#!/usr/bin/env python3
"""Create a private integration API key and store it in backend/.env."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import dotenv_values, set_key

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
ENV_FILE = BACKEND_DIR / ".env"
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

from app.core.auth import generate_api_key  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.models.models import ApiClient, Tenant  # noqa: E402


def main() -> None:
    if dotenv_values(ENV_FILE).get("CATALOG_API_KEY"):
        print("Catalog API key is already configured.")
        return

    db = SessionLocal()
    try:
        tenant = db.query(Tenant).first()
        if not tenant:
            raise SystemExit("No tenant exists; cannot create an integration key.")
        raw_key, key_hash, key_prefix = generate_api_key()
        db.add(
            ApiClient(
                tenant_id=tenant.id,
                name="Room Visualizer Catalog Importer",
                key_hash=key_hash,
                key_prefix=key_prefix,
                is_active=True,
            )
        )
        db.commit()
        set_key(str(ENV_FILE), "CATALOG_API_KEY", raw_key)
        print("Catalog API key created and stored securely in backend/.env.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
