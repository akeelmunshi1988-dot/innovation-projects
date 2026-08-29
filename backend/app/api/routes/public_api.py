"""
Public partner/integration API. Authenticated via a single opaque key sent as
X-Api-Key (see generate_api_key()/get_api_client() in app/core/auth.py) rather
than the staff/customer JWT schemes used everywhere else — for external
systems (a vendor's own ERP, a partner storefront) to sync catalog/inventory
and record sales without a human logging in.

Every write here reuses the exact same helper functions the admin panel and
storefront routes call (create_rug_row, create_material_row, etc.), so a
partner-created row can never behave differently from one a human created.
"""
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.auth import get_api_client
from app.core.database import get_db
from app.models.models import ApiClient, RugCatalog, Material, Customer, Tenant, RugImage
from app.schemas.schemas import (
    PublicCatalogCreate, RugCatalogUpdate, RugCatalog as RugCatalogSchema,
    PublicMaterialCreate, Material as MaterialSchema,
    PublicRestockRequest,
    PublicQuoteCreate,
    PublicOrderCreate,
    PublicRugImageCreate, PublicRugImageUpdate, RugImage as RugImageSchema,
)
from app.api.routes.catalog import (
    create_rug_row, update_rug_row, UPLOAD_DIR, ALLOWED_TYPES, MAX_SIZE_MB,
    add_rug_image_row, update_rug_image_row, delete_rug_image_row, get_tenant_rug_image,
)
from app.api.routes.inventory import create_material_row, restock_material_row
from app.services.quote_engine import QuoteEngine
from app.models.models import Quote

router = APIRouter()


def _resolve_or_create_customer_public(
    db: Session, tenant_id: Optional[int], name: str, email: str, phone: Optional[str], country: str,
) -> Customer:
    """Public-API equivalent of customer.py's _resolve_or_create_customer, adapted
    to this file's request field names — same find-by-email-or-create behavior."""
    from app.api.routes.customer import _is_export_country
    customer = db.query(Customer).filter(Customer.email == email, Customer.tenant_id == tenant_id).first()
    if not customer:
        customer = Customer(tenant_id=tenant_id, name=name, email=email, phone=phone)
        db.add(customer)
        db.flush()
    customer.country = country
    customer.is_export_buyer = _is_export_country(country)
    return customer


