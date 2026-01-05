-- Seed Data for RaiderPark
-- TTU Parking Lots with real coordinates

-- ============================================
-- INSERT TTU PARKING LOTS
-- ============================================

INSERT INTO lots (id, name, area, center, total_spaces, accessible_spaces, ev_spaces, motorcycle_spaces, walk_times, has_covered_parking, has_ev_charging, has_lighting, notes)
VALUES
  ('C1', 'Commuter Lot C1', 'west',
   ST_SetSRID(ST_MakePoint(-101.8728, 33.5897), 4326)::GEOGRAPHY,
   1200, 15, 0, 10,
   '{"library": 15, "student_union": 12, "rec_center": 18, "engineering": 20, "business": 14}'::jsonb,
   FALSE, FALSE, TRUE, 'Largest commuter lot, near stadium. Very busy on game days.'),

  ('C4', 'Commuter Lot C4', 'west',
   ST_SetSRID(ST_MakePoint(-101.8752, 33.5845), 4326)::GEOGRAPHY,
   800, 10, 0, 5,
   '{"library": 18, "student_union": 15, "rec_center": 8, "engineering": 22, "business": 16}'::jsonb,
   FALSE, FALSE, TRUE, 'Near Rec Center and United Supermarkets Arena'),

  ('C11', 'Commuter Lot C11', 'north',
   ST_SetSRID(ST_MakePoint(-101.8695, 33.5925), 4326)::GEOGRAPHY,
   500, 8, 0, 5,
   '{"library": 8, "student_union": 10, "rec_center": 20, "engineering": 5, "business": 12}'::jsonb,
   FALSE, FALSE, TRUE, 'Close to Engineering and Science buildings'),

  ('C12', 'Commuter Lot C12', 'north',
   ST_SetSRID(ST_MakePoint(-101.8632, 33.5918), 4326)::GEOGRAPHY,
   350, 5, 0, 3,
   '{"library": 10, "student_union": 12, "rec_center": 22, "engineering": 8, "business": 6}'::jsonb,
   FALSE, FALSE, TRUE, 'Near Law School and Rawls College of Business'),

  ('C14', 'Commuter Lot C14', 'east',
   ST_SetSRID(ST_MakePoint(-101.8580, 33.5885), 4326)::GEOGRAPHY,
   400, 6, 4, 4,
   '{"library": 12, "student_union": 14, "rec_center": 25, "engineering": 15, "business": 8}'::jsonb,
   FALSE, TRUE, TRUE, 'Has EV charging stations. Near Business buildings.'),

  ('C15', 'Commuter Lot C15', 'central',
   ST_SetSRID(ST_MakePoint(-101.8655, 33.5870), 4326)::GEOGRAPHY,
   300, 5, 0, 3,
   '{"library": 5, "student_union": 3, "rec_center": 15, "engineering": 10, "business": 8}'::jsonb,
   FALSE, FALSE, TRUE, 'Central location, fills up quickly'),

  ('C16', 'Commuter Lot C16', 'central',
   ST_SetSRID(ST_MakePoint(-101.8710, 33.5862), 4326)::GEOGRAPHY,
   450, 7, 0, 4,
   '{"library": 7, "student_union": 5, "rec_center": 12, "engineering": 12, "business": 10}'::jsonb,
   FALSE, FALSE, TRUE, 'Good central access, moderate walk to most buildings'),

  ('S1', 'Satellite Lot S1', 'south',
   ST_SetSRID(ST_MakePoint(-101.8680, 33.5835), 4326)::GEOGRAPHY,
   250, 4, 0, 2,
   '{"library": 12, "student_union": 10, "rec_center": 5, "engineering": 18, "business": 15}'::jsonb,
   FALSE, FALSE, TRUE, 'Near Rec Center, good for athletics facilities')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  area = EXCLUDED.area,
  center = EXCLUDED.center,
  total_spaces = EXCLUDED.total_spaces,
  accessible_spaces = EXCLUDED.accessible_spaces,
  ev_spaces = EXCLUDED.ev_spaces,
  motorcycle_spaces = EXCLUDED.motorcycle_spaces,
  walk_times = EXCLUDED.walk_times,
  has_covered_parking = EXCLUDED.has_covered_parking,
  has_ev_charging = EXCLUDED.has_ev_charging,
  has_lighting = EXCLUDED.has_lighting,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- ============================================
-- INITIALIZE LOT STATUS
-- ============================================

