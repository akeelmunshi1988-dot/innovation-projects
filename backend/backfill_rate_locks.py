"""
Backfill margin_pct and gst_pct for quotes that predate rate locking.

Strategy:
  margin_pct: derive from (base_price / mat_cost_total - 1) * 100.
              Use the derived value when it falls in a sane range (5%-300%).
              Fall back to tenant default only when derivation is clearly wrong
              (negative or astronomically high — indicates corrupted seed data).
  gst_pct:    detect whether final_price ≈ base_price × 1.12 (±1%); if so set 12.0,
              otherwise 0.0 (quote predates GST being added to the engine).
"""

import sqlite3

DB = "/Applications/RugManufactureCustomApp/backend/rug_manufacture.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.execute("SELECT default_profit_margin_pct FROM tenants LIMIT 1")
row = cur.fetchone()
tenant_default_margin = row[0] if row else 28.0

print(f"Tenant default margin: {tenant_default_margin}%\n")

cur.execute("""
    SELECT q.id, q.base_price, q.final_price, q.margin_pct, q.gst_pct,
           q.custom_size_w, q.custom_size_h, q.qty, m.cost_per_sqm
    FROM quotes q
    LEFT JOIN materials m ON q.material_id = m.id
    ORDER BY q.id
""")
rows = cur.fetchall()

updates = []
for qid, base_price, final_price, margin_pct, gst_pct, w, h, qty, cost_per_sqm in rows:
    # ── margin_pct ────────────────────────────────────────────────────────────
    new_margin = margin_pct
    if new_margin is None:
        if w and h and qty and cost_per_sqm and base_price and base_price > 0:
            total_sqm = round(w * h, 4) * qty
            mat_cost_total = cost_per_sqm * total_sqm
            if mat_cost_total > 0:
                derived = (base_price / mat_cost_total - 1) * 100
                # Accept derived value if it's in a sane range for a rug business
                if 5.0 <= derived <= 300.0:
                    new_margin = round(derived, 2)
                    flag = f"derived={derived:.1f}%"
                else:
                    new_margin = tenant_default_margin
                    flag = f"fallback (derived={derived:.1f}% out of range)"
            else:
                new_margin = tenant_default_margin
                flag = "fallback (zero mat cost)"
        else:
            new_margin = tenant_default_margin
            flag = "fallback (missing data)"
    else:
        flag = "already set"

    # ── gst_pct ───────────────────────────────────────────────────────────────
    new_gst = gst_pct
    if new_gst is None:
        if base_price and final_price and base_price > 0:
            ratio = final_price / base_price
            if abs(ratio - 1.12) <= 0.01:
                new_gst = 12.0
                gst_flag = "detected 12%"
            else:
                new_gst = 0.0
                gst_flag = f"no GST (ratio={ratio:.3f})"
        else:
            new_gst = 0.0
            gst_flag = "no GST (missing data)"
    else:
        gst_flag = "already set"

    print(f"Q{qid:>2}: margin={new_margin:>7.2f}%  ({flag:45s})  gst={new_gst:>4.1f}% ({gst_flag})")
    updates.append((new_margin, new_gst, qid))

print(f"\nApplying {len(updates)} updates...")
for new_margin, new_gst, qid in updates:
    cur.execute("UPDATE quotes SET margin_pct=?, gst_pct=? WHERE id=?", (new_margin, new_gst, qid))

conn.commit()
conn.close()
print("Done!")
