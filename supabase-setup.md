# MOC Console — Supabase Database Setup

You are setting up the Supabase database for a church media production console called "MOC Console." Follow every step below exactly. Do not skip any section.

---

## 1. Create Enums

```sql
CREATE TYPE request_status AS ENUM ('not_started', 'in_progress', 'completed', 'archived');
CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE request_category AS ENUM ('video_production', 'video_shooting', 'graphic_design', 'event', 'education');
```

---

## 2. Create Tables

> **Important:** `when` and `where` are reserved SQL keywords. They MUST be double-quoted in all DDL and DML statements.

### 2a. `requests`

```sql
CREATE TABLE requests (
  id         text PRIMARY KEY,
  title      text NOT NULL,
  priority   request_priority NOT NULL,
  status     request_status NOT NULL DEFAULT 'not_started',
  category   request_category NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  due_date   timestamptz,
  who        text NOT NULL,
  what       text NOT NULL,
  "when"     text NOT NULL,
  "where"    text NOT NULL,
  why        text NOT NULL,
  how        text NOT NULL,
  notes      text,
  flow       text,
  content    text
);
```

### 2b. `assignees`

```sql
CREATE TABLE assignees (
  id      text PRIMARY KEY,
  name    text NOT NULL,
  surname text NOT NULL
);
```

### 2c. `request_assignees` (join table)

```sql
CREATE TABLE request_assignees (
  request_id  text NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  assignee_id text NOT NULL REFERENCES assignees(id) ON DELETE CASCADE,
  duty        text NOT NULL,
  PRIMARY KEY (request_id, assignee_id)
);
```

### 2d. `roles`

```sql
CREATE TABLE roles (
  name text PRIMARY KEY
);
```

---

## 3. Disable Row-Level Security

Everything is public for now. Disable RLS on all tables:

```sql
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_assignees DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
```

---

## 4. Seed Data

### 4a. Seed `assignees`

```sql
INSERT INTO assignees (id, name, surname) VALUES
  ('usr-001', 'David', 'Chen'),
  ('usr-002', 'Maria', 'Santos'),
  ('usr-003', 'James', 'Okonkwo'),
  ('usr-004', 'Sarah', 'Kim'),
  ('usr-005', 'Rachel', 'Thompson');
```

### 4b. Seed `roles`

```sql
INSERT INTO roles (name) VALUES
  ('Videographer'),
  ('Designer'),
  ('Audio Tech'),
  ('Event Coordinator'),
  ('Editor'),
  ('Photographer'),
  ('Stage Manager'),
  ('Presenter');
```

### 4c. Seed `requests`

