"""Run: backend/venv/bin/python -m unittest discover -s backend/tests -p test_gallery.py."""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.routes.gallery import router, update_gallery_item
from app.core.auth import get_current_user
from app.core.database import Base, get_db
from app.models.models import Tenant, ProjectGalleryItem, ProjectGalleryImage
from app.schemas.schemas import ProjectGalleryItemUpdate


class GalleryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            'sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.session.add(Tenant(id=1, name='Test', slug='test'))
        self.session.add(ProjectGalleryItem(id=1, tenant_id=1, image_url='/cover.jpg'))
        self.session.flush()
        self.session.add_all([
            ProjectGalleryImage(id=i, project_gallery_item_id=1, image_url=f'/{i}.jpg')
            for i in (5, 6, 7)
        ])
        self.session.commit()
        self.user = SimpleNamespace(tenant_id=1)
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.session
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        self.session.close()
        self.engine.dispose()

    def assert_images_preserved(self):
        self.session.expire_all()
        images = self.session.query(ProjectGalleryImage).order_by(ProjectGalleryImage.id).all()
        self.assertEqual([(i.id, i.project_gallery_item_id) for i in images], [(5, 1), (6, 1), (7, 1)])
        self.assertEqual(self.session.get(ProjectGalleryItem, 1).caption, 'Updated')

    def test_parent_request_preserves_images(self):
        response = self.client.put('/gallery-items/1', json={'caption': 'Updated', 'images': []})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(response.json()['images']), 3)
        self.assert_images_preserved()

    def test_update_guard_preserves_images_if_schema_exposes_relationship(self):
        # Exercise the endpoint guard independently of today's extra-field filtering.
        class UpdateWithImages(ProjectGalleryItemUpdate):
            images: list = []

        update_gallery_item(
            1, UpdateWithImages(caption='Updated', images=[]), self.session, self.user,
        )
        self.assert_images_preserved()

    def test_dedicated_image_endpoints(self):
        response = self.client.post('/gallery-items/1/images', json={'image_url': '/new.jpg', 'sort_order': 4})
        self.assertEqual(response.status_code, 200, response.text)
        image_id = response.json()['id']
        self.assertEqual(self.session.get(ProjectGalleryImage, image_id).project_gallery_item_id, 1)
        response = self.client.patch(f'/gallery-items/images/{image_id}', json={'sort_order': 2})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['sort_order'], 2)
        self.assertEqual(self.client.delete(f'/gallery-items/images/{image_id}').status_code, 200)
        self.session.expire_all()
        self.assertIsNone(self.session.get(ProjectGalleryImage, image_id))
        self.assertEqual(self.session.query(ProjectGalleryImage).count(), 3)
