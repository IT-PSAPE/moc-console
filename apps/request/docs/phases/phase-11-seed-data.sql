-- ============================================================
-- Seed Data Script
-- Requires: Phases 1-5 executed (enums, base tables, seeds,
--           operational tables, event system, checklist system)
--
-- Run with: psql $DATABASE_URL -f docs/phases/phase-11-seed-data.sql
-- Or paste into the Supabase SQL Editor.
--
-- Uses ON CONFLICT DO NOTHING so it is safe to re-run.
-- ============================================================

BEGIN;

-- ============================================================
-- Phase 1: Media (12 rows)
-- ============================================================

INSERT INTO public.media (id, workspace_id, name, type, url, thumbnail_url, created_at) VALUES
  ('8786e303-5e8d-45c9-a32f-5ae0fcf33820', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Welcome', 'image', 'https://picsum.photos/id/1018/1280/720.jpg', 'https://picsum.photos/id/1018/400/225.jpg', '2026-03-10'),
  ('7d547e0f-0764-46a9-9d17-3f04d828c3d3', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Worship Background - Mountains', 'image', 'https://picsum.photos/id/1015/1280/720.jpg', 'https://picsum.photos/id/1015/400/225.jpg', '2026-03-12'),
  ('82e35c1f-ed72-479d-994c-6702c451bc70', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Announcements Background', 'image', 'https://picsum.photos/id/1039/1280/720.jpg', 'https://picsum.photos/id/1039/400/225.jpg', '2026-03-15'),
  ('1d044fe4-cf16-4e23-b0c8-b2557f885969', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Offering Background', 'image', 'https://picsum.photos/id/1018/1280/720.jpg', 'https://picsum.photos/id/1018/400/225.jpg', '2026-03-18'),
  ('2ff898e9-c2fd-4aa7-bc00-35e5b9baea47', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Closing Benediction Background', 'image', 'https://picsum.photos/id/1015/1280/720.jpg', 'https://picsum.photos/id/1015/400/225.jpg', '2026-04-02'),
  ('830c70a5-ee0e-4a97-a1f1-d21deb80fd1a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Worship Instrumental - Piano', 'audio', 'https://samplelib.com/mp3/sample-6s.mp3', NULL, '2026-03-08'),
  ('241f216e-7c54-4b4e-a15d-eea67c7c3f2a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Ambient Pad - Key of G', 'audio', 'https://samplelib.com/mp3/sample-12s.mp3', NULL, '2026-03-11'),
  ('0eef7e97-39c6-4015-accb-9ac7574305e8', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Pre-Service Background Music', 'audio', 'https://samplelib.com/mp3/sample-15s.mp3', NULL, '2026-03-30'),
  ('daf07e76-08de-4611-9264-039d46414d7b', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Countdown Timer - 5 Min', 'video', 'https://samplelib.com/mp4/sample-5s.mp4', 'https://picsum.photos/id/1018/400/225.jpg', '2026-03-05'),
  ('6811b3a8-a779-450a-ad16-1237835f95b2', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Welcome Loop Video', 'video', 'https://samplelib.com/mp4/sample-10s.mp4', 'https://picsum.photos/id/1015/400/225.jpg', '2026-03-14'),
  ('3169c450-24e6-405a-bd32-dda3f5b510af', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Easter Promo Video', 'video', 'https://samplelib.com/mp4/sample-20s.mp4', 'https://picsum.photos/id/1039/400/225.jpg', '2026-03-20'),
  ('77b667d2-5008-44df-999d-978468bc272d', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sermon Recap - Week 12', 'video', 'https://samplelib.com/mp4/sample-30s.mp4', 'https://picsum.photos/id/1018/400/225.jpg', '2026-03-25')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 2: Requests (8 rows)
-- ============================================================

INSERT INTO public.requests (id, workspace_id, title, priority, status, category, created_at, updated_at, requested_by, due_date, who, what, when_text, where_text, why, how, notes, flow, content) VALUES
  ('1367a685-ec8c-459e-a353-baeac42dc23c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Easter service recap video', 'urgent', 'in_progress', 'video_production', '2026-04-01T08:15:00Z', '2026-04-10T15:40:00Z', 'Lead Pastor', '2026-04-09T14:00:00Z', 'Communications team and Sunday congregation', 'Produce a short recap video from Easter Sunday coverage', 'Before the post-Easter social push', 'Main auditorium and social channels', 'Extend reach of the Easter event and support follow-up engagement', 'Edit multicam footage into a 60 to 90 second social-first cut', 'Prioritize crowd reactions, worship highlights, and sermon close.', 'Open with atmosphere, move into worship energy, end with call-to-action.', 'Deliver a polished recap with captions for Instagram, YouTube, and internal presentation use.'),
  ('eb6f44f6-ae42-490b-a006-f23ff59d1cf6', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth night promo graphics', 'high', 'not_started', 'graphic_design', '2026-04-02T09:20:00Z', '2026-04-08T11:00:00Z', 'Youth Department', '2026-04-14T10:00:00Z', 'Youth leaders and teenagers', 'Create social promo graphics and announcement slide set', 'Ahead of Friday youth night launch', 'Instagram stories, WhatsApp groups, and in-service screens', 'Drive attendance and give the event a clear visual identity', 'Reuse the existing youth palette with bold copy and square plus story crops', 'Need one static hero slide and three social cutdowns.', NULL, NULL),
  ('347db73a-15e1-4469-b682-af7408777fef', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Midweek Bible study livestream package', 'medium', 'completed', 'event', '2026-03-28T13:10:00Z', '2026-04-07T18:30:00Z', 'Teaching Pastor', '2026-04-07T16:00:00Z', 'Online congregation', 'Prepare lower thirds, stream slate, and livestream support notes', 'For the April 7 midweek session', 'Livestream output and confidence monitors', 'Keep the midweek teaching stream operationally consistent', 'Use standard stream templates and event run sheet', NULL, NULL, 'Package already delivered and used in the live session.'),
  ('b1e2315f-919d-47ec-acd9-9facbca9bc4c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Volunteer training handout redesign', 'medium', 'in_progress', 'education', '2026-04-03T07:45:00Z', '2026-04-11T09:15:00Z', 'Operations Coordinator', '2026-04-18T08:00:00Z', 'Front-of-house volunteers', 'Refresh the onboarding handout for new volunteer intake', 'Before the next volunteer orientation', 'Print handout and PDF distribution', 'Improve clarity and reduce repetitive onboarding questions', 'Simplify copy, add icons, and break the content into short sections', 'Keep the final file printable in grayscale.', NULL, NULL),
  ('c6dd535e-d12e-4b3f-8766-534c5e4a7836', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Conference interview shoot plan', 'high', 'not_started', 'video_shooting', '2026-04-04T10:30:00Z', '2026-04-04T10:30:00Z', 'Events Team', '2026-04-16T06:30:00Z', 'Conference speakers and media team', 'Plan and capture interview pickups during the conference', 'Across the two main conference days', 'Green room and lobby interview corner', 'Gather post-event testimonial content for recap and next-year promotion', 'Two-camera interview setup with lightweight lighting and audio kit', NULL, 'Speaker arrivals, short interview windows, same-day media backup.', NULL),
  ('581b8731-2eee-45b7-893f-b4240228f768', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday announcement lower thirds refresh', 'low', 'completed', 'graphic_design', '2026-03-30T12:00:00Z', '2026-04-05T08:50:00Z', 'Production Director', '2026-04-05T07:30:00Z', 'In-service audience and stream viewers', 'Refresh the lower-third graphics for weekly announcements', 'Before the April 5 service', 'LED screens and stream graphics output', 'Align lower thirds with the updated event visual language', 'Adjust template spacing, typography, and event color accents', NULL, NULL, NULL),
  ('55efb96b-5165-4e84-b9d0-7311fcdfd281', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'School outreach mini-doc', 'high', 'archived', 'video_production', '2026-03-12T08:00:00Z', '2026-04-01T12:25:00Z', 'Community Outreach', '2026-03-28T15:00:00Z', 'Outreach partners and donor audience', 'Produce a short documentary-style outreach story', 'For the March reporting cycle', 'Partner school and donor presentation deck', 'Showcase community impact with a stronger story package', 'Combine interview footage, classroom b-roll, and supers', NULL, NULL, 'Completed, approved, and archived after delivery.'),
  ('27eeade7-576e-4051-96dd-75b6806b79fd', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Women''s breakfast photo coverage', 'medium', 'not_started', 'event', '2026-04-06T14:10:00Z', '2026-04-06T14:10:00Z', 'Women''s Ministry', '2026-04-20T05:30:00Z', 'Women''s ministry attendees and internal comms team', 'Cover the breakfast event with photo selects for recap use', 'On event morning', 'Church foyer and hall', 'Provide same-week recap content and ministry archives', 'Photo-first coverage with a shortlist delivered by end of day', 'Need at least 20 usable selects plus 5 hero images.', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 3: Equipment (25 rows)
-- ============================================================

INSERT INTO public.equipment (id, workspace_id, name, serial_number, category, status, location, notes, last_active_on, thumbnail_url) VALUES
  ('26de9c97-cb04-4dc0-a03b-98db12eea23f', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sony A7S III', 'SN-CAM-001', 'camera', 'available', 'Studio A', NULL, '2026-03-28', NULL),
  ('856bd409-0785-4c51-bdd8-7b138cad6e04', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Canon C70', 'SN-CAM-002', 'camera', 'booked_out', 'Field', NULL, '2026-04-01', NULL),
  ('cc62c97f-4039-41ed-880a-85b8529a2479', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Blackmagic URSA Mini Pro 12K', 'SN-CAM-003', 'camera', 'booked', 'Storage Room B', NULL, '2026-04-03', NULL),
  ('297d46eb-ec6a-443d-8d08-c8147ed88ab7', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sony FX6', 'SN-CAM-004', 'camera', 'booked_out', 'Field', NULL, '2026-04-02', NULL),
  ('71251d3e-0a5a-4ae4-af12-31af03615b0c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Canon R5 C', 'SN-CAM-005', 'camera', 'maintenance', 'Repair Shop', 'Sensor overheating — sent for repair', '2026-03-15', NULL),
  ('54374941-8a59-4f6d-90ee-f4a32e671422', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Canon RF 24-70mm f/2.8L', 'SN-LNS-001', 'lens', 'available', 'Studio A', NULL, '2026-03-25', NULL),
  ('7e048cc6-86e6-4898-9d24-282fc157e0b8', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sony FE 70-200mm f/2.8 GM II', 'SN-LNS-002', 'lens', 'booked_out', 'Field', NULL, '2026-04-01', NULL),
  ('d2c9bf32-e08e-46ad-9aad-3f509e0c4d00', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sigma 18-35mm f/1.8 Art', 'SN-LNS-003', 'lens', 'available', 'Storage Room B', 'Minor scratch on front element', '2026-03-10', NULL),
  ('e8403422-162e-4d30-a246-0e518de6847f', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Aputure 600D Pro', 'SN-LGT-001', 'lighting', 'available', 'Studio A', NULL, '2026-03-30', NULL),
  ('975a6d0f-0edd-421b-bee2-a32b8083af33', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Aputure 300X', 'SN-LGT-002', 'lighting', 'booked_out', 'Field', NULL, '2026-04-02', NULL),
  ('f54df35f-8e05-4a41-9ce2-ff9ee5ca6d17', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Nanlite Forza 500 II', 'SN-LGT-003', 'lighting', 'available', 'Studio B', NULL, '2026-03-22', NULL),
  ('6266630f-c376-4f30-9707-20ef8efa0040', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Godox SL200 III', 'SN-LGT-004', 'lighting', 'maintenance', 'Repair Shop', 'Fan motor failure — awaiting replacement part', '2026-03-18', NULL),
  ('9869b21d-00da-498c-9a88-ced9a44347d1', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sennheiser MKH 416', 'SN-AUD-001', 'audio', 'available', 'Studio A', NULL, '2026-03-27', NULL),
  ('6e53c250-1ce2-4aab-b0f6-1a40ce23c71e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Rode NTG5', 'SN-AUD-002', 'audio', 'booked_out', 'Field', NULL, '2026-04-01', NULL),
  ('ced72c9a-cd08-4aa8-81ef-0ef75fea6422', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Zoom F6 Recorder', 'SN-AUD-003', 'audio', 'booked', 'Storage Room A', NULL, '2026-04-03', NULL),
  ('affa8801-b7dd-4a98-ae16-7f89fca43346', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sennheiser EW 112P G4 Wireless', 'SN-AUD-004', 'audio', 'booked_out', 'Field', NULL, '2026-03-31', NULL),
  ('6b541a99-b678-4dae-bc2d-1f0d7860e55d', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'DJI RS 3 Pro', 'SN-SUP-001', 'support', 'available', 'Storage Room B', NULL, '2026-03-26', NULL),
  ('238dc24a-a89e-4d03-a944-d0628ee44290', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sachtler Ace XL Tripod', 'SN-SUP-002', 'support', 'available', 'Studio A', NULL, '2026-03-19', NULL),
  ('9f72c3db-857a-480d-8aa0-f92b671875d7', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Manfrotto 504X Fluid Head Tripod', 'SN-SUP-003', 'support', 'booked_out', 'Field', NULL, '2026-04-02', NULL),
  ('5f3cba3f-aaed-40d4-9046-53c7a2f088be', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'SmallHD Cine 7', 'SN-MON-001', 'monitor', 'available', 'Studio A', NULL, '2026-03-29', NULL),
  ('8b71cb92-63c8-46e9-ba4b-2a0c8f6ca8b0', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Atomos Ninja V+', 'SN-MON-002', 'monitor', 'maintenance', 'Repair Shop', 'HDMI port loose — needs resoldering', '2026-03-12', NULL),
  ('4ad7f677-e08e-4475-ab29-5e53f33395db', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'SDI Cable 50m', 'SN-CBL-001', 'cable', 'available', 'Storage Room A', NULL, '2026-03-14', NULL),
  ('c59d172d-e017-48a5-810f-ffcb5f880a0a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'HDMI 2.1 Cable 5m', 'SN-CBL-002', 'cable', 'available', 'Storage Room A', NULL, '2026-03-16', NULL),
  ('a15fc4ab-90a9-4119-a081-6103a255c39d', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'V-Mount Battery 150Wh', 'SN-ACC-001', 'accessory', 'available', 'Storage Room B', NULL, '2026-03-21', NULL),
  ('bb018d66-86db-475d-940d-99b5dbbc24dd', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sony NP-FZ100 Battery (x4)', 'SN-ACC-002', 'accessory', 'available', 'Storage Room B', NULL, '2026-02-28', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 4: Bookings (67 rows — depends on equipment)
-- ============================================================

INSERT INTO public.bookings (id, workspace_id, equipment_id, booked_by, checked_out_at, expected_return_at, returned_at, notes, status) VALUES
  -- Active bookings (booked)
  ('b3685ae2-6965-4aaf-9fa6-4e10314e140a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'cc62c97f-4039-41ed-880a-85b8529a2479', 'Kagiso Molefe',   '2026-04-04T00:00:00Z', '2026-04-07T00:00:00Z', NULL, 'Commercial shoot prep', 'booked'),
  ('03d40bda-c314-45d6-aaff-d2e24d87cbb1', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'ced72c9a-cd08-4aa8-81ef-0ef75fea6422', 'Ayanda Nene',     '2026-04-05T00:00:00Z', '2026-04-07T00:00:00Z', NULL, 'Field recording session', 'booked'),
  -- Active bookings (checked_out)
  ('46e3f794-e8ca-4626-9535-6b5d70a09b33', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '856bd409-0785-4c51-bdd8-7b138cad6e04', 'Thabiso Mkhize',  '2026-04-01T00:00:00Z', '2026-04-04T00:00:00Z', NULL, 'Documentary shoot at Newlands', 'checked_out'),
  ('562919c0-46ea-4711-86d0-a00bd84f7a2c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '297d46eb-ec6a-443d-8d08-c8147ed88ab7', 'Naledi Dlamini',  '2026-04-02T00:00:00Z', '2026-04-04T00:00:00Z', NULL, 'Corporate interview', 'checked_out'),
  ('c367338f-4ee6-4e2e-83f6-5986558b7c84', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '7e048cc6-86e6-4898-9d24-282fc157e0b8', 'Thabiso Mkhize',  '2026-04-01T00:00:00Z', '2026-04-04T00:00:00Z', NULL, 'Paired with Canon C70', 'checked_out'),
  ('f3ed3e32-d2d5-449e-b743-14739d01a290', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Sipho Ndaba',     '2026-04-02T00:00:00Z', '2026-04-03T00:00:00Z', NULL, 'Studio B lighting setup', 'checked_out'),
  ('8bb9642b-d9e3-476f-866d-a71537db7a50', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6e53c250-1ce2-4aab-b0f6-1a40ce23c71e', 'Naledi Dlamini',  '2026-04-01T00:00:00Z', '2026-04-03T00:00:00Z', NULL, 'Interview audio', 'checked_out'),
  ('c904acd4-e095-4988-abd0-f0567b53e0bd', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'affa8801-b7dd-4a98-ae16-7f89fca43346', 'Sipho Ndaba',     '2026-03-31T00:00:00Z', '2026-04-03T00:00:00Z', NULL, 'Presenter mic for live event', 'checked_out'),
  ('fa298eea-dbd1-4bb4-9eb1-d88727871a5d', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '9f72c3db-857a-480d-8aa0-f92b671875d7', 'Thabiso Mkhize',  '2026-04-02T00:00:00Z', '2026-04-05T00:00:00Z', NULL, NULL, 'checked_out'),
  -- Returned bookings
  ('5a7bc51c-19a5-4b2a-b242-ed57ef16b696', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '26de9c97-cb04-4dc0-a03b-98db12eea23f', 'Lerato Mokoena',  '2026-03-24T00:00:00Z', '2026-03-28T00:00:00Z', '2026-03-28T00:00:00Z', 'BTS content for social media', 'returned'),
  ('cd946853-3337-43d8-a7b5-7f0b6842c739', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'e8403422-162e-4d30-a246-0e518de6847f', 'Kagiso Molefe',   '2026-03-27T00:00:00Z', '2026-03-30T00:00:00Z', '2026-03-30T00:00:00Z', 'Studio A key light', 'returned'),
  ('1259f924-e0ee-451b-b2a1-94ad94c73e65', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6b541a99-b678-4dae-bc2d-1f0d7860e55d', 'Naledi Dlamini',  '2026-03-22T00:00:00Z', '2026-03-26T00:00:00Z', '2026-03-26T00:00:00Z', 'Gimbal work for music video', 'returned'),
  ('68098053-814c-42de-b18a-d0f465d3c564', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Sipho Ndaba',     '2026-03-25T00:00:00Z', '2026-03-29T00:00:00Z', '2026-03-29T00:00:00Z', 'Director''s monitor', 'returned'),
  ('dbdbbac8-003e-4b14-9c2d-1b08072b4040', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'cc62c97f-4039-41ed-880a-85b8529a2479', 'Thabiso Mkhize',  '2026-03-15T00:00:00Z', '2026-03-20T00:00:00Z', '2026-03-20T00:00:00Z', 'High-res commercial shoot', 'returned'),
  ('a22f820f-0511-4f6f-992b-32da0236e500', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '26de9c97-cb04-4dc0-a03b-98db12eea23f', 'Thando Jacobs',   '2026-02-18T00:00:00Z', '2026-02-20T00:00:00Z', '2026-02-20T00:00:00Z', 'Short-form campaign pickup shots', 'returned'),
  ('999d89f0-fc60-46c4-a646-e01a0577a456', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '26de9c97-cb04-4dc0-a03b-98db12eea23f', 'Kagiso Molefe',   '2026-01-27T00:00:00Z', '2026-01-31T00:00:00Z', '2026-01-31T00:00:00Z', 'Studio B product hero clips', 'returned'),
  ('86fdab0c-5383-4446-a82a-d94f96a3ec19', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '26de9c97-cb04-4dc0-a03b-98db12eea23f', 'Naledi Dlamini',  '2025-12-09T00:00:00Z', '2025-12-12T00:00:00Z', '2025-12-12T00:00:00Z', 'Social launch content', 'returned'),
  ('27c73c20-e2c1-4cfe-bb88-c95e00490128', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '26de9c97-cb04-4dc0-a03b-98db12eea23f', 'Lerato Mokoena',  '2025-10-22T00:00:00Z', '2025-10-26T00:00:00Z', '2025-10-26T00:00:00Z', 'Behind-the-scenes stills and reels', 'returned'),
  ('2d9482b8-65ae-40fc-bd9b-af8aa4e8c22a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '856bd409-0785-4c51-bdd8-7b138cad6e04', 'Sipho Ndaba',     '2026-03-14T00:00:00Z', '2026-03-17T00:00:00Z', '2026-03-17T00:00:00Z', 'Client testimonial interviews', 'returned'),
  ('536cc713-7a35-4463-a29c-09d03369be66', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '856bd409-0785-4c51-bdd8-7b138cad6e04', 'Naledi Dlamini',  '2026-02-03T00:00:00Z', '2026-02-07T00:00:00Z', '2026-02-07T00:00:00Z', 'Retail launch recap', 'returned'),
  ('a155eafd-c2cb-4bcd-8f94-64065b41ff1e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '856bd409-0785-4c51-bdd8-7b138cad6e04', 'Thabiso Mkhize',  '2025-12-01T00:00:00Z', '2025-12-05T00:00:00Z', '2025-12-05T00:00:00Z', 'Documentary pickup interviews', 'returned'),
  ('6e28eecd-b795-4541-bfa1-2258182ebdcb', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '856bd409-0785-4c51-bdd8-7b138cad6e04', 'Ayanda Nene',     '2025-09-18T00:00:00Z', '2025-09-21T00:00:00Z', '2025-09-21T00:00:00Z', 'School outreach mini-doc', 'returned'),
  ('03e51799-d90d-42e2-bdca-bf8efdcd3fe6', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'cc62c97f-4039-41ed-880a-85b8529a2479', 'Kagiso Molefe',   '2026-02-10T00:00:00Z', '2026-02-14T00:00:00Z', '2026-02-14T00:00:00Z', 'Luxury auto campaign plates', 'returned'),
  ('44cbeab9-48d6-471e-babc-9d9cb13f40fe', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'cc62c97f-4039-41ed-880a-85b8529a2479', 'Lerato Mokoena',  '2025-11-11T00:00:00Z', '2025-11-16T00:00:00Z', '2025-11-16T00:00:00Z', 'High-res greenscreen capture', 'returned'),
  ('7ea4d6b5-fac9-4e27-98b3-75f577846c10', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'cc62c97f-4039-41ed-880a-85b8529a2479', 'Sipho Ndaba',     '2025-08-20T00:00:00Z', '2025-08-24T00:00:00Z', '2025-08-24T00:00:00Z', 'Studio product motion control shoot', 'returned'),
  ('1481e75d-ebc5-4eef-8c1c-b9e017312e7e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '297d46eb-ec6a-443d-8d08-c8147ed88ab7', 'Lerato Mokoena',  '2026-03-05T00:00:00Z', '2026-03-09T00:00:00Z', '2026-03-09T00:00:00Z', 'Night exterior test shoot', 'returned'),
  ('1f1fd687-65d1-45b0-b424-fb69199ae9fb', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '297d46eb-ec6a-443d-8d08-c8147ed88ab7', 'Ayanda Nene',     '2025-12-15T00:00:00Z', '2025-12-18T00:00:00Z', '2025-12-18T00:00:00Z', 'Event recap coverage', 'returned'),
  ('97a90a1b-11bb-4014-9743-3a9d48e1d4b0', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '297d46eb-ec6a-443d-8d08-c8147ed88ab7', 'Thabiso Mkhize',  '2025-10-07T00:00:00Z', '2025-10-10T00:00:00Z', '2025-10-10T00:00:00Z', 'Run-and-gun branded content', 'returned'),
  ('ab005762-2fe0-4ef6-9790-3501d34ddb85', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '7e048cc6-86e6-4898-9d24-282fc157e0b8', 'Sipho Ndaba',     '2026-03-14T00:00:00Z', '2026-03-17T00:00:00Z', '2026-03-17T00:00:00Z', 'Sports portrait session', 'returned'),
  ('49d8acfc-a6a9-4d36-8902-02b54dbe1378', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '7e048cc6-86e6-4898-9d24-282fc157e0b8', 'Naledi Dlamini',  '2026-02-19T00:00:00Z', '2026-02-22T00:00:00Z', '2026-02-22T00:00:00Z', 'Conference stage coverage', 'returned'),
  ('98c4f7a0-c112-48fe-9f8e-4fbd46889deb', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '7e048cc6-86e6-4898-9d24-282fc157e0b8', 'Kagiso Molefe',   '2026-01-12T00:00:00Z', '2026-01-16T00:00:00Z', '2026-01-16T00:00:00Z', 'Telephoto inserts for automotive spot', 'returned'),
  ('0abcc893-5f4f-4280-b7e6-ce4074fdd9f5', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '7e048cc6-86e6-4898-9d24-282fc157e0b8', 'Thando Jacobs',   '2025-11-03T00:00:00Z', '2025-11-05T00:00:00Z', '2025-11-05T00:00:00Z', 'Live performance coverage', 'returned'),
  ('04efe5a0-029e-4ef2-8eb5-fcba874aabc7', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '7e048cc6-86e6-4898-9d24-282fc157e0b8', 'Lerato Mokoena',  '2025-09-24T00:00:00Z', '2025-09-27T00:00:00Z', '2025-09-27T00:00:00Z', 'Wildlife b-roll day trip', 'returned'),
  ('c42e3c12-1ffe-4d35-b3cd-da3a2a452a3e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'e8403422-162e-4d30-a246-0e518de6847f', 'Ayanda Nene',     '2026-02-24T00:00:00Z', '2026-02-26T00:00:00Z', '2026-02-26T00:00:00Z', 'Key light for CEO portrait setup', 'returned'),
  ('d16710a7-d801-43a5-a240-5f412ba015fa', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'e8403422-162e-4d30-a246-0e518de6847f', 'Sipho Ndaba',     '2026-01-21T00:00:00Z', '2026-01-24T00:00:00Z', '2026-01-24T00:00:00Z', 'Studio cyc wall lighting', 'returned'),
  ('6987e31b-4609-467d-a48a-63a4365f7ce9', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'e8403422-162e-4d30-a246-0e518de6847f', 'Kagiso Molefe',   '2025-11-27T00:00:00Z', '2025-11-30T00:00:00Z', '2025-11-30T00:00:00Z', 'Fashion editorial key light', 'returned'),
  ('1f3eec14-939b-4eec-b1b0-00446e395e73', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'e8403422-162e-4d30-a246-0e518de6847f', 'Thabiso Mkhize',  '2025-10-14T00:00:00Z', '2025-10-18T00:00:00Z', '2025-10-18T00:00:00Z', 'Warehouse interview lighting package', 'returned'),
  ('37706b09-4311-498a-b143-1c09ae8c9409', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Kagiso Molefe',   '2026-03-20T00:00:00Z', '2026-03-21T00:00:00Z', '2026-03-21T00:00:00Z', 'Accent light for tabletop shoot', 'returned'),
  ('5408aafb-44f4-44eb-8170-59d054fe4d93', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Lerato Mokoena',  '2026-03-01T00:00:00Z', '2026-03-03T00:00:00Z', '2026-03-03T00:00:00Z', 'Hair light for interview kit', 'returned'),
  ('f124491a-7bf4-4080-a190-3ca9a310142a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Ayanda Nene',     '2026-02-11T00:00:00Z', '2026-02-12T00:00:00Z', '2026-02-12T00:00:00Z', 'Backlight for food campaign', 'returned'),
  ('00045def-cfcd-4f11-9345-c11e05e6b7af', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Sipho Ndaba',     '2026-01-28T00:00:00Z', '2026-01-30T00:00:00Z', '2026-01-30T00:00:00Z', 'Studio B talking head fill light', 'returned'),
  ('723057ec-d699-4306-81b7-d1211de5ddc2', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Naledi Dlamini',  '2025-12-17T00:00:00Z', '2025-12-20T00:00:00Z', '2025-12-20T00:00:00Z', 'Small crew travel lighting', 'returned'),
  ('477a596d-d4ec-4c46-a7e7-5261313414b5', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Thando Jacobs',   '2025-11-06T00:00:00Z', '2025-11-08T00:00:00Z', '2025-11-08T00:00:00Z', 'Fashion set practical boost', 'returned'),
  ('fa495068-0f3a-4cb7-83de-f5e6ad653ed9', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '975a6d0f-0edd-421b-bee2-a32b8083af33', 'Kagiso Molefe',   '2025-09-09T00:00:00Z', '2025-09-11T00:00:00Z', '2025-09-11T00:00:00Z', 'Secondary interview light', 'returned'),
  ('cc405ab3-5c94-4843-9528-3de70c159771', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6e53c250-1ce2-4aab-b0f6-1a40ce23c71e', 'Thabiso Mkhize',  '2026-03-10T00:00:00Z', '2026-03-12T00:00:00Z', '2026-03-12T00:00:00Z', 'Voice-focused sit-down interview', 'returned'),
  ('bca778b0-b9d5-4e87-8645-25b93dfef47e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6e53c250-1ce2-4aab-b0f6-1a40ce23c71e', 'Ayanda Nene',     '2026-01-15T00:00:00Z', '2026-01-18T00:00:00Z', '2026-01-18T00:00:00Z', 'Short doc ambient dialogue capture', 'returned'),
  ('42994482-dd0d-4dda-afda-e2936c089500', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6e53c250-1ce2-4aab-b0f6-1a40ce23c71e', 'Lerato Mokoena',  '2025-10-28T00:00:00Z', '2025-10-31T00:00:00Z', '2025-10-31T00:00:00Z', 'Podcast video backup boom', 'returned'),
  ('fd5b97ef-8810-4e3e-846b-c94c0216603b', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'affa8801-b7dd-4a98-ae16-7f89fca43346', 'Naledi Dlamini',  '2026-03-02T00:00:00Z', '2026-03-05T00:00:00Z', '2026-03-05T00:00:00Z', 'Presenter wireless kit', 'returned'),
  ('47580f68-f6e2-496a-8d4f-dcfc8f5c262f', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'affa8801-b7dd-4a98-ae16-7f89fca43346', 'Kagiso Molefe',   '2026-02-06T00:00:00Z', '2026-02-09T00:00:00Z', '2026-02-09T00:00:00Z', 'Conference panel lav setup', 'returned'),
  ('ee22c874-65b8-4e69-b199-0df81dd3141b', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'affa8801-b7dd-4a98-ae16-7f89fca43346', 'Sipho Ndaba',     '2025-12-08T00:00:00Z', '2025-12-10T00:00:00Z', '2025-12-10T00:00:00Z', 'Field presenter package', 'returned'),
  ('20694c5e-9cfa-4fe3-8b62-c9626ce10611', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'affa8801-b7dd-4a98-ae16-7f89fca43346', 'Thando Jacobs',   '2025-09-30T00:00:00Z', '2025-10-02T00:00:00Z', '2025-10-02T00:00:00Z', 'Run-and-gun interview audio', 'returned'),
  ('c6c31edd-79b6-40c0-ad94-fa88c7e13852', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6b541a99-b678-4dae-bc2d-1f0d7860e55d', 'Thabiso Mkhize',  '2026-02-28T00:00:00Z', '2026-03-03T00:00:00Z', '2026-03-03T00:00:00Z', 'Tracking shots for showroom launch', 'returned'),
  ('589def28-561b-45a5-9b3f-3a984e303815', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6b541a99-b678-4dae-bc2d-1f0d7860e55d', 'Lerato Mokoena',  '2026-01-30T00:00:00Z', '2026-02-02T00:00:00Z', '2026-02-02T00:00:00Z', 'Real-estate walkthrough stabilizer', 'returned'),
  ('53f1e1c0-ab4f-49e2-8487-6e48d5510b06', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6b541a99-b678-4dae-bc2d-1f0d7860e55d', 'Kagiso Molefe',   '2025-12-12T00:00:00Z', '2025-12-15T00:00:00Z', '2025-12-15T00:00:00Z', 'Motion-heavy beauty campaign', 'returned'),
  ('dcd12ec4-0d60-4db2-b903-61d8b0b3be4e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6b541a99-b678-4dae-bc2d-1f0d7860e55d', 'Ayanda Nene',     '2025-11-18T00:00:00Z', '2025-11-21T00:00:00Z', '2025-11-21T00:00:00Z', 'Hospitality venue walkthrough', 'returned'),
  ('9e6b3ec2-9feb-4500-8e6c-3fc01813313a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '6b541a99-b678-4dae-bc2d-1f0d7860e55d', 'Sipho Ndaba',     '2025-09-15T00:00:00Z', '2025-09-18T00:00:00Z', '2025-09-18T00:00:00Z', 'Music video motion plates', 'returned'),
  ('4c8f8bd3-f5f5-42de-b456-70a9c92995a7', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '9f72c3db-857a-480d-8aa0-f92b671875d7', 'Naledi Dlamini',  '2026-03-08T00:00:00Z', '2026-03-11T00:00:00Z', '2026-03-11T00:00:00Z', 'Interview lock-offs', 'returned'),
  ('0af01ba2-5590-476e-9ac8-dbea1f3bbe9c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '9f72c3db-857a-480d-8aa0-f92b671875d7', 'Kagiso Molefe',   '2026-02-14T00:00:00Z', '2026-02-17T00:00:00Z', '2026-02-17T00:00:00Z', 'Long lens wildlife support', 'returned'),
  ('33dd920a-9c88-487b-af9c-56196dba6c1f', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '9f72c3db-857a-480d-8aa0-f92b671875d7', 'Thando Jacobs',   '2025-12-02T00:00:00Z', '2025-12-06T00:00:00Z', '2025-12-06T00:00:00Z', 'Studio interview tripod package', 'returned'),
  ('3f1609da-2898-4f97-bf0d-f1821aa742c4', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '9f72c3db-857a-480d-8aa0-f92b671875d7', 'Ayanda Nene',     '2025-10-20T00:00:00Z', '2025-10-23T00:00:00Z', '2025-10-23T00:00:00Z', 'Conference stage camera support', 'returned'),
  ('6c289bdc-a33f-48d0-8467-3e959e0cad7c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '9f72c3db-857a-480d-8aa0-f92b671875d7', 'Sipho Ndaba',     '2025-09-04T00:00:00Z', '2025-09-07T00:00:00Z', '2025-09-07T00:00:00Z', 'Outdoor sit-down interview', 'returned'),
  ('961dd873-fc56-4382-b581-824d18c6c629', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Lerato Mokoena',  '2026-03-02T00:00:00Z', '2026-03-05T00:00:00Z', '2026-03-05T00:00:00Z', 'Director monitoring for fashion set', 'returned'),
  ('b09e0e22-1ce1-47c7-a757-4910a3a45e68', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Thabiso Mkhize',  '2026-02-08T00:00:00Z', '2026-02-11T00:00:00Z', '2026-02-11T00:00:00Z', 'Wireless monitor for multicam interviews', 'returned'),
  ('ce4896fb-0c82-405c-a0c5-9b1c49438b6e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Kagiso Molefe',   '2026-01-17T00:00:00Z', '2026-01-20T00:00:00Z', '2026-01-20T00:00:00Z', 'Outdoor daylight reference monitor', 'returned'),
  ('da7a7662-2f1a-4df5-956d-a0cbe79c907c', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Ayanda Nene',     '2025-12-05T00:00:00Z', '2025-12-08T00:00:00Z', '2025-12-08T00:00:00Z', 'Product demo focus pulling support', 'returned'),
  ('9f74a628-fb4e-4f22-821f-8c30ef3c6686', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Sipho Ndaba',     '2025-11-10T00:00:00Z', '2025-11-13T00:00:00Z', '2025-11-13T00:00:00Z', 'Lighting review monitor', 'returned'),
  ('216ed1de-93de-4f82-8830-ddef8025d335', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Naledi Dlamini',  '2025-10-01T00:00:00Z', '2025-10-04T00:00:00Z', '2025-10-04T00:00:00Z', 'Travel commercial on-set monitoring', 'returned'),
  ('1b7c6b4e-ecf3-436f-8a8b-5a07a35d8998', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), '5f3cba3f-aaed-40d4-9046-53c7a2f088be', 'Thando Jacobs',   '2025-08-26T00:00:00Z', '2025-08-29T00:00:00Z', '2025-08-29T00:00:00Z', 'Music video director monitor', 'returned')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 5: Playlists (5 rows — depends on media)
-- ============================================================

INSERT INTO public.playlists (id, workspace_id, name, description, status, created_at, music_id, default_image_duration) VALUES
  ('43597092-32f8-4b1e-b4ce-dd5a812529ab', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service',        'Main Sunday morning service playlist with worship, announcements, and sermon.', 'published', '2026-03-28', NULL, 10),
  ('e1a30107-c11b-480b-8103-2737587f870a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Easter Sunday Service',  'Special Easter celebration playlist with extended worship and Easter-themed media.', 'published', '2026-03-15', NULL, 10),
  ('05f405e5-925b-40bf-86eb-a8e135f35b7d', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Midweek Prayer',         'Wednesday evening prayer and devotion playlist with ambient backgrounds.', 'draft', '2026-04-01', '241f216e-7c54-4b4e-a15d-eea67c7c3f2a', 15),
  ('c425177a-d1b3-4bab-8b0d-fe4f2d51de7e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth Service',          'Friday youth service playlist with contemporary media.', 'published', '2026-03-18', NULL, 10),
  ('601aa4ed-78b5-4781-9ea9-5901690ed033', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Worship Night',           'Extended worship evening with curated visuals and music.', 'draft', '2026-04-02', '0eef7e97-39c6-4015-accb-9ac7574305e8', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 5b: Queue / cues (13 rows — depends on playlists + media)
-- ============================================================

INSERT INTO public.queue (id, playlist_id, media_id, sort_order, duration, disabled) VALUES
  -- Sunday Service
  ('a63beee4-f499-4ec5-a4a2-420cf50cebb2', '43597092-32f8-4b1e-b4ce-dd5a812529ab', '6811b3a8-a779-450a-ad16-1237835f95b2', 1, NULL,  false),
  ('afa1c1ef-56ab-43ca-97d2-b194b67ef3a4', '43597092-32f8-4b1e-b4ce-dd5a812529ab', '8786e303-5e8d-45c9-a32f-5ae0fcf33820', 2, 15,    false),
  ('3e2227a7-c95c-443a-8292-aaa60eb61e3f', '43597092-32f8-4b1e-b4ce-dd5a812529ab', '1d044fe4-cf16-4e23-b0c8-b2557f885969', 3, 120,   false),
  ('6b3f7544-bc29-4392-b702-7c1f2c56f8d9', '43597092-32f8-4b1e-b4ce-dd5a812529ab', '2ff898e9-c2fd-4aa7-bc00-35e5b9baea47', 4, 30,    false),
  -- Easter Sunday Service
  ('26cc4138-45d0-4490-977c-6fe150800303', 'e1a30107-c11b-480b-8103-2737587f870a', 'daf07e76-08de-4611-9264-039d46414d7b', 1, NULL,  false),
  ('12a840c2-0372-4ab0-9800-2764c661cc3f', 'e1a30107-c11b-480b-8103-2737587f870a', '3169c450-24e6-405a-bd32-dda3f5b510af', 2, NULL,  false),
  ('4cdb3edc-1bac-4229-ae74-c7df950b44f9', 'e1a30107-c11b-480b-8103-2737587f870a', '7d547e0f-0764-46a9-9d17-3f04d828c3d3', 3, 60,    false),
  ('0f0ff890-b599-4f86-9bf3-c871a68c9478', 'e1a30107-c11b-480b-8103-2737587f870a', '1d044fe4-cf16-4e23-b0c8-b2557f885969', 4, 120,   false),
  -- Midweek Prayer
  ('8ee51109-4beb-485d-a0dd-e861524a2602', '05f405e5-925b-40bf-86eb-a8e135f35b7d', '7d547e0f-0764-46a9-9d17-3f04d828c3d3', 1, 30,    false),
  -- Youth Service
  ('e4296bd5-4383-4d4e-9608-494a22bc82e2', 'c425177a-d1b3-4bab-8b0d-fe4f2d51de7e', 'daf07e76-08de-4611-9264-039d46414d7b', 1, NULL,  false),
  ('42446e2b-20b7-45f7-9dd9-7aa5893db1f9', 'c425177a-d1b3-4bab-8b0d-fe4f2d51de7e', '82e35c1f-ed72-479d-994c-6702c451bc70', 2, 20,    false),
  -- Worship Night
  ('51d5bb60-dccf-442f-82da-b80f0b52ea93', '601aa4ed-78b5-4781-9ea9-5901690ed033', '7d547e0f-0764-46a9-9d17-3f04d828c3d3', 1, 60,    false),
  ('3439a795-fca5-4059-a1e0-ac659f66c7a6', '601aa4ed-78b5-4781-9ea9-5901690ed033', '2ff898e9-c2fd-4aa7-bc00-35e5b9baea47', 2, 30,    false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 6: Event Templates (3 rows)
-- ============================================================

INSERT INTO public.event_templates (id, workspace_id, title, description, duration, created_at, updated_at) VALUES
  ('a068944c-130e-436c-862a-1ee185c516a5', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service',          'Standard Sunday morning service template',  120, '2026-03-01T08:00:00Z', '2026-03-28T10:00:00Z'),
  ('f1215a0c-ec38-4e06-8c9f-e608afda758a', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Wednesday Bible Study',    'Midweek Bible study session',               90,  '2026-03-05T08:00:00Z', '2026-03-26T10:00:00Z'),
  ('97239eb8-7a65-4eb7-a4de-85994a38e371', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth Night',              'Friday youth gathering template',            150, '2026-03-10T08:00:00Z', '2026-03-30T10:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 6b: Template Tracks (7 rows — depends on event_templates + colors)
-- ============================================================

INSERT INTO public.template_tracks (id, event_template_id, name, color_id, sort_order) VALUES
  -- Sunday Service
  ('fae00cde-713c-40d0-b564-f320ea609883', 'a068944c-130e-436c-862a-1ee185c516a5', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  ('64b83d97-5119-45b9-9d1f-d80ee2671471', 'a068944c-130e-436c-862a-1ee185c516a5', 'Visuals',    (SELECT id FROM public.colors WHERE key = 'purple'), 1),
  ('8a0bb12b-e308-4c7d-b58a-2defcf115ef0', 'a068944c-130e-436c-862a-1ee185c516a5', 'Livestream', (SELECT id FROM public.colors WHERE key = 'red'),    2),
  -- Wednesday Bible Study
  ('8496b7d2-720a-4694-87d9-f91f08b01b08', 'f1215a0c-ec38-4e06-8c9f-e608afda758a', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  ('70c9a659-dac1-4d95-b603-2085435293ef', 'f1215a0c-ec38-4e06-8c9f-e608afda758a', 'Visuals',    (SELECT id FROM public.colors WHERE key = 'purple'), 1),
  -- Youth Night
  ('12b99b62-c7f2-4c50-b4cc-d55dd484e520', '97239eb8-7a65-4eb7-a4de-85994a38e371', 'Stage',      (SELECT id FROM public.colors WHERE key = 'green'),  0),
  ('93e1579e-3ee5-4045-9753-bb1562cb6d2d', '97239eb8-7a65-4eb7-a4de-85994a38e371', 'Media',      (SELECT id FROM public.colors WHERE key = 'orange'), 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 6c: Template Cues (25 rows — depends on template_tracks)
-- ============================================================

INSERT INTO public.template_cues (id, template_track_id, label, start, duration, type) VALUES
  -- Sunday Service — Audio
  ('8dc081a9-aa0e-4572-819b-479afdc6740c', 'fae00cde-713c-40d0-b564-f320ea609883', 'Pre-service music', 0,   15, 'performance'),
  ('1debac48-d9c1-4bed-b6bf-87a0a7aa4504', 'fae00cde-713c-40d0-b564-f320ea609883', 'Worship set',       15,  30, 'performance'),
  ('8f933df3-74f4-456f-a1ce-db954454c100', 'fae00cde-713c-40d0-b564-f320ea609883', 'Sermon audio',      50,  40, 'performance'),
  ('1af17e04-d826-4dec-a0d9-aafffe684790', 'fae00cde-713c-40d0-b564-f320ea609883', 'Closing music',     100, 20, 'performance'),
  -- Sunday Service — Visuals
  ('32f3ea14-3bcb-4dd3-bcc0-5afe04f323e8', '64b83d97-5119-45b9-9d1f-d80ee2671471', 'Welcome slides',    0,   15, 'technical'),
  ('1d2b860c-ec62-44b9-a5be-c8835810e0fb', '64b83d97-5119-45b9-9d1f-d80ee2671471', 'Worship lyrics',    15,  30, 'technical'),
  ('075f48ec-aa55-4031-adb3-22a68594c136', '64b83d97-5119-45b9-9d1f-d80ee2671471', 'Sermon slides',     50,  40, 'technical'),
  ('5596d3bf-bc8f-44d6-b927-4e2ef98db6d5', '64b83d97-5119-45b9-9d1f-d80ee2671471', 'Announcements',     90,  10, 'announcement'),
  -- Sunday Service — Livestream
  ('2f38dc39-2a04-49e2-97de-31ca92508883', '8a0bb12b-e308-4c7d-b58a-2defcf115ef0', 'Go live',           10,  5,  'technical'),
  ('1fb0c23c-43ec-4d55-991d-b608fe973648', '8a0bb12b-e308-4c7d-b58a-2defcf115ef0', 'Main broadcast',    15,  95, 'technical'),
  ('01a311cf-8bf9-4ca8-921f-77b458321b11', '8a0bb12b-e308-4c7d-b58a-2defcf115ef0', 'End stream',        110, 10, 'technical'),
  -- Wednesday Bible Study — Audio
  ('9d365c1f-42e2-4a64-abc8-5cf75d6ba548', '8496b7d2-720a-4694-87d9-f91f08b01b08', 'Background music',  0,   10, 'performance'),
  ('a719d12b-a2f1-4f74-9f93-ed08e7eb937b', '8496b7d2-720a-4694-87d9-f91f08b01b08', 'Teaching audio',    10,  60, 'performance'),
  ('4cd909d1-573f-4a03-b8ae-08d5f9dba676', '8496b7d2-720a-4694-87d9-f91f08b01b08', 'Discussion',        70,  20, 'transition'),
  -- Wednesday Bible Study — Visuals
  ('67b90d94-e65f-422c-8cc6-69ea060269a3', '70c9a659-dac1-4d95-b603-2085435293ef', 'Study slides',      10,  60, 'technical'),
  ('bb756dba-398d-481b-b893-d90d827028ba', '70c9a659-dac1-4d95-b603-2085435293ef', 'Discussion prompts',70,  20, 'technical'),
  -- Youth Night — Stage
  ('e0dd48e8-4409-4dda-9ec7-a2adedba36ba', '12b99b62-c7f2-4c50-b4cc-d55dd484e520', 'Games',             0,   30, 'performance'),
  ('99cc3670-8bbf-436e-b567-6cac85a9cd6f', '12b99b62-c7f2-4c50-b4cc-d55dd484e520', 'Worship',           30,  30, 'performance'),
  ('5ee39cfd-ba3b-4c9d-af33-96ba7bba4550', '12b99b62-c7f2-4c50-b4cc-d55dd484e520', 'Message',           60,  30, 'performance'),
  ('f279d203-6765-4d5d-b467-6474838f5476', '12b99b62-c7f2-4c50-b4cc-d55dd484e520', 'Small groups',      90,  40, 'transition'),
  ('46f699f2-4620-4146-a685-1c17a6609a72', '12b99b62-c7f2-4c50-b4cc-d55dd484e520', 'Hangout',           130, 20, 'transition'),
  -- Youth Night — Media
  ('1ec8cdb7-addc-43c9-a494-25c6de25802e', '93e1579e-3ee5-4045-9753-bb1562cb6d2d', 'Game visuals',      0,   30, 'technical'),
  ('aca2b252-59b0-47d7-bfac-804f80a0175a', '93e1579e-3ee5-4045-9753-bb1562cb6d2d', 'Lyrics',            30,  30, 'technical'),
  ('e22ef1d6-e571-425f-b859-57fa7dd43471', '93e1579e-3ee5-4045-9753-bb1562cb6d2d', 'Sermon slides',     60,  30, 'technical')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 7: Events — instances (6 rows)
-- ============================================================

INSERT INTO public.events (id, workspace_id, title, description, scheduled_at, duration, created_at, updated_at) VALUES
  ('31692a29-fa9e-47bd-84b7-33424d6dfea7', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Run - Mar 22',  'Completed Sunday morning service run',   '2026-03-22T08:30:00Z', 120, '2026-03-18T09:00:00Z', '2026-03-22T11:00:00Z'),
  ('58ce2896-678a-4062-8dad-8317edb4785f', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Bible Study Run - Mar 25',     'Completed midweek study run',            '2026-03-25T17:30:00Z', 90,  '2026-03-22T12:00:00Z', '2026-03-25T19:00:00Z'),
  ('520215fd-574d-4926-a389-3aa4edbf88ce', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth Night Run - Apr 3',      'Completed youth gathering run',          '2026-04-03T17:00:00Z', 150, '2026-03-30T11:00:00Z', '2026-04-03T19:20:00Z'),
  ('56076002-266a-48d6-ae4e-e6f03da13a82', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Run - Apr 7',   'Current service preparation run',        '2026-04-07T08:30:00Z', 120, '2026-04-03T09:00:00Z', '2026-04-07T07:45:00Z'),
  ('dc0d7288-3237-4d57-a5c4-7bafd4b95e4f', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Bible Study Run - Apr 15',     'Upcoming midweek study run',             '2026-04-15T17:30:00Z', 90,  '2026-04-06T10:00:00Z', '2026-04-06T10:00:00Z'),
  ('0c93eb20-83e6-4dc4-89f4-ce0d4804ce36', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Run - Apr 19',  'Upcoming Sunday morning service run',    '2026-04-19T08:30:00Z', 120, '2026-04-06T11:00:00Z', '2026-04-06T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 7b: Tracks (12 rows — depends on events + colors)
-- ============================================================

INSERT INTO public.tracks (id, event_id, name, color_id, sort_order) VALUES
  -- Sunday Service Run - Mar 22
  ('e62138ec-83ba-4828-8d4d-bac99823c8e8', '31692a29-fa9e-47bd-84b7-33424d6dfea7', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  ('6cd6b18b-c78d-443c-9be8-31c5b10c3069', '31692a29-fa9e-47bd-84b7-33424d6dfea7', 'Visuals',    (SELECT id FROM public.colors WHERE key = 'purple'), 1),
  -- Bible Study Run - Mar 25
  ('db51999f-e73a-4d60-9d85-72bb0398bad3', '58ce2896-678a-4062-8dad-8317edb4785f', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  -- Youth Night Run - Apr 3
  ('087baf7f-b006-4a12-9bcb-66e521041cc5', '520215fd-574d-4926-a389-3aa4edbf88ce', 'Stage',      (SELECT id FROM public.colors WHERE key = 'green'),  0),
  ('85c25a58-9150-419d-969c-65a806f7804b', '520215fd-574d-4926-a389-3aa4edbf88ce', 'Media',      (SELECT id FROM public.colors WHERE key = 'orange'), 1),
  -- Sunday Service Run - Apr 7
  ('46b671f3-860d-420c-8fce-4dc0348e6a40', '56076002-266a-48d6-ae4e-e6f03da13a82', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  ('56316c39-8539-4813-b8a0-f76f3220da0d', '56076002-266a-48d6-ae4e-e6f03da13a82', 'Visuals',    (SELECT id FROM public.colors WHERE key = 'purple'), 1),
  ('e31c9965-f514-4017-96e7-75aff591b6dd', '56076002-266a-48d6-ae4e-e6f03da13a82', 'Livestream', (SELECT id FROM public.colors WHERE key = 'red'),    2),
  -- Bible Study Run - Apr 15
  ('23ca4add-7785-4cea-a3a3-83d8db893256', 'dc0d7288-3237-4d57-a5c4-7bafd4b95e4f', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  ('a15d135e-4650-4e04-8e11-4c52a255becf', 'dc0d7288-3237-4d57-a5c4-7bafd4b95e4f', 'Visuals',    (SELECT id FROM public.colors WHERE key = 'purple'), 1),
  -- Sunday Service Run - Apr 19
  ('a2a4c585-ce54-46a4-8ce4-15e7374bdc1e', '0c93eb20-83e6-4dc4-89f4-ce0d4804ce36', 'Audio',      (SELECT id FROM public.colors WHERE key = 'blue'),   0),
  ('f94dbb36-7b0c-4f30-ba62-10cf566159ed', '0c93eb20-83e6-4dc4-89f4-ce0d4804ce36', 'Visuals',    (SELECT id FROM public.colors WHERE key = 'purple'), 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 7c: Cues (37 rows — depends on tracks)
-- ============================================================

INSERT INTO public.cues (id, track_id, label, start, duration, type) VALUES
  -- Sunday Service Run - Mar 22 — Audio
  ('bd88652f-c2fe-44e9-9496-dd3c526ee9b3', 'e62138ec-83ba-4828-8d4d-bac99823c8e8', 'Pre-service music', 0,   15, 'performance'),
  ('549e0c12-6444-4cac-a9a2-2c71169d01a2', 'e62138ec-83ba-4828-8d4d-bac99823c8e8', 'Worship set',       15,  30, 'performance'),
  ('8e8d531c-68d7-49c3-8c81-eecdd92e3b84', 'e62138ec-83ba-4828-8d4d-bac99823c8e8', 'Sermon audio',      50,  40, 'performance'),
  -- Sunday Service Run - Mar 22 — Visuals
  ('b833443d-fe0c-4198-8faa-f0be6746eeb3', '6cd6b18b-c78d-443c-9be8-31c5b10c3069', 'Welcome slides',    0,   15, 'technical'),
  ('75aef3a4-79e4-4ca5-a4d1-300fc8cee3c5', '6cd6b18b-c78d-443c-9be8-31c5b10c3069', 'Worship lyrics',    15,  30, 'technical'),
  ('657d9668-cb52-4267-a52d-9b27d6e59d65', '6cd6b18b-c78d-443c-9be8-31c5b10c3069', 'Announcements',     90,  10, 'announcement'),
  -- Bible Study Run - Mar 25 — Audio
  ('3ce6f34f-9e07-4b4f-8691-f228a9920053', 'db51999f-e73a-4d60-9d85-72bb0398bad3', 'Background music',  0,   10, 'performance'),
  ('bbbeb92f-9f70-4a6e-9dbc-a2459fcaca92', 'db51999f-e73a-4d60-9d85-72bb0398bad3', 'Teaching audio',    10,  60, 'performance'),
  ('740df4be-f566-463c-ab3b-7e9e323f5f0c', 'db51999f-e73a-4d60-9d85-72bb0398bad3', 'Discussion',        70,  20, 'transition'),
  -- Youth Night Run - Apr 3 — Stage
  ('297f81b5-ec07-460f-95d1-5ab8a4ae8193', '087baf7f-b006-4a12-9bcb-66e521041cc5', 'Games',             0,   30, 'performance'),
  ('32334f11-f7cf-456d-9c3b-272de07610ab', '087baf7f-b006-4a12-9bcb-66e521041cc5', 'Worship',           30,  30, 'performance'),
  ('76172933-6209-4578-ab79-2932b38aa150', '087baf7f-b006-4a12-9bcb-66e521041cc5', 'Message',           60,  30, 'performance'),
  ('348870a2-506a-4fff-82db-e9613bbae463', '087baf7f-b006-4a12-9bcb-66e521041cc5', 'Small groups',      90,  40, 'transition'),
  -- Youth Night Run - Apr 3 — Media
  ('3d6ec3ac-5ff9-47b1-bafd-5b7449e18add', '85c25a58-9150-419d-969c-65a806f7804b', 'Game visuals',      0,   30, 'technical'),
  ('cd9e57d2-2646-4252-95fc-2046145325e1', '85c25a58-9150-419d-969c-65a806f7804b', 'Lyrics',            30,  30, 'technical'),
  -- Sunday Service Run - Apr 7 — Audio
  ('6bb2aaea-5a09-4230-9360-156c1d231241', '46b671f3-860d-420c-8fce-4dc0348e6a40', 'Pre-service music', 0,   15, 'performance'),
  ('035ccc50-e772-498b-bcc1-27a7880833fb', '46b671f3-860d-420c-8fce-4dc0348e6a40', 'Worship set',       15,  30, 'performance'),
  ('7197dbfe-f1d7-455d-a479-4c0691da7835', '46b671f3-860d-420c-8fce-4dc0348e6a40', 'Sermon audio',      50,  40, 'performance'),
  ('cc10e334-69d8-48d4-b3f4-667ae3cf09cb', '46b671f3-860d-420c-8fce-4dc0348e6a40', 'Closing music',     100, 20, 'performance'),
  -- Sunday Service Run - Apr 7 — Visuals
  ('fd432a8f-768c-460d-a8f5-549a60d4ff65', '56316c39-8539-4813-b8a0-f76f3220da0d', 'Welcome slides',    0,   15, 'technical'),
  ('491f4be5-8d36-4fe9-b1f8-cf048d1e5284', '56316c39-8539-4813-b8a0-f76f3220da0d', 'Worship lyrics',    15,  30, 'technical'),
  ('e9a51ad3-91e8-4f62-916b-48bc02def53f', '56316c39-8539-4813-b8a0-f76f3220da0d', 'Sermon slides',     50,  40, 'technical'),
  -- Sunday Service Run - Apr 7 — Livestream
  ('54ced002-630e-4912-a8ab-c2ea03d66385', 'e31c9965-f514-4017-96e7-75aff591b6dd', 'Go live',           10,  5,  'technical'),
  ('85b28635-4837-400b-8f29-81cf353685ea', 'e31c9965-f514-4017-96e7-75aff591b6dd', 'End stream',        110, 10, 'technical'),
  -- Bible Study Run - Apr 15 — Audio
  ('f32f9267-4774-4d6e-a97d-6bb2483122e2', '23ca4add-7785-4cea-a3a3-83d8db893256', 'Background music',  0,   10, 'performance'),
  ('57574f77-1c24-4a26-a9b3-5da421cbb67a', '23ca4add-7785-4cea-a3a3-83d8db893256', 'Teaching audio',    10,  60, 'performance'),
  ('f98be4de-37a0-4ae7-a81b-64b1d995a6e4', '23ca4add-7785-4cea-a3a3-83d8db893256', 'Discussion',        70,  20, 'transition'),
  -- Bible Study Run - Apr 15 — Visuals
  ('be438ebc-7f58-46c7-8128-00d43d8547f0', 'a15d135e-4650-4e04-8e11-4c52a255becf', 'Study slides',      10,  60, 'technical'),
  ('034c2b16-1f8c-4aa4-9d83-cae715a6fce4', 'a15d135e-4650-4e04-8e11-4c52a255becf', 'Discussion prompts',70,  20, 'technical'),
  -- Sunday Service Run - Apr 19 — Audio
  ('805efc79-0d27-44f7-997a-807df695d778', 'a2a4c585-ce54-46a4-8ce4-15e7374bdc1e', 'Pre-service music', 0,   15, 'performance'),
  ('c1f404cd-087c-4d12-9703-b68ab65d5a6b', 'a2a4c585-ce54-46a4-8ce4-15e7374bdc1e', 'Worship set',       15,  30, 'performance'),
  ('d1328806-af1a-4e6a-a8ef-94639797af1b', 'a2a4c585-ce54-46a4-8ce4-15e7374bdc1e', 'Sermon audio',      50,  40, 'performance'),
  ('93a999e7-7ceb-4dca-9be8-98c601ccebaf', 'a2a4c585-ce54-46a4-8ce4-15e7374bdc1e', 'Closing music',     100, 20, 'performance'),
  -- Sunday Service Run - Apr 19 — Visuals
  ('7a7631f3-7221-4afe-853e-277b612d8b44', 'f94dbb36-7b0c-4f30-ba62-10cf566159ed', 'Welcome slides',    0,   15, 'technical'),
  ('fe680288-6a41-49f5-9e3e-c5050bf8dc97', 'f94dbb36-7b0c-4f30-ba62-10cf566159ed', 'Worship lyrics',    15,  30, 'technical'),
  ('d25b1d9d-adf0-4ae8-9ce6-8a6cae6ea927', 'f94dbb36-7b0c-4f30-ba62-10cf566159ed', 'Sermon slides',     50,  40, 'technical'),
  ('74eb1c2d-e569-4210-9aec-d3fc4455a117', 'f94dbb36-7b0c-4f30-ba62-10cf566159ed', 'Announcements',     90,  10, 'announcement')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 8: Checklist Templates (3 rows)
-- ============================================================

INSERT INTO public.checklist_templates (id, workspace_id, name, description, created_at, updated_at) VALUES
  ('c1635a83-451c-41d2-8e29-bfa68fb4b2a3', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Prep', 'Pre-service preparation checklist',   '2026-03-01T07:00:00Z', '2026-03-28T07:00:00Z'),
  ('c672ac92-da09-4860-8d20-6334dad9f534', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Media Setup',         'Equipment and media readiness check',  '2026-03-02T07:00:00Z', '2026-03-29T07:00:00Z'),
  ('e1e40bc0-eb7b-40e4-a724-4700fd684241', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth Night Prep',    'Youth event preparation',              '2026-03-10T07:00:00Z', '2026-03-30T07:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 8b: Template Sections (5 rows)
-- ============================================================

INSERT INTO public.template_sections (id, checklist_template_id, name, sort_order) VALUES
  -- Sunday Service Prep
  ('afa506a4-448d-4eab-be9f-7c2d7aecb9e6', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', 'Audio Team',           0),
  ('990bb295-82be-4aeb-bec8-40e57cd9aa94', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', 'Visuals & Streaming',  1),
  ('532e5a84-4b90-4725-9903-5c0a6a48394f', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', 'Welcome Team',         2),
  -- Youth Night Prep
  ('7a63977a-88a5-465b-9068-8cb47bc53c60', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', 'Praise & Worship',     0),
  ('fa715d1e-f2fe-46c9-a0ec-73a7ca6e8a20', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', 'Activities',           1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 8c: Template Items (20 rows)
-- ============================================================

INSERT INTO public.template_items (id, checklist_template_id, template_section_id, label, sort_order) VALUES
  -- Sunday Service Prep — unsectioned
  ('1be56abe-9d31-46a6-bfa8-2fde0a7dc3a2', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', NULL,                                    'Venue unlocked and lights on',   0),
  ('6553805e-1d1d-4af5-a650-7d234960fb12', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', NULL,                                    'Communion elements prepared',     1),
  -- Sunday Service Prep — Audio Team
  ('42e1ea1e-4189-466f-b9f9-fb8e454f90cb', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', 'afa506a4-448d-4eab-be9f-7c2d7aecb9e6', 'Sound check completed',          0),
  ('3d1798b9-a5a2-483d-8809-1eb7cc441066', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', 'afa506a4-448d-4eab-be9f-7c2d7aecb9e6', 'Microphone batteries replaced',  1),
  ('f5816bec-e4d4-45dc-a0c8-9f6828e3e250', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', 'afa506a4-448d-4eab-be9f-7c2d7aecb9e6', 'Audio mixer levels set',         2),
  -- Sunday Service Prep — Visuals & Streaming
  ('4a699620-336d-4010-bd63-97012465a2ac', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', '990bb295-82be-4aeb-bec8-40e57cd9aa94', 'Projector slides loaded',        0),
  ('a3edf9ca-a11b-4487-9ad1-7436c8f138a4', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', '990bb295-82be-4aeb-bec8-40e57cd9aa94', 'Livestream tested',              1),
  ('1f17d78d-2cb5-4169-a00b-d1b51564d478', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', '990bb295-82be-4aeb-bec8-40e57cd9aa94', 'Recording software running',     2),
  -- Sunday Service Prep — Welcome Team
  ('872410bd-61bf-4a33-bdf7-43c1da913643', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', '532e5a84-4b90-4725-9903-5c0a6a48394f', 'Welcome team briefed',           0),
  ('28910b12-95fc-4f54-b5c1-edc1768072f3', 'c1635a83-451c-41d2-8e29-bfa68fb4b2a3', '532e5a84-4b90-4725-9903-5c0a6a48394f', 'Bulletins printed and ready',    1),
  -- Media Setup — unsectioned
  ('355a2209-7a1b-4779-a197-04db5d814788', 'c672ac92-da09-4860-8d20-6334dad9f534', NULL,                                    'Cameras powered on',             0),
  ('46e4441a-51ef-40b4-b686-a15ce7e94634', 'c672ac92-da09-4860-8d20-6334dad9f534', NULL,                                    'Audio mixer levels set',         1),
  ('50752339-0657-4ab2-a3ad-af9dfa0bf96b', 'c672ac92-da09-4860-8d20-6334dad9f534', NULL,                                    'Recording software running',     2),
  -- Youth Night Prep — unsectioned
  ('7abd223c-6202-4159-9ad2-9e02f71629ab', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', NULL,                                    'Venue setup complete',           0),
  -- Youth Night Prep — Praise & Worship
  ('d3745be4-b8f2-4fde-99cd-7d22aed65e0b', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', '7a63977a-88a5-465b-9068-8cb47bc53c60', 'Worship team rehearsed',         0),
  ('4e7af527-1656-4c4b-a21e-5719eb0d3f7f', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', '7a63977a-88a5-465b-9068-8cb47bc53c60', 'Lyrics loaded on screens',       1),
  -- Youth Night Prep — Activities
  ('0fa04ed2-93b9-4523-82b3-32e82d3e9429', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', 'fa715d1e-f2fe-46c9-a0ec-73a7ca6e8a20', 'Games equipment ready',          0),
  ('438a1342-a60d-4545-bc92-7c8ce66ec331', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', 'fa715d1e-f2fe-46c9-a0ec-73a7ca6e8a20', 'Snacks and drinks set up',       1),
  ('73d9067f-5691-4b8f-8d44-d35f3953271d', 'e1e40bc0-eb7b-40e4-a724-4700fd684241', 'fa715d1e-f2fe-46c9-a0ec-73a7ca6e8a20', 'Small group materials printed',  2)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 9: Checklists — instances (9 rows)
-- ============================================================

INSERT INTO public.checklists (id, workspace_id, name, description, scheduled_at, created_at, updated_at) VALUES
  ('74aa8e8e-1603-461c-b7a1-f4881960a869', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Prep - Mar 23',  'Completed preparation run for Sunday service',              '2026-03-23T06:30:00Z', '2026-03-20T07:00:00Z', '2026-03-23T07:45:00Z'),
  ('e1aeadb3-082d-4e7a-a7be-aa452bb37276', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Media Setup - Mar 25',          'Completed midweek media setup run',                         '2026-03-25T16:30:00Z', '2026-03-24T09:00:00Z', '2026-03-25T17:20:00Z'),
  ('11f01b19-9848-443b-981d-ad494c8143e9', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth Night Prep - Mar 27',     'Partially completed youth night preparation run',           '2026-03-27T16:00:00Z', '2026-03-25T10:00:00Z', '2026-03-27T17:15:00Z'),
  ('e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Prep - Apr 3',   'Past Sunday preparation run with remaining follow-up',      '2026-04-03T06:30:00Z', '2026-04-01T08:00:00Z', '2026-04-03T08:00:00Z'),
  ('360f0dc6-2fe4-4de8-8230-3a45486af1dc', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Media Setup - Apr 7',           'Current media setup run',                                   '2026-04-07T15:30:00Z', '2026-04-06T11:00:00Z', '2026-04-07T08:30:00Z'),
  ('e64e473d-d7b6-450d-bf61-a189219c6ca1', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Prep - Apr 10',  'Upcoming Sunday service preparation run',                   '2026-04-10T06:30:00Z', '2026-04-06T12:00:00Z', '2026-04-06T12:00:00Z'),
  ('bcc5304d-7035-4cd8-ab52-d95cb81e77ad', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Youth Night Prep - Apr 17',     'Upcoming youth night preparation run',                      '2026-04-17T16:00:00Z', '2026-04-06T13:00:00Z', '2026-04-06T13:00:00Z'),
  ('b28b9624-82b3-44bd-b735-5aabc61efcc3', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Sunday Service Prep - Apr 19',  'Future Sunday service preparation run',                     '2026-04-19T06:30:00Z', '2026-04-07T07:00:00Z', '2026-04-07T07:00:00Z'),
  ('cede19d1-a0d2-487d-bea0-417b95f479bc', (SELECT id FROM public.workspaces WHERE slug = 'default-workspace'), 'Media Setup - Apr 22',          'Future media setup run',                                    '2026-04-22T16:30:00Z', '2026-04-07T08:00:00Z', '2026-04-07T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 9b: Checklist Sections (6 rows)
-- ============================================================

INSERT INTO public.checklist_sections (id, checklist_id, name, sort_order) VALUES
  ('2eb6f8de-5945-48ca-9795-7d03bf5def90', '74aa8e8e-1603-461c-b7a1-f4881960a869', 'Audio Team',          0),
  ('b38af783-7102-4b43-881f-d2c794dd7e72', '11f01b19-9848-443b-981d-ad494c8143e9', 'Activities',          0),
  ('c0c189d9-6e4a-42b3-bd59-9d4b494aef26', 'e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', 'Visuals & Streaming', 0),
  ('f1c1b3c3-9665-4e68-8186-3782790ec338', 'e64e473d-d7b6-450d-bf61-a189219c6ca1', 'Audio Team',          0),
  ('8dfa906e-eabc-4f8e-bd17-5000b41acf6d', 'bcc5304d-7035-4cd8-ab52-d95cb81e77ad', 'Praise & Worship',    0),
  ('d5c07b25-07d8-4134-822d-d796d4a60491', 'b28b9624-82b3-44bd-b735-5aabc61efcc3', 'Welcome Team',        0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Phase 9c: Checklist Items (35 rows)
-- ============================================================

INSERT INTO public.checklist_items (id, checklist_id, section_id, label, checked, sort_order) VALUES
  -- Sunday Service Prep - Mar 23 — unsectioned
  ('54a75c63-27e9-4ff7-b967-97e45df0a304', '74aa8e8e-1603-461c-b7a1-f4881960a869', NULL,                                    'Venue unlocked and lights on',   true,  0),
  ('a6f04ecb-ba66-4631-a4dd-1900013a231d', '74aa8e8e-1603-461c-b7a1-f4881960a869', NULL,                                    'Communion elements prepared',     true,  1),
  -- Sunday Service Prep - Mar 23 — Audio Team
  ('b7d04648-60bb-4a96-a056-50416e9332a5', '74aa8e8e-1603-461c-b7a1-f4881960a869', '2eb6f8de-5945-48ca-9795-7d03bf5def90', 'Sound check completed',          true,  0),
  ('daa8acd6-0097-4ae4-ab83-c7a34193017a', '74aa8e8e-1603-461c-b7a1-f4881960a869', '2eb6f8de-5945-48ca-9795-7d03bf5def90', 'Microphone batteries replaced',  true,  1),
  -- Media Setup - Mar 25
  ('49e3664b-cf33-4cf4-8dc3-9f34059e7d08', 'e1aeadb3-082d-4e7a-a7be-aa452bb37276', NULL,                                    'Cameras powered on',             true,  0),
  ('19ea57c5-736f-4dd3-90fe-5c8832c3c6ef', 'e1aeadb3-082d-4e7a-a7be-aa452bb37276', NULL,                                    'Audio mixer levels set',         true,  1),
  ('673718b7-d61a-41d2-b4f2-d0aae2f24160', 'e1aeadb3-082d-4e7a-a7be-aa452bb37276', NULL,                                    'Recording software running',     true,  2),
  -- Youth Night Prep - Mar 27 — unsectioned
  ('13df5301-6099-4415-a4ac-3975f4b22b73', '11f01b19-9848-443b-981d-ad494c8143e9', NULL,                                    'Venue setup complete',           true,  0),
  -- Youth Night Prep - Mar 27 — Activities
  ('2494315d-6177-4051-9730-ef2effb4e7d1', '11f01b19-9848-443b-981d-ad494c8143e9', 'b38af783-7102-4b43-881f-d2c794dd7e72', 'Games equipment ready',          true,  0),
  ('eabd1437-f39b-4203-b3b4-d2987ffc0ac5', '11f01b19-9848-443b-981d-ad494c8143e9', 'b38af783-7102-4b43-881f-d2c794dd7e72', 'Snacks and drinks set up',       false, 1),
  ('7899cf91-bd5b-49ef-8737-e26f3c73302e', '11f01b19-9848-443b-981d-ad494c8143e9', 'b38af783-7102-4b43-881f-d2c794dd7e72', 'Small group materials printed',  false, 2),
  -- Sunday Service Prep - Apr 3 — unsectioned
  ('2880e81d-ddfd-4741-96ff-4e40dd9b1c05', 'e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', NULL,                                    'Venue unlocked and lights on',   true,  0),
  ('7b085889-28cc-4710-9a35-e4b8738aa861', 'e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', NULL,                                    'Communion elements prepared',     false, 1),
  -- Sunday Service Prep - Apr 3 — Visuals & Streaming
  ('013136ff-e56c-4ab6-9660-95e93f89a927', 'e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', 'c0c189d9-6e4a-42b3-bd59-9d4b494aef26', 'Projector slides loaded',        true,  0),
  ('a73cb478-bb62-4556-b645-6d35141d6795', 'e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', 'c0c189d9-6e4a-42b3-bd59-9d4b494aef26', 'Livestream tested',              true,  1),
  ('23b10ab9-91ae-40e6-a69e-fc00a0f83c47', 'e93346e0-8ef6-4d7f-a3c3-10cbdb20d80e', 'c0c189d9-6e4a-42b3-bd59-9d4b494aef26', 'Recording software running',     false, 2),
  -- Media Setup - Apr 7
  ('2fdded31-1a95-4631-a4c0-d126e720deee', '360f0dc6-2fe4-4de8-8230-3a45486af1dc', NULL,                                    'Cameras powered on',             true,  0),
  ('5630805b-cd5f-4db2-8a99-5da9032fd2b4', '360f0dc6-2fe4-4de8-8230-3a45486af1dc', NULL,                                    'Audio mixer levels set',         false, 1),
  ('d362f0ca-eb4b-4089-9929-bf0783980738', '360f0dc6-2fe4-4de8-8230-3a45486af1dc', NULL,                                    'Recording software running',     false, 2),
  -- Sunday Service Prep - Apr 10 — unsectioned
  ('c8f8a667-8f91-4985-839b-e2ab4319a774', 'e64e473d-d7b6-450d-bf61-a189219c6ca1', NULL,                                    'Venue unlocked and lights on',   false, 0),
  ('35b47a8d-08f2-4d4e-8abc-bf9071454fab', 'e64e473d-d7b6-450d-bf61-a189219c6ca1', NULL,                                    'Communion elements prepared',     false, 1),
  -- Sunday Service Prep - Apr 10 — Audio Team
  ('a79745e7-ec39-4d08-aafb-0e4c98153d16', 'e64e473d-d7b6-450d-bf61-a189219c6ca1', 'f1c1b3c3-9665-4e68-8186-3782790ec338', 'Sound check completed',          false, 0),
  ('be5a4c0f-3d43-498c-a221-06933afd1886', 'e64e473d-d7b6-450d-bf61-a189219c6ca1', 'f1c1b3c3-9665-4e68-8186-3782790ec338', 'Microphone batteries replaced',  false, 1),
  ('7325d9a6-4c83-439e-a471-4b4a2214f30a', 'e64e473d-d7b6-450d-bf61-a189219c6ca1', 'f1c1b3c3-9665-4e68-8186-3782790ec338', 'Audio mixer levels set',         false, 2),
  -- Youth Night Prep - Apr 17 — unsectioned
  ('4c37de21-22fa-4ded-b3ab-024c31f9615b', 'bcc5304d-7035-4cd8-ab52-d95cb81e77ad', NULL,                                    'Venue setup complete',           false, 0),
  -- Youth Night Prep - Apr 17 — Praise & Worship
  ('4239a8ec-e7b5-4297-ae31-56baa51d026f', 'bcc5304d-7035-4cd8-ab52-d95cb81e77ad', '8dfa906e-eabc-4f8e-bd17-5000b41acf6d', 'Worship team rehearsed',         false, 0),
  ('93f72807-535a-4fdd-80d3-bc5bf60d5a15', 'bcc5304d-7035-4cd8-ab52-d95cb81e77ad', '8dfa906e-eabc-4f8e-bd17-5000b41acf6d', 'Lyrics loaded on screens',       false, 1),
  -- Sunday Service Prep - Apr 19 — unsectioned
  ('e029aadb-803e-4217-8e46-b3d9cc69e394', 'b28b9624-82b3-44bd-b735-5aabc61efcc3', NULL,                                    'Venue unlocked and lights on',   false, 0),
  ('c688bafc-43e7-4c90-bcaa-4314f6ee955b', 'b28b9624-82b3-44bd-b735-5aabc61efcc3', NULL,                                    'Communion elements prepared',     false, 1),
  -- Sunday Service Prep - Apr 19 — Welcome Team
  ('4f9cb624-9878-4457-8533-438d3dba508d', 'b28b9624-82b3-44bd-b735-5aabc61efcc3', 'd5c07b25-07d8-4134-822d-d796d4a60491', 'Welcome team briefed',           false, 0),
  ('071b157b-ba82-45e5-bc05-61150f894f91', 'b28b9624-82b3-44bd-b735-5aabc61efcc3', 'd5c07b25-07d8-4134-822d-d796d4a60491', 'Bulletins printed and ready',    false, 1),
  -- Media Setup - Apr 22
  ('ffd5e7c0-2543-4f90-8ec4-d43815b19ec0', 'cede19d1-a0d2-487d-bea0-417b95f479bc', NULL,                                    'Cameras powered on',             false, 0),
  ('af2a051a-2aee-4f01-917c-e66afff2bec7', 'cede19d1-a0d2-487d-bea0-417b95f479bc', NULL,                                    'Audio mixer levels set',         false, 1),
  ('62e109a4-d5f7-4439-9a08-d52e7c3f7f18', 'cede19d1-a0d2-487d-bea0-417b95f479bc', NULL,                                    'Recording software running',     false, 2)
ON CONFLICT (id) DO NOTHING;

COMMIT;
