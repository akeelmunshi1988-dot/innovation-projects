import os
import time
import asyncio
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from app.core.database import init_db, SessionLocal
from app.core.config import settings
from app.core.logging_config import logger
from app.api.routes import chat, catalog, quotes, orders, inventory, customers, dashboard, customer, auth, billing, invoices, email_templates, showcase, workshop, testimonials, gallery, newsletter, promo_codes, api_clients, public_api
from app.models.models import Tenant
from app.services.fx_rates import refresh_tenant_rates
from app.services import geo_ip
from app.core.cache import cache_get, cache_set

app = FastAPI(
    title="DreamRugsCreation - Rug Manufacture System",
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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs every API request to backend/logs/app.log — method, path, status, duration.
    Unhandled exceptions get their full traceback logged here before re-raising, since
    otherwise they're only visible in whichever terminal happened to be running uvicorn
    at the time (see logging_config.py)."""
    start = time.time()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.time() - start) * 1000
        logger.exception(f"{request.method} {request.url.path} raised an unhandled exception after {duration_ms:.0f}ms")
        raise
    duration_ms = (time.time() - start) * 1000
    log = logger.warning if response.status_code >= 500 else logger.info
    log(f"{request.method} {request.url.path} {response.status_code} {duration_ms:.0f}ms")
    return response


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
os.makedirs(os.path.join(STATIC_DIR, "testimonials"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "gallery"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "custom-requests"), exist_ok=True)
app.mount("/static", CachedStaticFiles(directory=STATIC_DIR), name="static")


_FX_REFRESH_INTERVAL_SECONDS = 24 * 60 * 60  # once a day — matches the source API's own update cadence


async def _fx_refresh_loop():
    """Keeps every tenant's exchange_rates in sync with live FX rates, so Business
    Settings → Currency doesn't require the vendor to track rates manually. Runs
    once at startup, then once every 24h for the life of the process. Tenants with
    exchange_rates_auto=False are skipped (vendor has opted into manual control)."""
    while True:
        db = SessionLocal()
        try:
            for tenant in db.query(Tenant).filter(Tenant.exchange_rates_auto == True).all():  # noqa: E712
                try:
                    await asyncio.to_thread(refresh_tenant_rates, db, tenant)
                except Exception as e:
                    logger.warning("FX rate refresh failed for tenant %s: %s", tenant.id, e)
        finally:
            db.close()
        await asyncio.sleep(_FX_REFRESH_INTERVAL_SECONDS)


@app.on_event("startup")
async def startup_event():
    init_db()
    asyncio.create_task(_fx_refresh_loop())


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
app.include_router(testimonials.router, prefix="/api", tags=["Testimonials"])
app.include_router(gallery.router, prefix="/api", tags=["Project Gallery"])
app.include_router(newsletter.router, prefix="/api", tags=["Newsletter"])
app.include_router(promo_codes.router, prefix="/api", tags=["Promo Codes"])
app.include_router(api_clients.router, prefix="/api", tags=["API Clients"])
app.include_router(public_api.router, prefix="/api", tags=["Public API"])


@app.get("/")
async def root():
    return {"message": "DreamRugsCreation API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


ACCESS_GATE_COOKIE = "drc_access"


@app.get("/internal/access-check")
async def access_check(request: Request):
    """
    Used exclusively by nginx's `auth_request` directive (see DEPLOYMENT.md)
    to gate the whole site — India-based visitors need INDIA_ACCESS_KEY,
    everyone else passes through untouched. Not reachable from outside the
    server (nginx's location for this is marked `internal`), and a no-op
    (always 200) whenever INDIA_ACCESS_KEY isn't configured, so this is safe
    to leave deployed without accidentally locking anyone out.

    Country lookup reuses the same cached ip-api.com call as
    /customer/detect-country (see geo_ip.py) — same free-tier budget, same
    "never block on a failed lookup" philosophy: if we can't tell where a
    visitor is from, we let them through rather than risk locking out real
    traffic on a flaky third-party API call.
    """
    if not settings.INDIA_ACCESS_KEY:
        return Response(status_code=200)

    if request.cookies.get(ACCESS_GATE_COOKIE) == settings.INDIA_ACCESS_KEY:
        return Response(status_code=200)

    if request.query_params.get("key") == settings.INDIA_ACCESS_KEY:
        response = Response(status_code=200)
        response.set_cookie(
            ACCESS_GATE_COOKIE, settings.INDIA_ACCESS_KEY,
            max_age=60 * 60 * 24 * 30, httponly=True, secure=True, samesite="lax",
        )
        return response

    ip = request.headers.get("x-real-ip") or (request.client.host if request.client else None)
    if not ip:
        return Response(status_code=200)

    cached = cache_get("geo_country", ip)
    country = cached if cached is not None else geo_ip.lookup_country(ip)
    if cached is None:
        cache_set("geo_country", country, ip)

    if country != "India":
        return Response(status_code=200)

    return Response(status_code=403)


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
        rug_slugs = [
            r.slug or str(r.id)
            for r in db.query(RugCatalog.id, RugCatalog.slug).all()
        ]
    finally:
        db.close()

    urls = [f"{base_url}{path}" for path in STATIC_SITEMAP_ROUTES]
    urls += [f"{base_url}/catalog/{slug}" for slug in rug_slugs]

    entries = "\n".join(f"  <url><loc>{url}</loc></url>" for url in urls)
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")
