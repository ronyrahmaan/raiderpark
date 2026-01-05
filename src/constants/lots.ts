// ============================================================
// TTU PARKING LOTS STATIC DATA
// This file contains the complete list of Texas Tech parking lots
// with their properties, coordinates, and walk times.
// ============================================================

import { Lot, LotArea } from '../types/database';

// ============================================================
// LOT DATA
// Based on seed data from RaiderPark_COMPLETE_Supabase_Plan.md
// ============================================================

export const LOTS: Record<string, Lot> = {
  // ============================================================
  // COMMUTER NORTH LOTS
  // ============================================================
  C1: {
    id: 'C1',
    name: 'Jones AT&T Stadium Lot',
    short_name: 'Stadium',
    area: 'commuter_north' as LotArea,
    center: {
      lat: 33.5906,
      lng: -101.8725,
    },
    geofence: null,
    capacity: 400,
    accessible_spots: 10,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: false,
    walk_times: {
      rawls: 4,
      library: 8,
      sub: 6,
    },
    notes: [],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  C4: {
    id: 'C4',
    name: 'Rawls Lot',
    short_name: 'Rawls',
    area: 'commuter_north' as LotArea,
    center: {
      lat: 33.5870,
      lng: -101.8780,
    },
    geofence: null,
    capacity: 500,
    accessible_spots: 12,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: false,
    walk_times: {
      rawls: 2,
      library: 5,
      sub: 4,
    },
    notes: [],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  // ============================================================
  // COMMUTER WEST LOTS
  // ============================================================
  C11: {
    id: 'C11',
    name: 'Recreation Center Lot',
    short_name: 'Rec Center',
    area: 'commuter_west' as LotArea,
    center: {
      lat: 33.5830,
      lng: -101.8850,
    },
    geofence: null,
    capacity: 450,
    accessible_spots: 10,
    ev_charging: false,
    time_limit_minutes: 120,
    is_icing_zone: false,
    walk_times: {
      rec: 1,
      library: 6,
      rawls: 8,
      sub: 7,
    },
    notes: [],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  C12: {
    id: 'C12',
    name: 'Arena Lot',
    short_name: 'Arena',
    area: 'commuter_west' as LotArea,
    center: {
      lat: 33.5850,
      lng: -101.8830,
    },
    geofence: null,
    capacity: 400,
    accessible_spots: 10,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: false,
    walk_times: {
      rec: 3,
      library: 5,
      rawls: 7,
      sub: 6,
    },
    notes: [],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  C14: {
    id: 'C14',
    name: 'West Lot 14',
    short_name: 'West 14',
    area: 'commuter_west' as LotArea,
    center: {
      lat: 33.5810,
      lng: -101.8880,
    },
    geofence: null,
    capacity: 350,
    accessible_spots: 8,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: true,
    walk_times: {
      rec: 4,
      library: 7,
      rawls: 9,
    },
    notes: ['Near residence towers - watch for icing conditions'],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  C15: {
    id: 'C15',
    name: 'West Lot 15',
    short_name: 'West 15',
    area: 'commuter_west' as LotArea,
    center: {
      lat: 33.5800,
      lng: -101.8890,
    },
    geofence: null,
    capacity: 350,
    accessible_spots: 8,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: true,
    walk_times: {
      rec: 5,
      library: 8,
      rawls: 10,
    },
    notes: ['Near residence towers - watch for icing conditions'],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  C16: {
    id: 'C16',
    name: 'West Lot 16',
    short_name: 'West 16',
    area: 'commuter_west' as LotArea,
    center: {
      lat: 33.5790,
      lng: -101.8900,
    },
    geofence: null,
    capacity: 500,
    accessible_spots: 12,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: true,
    walk_times: {
      rec: 6,
      library: 9,
      rawls: 12,
    },
    notes: ['Near residence towers - watch for icing conditions'],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },

  // ============================================================
  // SATELLITE LOTS
  // ============================================================
  S1: {
    id: 'S1',
    name: 'Satellite Lot',
    short_name: 'Satellite',
    area: 'satellite' as LotArea,
    center: {
      lat: 33.5700,
      lng: -101.9000,
    },
    geofence: null,
    capacity: 1500,
    accessible_spots: 20,
    ev_charging: false,
    time_limit_minutes: null,
    is_icing_zone: false,
    walk_times: {
      sub: 12,
    },
    notes: ['Shuttle service available to campus'],
    common_violations: [],
    created_at: '',
    updated_at: '',
  },
};

// ============================================================
// DERIVED ARRAYS AND HELPERS
// ============================================================

export const LOTS_ARRAY: Lot[] = Object.values(LOTS);
export const LOT_IDS: string[] = Object.keys(LOTS);

export function getLotsByArea(area: LotArea): Lot[] {
  return LOTS_ARRAY.filter((lot) => lot.area === area);
}

export function getIcingZoneLots(): Lot[] {
  return LOTS_ARRAY.filter((lot) => lot.is_icing_zone);
}

export function getTimeLimitedLots(): Lot[] {
  return LOTS_ARRAY.filter((lot) => lot.time_limit_minutes !== null);
}

export function getLotById(id: string): Lot | undefined {
  return LOTS[id];
}

export function getWalkTime(lotId: string, building: string): number | undefined {
  const lot = LOTS[lotId];
  if (!lot) return undefined;
  return lot.walk_times[building];
}

// ============================================================
// AREA GROUPINGS
// ============================================================

export const COMMUTER_NORTH_LOTS = getLotsByArea('commuter_north');
export const COMMUTER_WEST_LOTS = getLotsByArea('commuter_west');
export const SATELLITE_LOTS = getLotsByArea('satellite');
export const ICING_ZONE_LOTS = getIcingZoneLots();

export const AREA_DISPLAY_NAMES: Record<LotArea, string> = {
  commuter_west: 'Commuter West',
  commuter_north: 'Commuter North',
  satellite: 'Satellite',
  residence: 'Residence',
  garage: 'Garage',
  metered: 'Metered',
  faculty: 'Faculty/Staff',
};

export const COMMON_BUILDINGS = [
  'library',
  'sub',
  'rawls',
  'rec',
  'engineering',
  'mass_comm',
  'holden_hall',
  'science',
] as const;

export type CommonBuilding = typeof COMMON_BUILDINGS[number];
