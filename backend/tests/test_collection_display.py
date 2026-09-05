"""Run: backend/venv/bin/python -m unittest discover -s backend/tests."""
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
from app.core.database import Base, get_db
from app.core.auth import get_current_user
from app.models.models import Tenant, CollectionDisplay, WeaveTypeMaster
from app.api.routes.collection_display import router


class CollectionDisplayTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.session.add_all([Tenant(id=1, name='First', slug='first'), Tenant(id=2, name='Second', slug='second')])
        self.session.commit()
        self.user = SimpleNamespace(tenant_id=1)
        app = FastAPI()
        app.include_router(router, prefix='/api')
        app.dependency_overrides[get_db] = lambda: self.session
        app.dependency_overrides[get_current_user] = lambda: self.user
        self.client = TestClient(app)
        self.body = {'enabled': True, 'images': [{'image_url': f'/static/rugs/{i}.jpg', 'caption': f'Photo {i}'} for i in range(3)]}

    def tearDown(self):
        self.client.close()
        self.session.close()
        self.engine.dispose()

    def save(self, category='material/wool', body=None):
        return self.client.put('/api/catalog-display', params={'category': category}, json=body or self.body)

    def test_save_is_tenant_scoped_and_public_uses_storefront_tenant(self):
        self.assertEqual(self.save().status_code, 200)
        self.assertEqual(self.session.query(CollectionDisplay).one().tenant_id, 1)
        self.user.tenant_id = 2
        self.assertFalse(self.client.get('/api/catalog-display?category=material/wool').json()['enabled'])
        second = dict(self.body, images=[{'image_url': '/static/rugs/second.jpg'}] * 3)
        self.assertEqual(self.save(body=second).status_code, 200)
        public = self.client.get('/api/customer/catalog-display?category=material/wool').json()
        self.assertEqual(public, self.body)
        self.assertEqual(self.session.query(CollectionDisplay).count(), 2)

    def test_validation_and_disabled_drafts(self):
        self.assertEqual(self.save(category='made-up/category').status_code, 422)
        for images in [[], self.body['images'][:2], self.body['images'] * 2, [{'image_url': 'javascript:alert(1)'}] * 3]:
            self.assertEqual(self.save(body={'enabled': True, 'images': images}).status_code, 422)
        draft = {'enabled': False, 'images': [{'image_url': '', 'caption': ''}] * 3}
        self.assertEqual(self.save(body=draft).status_code, 200)
        self.assertTrue(self.client.get('/api/customer/catalog-display?category=material/wool').json()['enabled'])

    def test_update_disable_and_category_independence(self):
        self.save()
        self.save(body=dict(self.body, enabled=False))
        self.assertEqual(self.session.query(CollectionDisplay).count(), 1)
        self.assertTrue(self.client.get('/api/customer/catalog-display?category=material/wool').json()['enabled'])
        self.save(category='default')
        self.assertTrue(self.client.get('/api/customer/catalog-display?category=space/bedroom').json()['enabled'])

    def test_categories_include_only_own_custom_weaves(self):
        self.session.add_all([WeaveTypeMaster(tenant_id=1, name='custom-weave'), WeaveTypeMaster(tenant_id=2, name='private-weave')])
        self.session.commit()
        categories = self.client.get('/api/catalog-display-categories').json()
        keys = [category['key'] for category in categories]
        self.assertEqual(keys[0], 'default')
        self.assertIn('weave/custom-weave', keys)
        self.assertNotIn('weave/private-weave', keys)

    def test_partial_default_images_appear_on_collection_pages(self):
        partial = {'enabled': False, 'images': [
            {'image_url': '/static/rugs/left.jpg', 'caption': 'Left'},
            {'image_url': '/static/rugs/centre.jpg', 'caption': 'Centre'},
            {'image_url': '', 'caption': ''},
        ]}
        # Reproduce a draft saved by the previous UI, which disabled the grid.
        self.session.add(CollectionDisplay(tenant_id=1, category='default', enabled=False, images=partial['images']))
        self.session.commit()
        public = self.client.get('/api/customer/catalog-display?category=material/wool').json()
        self.assertTrue(public['enabled'])
        self.assertEqual(public['images'][:2], partial['images'][:2])
        self.assertTrue(public['images'][2]['image_url'])
        override = dict(partial, images=[{'image_url': '/static/rugs/wool.jpg', 'caption': 'Wool'}, {'image_url': ''}, {'image_url': ''}])
        self.assertEqual(self.save(body=override).status_code, 200)
        public = self.client.get('/api/customer/catalog-display?category=material/wool').json()
        self.assertEqual(public['images'][0]['image_url'], '/static/rugs/wool.jpg')
        self.assertEqual(public['images'][1]['image_url'], '/static/rugs/centre.jpg')

    def test_bulk_save_is_atomic_and_tenant_scoped(self):
        body = dict(self.body, categories=['material/wool', 'mood/bohemian', 'weave/hand-knotted'])
        result = self.client.put('/api/catalog-displays', json=body)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.session.query(CollectionDisplay).count(), 3)
        self.assertTrue(all(row.tenant_id == 1 for row in self.session.query(CollectionDisplay)))
        invalid = dict(body, categories=['default', 'invalid/category'])
        self.assertEqual(self.client.put('/api/catalog-displays', json=invalid).status_code, 422)
        self.assertEqual(self.session.query(CollectionDisplay).count(), 3)
        self.user.tenant_id = 2
        self.assertEqual(self.client.put('/api/catalog-displays', json=body).status_code, 200)
        self.assertEqual(self.session.query(CollectionDisplay).count(), 6)

    def test_admin_requires_authentication(self):
        del self.client.app.dependency_overrides[get_current_user]
        self.assertIn(self.save().status_code, [401, 403])


if __name__ == '__main__':
    unittest.main()