```sql
INSERT INTO requests (id, title, priority, status, category, created_at, due_date, who, what, "when", "where", why, how, notes, flow, content) VALUES
  ('req-001', 'Revelation Class Promo Video', 'high', 'in_progress', 'video_production',
   '2026-03-10T09:00:00Z', '2026-04-05T17:00:00Z',
   'Pastor Williams',
   'Promotional video for the Revelation Bible study series',
   'Needed before April 6 Sunday service',
   'Main sanctuary and classroom B',
   'Drive enrollment for the upcoming 12-week series',
   '2-minute highlight reel with interviews and b-roll',
   'Include testimony clips from last year''s participants', NULL, NULL),

  ('req-002', 'Easter Sunday Service Recording', 'urgent', 'not_started', 'video_shooting',
   '2026-03-12T14:30:00Z', '2026-04-05T08:00:00Z',
   'Media Team Lead',
   'Full multi-camera recording of Easter service',
   'Easter Sunday, April 5',
   'Main sanctuary',
   'Archive and online streaming for remote members',
   '3-camera setup with live switching and separate audio feed',
   NULL, NULL, NULL),

  ('req-003', 'Youth Summer Camp Flyer', 'medium', 'not_started', 'graphic_design',
   '2026-03-15T10:00:00Z', '2026-04-15T17:00:00Z',
   'Youth Ministry Director',
   'Flyer and social media graphics for summer camp registration',
   'Distribution starts mid-April',
   'Digital and print — lobby display boards',
   'Early bird registration opens April 20',
   'Match 2025 camp branding with updated dates and pricing',
   'Need both English and Spanish versions', NULL, NULL),

  ('req-004', 'Mission Church Community Outreach Event', 'high', 'in_progress', 'event',
   '2026-03-08T11:00:00Z', '2026-04-12T09:00:00Z',
   'Outreach Coordinator',
   'Community outreach event with food distribution and live music',
   'Saturday, April 12',
   'Church parking lot and fellowship hall',
   'Quarterly community engagement initiative',
   'Stage setup, PA system, 3 food stations, kids activities area',
   NULL, 'Setup 6am → Sound check 8am → Doors 9am → Cleanup 3pm', NULL),

  ('req-005', 'Baptism Class Welcome Video', 'low', 'completed', 'video_production',
   '2026-02-20T08:00:00Z', '2026-03-10T17:00:00Z',
   'Associate Pastor',
   'Welcome video for new baptism class members',
   'Plays at the start of each Saturday class',
   'Classroom A',
   'Standardize the welcome experience for new attendees',
   '5-minute video with pastor intro and class overview',
   NULL, NULL, NULL),

  ('req-006', 'Weekly Bulletin Design — April', 'medium', 'in_progress', 'graphic_design',
   '2026-03-20T09:00:00Z', '2026-04-01T12:00:00Z',
   'Church Administrator',
   'April bulletin template with updated announcements',
   'Ready by April 1 for print',
   'Lobby handout and digital PDF',
   'Weekly congregation communication',
   'Update March template with new events, scripture, and prayer list',
   NULL, NULL, NULL),

  ('req-007', 'Worship Team Rehearsal Recording', 'low', 'completed', 'video_shooting',
   '2026-02-25T16:00:00Z', '2026-03-05T20:00:00Z',
   'Worship Leader',
   'Record Thursday rehearsal for remote band members',
   'Every Thursday 7-9pm',
   'Main sanctuary stage',
   'Remote musicians need to learn new arrangements',
   'Single wide-angle camera with direct audio board feed',
   NULL, NULL, NULL),

  ('req-008', 'VBS Volunteer Training Materials', 'medium', 'not_started', 'education',
   '2026-03-18T13:00:00Z', '2026-05-01T17:00:00Z',
   'Children''s Ministry Director',
   'Training slide deck and handout for VBS volunteers',
   'Training sessions start May 3',
   'Fellowship hall and emailed to volunteers',
   '60+ volunteers need consistent onboarding materials',
   'PowerPoint deck with role breakdowns, safety protocols, and schedules',
   NULL, NULL, NULL),

  ('req-009', 'Projector & Screen Setup — Friday Prayer', 'high', 'not_started', 'event',
   '2026-03-25T07:00:00Z', '2026-03-28T17:00:00Z',
   'Prayer Ministry Lead',
   'Projector, screen, and HDMI setup for Friday prayer night',
   'Friday March 28, 6pm',
   'Chapel room',
   'Displaying scripture passages and worship lyrics',
   'Portable projector, pull-down screen, laptop with ProPresenter',
   NULL, NULL, NULL),

  ('req-010', 'Mother''s Day Sermon Series Graphics', 'medium', 'not_started', 'graphic_design',
   '2026-03-22T10:00:00Z', '2026-04-25T17:00:00Z',
   'Senior Pastor',
   'Sermon series branding — title slide, social media, and banner',
   'Series launches May 4',
   'Projection, Instagram, Facebook, lobby banner',
   'Unified visual identity for the 3-week Mother''s Day series',
   'Warm color palette, floral accents, serif typography',
   'Series title: ''A Mother''s Heart''', NULL, NULL),

  ('req-011', 'Equipment Inventory Documentation', 'low', 'completed', 'education',
   '2026-02-10T09:00:00Z', '2026-03-01T17:00:00Z',
   'Media Team Lead',
   'Document all AV equipment with serial numbers and conditions',
   'Complete by end of February',
   'All campus rooms and storage',
   'Insurance renewal requires updated asset list',
   'Spreadsheet with photos, serial numbers, purchase dates, and conditions',
   NULL, NULL, NULL),

  ('req-012', 'Men''s Retreat Highlight Reel', 'medium', 'completed', 'video_production',
   '2026-02-15T08:00:00Z', '2026-03-08T17:00:00Z',
   'Men''s Ministry Leader',
   '3-minute highlight video from the February retreat',
   'Show during Sunday announcements March 9',
   'Main sanctuary projection',
   'Encourage sign-ups for the fall retreat',
   'Music-driven montage with candid shots and testimonials',
   NULL, NULL, NULL),

  ('req-013', 'New Members Class Photography', 'low', 'archived', 'video_shooting',
   '2026-01-20T10:00:00Z', '2026-02-15T17:00:00Z',
   'Membership Coordinator',
   'Headshots and group photo for new members directory',
   'Sunday Feb 15 after second service',
   'Lobby photo area',
   'Updated church directory for Q1',
   'Portable backdrop, ring light, DSLR with portrait lens',
   NULL, NULL, NULL),

  ('req-014', 'Christmas Concert Recap Video', 'low', 'archived', 'video_production',
   '2025-12-28T09:00:00Z', '2026-01-15T17:00:00Z',
   'Worship Leader',
   'Recap video of the Christmas concert for social media',
   'Post by mid-January',
   'YouTube and Instagram',
   'Year-end content to close out the Christmas season',
   '4-minute edit with concert footage, audience reactions, behind-the-scenes',
   NULL, NULL, NULL),

  ('req-015', 'Sunday School Curriculum Video Modules', 'high', 'in_progress', 'education',
   '2026-03-05T08:00:00Z', '2026-04-20T17:00:00Z',
   'Education Director',
   'Record 6 video lessons for the spring Sunday school curriculum',
   'One lesson per week starting March 9',
   'Studio room',
   'Hybrid learning — in-person and online students',
   'Talking head with slides, 15-20 min each, screen recording overlay',
   'Lessons 1-3 recorded, editing in progress', NULL, NULL),

  ('req-016', '2 Wired Mics for Panel Discussion', 'medium', 'completed', 'event',
   '2026-03-20T14:00:00Z', '2026-03-27T18:00:00Z',
   'Young Adults Ministry',
   'Equipment setup for Friday panel discussion',
   'Friday March 27, 6:30pm',
   'Fellowship hall stage',
   'Panel of 4 speakers needs clear audio for audience and recording',
   '2 wired handheld mics, 2 lapel mics, small mixer, PA speakers',
   NULL, NULL, NULL);
```