@router.post("/v1/catalog/upload-image")
async def public_upload_rug_image(
    file: UploadFile = File(...),
    client: ApiClient = Depends(get_api_client),
):
    """Same validation/storage as the admin panel's /catalog/upload-image —
    returns a URL to pass as image_url when creating or updating a rug."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}. Use JPEG, PNG, or WebP.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_SIZE_MB}MB allowed.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return JSONResponse({"url": f"/static/rugs/{filename}"})


@router.post("/v1/catalog", response_model=RugCatalogSchema)
def public_create_catalog(
    body: PublicCatalogCreate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    return create_rug_row(db, body.model_dump(), client.tenant_id)


@router.put("/v1/catalog/{rug_id}", response_model=RugCatalogSchema)
def public_update_catalog(
    rug_id: int,
    body: RugCatalogUpdate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    rug = db.query(RugCatalog).filter(
        RugCatalog.id == rug_id,
        RugCatalog.tenant_id == client.tenant_id,
    ).first()
    if not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    return update_rug_row(db, rug, body.model_dump(exclude_unset=True))


@router.post("/v1/catalog/{rug_id}/images", response_model=RugImageSchema)
def public_add_rug_image(
    rug_id: int,
    body: PublicRugImageCreate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    """Adds a gallery photo to an existing rug — get image_url from
    POST /v1/catalog/upload-image first. Distinct from the rug's own
    image_url (the cover photo, set at creation) — this is the extra
    gallery shown on the rug detail page."""
    rug = db.query(RugCatalog).filter(RugCatalog.id == rug_id, RugCatalog.tenant_id == client.tenant_id).first()
    if not rug:
        raise HTTPException(status_code=404, detail="Rug not found")
    return add_rug_image_row(db, rug_id, body.image_url, body.sort_order)


@router.patch("/v1/catalog/images/{image_id}", response_model=RugImageSchema)
def public_update_rug_image(
    image_id: int,
    body: PublicRugImageUpdate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    image = get_tenant_rug_image(db, image_id, client.tenant_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return update_rug_image_row(db, image, body.sort_order)


@router.delete("/v1/catalog/images/{image_id}")
def public_delete_rug_image(
    image_id: int,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    image = get_tenant_rug_image(db, image_id, client.tenant_id)
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    delete_rug_image_row(db, image)
    return {"message": "Image deleted successfully"}


@router.post("/v1/materials", response_model=MaterialSchema)
def public_create_material(
    body: PublicMaterialCreate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    return create_material_row(db, body.model_dump(), client.tenant_id)


@router.post("/v1/materials/{material_id}/restock", response_model=MaterialSchema)
def public_restock_material(
    material_id: int,
    body: PublicRestockRequest,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    material = db.query(Material).filter(Material.id == material_id, Material.tenant_id == client.tenant_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return restock_material_row(db, material, body.qty_meters, client.tenant_id, body.notes)


@router.post("/v1/quotes")
def public_create_quote(
    body: PublicQuoteCreate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    tenant_id = client.tenant_id
    item = body.item
    rug = db.query(RugCatalog).filter(RugCatalog.id == item.rug_id, RugCatalog.tenant_id == tenant_id).first()
    if not rug:
        raise HTTPException(status_code=404, detail=f"Rug {item.rug_id} not found")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    engine = QuoteEngine(db, tenant_id=tenant_id)
    calc = engine.calculate_quote(
        rug_id=item.rug_id, size_w=item.size_w, size_h=item.size_h,
        material_id=rug.material_id, qty=item.qty, rush_order=item.rush_order, shape=item.shape,
    )
    if "error" in calc:
        raise HTTPException(status_code=400, detail=calc["error"])

    customer = _resolve_or_create_customer_public(
        db, tenant_id, body.customer_name, body.customer_email, body.customer_phone, "India",
    )

    quote = Quote(
        tenant_id=tenant_id, customer_id=customer.id, rug_catalog_id=rug.id,
        material_id=rug.material_id, custom_size_w=item.size_w, custom_size_h=item.size_h,
        rug_shape=item.shape, qty=item.qty, base_price=calc.get("subtotal"), final_price=calc.get("final_price"),
        price_currency=calc.get("price_currency") or (tenant.base_currency if tenant else "INR"),
        margin_pct=calc.get("profit_margin_pct"), gst_pct=calc.get("gst_pct"),
        rush_order=item.rush_order, status="draft",
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)

    return {
        "quote_id": quote.id,
        "customer_id": customer.id,
        "rug_name": rug.name,
        "final_price": quote.final_price,
        "price_currency": quote.price_currency,
        "status": quote.status,
    }


@router.post("/v1/orders")
def public_create_order(
    body: PublicOrderCreate,
    db: Session = Depends(get_db),
    client: ApiClient = Depends(get_api_client),
):
    """Records an already-settled external sale — the partner has already collected
    payment on their own end; this just syncs it in (deducts stock, creates the
    Order/Quote rows) so it shows up in the admin panel like any other order."""
    from app.api.routes.customer import _price_cart_items, _create_order_from_items, CartItemBody

    tenant_id = client.tenant_id
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    customer = _resolve_or_create_customer_public(
        db, tenant_id, body.customer_name, body.customer_email, body.customer_phone, body.country,
    )

    cart_items = [
        CartItemBody(rug_id=i.rug_id, size_w=i.size_w, size_h=i.size_h, qty=i.qty, rush_order=i.rush_order, shape=i.shape)
        for i in body.items
    ]
    priced = _price_cart_items(db, tenant_id, cart_items, is_export=customer.is_export_buyer)
    subtotal = sum(p["calc"]["final_price"] for p in priced)

    order, items_meta = _create_order_from_items(
        db, tenant_id, tenant, customer, priced, body.shipping_address, payment_ref=body.external_reference,
    )
    order.total_amount = round(subtotal, 2)
    order.price_currency = items_meta[0]["quote"].price_currency
    db.commit()
    db.refresh(order)

    return {
        "order_id": order.id,
        "customer_id": customer.id,
        "status": order.status,
        "total_amount": order.total_amount,
        "price_currency": order.price_currency,
        "estimated_delivery": order.estimated_delivery.strftime("%Y-%m-%d") if order.estimated_delivery else None,
        "items": [
            {"quote_id": m["quote"].id, "rug_name": m["rug"].name, "qty": m["qty"], "final_price": m["quote"].final_price}
            for m in items_meta
        ],
    }
