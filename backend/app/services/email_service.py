import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import EmailTemplate, Tenant

logger = logging.getLogger(__name__)


# Default template content — reproduces the copy that used to be hardcoded inline
# in quotes.py / invoices.py / customer.py, so behavior is unchanged for any tenant
# that never opens the Email Templates settings tab.
DEFAULT_TEMPLATES = {
    "quote_sent": {
        "name": "Quote Sent to Customer",
        "subject": "Your Quote is Ready — {{rug_name}} | {{tenant_name}}",
        "body_html": """\
<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">
<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">
  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>
  <p style="color:#929290;margin:4px 0 0;font-size:13px">Your quote is ready for review</p>
</div>
<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">
  <p>Dear <strong>{{customer_name}}</strong>,</p>
  <p>Great news — we've prepared a quote for your order. Please review the details below:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:8px 0;color:#666;width:40%">Rug</td><td style="padding:8px 0;font-weight:600">{{rug_name}}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Size</td><td style="padding:8px 0">{{size}}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Quantity</td><td style="padding:8px 0">{{qty}}</td></tr>
    <tr><td style="padding:8px 0;color:#666">Expected delivery</td><td style="padding:8px 0">{{expected_delivery}}</td></tr>
    <tr style="border-top:2px solid #e5e5e5"><td style="padding:12px 0;color:#666;font-weight:600">Total Price</td>
    <td style="padding:12px 0;font-size:18px;font-weight:700;color:#d97706">{{price}}</td></tr>
  </table>
  {{note_html}}
  <p>To <strong>accept or decline</strong> this quote, log in to your account and visit <em>My Quotes</em>.</p>
  <p style="color:#888;font-size:12px;margin-top:24px">This quote is valid for 7 days. For any queries, reply to this email.<br>— {{tenant_name}} Team</p>
</div>
</body></html>""",
        "body_text": (
            "Dear {{customer_name}},\n\n"
            "Your quote from {{tenant_name}} is ready.\n\n"
            "Rug: {{rug_name}}\nSize: {{size}}\nQty: {{qty}}\nExpected delivery: {{expected_delivery}}\nTotal: {{price}}\n"
            "{{note_text}}"
            "\nLog in to your account and visit 'My Quotes' to accept or decline.\n\n– {{tenant_name}} Team"
        ),
    },
    "invoice_email": {
        "name": "Invoice Email",
        "subject": "{{invoice_type_label}} – {{rug_name}} – {{tenant_name}}",
        "body_html": "",  # invoice email is plaintext-only today
        "body_text": (
            "Dear {{customer_name}},\n\n"
            "Please find attached your {{invoice_type_label}} from {{tenant_name}}.\n\n"
            "Order Details:\n"
            "  Rug      : {{rug_name}}\n"
            "  Size     : {{size}}\n"
            "  Quantity : {{qty}}\n"
            "  Amount   : {{price}}\n\n"
            "{{disclaimer}}\n\n"
            "For any queries, please reply to this email.\n\n"
            "Best regards,\n{{tenant_name}}\n"
        ),
    },
    "vendor_review_request": {
        "name": "Customer Review Request (to Vendor)",
        "subject": "[Review Request #{{request_num}}] {{customer_name}} — {{rug_name}}",
        "body_html": "",  # vendor notification is plaintext-only today
        "body_text": (
            "Hello {{tenant_name}} team,\n\n"
            "{{customer_name}} ({{customer_email}}) has requested a review of Quote #{{quote_id}}.\n\n"
            "Rug: {{rug_name}}\n"
            "Size: {{size}}\n"
            "Status: {{status}}\n"
            "Review Request: #{{request_num}} of {{max_requests}}\n\n"
            "Please log in to the admin panel to review and update the quote.\n\n"
            "— {{tenant_name}} System"
        ),
    },
    "customer_verification": {
        "name": "Registration Verification",
        "subject": "Verify your email — {{tenant_name}}",
        "body_html": """\
<html><body style="font-family:Arial,sans-serif;color:#222;max-width:600px;margin:0 auto">
<div style="background:#1c1c1b;padding:24px 32px;border-radius:12px 12px 0 0">
  <h1 style="color:#fbbf24;margin:0;font-size:22px">{{tenant_name}}</h1>
  <p style="color:#929290;margin:4px 0 0;font-size:13px">Confirm your email address</p>
</div>
<div style="background:#f9f9f9;padding:24px 32px;border:1px solid #e5e5e5;border-top:none">
  <p>Dear <strong>{{customer_name}}</strong>,</p>
  <p>Thanks for creating an account with {{tenant_name}}. Please confirm your email address to activate your account:</p>
  <p style="margin:24px 0"><a href="{{verification_link}}" style="background:#d97706;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Verify Email Address</a></p>
  <p style="color:#888;font-size:12px">Or copy this link into your browser:<br>{{verification_link}}</p>
  <p style="color:#888;font-size:12px;margin-top:24px">This link expires in 24 hours. If you didn't create this account, you can ignore this email.<br>— {{tenant_name}} Team</p>
</div>
</body></html>""",
        "body_text": (
            "Dear {{customer_name}},\n\n"
            "Thanks for creating an account with {{tenant_name}}. Please confirm your email address "
            "by visiting the link below:\n\n{{verification_link}}\n\n"
            "This link expires in 24 hours. If you didn't create this account, you can ignore this email.\n\n"
            "– {{tenant_name}} Team"
        ),
    },
}


