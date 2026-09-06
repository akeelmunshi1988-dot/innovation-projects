"""Update the sole admin for the storefront tenant; prompt for the new password."""
import sys
from getpass import getpass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.auth import hash_password, verify_password
from app.core.database import SessionLocal
from app.models.models import StaffUser, Tenant


def main():
    email = 'admin@dreamrugscreation.in'
    password = getpass('New admin password: ')
    if not password or password != getpass('Confirm password: '):
        raise SystemExit('Passwords must be nonempty and match; nothing changed.')
    with SessionLocal() as db:
        tenant = db.query(Tenant).first()
        if tenant is None:
            raise SystemExit('No storefront tenant found; nothing changed.')
        admins = db.query(StaffUser).filter(
            StaffUser.tenant_id == tenant.id, StaffUser.role == 'admin'
        ).all()
        if len(admins) != 1:
            raise SystemExit('Expected exactly one storefront admin; nothing changed.')
        admin = admins[0]
        admin.email = email
        admin.hashed_password = hash_password(password)
        admin.reset_token = None
        admin.reset_token_expires_at = None
        db.commit()
        db.refresh(admin)
        assert verify_password(password, admin.hashed_password)
        print(f'Updated admin credentials for {email}.')


if __name__ == '__main__':
    main()