INSERT INTO lot_status (lot_id, status, occupancy_percent, confidence, trend, is_closed, updated_at)
VALUES
  ('C1', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('C4', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('C11', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('C12', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('C14', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('C15', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('C16', 'moderate', 50, 'low', 0, FALSE, NOW()),
  ('S1', 'moderate', 50, 'low', 0, FALSE, NOW())
ON CONFLICT (lot_id) DO UPDATE SET
  status = EXCLUDED.status,
  occupancy_percent = EXCLUDED.occupancy_percent,
  confidence = EXCLUDED.confidence,
  updated_at = NOW();

-- ============================================
-- INSERT PERMIT RULES (unique combinations only)
-- ============================================

-- Commuter West permits
INSERT INTO permit_rules (lot_id, permit_type, valid_from, valid_until, valid_days, notes)
VALUES
  ('C1', 'commuter_west', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours'),
  ('C4', 'commuter_west', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours'),
  ('C16', 'commuter_west', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours')
ON CONFLICT (lot_id, permit_type) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  valid_days = EXCLUDED.valid_days,
  notes = EXCLUDED.notes;

-- Commuter North permits
INSERT INTO permit_rules (lot_id, permit_type, valid_from, valid_until, valid_days, notes)
VALUES
  ('C11', 'commuter_north', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours'),
  ('C12', 'commuter_north', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours')
ON CONFLICT (lot_id, permit_type) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  valid_days = EXCLUDED.valid_days,
  notes = EXCLUDED.notes;

-- Commuter East permits
INSERT INTO permit_rules (lot_id, permit_type, valid_from, valid_until, valid_days, notes)
VALUES
  ('C14', 'commuter_east', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours'),
  ('C15', 'commuter_east', '07:30', '17:30', '{1,2,3,4,5}', 'Standard weekday hours')
ON CONFLICT (lot_id, permit_type) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  valid_days = EXCLUDED.valid_days,
  notes = EXCLUDED.notes;

-- Faculty/Staff - access to all lots
INSERT INTO permit_rules (lot_id, permit_type, valid_from, valid_until, valid_days, notes)
VALUES
  ('C1', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('C4', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('C11', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('C12', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('C14', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('C15', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('C16', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access'),
  ('S1', 'faculty_staff', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Faculty/Staff full access')
ON CONFLICT (lot_id, permit_type) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  valid_days = EXCLUDED.valid_days,
  notes = EXCLUDED.notes;

-- Accessible permits - all lots
INSERT INTO permit_rules (lot_id, permit_type, valid_from, valid_until, valid_days, notes)
VALUES
  ('C1', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('C4', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('C11', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('C12', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('C14', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('C15', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('C16', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces'),
  ('S1', 'accessible', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Accessible parking - designated spaces')
ON CONFLICT (lot_id, permit_type) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  valid_days = EXCLUDED.valid_days,
  notes = EXCLUDED.notes;

-- Residence Halls permits
INSERT INTO permit_rules (lot_id, permit_type, valid_from, valid_until, valid_days, notes)
VALUES
  ('C15', 'residence_halls', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Residence Halls 24/7 access'),
  ('S1', 'residence_halls', '00:00', '23:59', '{0,1,2,3,4,5,6}', 'Residence Halls 24/7 access')
ON CONFLICT (lot_id, permit_type) DO UPDATE SET
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  valid_days = EXCLUDED.valid_days,
  notes = EXCLUDED.notes;

-- ============================================
-- SAMPLE EVENTS
-- ============================================

INSERT INTO events (name, event_type, starts_at, ends_at, affected_lot_ids, impact_level, description, venue, expected_attendance, alternative_lots)
VALUES
  (
    'TTU vs OU Football',
    'football',
    '2026-01-15 14:00:00-06',
    '2026-01-15 18:00:00-06',
    ARRAY['C1', 'C4'],
    5,
    'Big 12 Conference football game. Heavy traffic expected.',
    'Jones AT&T Stadium',
    60000,
    ARRAY['C11', 'C12', 'C14']
  ),
  (
    'Basketball vs Baylor',
    'basketball',
    '2026-01-20 19:00:00-06',
    '2026-01-20 22:00:00-06',
    ARRAY['C4'],
    4,
    'Big 12 Conference basketball game.',
    'United Supermarkets Arena',
    15000,
    ARRAY['C1', 'C16', 'S1']
  ),
  (
    'Spring Graduation',
    'graduation',
    '2026-05-09 09:00:00-05',
    '2026-05-09 17:00:00-05',
    ARRAY['C1', 'C4', 'C15', 'C16'],
    5,
    'Spring commencement ceremonies. Multiple ceremonies throughout the day.',
    'United Supermarkets Arena',
    20000,
    ARRAY['C11', 'C12', 'C14']
  ),
  (
    'Career Fair',
    'special_event',
    '2026-02-10 10:00:00-06',
    '2026-02-10 16:00:00-06',
    ARRAY['C15'],
    3,
    'Spring career fair at Student Union. Moderate traffic increase.',
    'Student Union Building',
    5000,
    ARRAY['C11', 'C16']
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'RaiderPark seed data inserted successfully!';
  RAISE NOTICE 'Inserted % lots', (SELECT COUNT(*) FROM lots);
  RAISE NOTICE 'Inserted % permit rules', (SELECT COUNT(*) FROM permit_rules);
  RAISE NOTICE 'Inserted % lot statuses', (SELECT COUNT(*) FROM lot_status);
  RAISE NOTICE 'Inserted % events', (SELECT COUNT(*) FROM events);
END $$;
