-- Migration: Create Permit Types Table
-- Description: Add permit_types table with all TTU parking permit metadata
-- Note: New enum values must be added in separate transactions, handled via seed

-- ============================================
-- CREATE PERMIT TYPES TABLE
-- Use TEXT for id instead of enum to avoid transaction issues
-- ============================================

CREATE TABLE IF NOT EXISTS permit_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('commuter', 'residence', 'garage', 'other')),
  valid_lots TEXT[] DEFAULT '{}',
  cross_lot_time TIME,           -- When cross-lot parking starts (e.g., 14:30)
  free_time TIME,                -- When parking becomes free (e.g., 17:30)
  icon TEXT,                     -- Icon name for UI
  color TEXT,                    -- Color code for UI
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE permit_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read permit types (public data)
CREATE POLICY "Permit types are viewable by everyone"
  ON permit_types FOR SELECT
  USING (true);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_permit_types_category ON permit_types(category);
CREATE INDEX IF NOT EXISTS idx_permit_types_active ON permit_types(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_permit_types_sort ON permit_types(sort_order);

-- ============================================
-- SEED PERMIT TYPES DATA
-- TTU Parking Permit Information 2024-2025
-- ============================================

INSERT INTO permit_types (id, name, short_name, price, description, category, valid_lots, cross_lot_time, free_time, icon, color, sort_order) VALUES
  -- Commuter Permits
  ('commuter_west', 'Commuter West', 'West', 143.00,
   'Lots C11-C16 (Recreation Center area)',
   'commuter', ARRAY['C1', 'C4', 'C16'], '14:30', '17:30', 'car', '#3B82F6', 1),

  ('commuter_north', 'Commuter North', 'North', 162.00,
   'Lots C1-C10 (Stadium area)',
   'commuter', ARRAY['C11', 'C12'], '14:30', '17:30', 'car', '#3B82F6', 2),

  ('commuter_east', 'Commuter East', 'East', 143.00,
   'Lots C14-C15 (East campus)',
   'commuter', ARRAY['C14', 'C15'], '14:30', '17:30', 'car', '#3B82F6', 3),

  ('satellite', 'Satellite', 'S1', 44.00,
   'Satellite lot with free Citibus service to campus',
   'commuter', ARRAY['S1'], NULL, '17:30', 'bus', '#10B981', 4),

  -- Residence Hall Permits
  ('residence_halls', 'Residence Halls', 'Res Hall', 263.00,
   'Zone parking for residence hall students',
   'residence', ARRAY['C15', 'S1'], NULL, '17:30', 'building', '#8B5CF6', 10),

  -- Garage Permits
  ('garage_flint', 'Flint Avenue Garage', 'Flint', 517.00,
   'Covered parking at Flint Avenue Garage',
   'garage', ARRAY['FLINT'], NULL, NULL, 'building-2', '#F59E0B', 20),

  ('garage_raider', 'Raider Park Garage', 'Raider', 143.00,
   'Covered parking at Raider Park Garage',
   'garage', ARRAY['RAIDER'], NULL, NULL, 'building-2', '#F59E0B', 21),

  -- Other Permits
  ('faculty_staff', 'Faculty/Staff', 'F/S', 240.00,
   'Faculty and Staff parking - valid in most lots',
   'other', ARRAY['C1','C4','C11','C12','C14','C15','C16','S1'], NULL, NULL, 'briefcase', '#6366F1', 30),

  ('reserved', 'Reserved', 'Reserved', 500.00,
   'Reserved designated parking space',
   'other', ARRAY[]::TEXT[], NULL, NULL, 'lock', '#EF4444', 31),

  ('visitor', 'Visitor', 'Visitor', 0.00,
   'Pay-per-use visitor parking ($1.50/hr, $9/day max)',
   'other', ARRAY[]::TEXT[], NULL, NULL, 'users', '#6B7280', 40),

  ('motorcycle', 'Motorcycle', 'Moto', 50.00,
   'Motorcycle designated parking',
   'other', ARRAY[]::TEXT[], NULL, '17:30', 'zap', '#EC4899', 41),

  ('ev', 'Electric Vehicle', 'EV', 143.00,
   'Electric vehicle charging station access',
   'other', ARRAY['C14'], NULL, NULL, 'battery-charging', '#22C55E', 42),

  ('accessible', 'Accessible', 'ADA', 0.00,
   'Accessible parking - designated spaces only',
   'other', ARRAY['C1','C4','C11','C12','C14','C15','C16','S1'], NULL, NULL, 'accessibility', '#0EA5E9', 43),

  ('none', 'No Permit', 'None', 0.00,
   'No parking permit - free after 5:30pm and weekends',
   'other', ARRAY[]::TEXT[], NULL, '17:30', 'x', '#9CA3AF', 99)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  valid_lots = EXCLUDED.valid_lots,
  cross_lot_time = EXCLUDED.cross_lot_time,
  free_time = EXCLUDED.free_time,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ============================================
-- CREATE VIEW FOR PERMIT CATEGORIES
-- ============================================

CREATE OR REPLACE VIEW permit_categories AS
SELECT
  category,
  array_agg(id ORDER BY sort_order) as permit_ids,
  COUNT(*) as permit_count
FROM permit_types
WHERE is_active = TRUE
GROUP BY category
ORDER BY MIN(sort_order);

-- ============================================
-- UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_permit_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_permit_types ON permit_types;
CREATE TRIGGER trigger_update_permit_types
  BEFORE UPDATE ON permit_types
  FOR EACH ROW EXECUTE FUNCTION update_permit_types_updated_at();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Permit types table created and seeded successfully!';
  RAISE NOTICE 'Inserted % permit types', (SELECT COUNT(*) FROM permit_types);
END $$;