### 4d. Seed `request_assignees`

```sql
INSERT INTO request_assignees (request_id, assignee_id, duty) VALUES
  ('req-001', 'usr-001', 'Filming & editing'),
  ('req-001', 'usr-002', 'Thumbnail & title cards'),
  ('req-002', 'usr-001', 'Camera 1 — main'),
  ('req-002', 'usr-003', 'Camera 2 — wide'),
  ('req-002', 'usr-004', 'Live mix & board recording'),
  ('req-004', 'usr-005', 'Logistics & vendor management'),
  ('req-004', 'usr-003', 'Event coverage'),
  ('req-006', 'usr-002', 'Layout & typesetting'),
  ('req-015', 'usr-001', 'Recording & editing'),
  ('req-015', 'usr-004', 'Mic setup & audio post');
```

---

## 5. Verification

After running all SQL above, verify by running:

```sql
SELECT count(*) FROM requests;          -- expect 16
SELECT count(*) FROM assignees;         -- expect 5
SELECT count(*) FROM request_assignees; -- expect 10
SELECT count(*) FROM roles;             -- expect 8
```

---

## Column Mapping Reference (TypeScript ↔ PostgreSQL)

This project uses camelCase in TypeScript and snake_case in PostgreSQL. The application code handles the mapping. Full reference:

| TypeScript field | PostgreSQL column |
|---|---|
| `id` | `id` |
| `title` | `title` |
| `priority` | `priority` |
| `status` | `status` |
| `category` | `category` |
| `createdAt` | `created_at` |
| `dueDate` | `due_date` |
| `who` | `who` |
| `what` | `what` |
| `when` | `"when"` |
| `where` | `"where"` |
| `why` | `why` |
| `how` | `how` |
| `notes` | `notes` |
| `flow` | `flow` |
| `content` | `content` |
| `requestId` | `request_id` |
| `assigneeId` | `assignee_id` |
| `duty` | `duty` |
| `name` | `name` |
| `surname` | `surname` |
