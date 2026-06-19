
-- Enable pgcrypto for SHA-256 seeding
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Admin Users ────────────────────────────────────────────────────────────
CREATE TABLE admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  display_name  TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Hotels ─────────────────────────────────────────────────────────────────
CREATE TABLE hotels (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT          NOT NULL,
  trek_destination_id  TEXT          NOT NULL,
  trek_destination_name TEXT         NOT NULL,
  owner_contact        TEXT          NOT NULL,
  price_per_package    NUMERIC(12,2) NOT NULL,
  location             TEXT          NOT NULL,
  capacity             INTEGER       NOT NULL DEFAULT 10,
  description          TEXT,
  image_url            TEXT,
  is_active            BOOLEAN       DEFAULT true,
  created_at           TIMESTAMPTZ   DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── Chat Groups ─────────────────────────────────────────────────────────────
CREATE TABLE chat_groups (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  destination_id    TEXT        NOT NULL,
  destination_name  TEXT        NOT NULL,
  start_date        DATE,
  member_count      INTEGER     DEFAULT 1,
  members           JSONB       DEFAULT '[]',
  booked_hotel_id   UUID        REFERENCES hotels(id) ON DELETE SET NULL,
  created_by        TEXT,
  status            TEXT        DEFAULT 'active' CHECK (status IN ('active','inactive','completed')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE admin_users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups  ENABLE ROW LEVEL SECURITY;

-- admin_users: SELECT only (password verification)
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT TO anon USING (true);
CREATE POLICY "admin_users_insert" ON admin_users FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "admin_users_update" ON admin_users FOR UPDATE TO anon USING (false);
CREATE POLICY "admin_users_delete" ON admin_users FOR DELETE TO anon USING (false);

-- hotels: full CRUD (admin panel + future user-facing queries)
CREATE POLICY "hotels_select" ON hotels FOR SELECT TO anon USING (true);
CREATE POLICY "hotels_insert" ON hotels FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "hotels_update" ON hotels FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "hotels_delete" ON hotels FOR DELETE TO anon USING (true);

-- chat_groups: full CRUD (user app creates, admin reads/manages)
CREATE POLICY "chat_groups_select" ON chat_groups FOR SELECT TO anon USING (true);
CREATE POLICY "chat_groups_insert" ON chat_groups FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "chat_groups_update" ON chat_groups FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "chat_groups_delete" ON chat_groups FOR DELETE TO anon USING (true);

-- ─── Seed: admin user (admin / admin123) ─────────────────────────────────────
-- SHA-256 hash produced by encode(digest('admin123','sha256'),'hex')
-- matches crypto.subtle.digest('SHA-256', ...) in the browser
INSERT INTO admin_users (username, password_hash, display_name, role)
VALUES (
  'admin',
  encode(digest('admin123', 'sha256'), 'hex'),
  'System Admin',
  'super_admin'
);

-- ─── Seed: sample hotels ─────────────────────────────────────────────────────
INSERT INTO hotels (name, trek_destination_id, trek_destination_name, owner_contact, price_per_package, location, capacity, description) VALUES
  ('Annapurna Sanctuary Lodge', '1',  'Classic ABC',               '+977-61-420001', 45000,  'Chomrong, Annapurna',    20, 'Comfortable teahouse at the gateway to the Annapurna Sanctuary with sweeping panoramic views of Annapurna South and Machhapuchhre.'),
  ('Poon Hill Sunrise Inn',     '5',  'Ghorepani Sunrise Express', '+977-61-420002', 12000,  'Ghorepani, 2,860m',      15, 'Cozy mountain inn with direct access to the Poon Hill viewpoint trail. Famous for its sunrise views over Dhaulagiri.'),
  ('Everest Summit Lodge',      '8',  'Everest Base Camp Classic', '+977-1-4230003', 85000,  'Gorak Shep, 5,164m',     12, 'High-altitude teahouse at the furthest point on the EBC trail — the closest accommodation to the base camp at 5,364m.'),
  ('Manaslu Heritage House',    '18', 'Manaslu Round',             '+977-1-4230004', 55000,  'Samagaon, 3,530m',       18, 'Authentic Tibetan-style lodge in the heart of the Manaslu Conservation Area with yak-cheese breakfasts and monastery views.');

-- ─── Seed: sample chat groups ────────────────────────────────────────────────
DO $$
DECLARE
  h_poonhill UUID;
  h_ebc      UUID;
BEGIN
  SELECT id INTO h_poonhill FROM hotels WHERE name = 'Poon Hill Sunrise Inn'  LIMIT 1;
  SELECT id INTO h_ebc      FROM hotels WHERE name = 'Everest Summit Lodge'    LIMIT 1;

  INSERT INTO chat_groups (name, destination_id, destination_name, start_date, member_count, booked_hotel_id, created_by, status) VALUES
    ('Annapurna Adventurers',    '1',  'Classic ABC',               '2026-09-15', 6, NULL,       'Raj Sharma',   'active'),
    ('EBC Dream Team',           '8',  'Everest Base Camp Classic', '2026-10-01', 8, h_ebc,      'Priya Singh',  'active'),
    ('Poon Hill Sunrise Crew',   '5',  'Ghorepani Sunrise Express', '2026-08-20', 4, h_poonhill, 'Alex Chen',    'active'),
    ('Manaslu Circuit Warriors', '18', 'Manaslu Round',             '2026-11-05', 5, NULL,       'Maria Lopez',  'active');
END $$;
