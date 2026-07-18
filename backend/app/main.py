import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.database import init_db
from app.api.routes import chat, catalog, quotes, orders, inventory, customers, dashboard, customer, auth, billing, invoices

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


STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "static")
os.makedirs(os.path.join(STATIC_DIR, "rugs"), exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


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


@app.get("/")
async def root():
    return {"message": "LoomCraftRugs AI API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
