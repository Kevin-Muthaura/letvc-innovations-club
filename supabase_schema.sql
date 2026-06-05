-- ══════════════════════════════════════════════════════════════════
--  LETVC INNOVATIONS CLUB — COMPLETE SUPABASE DATABASE SCHEMA
--  Paste this entire file into: Supabase → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════

-- ── PROFILES (extends Supabase auth.users) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL DEFAULT '',
  email       TEXT DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin','editor','mentor','member')),
  section     TEXT DEFAULT '',
  adm_no      TEXT UNIQUE,
  phone       TEXT DEFAULT '',
  skills      TEXT[] DEFAULT '{}',
  bio         TEXT DEFAULT '',
  points      INTEGER DEFAULT 0,
  badges      TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── PATRON ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patron (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL DEFAULT 'MUTHURA KEVIN KARITHI',
  phone       TEXT DEFAULT '254714974036',
  email       TEXT DEFAULT 'muthaurak@gmail.com',
  bio         TEXT DEFAULT 'Patron, LETVC Innovations Club',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO public.patron (full_name, phone, email)
VALUES ('MUTHURA KEVIN KARITHI','254714974036','muthaurak@gmail.com')
ON CONFLICT DO NOTHING;

-- ── MEMBERS (registry — independent of auth) ────────────────────────
CREATE TABLE IF NOT EXISTS public.members (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  section     TEXT NOT NULL DEFAULT '',
  adm_no      TEXT UNIQUE NOT NULL,
  phone       TEXT DEFAULT '',
  email       TEXT DEFAULT '',
  role        TEXT DEFAULT 'member' CHECK (role IN ('member','club_officer','captain')),
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  joined_at   DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.members (full_name, section, adm_no, phone, email) VALUES
  ('SMYCHUS LAITH',   'TOURISM',                 'CTM/S25/003',  '254791388040','laithsmychus@gmail.com'),
  ('NAHASHON IRUNGU', 'ELECTRICAL',              'DEP/S25/003',  '254716718277',''),
  ('JOY WAIRIMU',     'FOOD & BEVERAGE',         'CFB/M26/004',  '254117334618',''),
  ('ALEX KIMANI',     'ELECTRICAL',              'CEP/J26/002',  '254701812374',''),
  ('JUSTER KARIMI',   'FOOD & BEVERAGE',         'CFB/J26/002',  '254702552628',''),
  ('REUBEN THUMBI',   'BUILDING & CONSTRUCTION', 'DBT/M25/121',  '254793456926',''),
  ('JOSEPH NDERITU',  'BUILDING & CONSTRUCTION', 'DBT/S24/006',  '254793807983',''),
  ('PIUS MUTUGI',     'BUILDING & CONSTRUCTION', 'DBT/S24/005',  '254111210518',''),
  ('FAITH WANJOHI',   'COSMETOLOGY',             'COS/S25/004',  '254718301039',''),
  ('JAMES GITONGA',   'PLUMBING',                'CP/S25/002',   '254700634434',''),
  ('STANLEY MWANGI',  'PLUMBING',                'CP/J25/001',   '254708012262',''),
  ('LEWIS KARANJA',   'ICT',                     'DICT/M25/001', '254740589500',''),
  ('SAMUEL MACHARIA', 'BUILDING & CONSTRUCTION', 'DBT/M25/001',  '254715259068',''),
  ('DENIS NDIRITU',   'ELECTRICAL',              'CEP/J25/005',  '254756568934',''),
  ('FIDELIS KARIUKI', 'COSMETOLOGY',             'COS/S25/010',  '254117617212',''),
  ('GLORIOUS CATE',   'FOOD & BEVERAGE',         'DCAM/M25/002', '254743182813',''),
  ('SIMON NDIRITU',   'PLUMBING',                'CP/M25/013',   '254116330841',''),
  ('KENNEDY OBUYA',   'TOURISM',                 'CTM/J26/001',  '254799295884','')
ON CONFLICT (adm_no) DO NOTHING;

-- ── TECHNICAL MENTORS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentors (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  technical_area TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  email         TEXT DEFAULT '',
  bio           TEXT DEFAULT '',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.mentors (full_name, technical_area, phone, email) VALUES
  ('TIMOTHY MUTHAMIA',      'HOSPITALITY',               '254706308361','timothymuthamia9@gmail.com'),
  ('WAMAI CAROLINE WAIRIMU','TOURISM',                    '254792098960','lunawairimu@gmail.com'),
  ('JOYCE WAIRIMU',         'COSMETOLOGY',               '254791705811',''),
  ('KELVIN KIBUI',          'FASHION',                   '254798208272',''),
  ('RHODA WANJIRU',         'BUSINESS',                  '254792173621',''),
  ('DUNCAN NDEGWA',         'ROBOTICS',                  '254799041089',''),
  ('DANIEL MWIKA',          'ELECTRICAL AND ELECTRONICS','254726636552',''),
  ('SAMUEL MWINDIRE',       'MECHANICAL',                '254727549024',''),
  ('BEATRICE NDIRANGU',     'BUILDING',                  '254718618318',''),
  ('DAVID MAINA',           'BUILDING',                  '254746315058','')
ON CONFLICT DO NOTHING;

-- ── IDEAS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ideas (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  submitted_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name   TEXT DEFAULT 'Anonymous',
  category      TEXT DEFAULT 'General'
                  CHECK (category IN ('Technology','Business','Social Impact','Environment','Health','Education','Agriculture','Robotics','Fashion','General')),
  status        TEXT DEFAULT 'submitted'
                  CHECK (status IN ('submitted','under_review','approved','rejected','funded')),
  votes_up      INTEGER DEFAULT 0,
  votes_down    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── IDEA VOTES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.idea_votes (
  id         SERIAL PRIMARY KEY,
  idea_id    INTEGER NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type  TEXT NOT NULL CHECK (vote_type IN ('up','down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (idea_id, user_id)
);

-- ── IDEA COMMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.idea_comments (
  id          SERIAL PRIMARY KEY,
  idea_id     INTEGER NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT DEFAULT '',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROJECTS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  linked_idea   INTEGER REFERENCES public.ideas(id) ON DELETE SET NULL,
  department    TEXT DEFAULT '',
  stage         TEXT DEFAULT 'Ideation'
                  CHECK (stage IN ('Ideation','Research','Prototype','Testing','Exhibition Ready','Completed')),
  status        TEXT DEFAULT 'active'
                  CHECK (status IN ('active','paused','completed')),
  progress      INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  tech_stack    TEXT DEFAULT '',
  demo_link     TEXT DEFAULT '',
  github_link   TEXT DEFAULT '',
  mentor_id     INTEGER REFERENCES public.mentors(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.projects (title, description, department, stage, progress) VALUES
  ('Solar Water Purifier',      'Low-cost solar-powered water purification for rural communities.','ELECTRICAL',              'Prototype',         65),
  ('Smart Food Waste Tracker',  'IoT device to monitor food waste in institutional kitchens.',    'FOOD & BEVERAGE',         'Ideation',          40),
  ('Bamboo Furniture Innovation','Sustainable low-cost furniture using bamboo and recycled materials.','BUILDING & CONSTRUCTION','Exhibition Ready',80),
  ('Eco-Tourism App',           'Mobile app for marketing Laikipia eco-tourism packages.',        'TOURISM',                 'Research',          30)
ON CONFLICT DO NOTHING;

-- ── PROJECT MEMBERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id INTEGER REFERENCES public.projects(id) ON DELETE CASCADE,
  member_id  INTEGER REFERENCES public.members(id)  ON DELETE CASCADE,
  PRIMARY KEY (project_id, member_id)
);

-- ── PROJECT UPDATES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_updates (
  id          SERIAL PRIMARY KEY,
  project_id  INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  author_name TEXT DEFAULT 'Admin',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── EVENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  event_date    DATE,
  event_time    TEXT DEFAULT '',
  venue         TEXT DEFAULT '',
  virtual_link  TEXT DEFAULT '',
  event_type    TEXT DEFAULT 'workshop'
                  CHECK (event_type IN ('hackathon','workshop','pitch_night','meeting','excursion','competition')),
  organizer     TEXT DEFAULT 'LETVC Innovations Club',
  max_attendees INTEGER DEFAULT 100,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.events (title, description, event_date, event_time, venue, event_type) VALUES
  ('Monthly Innovation Showcase','Members present project progress to the full club and patron.','2026-06-15','10:00 AM','Main Hall','pitch_night'),
  ('Prototyping Basics Workshop','Hands-on session on low-cost prototyping using available materials.','2026-06-22','2:00 PM','Science Lab','workshop'),
  ('TVET Exhibition Prep Meeting','Preparation for the national TVET innovation exhibition.','2026-07-05','9:00 AM','Workshop','meeting')
ON CONFLICT DO NOTHING;

-- ── EVENT REGISTRATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id            SERIAL PRIMARY KEY,
  event_id      INTEGER REFERENCES public.events(id) ON DELETE CASCADE,
  member_id     INTEGER REFERENCES public.members(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (event_id, member_id)
);

-- ── ANNOUNCEMENTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
  posted_by   TEXT DEFAULT 'Admin',
  post_date   DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.announcements (title, body, priority, post_date) VALUES
  ('Club approved by Board of Governors!',
   'The LETVC Innovations Club has received full approval from the Board of Governors. Welcome to the inaugural meeting!',
   'high','2026-06-05'),
  ('Registration open for new members',
   'All LETVC trainees are invited to register. Visit the STI Department office or contact the patron.',
   'medium','2026-06-03')
ON CONFLICT DO NOTHING;

-- ── AUDIT LOG ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id           SERIAL PRIMARY KEY,
  action       TEXT NOT NULL,
  entity       TEXT DEFAULT '',
  entity_id    TEXT DEFAULT '',
  performed_by TEXT DEFAULT '',
  details      TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════
--  AUTO-UPDATE TRIGGERS
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_upd  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_members_upd   BEFORE UPDATE ON public.members   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_upd  BEFORE UPDATE ON public.projects  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_upd    BEFORE UPDATE ON public.events    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ideas_upd     BEFORE UPDATE ON public.ideas     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════════════════════
--  ADMIN HELPER FUNCTION
-- ══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- ══════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patron              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log           ENABLE ROW LEVEL SECURITY;

-- Public reads for authenticated users
CREATE POLICY "auth read" ON public.patron              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.members             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.mentors             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.ideas               FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.idea_votes          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.idea_comments       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.projects            FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.project_members     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.project_updates     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.events              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.event_registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.announcements       FOR SELECT TO authenticated USING (true);

-- Profiles
CREATE POLICY "read all profiles"  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "admin update any"   ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin());

-- Ideas — members can submit/edit their own
CREATE POLICY "insert idea"     ON public.ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "update own idea" ON public.ideas FOR UPDATE TO authenticated USING (auth.uid() = submitted_by);
CREATE POLICY "delete own idea" ON public.ideas FOR DELETE TO authenticated USING (auth.uid() = submitted_by);
CREATE POLICY "admin idea write" ON public.ideas FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Votes
CREATE POLICY "own votes" ON public.idea_votes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments
CREATE POLICY "insert comment"     ON public.idea_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own comment" ON public.idea_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admin comments"     ON public.idea_comments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Admin-only write on everything else
CREATE POLICY "admin write" ON public.patron              FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.members             FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.mentors             FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.projects            FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.project_members     FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.project_updates     FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.events              FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.event_registrations FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin write" ON public.announcements       FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin read"  ON public.audit_log           FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "audit insert" ON public.audit_log          FOR INSERT TO authenticated WITH CHECK (true);
