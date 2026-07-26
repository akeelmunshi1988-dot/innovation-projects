"""GST-compliant invoice PDF generator using ReportLab."""
from io import BytesIO
from datetime import datetime, timedelta
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

# GST rate for rugs (HSN 5701-5705) — 12%
GST_RATE = 0.12

# Indian state codes
STATE_NAMES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa",
    "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana",
    "37": "Andhra Pradesh (New)",
}

# Gold brand color
GOLD = colors.HexColor("#B8860B")
DARK = colors.HexColor("#1a1a1a")
LIGHT_GREY = colors.HexColor("#f5f5f5")
MID_GREY = colors.HexColor("#e0e0e0")


def _num_to_words(n: float) -> str:
    """Convert a number to Indian English words (rupees and paise)."""
    ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
            "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen",
            "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty",
            "Sixty", "Seventy", "Eighty", "Ninety"]

    def _words(num: int) -> str:
        if num < 20:
            return ones[num]
        elif num < 100:
            return tens[num // 10] + (" " + ones[num % 10] if num % 10 else "")
        elif num < 1000:
            return ones[num // 100] + " Hundred" + (" " + _words(num % 100) if num % 100 else "")
        elif num < 100000:
            return _words(num // 1000) + " Thousand" + (" " + _words(num % 1000) if num % 1000 else "")
        elif num < 10000000:
            return _words(num // 100000) + " Lakh" + (" " + _words(num % 100000) if num % 100000 else "")
        else:
            return _words(num // 10000000) + " Crore" + (" " + _words(num % 10000000) if num % 10000000 else "")

    rupees = int(n)
    paise = round((n - rupees) * 100)
    result = _words(rupees) + " Rupees"
    if paise:
        result += " and " + _words(paise) + " Paise"
    return result + " Only"


def generate_invoice_pdf(
    quote_id: int,
    invoice_type: str,  # "tax", "export", or "proforma"
    # Supplier (tenant)
    supplier_name: str,
    supplier_address: str,
    supplier_gstin: Optional[str],
    supplier_state_code: Optional[str],
    lut_number: Optional[str],
    # Buyer (customer)
    buyer_name: str,
    buyer_company: Optional[str],
    buyer_address: Optional[str],
    buyer_gstin: Optional[str],
    buyer_state_code: Optional[str],
    is_export_buyer: bool,
    # Line item
    rug_name: str,
    hsn_code: str,
    size_desc: str,
    qty: int,
    rate_per_sqm: float,
    size_sqm: float,
    currency: str = "INR",
    expected_delivery_days: Optional[int] = None,
    size_dims_str: Optional[str] = None,  # e.g. "10.0x10.0 ft" — pre-formatted in the vendor's default_size_unit
) -> bytes:
    buf = BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", fontSize=16, fontName="Helvetica-Bold",
                                  textColor=GOLD, alignment=TA_CENTER, spaceAfter=2)
    sub_style = ParagraphStyle("sub", fontSize=8, fontName="Helvetica",
                                textColor=colors.grey, alignment=TA_CENTER, spaceAfter=8)
    label_style = ParagraphStyle("label", fontSize=7, fontName="Helvetica-Bold",
                                  textColor=colors.grey)
    value_style = ParagraphStyle("value", fontSize=9, fontName="Helvetica",
                                  textColor=DARK)
    bold_style = ParagraphStyle("bold", fontSize=9, fontName="Helvetica-Bold",
                                 textColor=DARK)
    small_style = ParagraphStyle("small", fontSize=7, fontName="Helvetica",
                                  textColor=colors.grey)

    # Determine tax type
    is_proforma = invoice_type == "proforma"
    is_export = (invoice_type == "export" or is_export_buyer) and not is_proforma
    same_state = (
        supplier_state_code and buyer_state_code and
        supplier_state_code == buyer_state_code and not is_export and not is_proforma
    )
    inter_state = not same_state and not is_export and not is_proforma

    # Financial year for invoice number
    now = datetime.now()
    fy_start = now.year if now.month >= 4 else now.year - 1
    fy_label = f"{str(fy_start)[2:]}{str(fy_start + 1)[2:]}"
    invoice_number = f"INV/FY{fy_label}/{quote_id:04d}"
    invoice_date = now.strftime("%d-%m-%Y")

    # Taxable value
    total_sqm = size_sqm * qty
    taxable_value = round(rate_per_sqm * total_sqm, 2)

    if is_export or is_proforma:
        cgst = sgst = igst = 0.0
        tax_total = 0.0
    elif same_state:
        cgst = round(taxable_value * (GST_RATE / 2), 2)
        sgst = cgst
        igst = 0.0
        tax_total = cgst + sgst
    else:
        igst = round(taxable_value * GST_RATE, 2)
        cgst = sgst = 0.0
        tax_total = igst

    grand_total = round(taxable_value + tax_total, 2)
    total_in_words = _num_to_words(grand_total)

    story = []

    # ── Header ──────────────────────────────────────────────────────────────────
    if is_proforma:
        doc_title = "PROFORMA INVOICE"
    elif is_export:
        doc_title = "EXPORT INVOICE"
    else:
        doc_title = "TAX INVOICE"

    story.append(Paragraph(supplier_name.upper(), title_style))
    story.append(Paragraph(doc_title, ParagraphStyle("dt", fontSize=11,
                                                       fontName="Helvetica-Bold",
                                                       textColor=DARK,
                                                       alignment=TA_CENTER,
                                                       spaceAfter=4)))
    if is_proforma:
        story.append(Paragraph(
            "This is a Proforma Invoice — not a tax document. Subject to change before final invoice.",
            ParagraphStyle("pi_note", fontSize=8, textColor=colors.orange,
                           alignment=TA_CENTER, spaceAfter=4)
        ))
    if is_export and lut_number:
        story.append(Paragraph(
            f"Supply meant for Export under LUT · LUT No: {lut_number}",
            ParagraphStyle("lut", fontSize=8, textColor=colors.orange,
                           alignment=TA_CENTER, spaceAfter=4)
        ))

    story.append(HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceAfter=8))

    # ── Supplier / Buyer / Invoice Meta ─────────────────────────────────────────
    sup_state_name = STATE_NAMES.get(supplier_state_code or "", supplier_state_code or "")
    buy_state_name = STATE_NAMES.get(buyer_state_code or "", buyer_state_code or "")

    supplier_lines = [
        Paragraph("SUPPLIER", label_style),
        Paragraph(supplier_name, bold_style),
        Paragraph(supplier_address or "—", value_style),
        Paragraph(f"GSTIN: {supplier_gstin or '—'}", value_style),
        Paragraph(f"State: {sup_state_name} ({supplier_state_code or '—'})", value_style),
    ]
    buyer_display = buyer_company or buyer_name
    buyer_lines = [
        Paragraph("BUYER", label_style),
        Paragraph(buyer_display, bold_style),
        Paragraph(f"Contact: {buyer_name}", value_style),
        Paragraph(buyer_address or "—", value_style),
        Paragraph(f"GSTIN: {buyer_gstin or 'URP (Unregistered)'}", value_style),
        Paragraph(f"State: {buy_state_name} ({buyer_state_code or '—'})", value_style),
    ]
    meta_lines = [
        Paragraph("INVOICE DETAILS", label_style),
        Paragraph(f"Invoice No: {invoice_number}", bold_style),
        Paragraph(f"Date: {invoice_date}", value_style),
        Paragraph(f"Quote Ref: #{quote_id}", value_style),
        Paragraph(f"Currency: {currency}", value_style),
        Paragraph(
            "IGST" if inter_state else ("CGST + SGST" if same_state else ("Proforma (No Tax)" if is_proforma else "Export (Zero-Rated)")),
            ParagraphStyle("taxtype", fontSize=8, fontName="Helvetica-Bold",
                           textColor=colors.orange if is_proforma else (GOLD if is_export else colors.darkblue))
        ),
    ]

    header_data = [[supplier_lines, buyer_lines, meta_lines]]
    header_table = Table(header_data, colWidths=["34%", "34%", "32%"])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
        ("GRID", (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    # ── Item card: name/HSN heading + a stat grid (size, qty, rate, delivery) ─────
    # ReportLab's base Helvetica font predates Unicode's Rupee sign (U+20B9) and
    # has no glyph for it — it silently renders as a black box. "Rs." is the
    # safe, always-available fallback; other currency symbols here (£, €) are
    # part of the standard WinAnsi encoding Helvetica does support.
    _CURRENCY_SYMBOLS = {"INR": "Rs. ", "USD": "$", "EUR": "€", "GBP": "£"}
    sym = _CURRENCY_SYMBOLS.get(currency, currency + " ")

    stat_label = ParagraphStyle("statlabel", fontSize=6.5, fontName="Helvetica-Bold",
                                 textColor=colors.grey, leading=9)
    stat_value = ParagraphStyle("statvalue", fontSize=10, fontName="Helvetica-Bold",
                                 textColor=DARK, leading=13)

    delivery_str = None
    if expected_delivery_days:
        delivery_str = (now + timedelta(days=expected_delivery_days)).strftime("%d-%m-%Y")

    stat_cells = [
        [Paragraph("SIZE (PER PIECE)", stat_label), Paragraph(size_dims_str or f"{size_sqm:.2f} m²", stat_value)],
        [Paragraph("QUANTITY", stat_label), Paragraph(f"{qty} pc" + ("s" if qty != 1 else ""), stat_value)],
        [Paragraph("RATE / M²", stat_label), Paragraph(f"{sym}{rate_per_sqm:,.2f}", stat_value)],
    ]
    if delivery_str:
        stat_cells.append([Paragraph("EST. DELIVERY", stat_label), Paragraph(delivery_str, stat_value)])
    else:
        stat_cells.append([Paragraph("HSN CODE", stat_label), Paragraph(hsn_code, stat_value)])

    stats_table = Table(
        [[c[0] for c in stat_cells], [c[1] for c in stat_cells]],
        colWidths=["25%", "25%", "25%", "25%"],
    )
    stats_table.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))

    item_card = [
        [Paragraph(rug_name, ParagraphStyle("itemname", fontSize=12, fontName="Helvetica-Bold",
                                             textColor=DARK, spaceAfter=1)),
         Paragraph(f"HSN {hsn_code} · {size_desc}", small_style)],
        [stats_table],
    ]
    item_table = Table(item_card, colWidths=["100%"])
    item_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
        ("BOX", (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 1), (-1, 1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 8))

    # ── Price calculation card ────────────────────────────────────────────────────
    calc_line = ParagraphStyle("calcline", fontSize=9, fontName="Helvetica",
                                textColor=DARK)
    calc_line_muted = ParagraphStyle("calclinemuted", fontSize=9, fontName="Helvetica",
                                      textColor=colors.grey)
    calc_total_label = ParagraphStyle("calctotallabel", fontSize=11, fontName="Helvetica-Bold",
                                       textColor=DARK)
    calc_total_value = ParagraphStyle("calctotalvalue", fontSize=13, fontName="Helvetica-Bold",
                                       textColor=GOLD)

    calc_rows = [
        [Paragraph(f"Rate: {sym}{rate_per_sqm:,.2f}/m² × {total_sqm:.2f} m²", calc_line),
         Paragraph(f"{sym}{taxable_value:,.2f}", calc_line)],
        [Paragraph("Pre-tax total", calc_line_muted),
         Paragraph(f"{sym}{taxable_value:,.2f}", calc_line_muted)],
    ]
    if is_proforma:
        calc_rows.append([Paragraph("GST (indicative — final invoice may vary)", calc_line_muted),
                           Paragraph("—", calc_line_muted)])
    elif is_export:
        calc_rows.append([Paragraph("IGST (0% — export under LUT)", calc_line_muted),
                           Paragraph(f"{sym}0.00", calc_line_muted)])
    elif same_state:
        calc_rows.append([Paragraph(f"CGST @ {GST_RATE*50:.0f}%", calc_line_muted),
                           Paragraph(f"+{sym}{cgst:,.2f}", calc_line_muted)])
        calc_rows.append([Paragraph(f"SGST @ {GST_RATE*50:.0f}%", calc_line_muted),
                           Paragraph(f"+{sym}{sgst:,.2f}", calc_line_muted)])
    else:
        calc_rows.append([Paragraph(f"IGST @ {GST_RATE*100:.0f}%", calc_line_muted),
                           Paragraph(f"+{sym}{igst:,.2f}", calc_line_muted)])

    calc_table = Table(calc_rows, colWidths=["65%", "35%"])
    calc_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    total_row = Table(
        [[Paragraph(("Total (indicative)" if is_proforma else "Total (incl. GST)"), calc_total_label),
          Paragraph(f"{sym}{grand_total:,.2f}", calc_total_value)]],
        colWidths=["65%", "35%"],
    )
    total_row.setStyle(TableStyle([
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, 0), (-1, 0), 1, GOLD),
    ]))

    calc_card = Table([[calc_table], [total_row]], colWidths=["100%"])
    calc_card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
        ("BOX", (0, 0), (-1, -1), 0.5, MID_GREY),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
    ]))
    story.append(calc_card)
    story.append(Spacer(1, 8))

    # ── Amount in words ──────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=MID_GREY, spaceAfter=4))
    story.append(Paragraph(
        f"<b>Amount in Words:</b> {total_in_words}",
        ParagraphStyle("words", fontSize=9, fontName="Helvetica",
                       textColor=DARK, spaceAfter=8)
    ))

    # ── Notes ────────────────────────────────────────────────────────────────────
    notes = []
    if is_proforma:
        notes.append("• This is a Proforma Invoice only. It is not a tax invoice and does not represent a demand for payment.")
        notes.append("• GST will be charged on the final Tax Invoice at applicable rates.")
        notes.append("• This document is valid for 15 days from the date of issue.")
    elif is_export:
        notes.append("• This invoice is issued for export under LUT. No GST charged as per Section 16(3)(a) of IGST Act, 2017.")
    else:
        notes.append("• All disputes subject to jurisdiction of the supplier's state courts.")
    notes.append("• E&OE – Errors and Omissions Excepted.")
    if not is_proforma:
        notes.append("• Payment within 30 days of invoice date unless otherwise agreed.")

    for note in notes:
        story.append(Paragraph(note, small_style))

    story.append(Spacer(1, 12))

    # ── Signature ────────────────────────────────────────────────────────────────
    sig_data = [[
        Paragraph("This is a computer-generated invoice.", small_style),
        Paragraph(f"For {supplier_name}", ParagraphStyle(
            "sig", fontSize=9, fontName="Helvetica-Bold",
            textColor=DARK, alignment=TA_RIGHT
        )),
    ]]
    sig_table = Table(sig_data, colWidths=["60%", "40%"])
    sig_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 20),
    ]))
    story.append(sig_table)

    sig_line = Table(
        [["", Paragraph("Authorised Signatory", small_style)]],
        colWidths=["60%", "40%"]
    )
    sig_line.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("LINEABOVE", (1, 0), (1, 0), 0.5, colors.grey),
    ]))
    story.append(sig_line)

    doc.build(story)
    return buf.getvalue()
