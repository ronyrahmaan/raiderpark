-- Migration: Create Enums
-- Description: Create all enumerated types for RaiderPark

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing types if they exist (for idempotent migrations)
DROP TYPE IF EXISTS permit_type CASCADE;
DROP TYPE IF EXISTS lot_area CASCADE;
DROP TYPE IF EXISTS occupancy_status CASCADE;
DROP TYPE IF EXISTS confidence_level CASCADE;
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS report_type CASCADE;
DROP TYPE IF EXISTS reporter_level CASCADE;

-- Permit types for TTU parking (matching app's permit options)
CREATE TYPE permit_type AS ENUM (
  'commuter_west',
  'commuter_north',
  'commuter_satellite',
  'residence_z1',
  'residence_z2',
  'residence_z3',
  'residence_z4',
  'residence_z5',
  'residence_z6',
  'faculty_staff',
  'garage_flint',
  'garage_raider',
  'visitor',
  'none'
);

-- Campus areas (matching app's lot groupings)
CREATE TYPE lot_area AS ENUM (
  'commuter_west',   -- West commuter lots (C11-C16)
  'commuter_north',  -- North commuter lots (C1-C10)
  'satellite',       -- Remote satellite lots (S1)
  'residence',       -- Residence hall parking
  'garage',          -- Parking garages
  'metered',         -- Pay-per-use metered spots
  'faculty'          -- Faculty/staff only
);

-- Parking lot occupancy levels (matching app's status indicators)
CREATE TYPE occupancy_status AS ENUM (
  'open',     -- 0-40% full (easy to find spot)
  'busy',     -- 40-60% full (moderate difficulty)
  'filling',  -- 60-80% full (getting difficult)
  'full',     -- 80-100% full (very hard)
  'closed'    -- Lot is closed
);

-- Confidence level for predictions/reports
CREATE TYPE confidence_level AS ENUM (
  'low',      -- Single report or old data
  'medium',   -- Multiple reports or recent data
  'high',     -- Many reports or very recent data
  'verified'  -- Verified by trusted source
);

-- Types of events that affect parking (matching app's event categories)
CREATE TYPE event_type AS ENUM (
  'football',
  'basketball',
  'baseball',
  'concert',
  'graduation',
  'university',   -- General university events
  'icing',        -- Weather-related closure
  'construction',
  'other'         -- Misc events
);

-- Types of user reports (matching app's report options)
CREATE TYPE report_type AS ENUM (
  'parked',        -- User just parked here
  'left',          -- User just left this lot
  'status_report', -- General status update
  'full_report',   -- Detailed report with all info
  'enforcement',   -- Spotted parking enforcement
  'hazard'         -- Pothole, flooding, etc.
);

-- Reporter trust levels for gamification (matching app's level system)
CREATE TYPE reporter_level AS ENUM (
  'newbie',       -- 0-5 reports
  'rookie',       -- 5-25 reports
  'regular',      -- 25-75 reports
  'veteran',      -- 75-200 reports
  'legend',       -- 200-500 reports
  'mvp',          -- 500-1000 reports
  'hall_of_fame'  -- 1000+ reports
);
