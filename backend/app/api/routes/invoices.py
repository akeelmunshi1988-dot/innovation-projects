import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.models import StaffUser, Quote, Tenant, Customer
from app.services.invoice_generator import generate_invoice_pdf

router = APIRouter()


def _build_pdf(quote_id: int, invoice_type: str, db: Session, tenant_id: int):
    """Shared logic: load quote + generate PDF bytes."""
    quote = (
        db.query(Quote)
        .filter(Quote.id == quote_id, Quote.tenant_id == tenant_id)
        .first()
    )
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    customer = db.query(Customer).filter(Customer.id == quote.customer_id).first()
    rug = quote.rug_catalog

    if not rug or not quote.final_price or not quote.custom_size_w or not quote.custom_size_h:
        raise HTTPException(
            status_code=422,
            detail="Quote is missing rug, dimensions, or final price — cannot generate invoice."
        )

    size_sqm = round(quote.custom_size_w * quote.custom_size_h, 4)
    qty = quote.qty or 1
    total_sqm = size_sqm * qty

    # Convert final_price from its stored currency (base_currency) to invoice display currency
    invoice_currency = tenant.currency or "INR"
    quote_currency = quote.price_currency or tenant.base_currency or "INR"
    _base = tenant.base_currency or "INR"
    _rates = tenant.exchange_rates or {}
    _from_rate = 1.0 if quote_currency == _base else (_rates.get(quote_currency) or 1.0)
    _to_rate   = 1.0 if invoice_currency == _base else (_rates.get(invoice_currency) or 1.0)
    final_price_display = round(quote.final_price * (_to_rate / _from_rate), 2)

    rate_per_sqm = round(final_price_display / total_sqm, 2) if total_sqm > 0 else 0.0
    size_desc = f"{quote.custom_size_w}×{quote.custom_size_h}m ({size_sqm:.2f}m²)"

    is_export = invoice_type == "export" or bool(customer and customer.is_export_buyer)
    effective_type = "export" if is_export and invoice_type != "proforma" else invoice_type

    pdf_bytes = generate_invoice_pdf(
        quote_id=quote_id,
        invoice_type=effective_type,
        supplier_name=tenant.name,
        supplier_address=tenant.address or "India",
        supplier_gstin=tenant.gstin,
        supplier_state_code=tenant.state_code,
        lut_number=tenant.lut_number,
        buyer_name=customer.name if customer else "Walk-in Customer",
        buyer_company=customer.company if customer else None,
        buyer_address=customer.address if customer else None,
        buyer_gstin=customer.gstin if customer else None,
        buyer_state_code=customer.state_code if customer else None,
        is_export_buyer=is_export,
        rug_name=rug.name,
        hsn_code=rug.hsn_code or "5703",
        size_desc=size_desc,
        qty=qty,
        rate_per_sqm=rate_per_sqm,
        size_sqm=size_sqm,
        currency=tenant.currency or "INR",
    )
    return pdf_bytes, quote, customer, tenant, effective_type, final_price_display


@router.get("/quotes/{quote_id}/invoice")
def download_invoice(
    quote_id: int,
    invoice_type: str = "tax",  # "tax", "export", or "proforma"
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    pdf_bytes, _, _, _, effective_type, _ = _build_pdf(quote_id, invoice_type, db, current_user.tenant_id)
    filename = f"invoice-Q{quote_id:04d}-{effective_type}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/quotes/{quote_id}/send-email")
def send_quote_email(
    quote_id: int,
    invoice_type: str = Query("proforma"),  # default to proforma for email
    recipient_email: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: StaffUser = Depends(get_current_user),
):
    if not all([settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD]):
        raise HTTPException(
            status_code=503,
            detail="Email not configured. Add SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD to your .env file."
        )

    pdf_bytes, quote, customer, tenant, effective_type, final_price_display = _build_pdf(
        quote_id, invoice_type, db, current_user.tenant_id
    )

    to_email = recipient_email or (customer.email if customer else None)
    if not to_email:
        raise HTTPException(status_code=422, detail="No recipient email address available.")

    _SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€", "GBP": "£"}
    currency_sym = _SYMBOLS.get(tenant.currency or "INR", tenant.currency or "$")
    rug_name = quote.rug_catalog.name if quote.rug_catalog else f"Rug #{quote.rug_catalog_id}"
    size_str = f"{quote.custom_size_w}×{quote.custom_size_h}m" if quote.custom_size_w else "custom size"
    price_str = f"{currency_sym}{final_price_display:,.2f}" if quote.final_price else "TBD"
    type_label = {"proforma": "Proforma Invoice", "tax": "Tax Invoice", "export": "Export Invoice"}.get(effective_type, "Invoice")

    subject = f"{type_label} – {rug_name} – {tenant.name}"
    body = f"""Dear {customer.name if customer else 'Customer'},

Please find attached your {type_label} from {tenant.name}.

Order Details:
  Rug      : {rug_name}
  Size     : {size_str}
  Quantity : {quote.qty or 1}
  Amount   : {price_str}

{"This is a proforma invoice. The final tax invoice will be issued upon order confirmation." if effective_type == "proforma" else "Please make payment as per the invoice terms."}

For any queries, please reply to this email.

Best regards,
{tenant.name}
"""

    msg = MIMEMultipart()
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    filename = f"invoice-Q{quote_id:04d}-{effective_type}.pdf"
    attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    attachment.add_header("Content-Disposition", "attachment", filename=filename)
    msg.attach(attachment)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to send email: {str(e)}")

    return {"message": f"Email sent to {to_email}", "recipient": to_email}
