import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from app.core.database import init_db, SessionLocal
from app.core.config import settings
from app.api.routes import chat, catalog, quotes, orders, inventory, customers, dashboard, customer, auth, billing, invoices, email_templates, showcase, workshop

app = FastAPI(
    title="LoomCraftRugs AI - Rug Manufacture System",
    description="Custom rug manufacturing management system with AI assistant",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CachedStaticFiles(StaticFiles):
    """Every upload under /static gets a fresh UUID filename (see catalog.py,
    showcase.py, workshop.py upload endpoints) — a given URL's content never
    changes, so it's safe to mark cacheable for a year. This is what lets a
    CDN (Cloudflare, see DEPLOYMENT.md Phase 13) cache these at the edge
    instead of re-serving them from the VPS on every visit."""
    def file_response(self, *args, **kwargs):
        resp = super().file_response(*args, **kwargs)
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return resp


STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(os.path.join(STATIC_DIR, "rugs"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "branding"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "showcase"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "workshop"), exist_ok=True)
app.mount("/static", CachedStaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
async def startup_event():
    init_db()


app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(chat.router, prefix="/api", tags=["AI Chat"])
app.include_router(catalog.router, prefix="/api", tags=["Catalog"])
app.include_router(quotes.router, prefix="/api", tags=["Quotes"])
app.include_router(orders.router, prefix="/api", tags=["Orders"])
app.include_router(inventory.router, prefix="/api", tags=["Inventory"])
app.include_router(customers.router, prefix="/api", tags=["Customers"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(customer.router, prefix="/api", tags=["Customer Portal"])
app.include_router(billing.router, prefix="/api", tags=["Billing"])
app.include_router(invoices.router, prefix="/api", tags=["Invoices"])
app.include_router(email_templates.router, prefix="/api", tags=["Email Templates"])
app.include_router(showcase.router, prefix="/api", tags=["Showcase Videos"])
app.include_router(workshop.router, prefix="/api", tags=["Workshop Photos"])


@app.get("/")
async def root():
    return {"message": "LoomCraftRugs AI API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


STATIC_SITEMAP_ROUTES = ["/", "/about", "/catalog", "/visualizer"]


@app.get("/sitemap.xml")
async def sitemap():
    """
    Mounted unprefixed (not under /api) so it lives at the conventional root
    URL search engines expect. NOTE: in production this requires an nginx
    location block routing /sitemap.xml to the backend — see DEPLOYMENT.md
    Phase 10 — since nginx's `location /` otherwise serves the frontend's
    SPA shell for any path it doesn't recognize as a static file.
    """
    from app.models.models import RugCatalog

    base_url = settings.FRONTEND_URL.rstrip("/")
    db = SessionLocal()
    try:
        rug_ids = [r.id for r in db.query(RugCatalog.id).all()]
    finally:
        db.close()

    urls = [f"{base_url}{path}" for path in STATIC_SITEMAP_ROUTES]
    urls += [f"{base_url}/catalog/{rug_id}" for rug_id in rug_ids]

    entries = "\n".join(f"  <url><loc>{url}</loc></url>" for url in urls)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")
