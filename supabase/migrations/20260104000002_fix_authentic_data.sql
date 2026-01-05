-- Migration: Fix Permit Data with Authentic TTU Prices
-- Source: https://www.depts.ttu.edu/parking/Resources/Transparency/PermitCosts.php
-- Last verified: January 2026

-- ============================================
-- UPDATE PERMIT TYPES WITH AUTHENTIC DATA
-- ============================================

-- Delete incorrect "commuter_east" (doesn't exist at TTU)
DELETE FROM permit_types WHERE id = 'commuter_east';

-- Update existing permits with correct authentic prices
UPDATE permit_types SET
  name = 'Commuter West',
  short_name = 'West',
  price = 143.00,
  description = '7 lots off Indiana Ave & Texas Tech Pkwy near United Supermarkets Arena',
  valid_lots = ARRAY['CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7']
WHERE id = 'commuter_west';

UPDATE permit_types SET
  name = 'Commuter North',
  short_name = 'North',
  price = 162.00,
  description = 'C1 & C4 near Jones AT&T Stadium and Rawls College of Business',
  valid_lots = ARRAY['C1', 'C4']
WHERE id = 'commuter_north';

UPDATE permit_types SET
  name = 'Satellite',
  short_name = 'Sat',
  price = 44.00,
  description = 'Large lots off Texas Tech Pkwy with free bus every 7 mins',
  valid_lots = ARRAY['S1', 'S2']
WHERE id = 'satellite';

UPDATE permit_types SET
  name = 'Residence Hall',
  short_name = 'Res',
  price = 263.00,
  description = 'Zone parking for your residence hall complex (24/7)'
WHERE id = 'residence_halls';

UPDATE permit_types SET
  name = 'Flint Avenue Garage',
  short_name = 'Flint',
  price = 517.50,
  description = 'Covered garage near busy campus area - guaranteed parking'
WHERE id = 'garage_flint';

UPDATE permit_types SET
  name = 'Raider Park Garage',
  short_name = 'Raider',
  price = 143.00,
  description = 'Covered garage north of campus across Marsha Sharp Freeway'
WHERE id = 'garage_raider';

UPDATE permit_types SET
  name = 'Faculty/Staff Area Reserved',
  short_name = 'F/S',
  price = 263.00,
  description = 'Surface Area Reserved parking for faculty and staff'
WHERE id = 'faculty_staff';

UPDATE permit_types SET
  name = 'Motorcycle',
  short_name = 'Moto',
  price = 66.80,
  description = 'Motorcycle designated parking (9-month rate)'
WHERE id = 'motorcycle';

-- Add missing authentic permit type: Commuter ICC
INSERT INTO permit_types (id, name, short_name, price, description, category, valid_lots, cross_lot_time, free_time, icon, color, sort_order)
VALUES (
  'commuter_icc', 'Commuter ICC', 'ICC', 162.00,
  'Two lots near Rawls College of Business',
  'commuter', ARRAY['ICC1', 'ICC2'], '14:30', '17:30', 'car', '#DC2626', 4
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description;

-- Add Evening Commuter (real TTU permit)
INSERT INTO permit_types (id, name, short_name, price, description, category, valid_lots, cross_lot_time, free_time, icon, color, sort_order)
VALUES (
  'evening_commuter', 'Evening Commuter', 'Eve', 44.00,
  'Free parking in commuter lots after 2:30 PM weekdays',
  'commuter', ARRAY['C1', 'C4', 'CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7', 'ICC1', 'ICC2'], '14:30', NULL, 'sun-moon', '#F59E0B', 5
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description;

-- ============================================
-- UPDATE RESIDENCE HALL ZONES (Authentic Z1-Z7)
-- ============================================

-- Delete old placeholder residence zones
DELETE FROM permit_types WHERE id LIKE 'residence_z%';

-- Insert authentic residence hall zones
INSERT INTO permit_types (id, name, short_name, price, description, category, valid_lots, icon, color, sort_order)
VALUES
  ('residence_z1', 'Z1 - Gordon/Bledsoe/Sneed', 'Z1', 263.00,
   'Two lots at 8th & Akron streets',
   'residence', ARRAY['Z1-A', 'Z1-B'], 'star', '#7C3AED', 10),

  ('residence_z2', 'Z2 - Horn/Knapp/Talkington', 'Z2', 263.00,
   'Portions of four lots for Z2 residents',
   'residence', ARRAY['Z2-A', 'Z2-B', 'Z2-C', 'Z2-D'], 'star', '#7C3AED', 11),

  ('residence_z3', 'Z3 - Wall/Gates/Hulen/Clement', 'Z3', 263.00,
   'One lot off 19th St, two lots off 18th St',
   'residence', ARRAY['Z3-A', 'Z3-B', 'Z3-C'], 'star', '#7C3AED', 12),

  ('residence_z4', 'Z4 - Chitwood/Weymouth/Coleman', 'Z4', 263.00,
   'Main lot off Hartford & 18th, smaller lot off Flint & 18th',
   'residence', ARRAY['Z4-A', 'Z4-B'], 'star', '#7C3AED', 13),

  ('residence_z5', 'Z5 - Stangel/Murdough', 'Z5', 263.00,
   'Over 700 spaces in three lots',
   'residence', ARRAY['Z5-A', 'Z5-B', 'Z5-C'], 'star', '#7C3AED', 14),

  ('residence_z6', 'Z6 - Carpenter/Wells/Murray/Honors', 'Z6', 263.00,
   'Two lots off Flint Avenue',
   'residence', ARRAY['Z6-A', 'Z6-B'], 'star', '#7C3AED', 15),

  ('residence_z7', 'Z7 - West Village', 'Z7', 263.00,
   'North of West Village at Texas Tech Pkwy & Indiana Ave',
   'residence', ARRAY['Z7-A'], 'star', '#7C3AED', 16)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  valid_lots = EXCLUDED.valid_lots;

-- ============================================
-- ADD VISITOR/PARK-AND-PAY INFO (Authentic rates)
-- ============================================

UPDATE permit_types SET
  description = 'Pay-per-use: $1.50/hr or $9/day max (surface & garage)',
  price = 0.00
WHERE id = 'visitor';

-- ============================================
-- ALLOW GUEST/ANONYMOUS REPORTS
-- ============================================

-- Make user_id nullable for anonymous reports
ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL;

-- Add index for anonymous reports
CREATE INDEX IF NOT EXISTS idx_reports_anonymous ON reports(lot_id, created_at DESC) WHERE user_id IS NULL;

-- ============================================
-- UPDATE LOTS TABLE WITH AUTHENTIC LOT IDS
-- ============================================

-- Update lot IDs to match TTU naming
UPDATE lots SET notes = 'Commuter North - near Jones AT&T Stadium' WHERE id = 'C1';
UPDATE lots SET notes = 'Commuter North - near Rawls College of Business' WHERE id = 'C4';

-- ============================================
-- VERIFY DATA
-- ============================================

DO $$
DECLARE
  permit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO permit_count FROM permit_types WHERE is_active = true;
  RAISE NOTICE 'Updated permit_types table. Active permits: %', permit_count;
END $$;
