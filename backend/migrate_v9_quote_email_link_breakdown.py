"""
Migration v9: Quote-sent email — price breakdown + My Quotes link.

The `quote_sent` email template gained new placeholders (subtotal, gst_pct,
discount_line_html/text, quote_link) and an actual "View My Quotes" link/button.
DEFAULT_TEMPLATES in app/services/email_service.py already has the new copy —
this migration refreshes any tenant's stored `quote_sent` row, but ONLY if it
still matches the old default content untouched, so real vendor customizations
are left alone.

Run once:  python3 migrate_v9_quote_email_link_breakdown.py
"""
import sqlite3
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.services.email_service import DEFAULT_TEMPLATES  # noqa: E402

DB_PATH = os.path.join(os.path.dirname(__file__), "rug_manufacture.db")

OLD_BODY_TEXT = (
    "Dear {{customer_name}},\n\n"
    "Your quote from {{tenant_name}} is ready.\n\n"
    "Rug: {{rug_name}}\nSize: {{size}}\nQty: {{qty}}\nExpected delivery: {{expected_delivery}}\nTotal: {{price}}\n"
    "{{note_text}}"
    "\nLog in to your account and visit 'My Quotes' to accept or decline.\n\n– {{tenant_name}} Team"
)


def run():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    new_default = DEFAULT_TEMPLATES["quote_sent"]
    cur.execute("SELECT id, tenant_id, body_text FROM email_templates WHERE key = 'quote_sent'")
    rows = cur.fetchall()

    updated, skipped = 0, 0
    for row_id, tenant_id, body_text in rows:
        if body_text == OLD_BODY_TEXT:
            cur.execute(
                "UPDATE email_templates SET subject = ?, body_html = ?, body_text = ? WHERE id = ?",
                (new_default["subject"], new_default["body_html"], new_default["body_text"], row_id),
            )
            updated += 1
        else:
            skipped += 1
            print(f"  Skipped tenant {tenant_id}'s quote_sent template (customized)")

    conn.commit()
    conn.close()
    print(f"Migration v9 complete. Updated {updated}, skipped {skipped} customized template(s).")


if __name__ == "__main__":
    run()
