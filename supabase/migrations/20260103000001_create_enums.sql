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

-- Permit types for TTU parking
CREATE TYPE permit_type AS ENUM (
  'commuter_west',
  'commuter_north',
  'commuter_east',
  'residence_halls',
  'reserved',
  'visitor',
  'faculty_staff',
  'motorcycle',
  'ev',
  'accessible'
);

-- Campus areas
CREATE TYPE lot_area AS ENUM (
  'west',
  'north',
  'east',
  'central',
  'south'
);

-- Parking lot occupancy levels
CREATE TYPE occupancy_status AS ENUM (
  'empty',    -- 0-20% full
  'light',    -- 20-40% full
  'moderate', -- 40-60% full
  'busy',     -- 60-80% full
  'full'      -- 80-100% full
);

-- Confidence level for predictions/reports
CREATE TYPE confidence_level AS ENUM (
  'low',      -- Single report or old data
  'medium',   -- Multiple reports or recent data
  'high',     -- Many reports or very recent data
  'verified'  -- Verified by trusted source
);

-- Types of events that affect parking
CREATE TYPE event_type AS ENUM (
  'football',
  'basketball',
  'baseball',
  'concert',
  'graduation',
  'special_event',
  'icing',        -- Weather-related closure
  'construction'
);

-- Types of user reports
CREATE TYPE report_type AS ENUM (
  'occupancy',    -- Reporting how full a lot is
  'enforcement',  -- Spotted parking enforcement
  'closed',       -- Lot is closed
  'event',        -- Event affecting parking
  'hazard'        -- Pothole, flooding, etc.
);

-- Reporter trust levels for gamification
CREATE TYPE reporter_level AS ENUM (
  'newcomer',     -- 0-10 reports
  'contributor',  -- 10-50 reports
  'trusted',      -- 50-200 reports with good accuracy
  'veteran',      -- 200+ reports with good accuracy
  'expert'        -- Verified power user
);
