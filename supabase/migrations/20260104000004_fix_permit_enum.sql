-- Migration: Fix Permit Type Enum
-- Add 'none' value for users who haven't selected a permit yet

-- Add 'none' to permit_type enum
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'none';

-- Also add missing residence hall zone permits
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'commuter_icc';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'evening_commuter';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'satellite';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z1';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z2';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z3';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z4';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z5';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z6';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'residence_z7';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'garage_flint';
ALTER TYPE permit_type ADD VALUE IF NOT EXISTS 'garage_raider';

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'permit_type enum updated with none and additional values';
END $$;
