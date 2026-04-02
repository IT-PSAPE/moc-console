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

### 2a. `users` (public profiles linked to Supabase Auth)

This table stores profile data for every authenticated user. A row is created automatically when a user signs up via the trigger in step 3.

```sql
CREATE TABLE users (
  id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name     text NOT NULL DEFAULT '',
  surname  text NOT NULL DEFAULT '',
  email    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 2b. `requests`

```sql
CREATE TABLE requests (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

### 2c. `request_assignees` (join table)

```sql
CREATE TABLE request_assignees (
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  duty       text NOT NULL,
  PRIMARY KEY (request_id, user_id)
);
```

### 2d. `request_roles` (duty options for request assignments)

```sql
CREATE TABLE request_roles (
  name text PRIMARY KEY
);
```

### 2e. `user_roles` (app-level RBAC)

App roles control what actions a user can perform. Roles: `admin` (full access), `editor` (CRUD minus delete), `viewer` (read-only).

```sql
CREATE TYPE app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE user_roles (
  user_id  uuid       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     app_role   NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (user_id)
);
```

---

## 3. Auto-Create Profile on Signup (Trigger)

This trigger fires after every new signup in `auth.users` and inserts a matching row into the public `users` table, pulling the email from auth metadata.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. Row-Level Security (Role-Based)

RLS policies use the `public.user_app_role()` helper to enforce access by app role.

| Table | admin | editor | viewer |
|---|---|---|---|
| `users` | read all, update own | read all, update own | read all, update own |
| `user_roles` | full CRUD | read | read |
| `requests` | full CRUD | read, insert, update | read |
| `request_assignees` | read, insert, delete | read, insert, delete | read |
| `request_roles` | read | read | read |

```sql
-- Helper function
CREATE OR REPLACE FUNCTION public.user_app_role()
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.user_roles WHERE user_id = auth.uid(); $$;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_roles ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "All roles can read profiles"
  ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "All roles can read user_roles"
  ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert user_roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (public.user_app_role() = 'admin');
CREATE POLICY "Admins can update user_roles"
  ON user_roles FOR UPDATE TO authenticated
  USING (public.user_app_role() = 'admin') WITH CHECK (public.user_app_role() = 'admin');
CREATE POLICY "Admins can delete user_roles"
  ON user_roles FOR DELETE TO authenticated
  USING (public.user_app_role() = 'admin');

-- requests
CREATE POLICY "All roles can read requests"
  ON requests FOR SELECT TO authenticated
  USING (public.user_app_role() IS NOT NULL);
CREATE POLICY "Admin and editor can insert requests"
  ON requests FOR INSERT TO authenticated
  WITH CHECK (public.user_app_role() IN ('admin', 'editor'));
CREATE POLICY "Admin and editor can update requests"
  ON requests FOR UPDATE TO authenticated
  USING (public.user_app_role() IN ('admin', 'editor'));
CREATE POLICY "Only admin can delete requests"
  ON requests FOR DELETE TO authenticated
  USING (public.user_app_role() = 'admin');

-- request_assignees
CREATE POLICY "All roles can read request_assignees"
  ON request_assignees FOR SELECT TO authenticated
  USING (public.user_app_role() IS NOT NULL);
CREATE POLICY "Admin and editor can insert request_assignees"
  ON request_assignees FOR INSERT TO authenticated
  WITH CHECK (public.user_app_role() IN ('admin', 'editor'));
CREATE POLICY "Admin and editor can delete request_assignees"
  ON request_assignees FOR DELETE TO authenticated
  USING (public.user_app_role() IN ('admin', 'editor'));

-- request_roles
CREATE POLICY "Authenticated users can read request_roles"
  ON request_roles FOR SELECT TO authenticated USING (true);
```

---

## 5. Seed Data

> **Note:** The `users` table is populated automatically when users sign up. You cannot seed it directly because rows must reference `auth.users`. Use the Supabase dashboard (Authentication > Users) to create test users first, then update their profiles:
>
> ```sql
> -- After creating test users via the dashboard, update their profiles:
> UPDATE users SET name = 'David', surname = 'Chen' WHERE email = 'david@example.com';
> UPDATE users SET name = 'Maria', surname = 'Santos' WHERE email = 'maria@example.com';
> ```

### 5a. Seed `request_roles`

```sql
INSERT INTO request_roles (name) VALUES
  ('Videographer'),
  ('Designer'),
  ('Audio Tech'),
  ('Event Coordinator'),
  ('Editor'),
  ('Photographer'),
  ('Stage Manager'),
  ('Presenter');
```

### 5b. Seed `requests`

```sql
INSERT INTO requests (id, title, priority, status, category, created_at, due_date, who, what, "when", "where", why, how, notes, flow, content) VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Revelation Class Promo Video', 'high', 'in_progress', 'video_production',
   '2026-03-10T09:00:00Z', '2026-04-05T17:00:00Z',
   'Pastor Williams',
   'Promotional video for the Revelation Bible study series',
   'Needed before April 6 Sunday service',
   'Main sanctuary and classroom B',
   'Drive enrollment for the upcoming 12-week series',
   '2-minute highlight reel with interviews and b-roll',
   'Include testimony clips from last year''s participants', NULL, NULL),

  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Easter Sunday Service Recording', 'urgent', 'not_started', 'video_shooting',
   '2026-03-12T14:30:00Z', '2026-04-05T08:00:00Z',
   'Media Team Lead',
   'Full multi-camera recording of Easter service',
   'Easter Sunday, April 5',
   'Main sanctuary',
   'Archive and online streaming for remote members',
   '3-camera setup with live switching and separate audio feed',
   NULL, NULL, NULL),

  ('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'Youth Summer Camp Flyer', 'medium', 'not_started', 'graphic_design',
   '2026-03-15T10:00:00Z', '2026-04-15T17:00:00Z',
   'Youth Ministry Director',
   'Flyer and social media graphics for summer camp registration',
   'Distribution starts mid-April',
   'Digital and print — lobby display boards',
   'Early bird registration opens April 20',
   'Match 2025 camp branding with updated dates and pricing',
   'Need both English and Spanish versions', NULL, NULL),

  ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80', 'Mission Church Community Outreach Event', 'high', 'in_progress', 'event',
   '2026-03-08T11:00:00Z', '2026-04-12T09:00:00Z',
   'Outreach Coordinator',
   'Community outreach event with food distribution and live music',
   'Saturday, April 12',
   'Church parking lot and fellowship hall',
   'Quarterly community engagement initiative',
   'Stage setup, PA system, 3 food stations, kids activities area',
   NULL, 'Setup 6am → Sound check 8am → Doors 9am → Cleanup 3pm', NULL),

  ('e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091', 'Baptism Class Welcome Video', 'low', 'completed', 'video_production',
   '2026-02-20T08:00:00Z', '2026-03-10T17:00:00Z',
   'Associate Pastor',
   'Welcome video for new baptism class members',
   'Plays at the start of each Saturday class',
   'Classroom A',
   'Standardize the welcome experience for new attendees',
   '5-minute video with pastor intro and class overview',
   NULL, NULL, NULL),

  ('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8091a2', 'Weekly Bulletin Design — April', 'medium', 'in_progress', 'graphic_design',
   '2026-03-20T09:00:00Z', '2026-04-01T12:00:00Z',
   'Church Administrator',
   'April bulletin template with updated announcements',
   'Ready by April 1 for print',
   'Lobby handout and digital PDF',
   'Weekly congregation communication',
   'Update March template with new events, scripture, and prayer list',
   NULL, NULL, NULL),

  ('07b8c9d0-e1f2-4a3b-4c5d-6e7f8091a2b3', 'Worship Team Rehearsal Recording', 'low', 'completed', 'video_shooting',
   '2026-02-25T16:00:00Z', '2026-03-05T20:00:00Z',
   'Worship Leader',
   'Record Thursday rehearsal for remote band members',
   'Every Thursday 7-9pm',
   'Main sanctuary stage',
   'Remote musicians need to learn new arrangements',
   'Single wide-angle camera with direct audio board feed',
   NULL, NULL, NULL),

  ('18c9d0e1-f2a3-4b4c-5d6e-7f8091a2b3c4', 'VBS Volunteer Training Materials', 'medium', 'not_started', 'education',
   '2026-03-18T13:00:00Z', '2026-05-01T17:00:00Z',
   'Children''s Ministry Director',
   'Training slide deck and handout for VBS volunteers',
   'Training sessions start May 3',
   'Fellowship hall and emailed to volunteers',
   '60+ volunteers need consistent onboarding materials',
   'PowerPoint deck with role breakdowns, safety protocols, and schedules',
   NULL, NULL, NULL),

  ('29d0e1f2-a3b4-4c5d-6e7f-8091a2b3c4d5', 'Projector & Screen Setup — Friday Prayer', 'high', 'not_started', 'event',
   '2026-03-25T07:00:00Z', '2026-03-28T17:00:00Z',
   'Prayer Ministry Lead',
   'Projector, screen, and HDMI setup for Friday prayer night',
   'Friday March 28, 6pm',
   'Chapel room',
   'Displaying scripture passages and worship lyrics',
   'Portable projector, pull-down screen, laptop with ProPresenter',
   NULL, NULL, NULL),

  ('3ae1f2a3-b4c5-4d6e-7f80-91a2b3c4d5e6', 'Mother''s Day Sermon Series Graphics', 'medium', 'not_started', 'graphic_design',
   '2026-03-22T10:00:00Z', '2026-04-25T17:00:00Z',
   'Senior Pastor',
   'Sermon series branding — title slide, social media, and banner',
   'Series launches May 4',
   'Projection, Instagram, Facebook, lobby banner',
   'Unified visual identity for the 3-week Mother''s Day series',
   'Warm color palette, floral accents, serif typography',
   'Series title: ''A Mother''s Heart''', NULL, NULL),

  ('4bf2a3b4-c5d6-4e7f-8091-a2b3c4d5e6f7', 'Equipment Inventory Documentation', 'low', 'completed', 'education',
   '2026-02-10T09:00:00Z', '2026-03-01T17:00:00Z',
   'Media Team Lead',
   'Document all AV equipment with serial numbers and conditions',
   'Complete by end of February',
   'All campus rooms and storage',
   'Insurance renewal requires updated asset list',
   'Spreadsheet with photos, serial numbers, purchase dates, and conditions',
   NULL, NULL, NULL),

  ('5ca3b4c5-d6e7-4f80-91a2-b3c4d5e6f708', 'Men''s Retreat Highlight Reel', 'medium', 'completed', 'video_production',
   '2026-02-15T08:00:00Z', '2026-03-08T17:00:00Z',
   'Men''s Ministry Leader',
   '3-minute highlight video from the February retreat',
   'Show during Sunday announcements March 9',
   'Main sanctuary projection',
   'Encourage sign-ups for the fall retreat',
   'Music-driven montage with candid shots and testimonials',
   NULL, NULL, NULL),

  ('6db4c5d6-e7f8-4091-a2b3-c4d5e6f70819', 'New Members Class Photography', 'low', 'archived', 'video_shooting',
   '2026-01-20T10:00:00Z', '2026-02-15T17:00:00Z',
   'Membership Coordinator',
   'Headshots and group photo for new members directory',
   'Sunday Feb 15 after second service',
   'Lobby photo area',
   'Updated church directory for Q1',
   'Portable backdrop, ring light, DSLR with portrait lens',
   NULL, NULL, NULL),

  ('7ec5d6e7-f809-41a2-b3c4-d5e6f708192a', 'Christmas Concert Recap Video', 'low', 'archived', 'video_production',
   '2025-12-28T09:00:00Z', '2026-01-15T17:00:00Z',
   'Worship Leader',
   'Recap video of the Christmas concert for social media',
   'Post by mid-January',
   'YouTube and Instagram',
   'Year-end content to close out the Christmas season',
   '4-minute edit with concert footage, audience reactions, behind-the-scenes',
   NULL, NULL, NULL),

  ('8fd6e7f8-091a-42b3-c4d5-e6f708192a3b', 'Sunday School Curriculum Video Modules', 'high', 'in_progress', 'education',
   '2026-03-05T08:00:00Z', '2026-04-20T17:00:00Z',
   'Education Director',
   'Record 6 video lessons for the spring Sunday school curriculum',
   'One lesson per week starting March 9',
   'Studio room',
   'Hybrid learning — in-person and online students',
   'Talking head with slides, 15-20 min each, screen recording overlay',
   'Lessons 1-3 recorded, editing in progress', NULL, NULL),

  ('90e7f809-1a2b-43c4-d5e6-f708192a3b4c', '2 Wired Mics for Panel Discussion', 'medium', 'completed', 'event',
   '2026-03-20T14:00:00Z', '2026-03-27T18:00:00Z',
   'Young Adults Ministry',
   'Equipment setup for Friday panel discussion',
   'Friday March 27, 6:30pm',
   'Fellowship hall stage',
   'Panel of 4 speakers needs clear audio for audience and recording',
   '2 wired handheld mics, 2 lapel mics, small mixer, PA speakers',
   NULL, NULL, NULL);
```

### 5c. Seed `request_assignees`

> After creating test users via the dashboard and noting their UUIDs, seed the join table:
>
> ```sql
> -- Replace the UUIDs below with real user IDs from auth.users
> INSERT INTO request_assignees (request_id, user_id, duty) VALUES
>   ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', '<david-uuid>', 'Filming & editing'),
>   ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', '<maria-uuid>', 'Thumbnail & title cards'),
>   ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', '<david-uuid>', 'Camera 1 — main'),
>   ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', '<james-uuid>', 'Camera 2 — wide'),
>   ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', '<sarah-uuid>', 'Live mix & board recording'),
>   ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80', '<rachel-uuid>', 'Logistics & vendor management'),
>   ('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80', '<james-uuid>', 'Event coverage'),
>   ('f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8091a2', '<maria-uuid>', 'Layout & typesetting'),
>   ('8fd6e7f8-091a-42b3-c4d5-e6f708192a3b', '<david-uuid>', 'Recording & editing'),
>   ('8fd6e7f8-091a-42b3-c4d5-e6f708192a3b', '<sarah-uuid>', 'Mic setup & audio post');
> ```

---

## 6. Verification

After running all SQL above, verify by running:

```sql
SELECT count(*) FROM users;              -- depends on signups
SELECT count(*) FROM requests;           -- expect 16
SELECT count(*) FROM request_assignees;  -- depends on seeded assignees
SELECT count(*) FROM request_roles;      -- expect 8
SELECT count(*) FROM user_roles;         -- should match users count
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
| `userId` | `user_id` |
| `duty` | `duty` |
| `name` | `name` |
| `surname` | `surname` |
| `email` | `email` |
