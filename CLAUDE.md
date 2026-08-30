# DreamRugsCreation — Project Conventions

FastAPI (Python) backend + React/TypeScript (Vite) frontend, PostgreSQL in production. Rug
manufacturing e-commerce: admin/vendor panel + public customer storefront,
production domain `dreamrugscreation.in`.

## Multi-tenant scoping — the single most important rule in this codebase

Almost every table has a nullable `tenant_id` FK. **Every query must filter by
it, and every created row must set it.** This has bitten the app twice for
real: a customer self-registration endpoint stamped `tenant_id=NULL`, and six
public storefront GET endpoints had no tenant filter at all — both leaked a
stray/orphaned tenant's data onto the live public homepage.

Two resolution patterns, use the one matching the route:

- **Admin/staff routes** (`current_user: StaffUser = Depends(get_current_user)`):
  filter and stamp with `current_user.tenant_id`.
- **Public/unauthenticated customer routes**: this is a single-tenant-per-deployment
  storefront (no domain-based multi-tenant routing yet), so resolve with
  `tenant = db.query(Tenant).first()` and use `tenant.id`. See
  `get_public_settings()` in `backend/app/api/routes/customer.py` for the
  canonical example — mirror it exactly, don't invent a new resolution
  mechanism.

When reviewing or writing any endpoint that reads-before-writing (an update or
delete that looks up a row by id) or creates a new row, check both:
1. Does the lookup query filter by tenant, not just by id? (An id-only lookup
   lets one tenant read/modify/delete another tenant's row by guessing IDs.)
2. Does every `Model(...)` constructor set `tenant_id` explicitly?

A secondary object derived from an already-tenant-checked row (e.g. looking up
`quote.customer_id` after `quote` was already filtered by tenant) does not
need to re-check tenant — it inherited that guarantee. Don't add redundant
filters there.

## Database migrations

PostgreSQL is the production database. `backend/migrate_sqlite_to_postgres.py`
is the one-time legacy-data importer; it requires an empty PostgreSQL target,
preserves explicit IDs, and resets sequences. The old `migrate_v*.py` files
operate directly on the legacy SQLite file and must not be used as the schema
migration mechanism after the PostgreSQL cutover.

After the import, run `alembic stamp 20260830_0001`. All subsequent schema
changes must be new Alembic revisions and deploys must run `alembic upgrade head`.

### Legacy SQLite migrations

SQLite, no ORM migration framework — plain Python scripts,
`backend/migrate_v##_description.py`, strictly following this shape:

- Idempotent: check before altering (`PRAGMA table_info(...)` for columns,
  `sqlite_master` for tables/indexes) so it's always safe to re-run.
- Prints `  + Added ...` for a real change, `  . Already exists ...` when
  skipped.
- A `run()` function plus `if __name__ == "__main__": run()`.
- Never alter a migration that's already shipped — add a new one, always the
  next `v##`.

Until the PostgreSQL cutover, every backend deploy must re-run the **full ordered list** of migration
scripts (they're idempotent, so this is always safe even if most are already
applied) — code deploys and DB migrations are two separate steps here, and
skipping the second one after a code deploy is the single most common cause
of production 500s in this app's history (missing columns on `StaffUser`/
`Order`/`RugCatalog` queries).

## Pricing / money — `final_price` and `total_amount` are canonical totals

`Quote.final_price` and `Order.total_amount` are always the true, final,
already-inclusive total — never add shipping or a discount on top of them
again downstream. `shipping_cost`/`discount_amount` fields that also exist on
these rows are informational breakdown lines for display, not additional
charges to apply. This was a real double-charging bug (quote acceptance was
adding `tenant.default_shipping_rate` on top of an already-shipping-inclusive
`final_price`) — don't reintroduce it.

## Sizes: feet vs centimetres

- Catalog rugs (`RugCatalog.sizes`): a list of `{"ft": "6x9", "cm": null}`
  objects. `cm` is **only ever vendor-typed** on the admin catalog form —
  never auto-computed from `ft`. If a vendor hasn't filled in `cm` for a
  size, display ft-only; never fall back to a computed conversion. This is
  deliberate (see the `RugCatalog.sizes` column comment and
  `frontend/src/utils/size.ts`'s `fmtSize`/`catalogSizeDims`).
- Custom/bespoke dimensions (`Quote.custom_size_w/h`, stored in metres): these
  have no vendor-entered cm value (there's no finite preset list), so a
  computed ft↔cm conversion is correct and expected here — see
  `backend/app/services/size_format.py`'s `email_dims_display()`, which tries
  a catalog-preset cm match first and only falls back to computed conversion
  for genuinely custom sizes.
- Conversion constant: exactly `0.3048` m/ft, rounding convention is
  ft → 1 decimal place, cm → nearest whole number. Reuse
  `backend/app/services/size_format.py` / `frontend/src/utils/size.ts` — don't
  reimplement this elsewhere (it's already drifted into an inconsistent
  duplicate once, in `quotes.py`).

## Backend structure

- `app/api/routes/*.py` — one router per resource area.
- `app/services/*.py` — business logic shared across routes (pricing engine,
  email templates, promo codes, size formatting, invoice PDF generation).
- `app/models/models.py` — single file, all SQLAlchemy models.
- `app/schemas/schemas.py` — single file, all Pydantic request/response models.
- In-process TTL cache (`app/core/cache.py`) for read-heavy public endpoints —
  **any route that writes data another cached endpoint reads must call
  `cache_clear("namespace")` right after `db.commit()`.** Note the systemd
  deploy runs `--workers 2`; the cache is per-worker, so a write clears one
  worker's copy and the other can serve a stale response for up to its TTL.

## No test suite yet

There is no `pytest`/`vitest` suite in this repo. Verification for backend
changes is: `python3 -m py_compile <file>` for a syntax check, then an actual
`curl` against a running local `uvicorn` to exercise the real endpoint.
Frontend: `npx tsc --noEmit` for type-check, `npm run lint` for ESLint. Don't
claim something is "tested" without one of these — and prefer hitting the
real running app over reasoning from source alone, especially for anything
money/tenant/auth-related given the bug history above.

## Deployment

See `DEPLOYMENT.md`. Two servers exist during the in-progress migration:
`srv1833598.hstgr.cloud` (old, `/var/www/loomcraft/innovation-projects`) and
`srv1909366` (current, `/var/www/dreamrugscreation-projects`, user
`dreamrugsuser`). `dreamrugscreation.in` DNS points at the new server.
After PostgreSQL cutover, deploy = `git fetch && git reset --hard origin/main` +
apply the current PostgreSQL schema migration + `systemctl restart dreamrugscreation`.
Do not run the historical SQLite scripts as a substitute. Frontend changes additionally
need `npm run build` on the server (or an `rsync` of a Mac-built `dist/`) since
nginx serves a separate static build directory, not the git working tree.
