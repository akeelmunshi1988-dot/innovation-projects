-- One-time content sync: showcase_videos + workshop_photos
-- Generated from local dev DB. Safe to run more than once (upserts by natural key).
-- Usage on server:
--   sqlite3 /var/www/loomcraft/innovation-projects/backend/rug_manufacture.db < sync_showcase_and_workshop_content.sql
-- Run this AFTER the file sync (Phase 5) has copied backend/static/showcase and backend/static/workshop.

-- ── Showcase Videos ──────────────────────────────────────────────

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Threading the Loom', 'Warp threads set by hand before a single knot is tied', '/static/showcase/rug-weaving-thread-loom.mp4', '/static/showcase/rug-weaving-thread-loom-poster.jpg', 1, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/rug-weaving-thread-loom.mp4');
UPDATE showcase_videos SET title = 'Threading the Loom', description = 'Warp threads set by hand before a single knot is tied', poster_url = '/static/showcase/rug-weaving-thread-loom-poster.jpg', sort_order = 1, is_active = 0, is_intro = 0 WHERE video_url = '/static/showcase/rug-weaving-thread-loom.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Hand-Knotted, Thread by Thread', 'Traditional knotting technique passed down through generations', '/static/showcase/rug-traditional-loom-hands.mp4', '/static/showcase/rug-traditional-loom-hands-poster.jpg', 2, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/rug-traditional-loom-hands.mp4');
UPDATE showcase_videos SET title = 'Hand-Knotted, Thread by Thread', description = 'Traditional knotting technique passed down through generations', poster_url = '/static/showcase/rug-traditional-loom-hands-poster.jpg', sort_order = 2, is_active = 0, is_intro = 0 WHERE video_url = '/static/showcase/rug-traditional-loom-hands.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'The Finer Details', 'Close-up craftsmanship on every pass of the shuttle', '/static/showcase/rug-tapestry-loom-closeup.mp4', '/static/showcase/rug-tapestry-loom-closeup-poster.jpg', 3, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/rug-tapestry-loom-closeup.mp4');
UPDATE showcase_videos SET title = 'The Finer Details', description = 'Close-up craftsmanship on every pass of the shuttle', poster_url = '/static/showcase/rug-tapestry-loom-closeup-poster.jpg', sort_order = 3, is_active = 0, is_intro = 0 WHERE video_url = '/static/showcase/rug-tapestry-loom-closeup.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Hand Work', NULL, '/static/showcase/b4c2f40694dd41c3bfc3ebabf6135f34.mp4', '/static/showcase/b4c2f40694dd41c3bfc3ebabf6135f34-poster.jpg', 0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/b4c2f40694dd41c3bfc3ebabf6135f34.mp4');
UPDATE showcase_videos SET title = 'Hand Work', description = NULL, poster_url = '/static/showcase/b4c2f40694dd41c3bfc3ebabf6135f34-poster.jpg', sort_order = 0, is_active = 1, is_intro = 1 WHERE video_url = '/static/showcase/b4c2f40694dd41c3bfc3ebabf6135f34.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Final Product', 'final product', '/static/showcase/39b85216179e41f9accb324435fb1cc6.mp4', '/static/showcase/39b85216179e41f9accb324435fb1cc6-poster.jpg', 1, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/39b85216179e41f9accb324435fb1cc6.mp4');
UPDATE showcase_videos SET title = 'Final Product', description = 'final product', poster_url = '/static/showcase/39b85216179e41f9accb324435fb1cc6-poster.jpg', sort_order = 1, is_active = 1, is_intro = 1 WHERE video_url = '/static/showcase/39b85216179e41f9accb324435fb1cc6.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Hand-Knotting', 'Hand-Knotting', '/static/showcase/564823fe71bb4c57b99780e90bd44957.mp4', '/static/showcase/d2c3761daa6a44088df35c2da2929d9a-poster.jpg', 0, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/564823fe71bb4c57b99780e90bd44957.mp4');
UPDATE showcase_videos SET title = 'Hand-Knotting', description = 'Hand-Knotting', poster_url = '/static/showcase/d2c3761daa6a44088df35c2da2929d9a-poster.jpg', sort_order = 0, is_active = 1, is_intro = 0 WHERE video_url = '/static/showcase/564823fe71bb4c57b99780e90bd44957.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Finishing', 'Finishing', '/static/showcase/a4f874041d074ce28214f10396744e7f.mp4', '/static/showcase/f6039096952a4f51bd4984434ab9928b-poster.jpg', 0, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/a4f874041d074ce28214f10396744e7f.mp4');
UPDATE showcase_videos SET title = 'Finishing', description = 'Finishing', poster_url = '/static/showcase/f6039096952a4f51bd4984434ab9928b-poster.jpg', sort_order = 0, is_active = 1, is_intro = 0 WHERE video_url = '/static/showcase/a4f874041d074ce28214f10396744e7f.mp4';