def render_template(db: Session, tenant_id: Optional[int], key: str, variables: dict) -> tuple[str, str, str]:
    """Load the tenant's EmailTemplate row for `key` (or fall back to defaults), substitute
    `{{var}}` placeholders, and return (subject, body_text, body_html)."""
    row = None
    if tenant_id is not None:
        row = db.query(EmailTemplate).filter(
            EmailTemplate.tenant_id == tenant_id,
            EmailTemplate.key == key,
        ).first()

    if row and row.is_active:
        subject, body_text, body_html = row.subject, row.body_text, row.body_html
    else:
        default = DEFAULT_TEMPLATES[key]
        subject, body_text, body_html = default["subject"], default["body_text"], default["body_html"]

    def _sub(text: str) -> str:
        for k, v in variables.items():
            text = text.replace("{{" + k + "}}", str(v) if v is not None else "")
        return text

    return _sub(subject), _sub(body_text), _sub(body_html)


def seed_default_templates(db: Session, tenant_id: int) -> None:
    """Insert the default EmailTemplate rows for a tenant if they don't exist yet."""
    existing_keys = {
        row.key for row in db.query(EmailTemplate.key).filter(EmailTemplate.tenant_id == tenant_id).all()
    }
    for key, default in DEFAULT_TEMPLATES.items():
        if key in existing_keys:
            continue
        db.add(EmailTemplate(
            tenant_id=tenant_id,
            key=key,
            name=default["name"],
            subject=default["subject"],
            body_html=default["body_html"],
            body_text=default["body_text"],
            is_active=True,
        ))
    db.commit()


def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str = "",
    attachment: Optional[tuple[bytes, str]] = None,
    raise_on_failure: bool = False,
    reply_to: Optional[str] = None,
) -> None:
    """SMTP send. By default fire-and-forget (logs a warning and returns on failure or missing
    config), matching the existing behavior of the quote/vendor-notification call sites this
    replaces. Pass raise_on_failure=True for flows (like the invoice email) that should surface
    a hard error to the caller instead of silently swallowing it."""
    smtp_host = settings.SMTP_HOST
    smtp_user = settings.SMTP_USERNAME
    smtp_pass = settings.SMTP_PASSWORD
    smtp_from = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    if not smtp_host or not smtp_user or not smtp_pass or not smtp_from:
        if raise_on_failure:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail="Email not configured. Add SMTP_HOST, SMTP_USERNAME, and SMTP_PASSWORD to your .env file."
            )
        logger.warning("Email to %s not sent — SMTP not configured.", to_email)
        return

    msg = MIMEMultipart("alternative" if body_html else "mixed")
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{smtp_from}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(body_text, "plain"))
    if body_html:
        msg.attach(MIMEText(body_html, "html"))

    if attachment:
        pdf_bytes, filename = attachment
        part = MIMEApplication(pdf_bytes, _subtype="pdf")
        part.add_header("Content-Disposition", "attachment", filename=filename)
        msg.attach(part)

    try:
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(smtp_user, smtp_pass)
            smtp.send_message(msg)
    except Exception as e:
        if raise_on_failure:
            from fastapi import HTTPException
            raise HTTPException(status_code=502, detail=f"Failed to send email: {str(e)}")
        logger.warning("Email to %s failed: %s", to_email, e)