INSERT INTO showcase_videos (tenant_id, title, description, video_url, poster_url, sort_order, is_active, is_intro)
SELECT (SELECT id FROM tenants LIMIT 1), 'Rugs Washing', 'Rugs Washing', '/static/showcase/166a7cf428c945f192545fcb1ad1cd99.mp4', '/static/showcase/29870766c5894a6c9cab3910fe321117-poster.jpg', 2, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM showcase_videos WHERE video_url = '/static/showcase/166a7cf428c945f192545fcb1ad1cd99.mp4');
UPDATE showcase_videos SET title = 'Rugs Washing', description = 'Rugs Washing', poster_url = '/static/showcase/29870766c5894a6c9cab3910fe321117-poster.jpg', sort_order = 2, is_active = 1, is_intro = 0 WHERE video_url = '/static/showcase/166a7cf428c945f192545fcb1ad1cd99.mp4';

-- ── Workshop Photos ──────────────────────────────────────────────

INSERT INTO workshop_photos (tenant_id, caption, description, image_url, sort_order, is_active)
SELECT (SELECT id FROM tenants LIMIT 1), 'Raw Fibre, Ready for the Loom', 'Bundles of raw fibre rest on the warp threads before weaving begins.', '/static/workshop/workshop-raw-fibre-loom.jpg', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM workshop_photos WHERE image_url = '/static/workshop/workshop-raw-fibre-loom.jpg');
UPDATE workshop_photos SET caption = 'Raw Fibre, Ready for the Loom', description = 'Bundles of raw fibre rest on the warp threads before weaving begins.', sort_order = 0, is_active = 1 WHERE image_url = '/static/workshop/workshop-raw-fibre-loom.jpg';

INSERT INTO workshop_photos (tenant_id, caption, description, image_url, sort_order, is_active)
SELECT (SELECT id FROM tenants LIMIT 1), 'Warping the Loom', 'Every warp thread set by hand on our outdoor looms before a single knot is tied.', '/static/workshop/workshop-warping-the-loom.jpg', 1, 1
WHERE NOT EXISTS (SELECT 1 FROM workshop_photos WHERE image_url = '/static/workshop/workshop-warping-the-loom.jpg');
UPDATE workshop_photos SET caption = 'Warping the Loom', description = 'Every warp thread set by hand on our outdoor looms before a single knot is tied.', sort_order = 1, is_active = 1 WHERE image_url = '/static/workshop/workshop-warping-the-loom.jpg';

INSERT INTO workshop_photos (tenant_id, caption, description, image_url, sort_order, is_active)
SELECT (SELECT id FROM tenants LIMIT 1), 'Hand-Weaving', 'Our weavers work thread by thread, the same way this craft has been passed down for generations.', '/static/workshop/workshop-hand-weaving.jpg', 2, 1
WHERE NOT EXISTS (SELECT 1 FROM workshop_photos WHERE image_url = '/static/workshop/workshop-hand-weaving.jpg');
UPDATE workshop_photos SET caption = 'Hand-Weaving', description = 'Our weavers work thread by thread, the same way this craft has been passed down for generations.', sort_order = 2, is_active = 1 WHERE image_url = '/static/workshop/workshop-hand-weaving.jpg';

INSERT INTO workshop_photos (tenant_id, caption, description, image_url, sort_order, is_active)
SELECT (SELECT id FROM tenants LIMIT 1), 'Hand-Knotted, Thread by Thread', 'Each knot trimmed and shaped by hand for a flawless, even pile.', '/static/workshop/workshop-hand-knotting-detail.jpg', 3, 1
WHERE NOT EXISTS (SELECT 1 FROM workshop_photos WHERE image_url = '/static/workshop/workshop-hand-knotting-detail.jpg');
UPDATE workshop_photos SET caption = 'Hand-Knotted, Thread by Thread', description = 'Each knot trimmed and shaped by hand for a flawless, even pile.', sort_order = 3, is_active = 1 WHERE image_url = '/static/workshop/workshop-hand-knotting-detail.jpg';

INSERT INTO workshop_photos (tenant_id, caption, description, image_url, sort_order, is_active)
SELECT (SELECT id FROM tenants LIMIT 1), 'Braided by Hand', 'Natural fibre rope coiled and braided into pattern, one loop at a time.', '/static/workshop/workshop-braiding-by-hand.jpg', 4, 1
WHERE NOT EXISTS (SELECT 1 FROM workshop_photos WHERE image_url = '/static/workshop/workshop-braiding-by-hand.jpg');
UPDATE workshop_photos SET caption = 'Braided by Hand', description = 'Natural fibre rope coiled and braided into pattern, one loop at a time.', sort_order = 4, is_active = 1 WHERE image_url = '/static/workshop/workshop-braiding-by-hand.jpg';

INSERT INTO workshop_photos (tenant_id, caption, description, image_url, sort_order, is_active)
SELECT (SELECT id FROM tenants LIMIT 1), 'The Finished Piece', 'Every rug inspected by hand before it ships to you.', '/static/workshop/087b47494cc84953bc275b7f951d0216.jpg', 5, 1
WHERE NOT EXISTS (SELECT 1 FROM workshop_photos WHERE image_url = '/static/workshop/087b47494cc84953bc275b7f951d0216.jpg');
UPDATE workshop_photos SET caption = 'The Finished Piece', description = 'Every rug inspected by hand before it ships to you.', sort_order = 5, is_active = 1 WHERE image_url = '/static/workshop/087b47494cc84953bc275b7f951d0216.jpg';
