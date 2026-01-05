// ============================================================
// TTU PARKING PERMIT DATA (Fallback - Backend is primary source)
// Source: https://www.depts.ttu.edu/parking/Resources/Transparency/PermitCosts.php
// Last verified: January 2026
// ============================================================

// Note: This file is used as offline fallback only.
// Real data is fetched from Supabase permit_types table.

export interface PermitInfo {
  id: string;
  name: string;
  shortName: string;
  price: number; // 9-month rate in USD
  description: string;
  validLots: string[];
  crossLotTime?: string; // When cross-lot parking starts (2:30 PM)
  freeTime?: string; // When parking becomes free (5:30 PM)
}

// Authentic TTU permit data
export const PERMITS: Record<string, PermitInfo> = {
  // ============================================
  // COMMUTER PERMITS
  // ============================================
  commuter_west: {
    id: 'commuter_west',
    name: 'Commuter West',
    shortName: 'West',
    price: 143.00,
    description: '7 lots off Indiana Ave & Texas Tech Pkwy near United Supermarkets Arena',
    validLots: ['CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7'],
    crossLotTime: '14:30',
    freeTime: '17:30',
  },
  commuter_north: {
    id: 'commuter_north',
    name: 'Commuter North',
    shortName: 'North',
    price: 162.00,
    description: 'C1 & C4 near Jones AT&T Stadium and Rawls College of Business',
    validLots: ['C1', 'C4'],
    crossLotTime: '14:30',
    freeTime: '17:30',
  },
  commuter_icc: {
    id: 'commuter_icc',
    name: 'Commuter ICC',
    shortName: 'ICC',
    price: 162.00,
    description: 'Two lots near Rawls College of Business',
    validLots: ['ICC1', 'ICC2'],
    crossLotTime: '14:30',
    freeTime: '17:30',
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    shortName: 'Sat',
    price: 44.00,
    description: 'Large lots off Texas Tech Pkwy with free bus every 7 mins',
    validLots: ['S1', 'S2'],
    freeTime: '17:30',
  },
  evening_commuter: {
    id: 'evening_commuter',
    name: 'Evening Commuter',
    shortName: 'Eve',
    price: 44.00,
    description: 'Free parking in commuter lots after 2:30 PM weekdays',
    validLots: ['C1', 'C4', 'CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7', 'ICC1', 'ICC2'],
    crossLotTime: '14:30',
  },

  // ============================================
  // RESIDENCE HALL PERMITS (Z1-Z7)
  // ============================================
  residence_z1: {
    id: 'residence_z1',
    name: 'Z1 - Gordon/Bledsoe/Sneed',
    shortName: 'Z1',
    price: 263.00,
    description: 'Two lots at 8th & Akron streets',
    validLots: ['Z1-A', 'Z1-B'],
  },
  residence_z2: {
    id: 'residence_z2',
    name: 'Z2 - Horn/Knapp/Talkington',
    shortName: 'Z2',
    price: 263.00,
    description: 'Portions of four lots for Z2 residents',
    validLots: ['Z2-A', 'Z2-B', 'Z2-C', 'Z2-D'],
  },
  residence_z3: {
    id: 'residence_z3',
    name: 'Z3 - Wall/Gates/Hulen/Clement',
    shortName: 'Z3',
    price: 263.00,
    description: 'One lot off 19th St, two lots off 18th St',
    validLots: ['Z3-A', 'Z3-B', 'Z3-C'],
  },
  residence_z4: {
    id: 'residence_z4',
    name: 'Z4 - Chitwood/Weymouth/Coleman',
    shortName: 'Z4',
    price: 263.00,
    description: 'Main lot off Hartford & 18th, smaller lot off Flint & 18th',
    validLots: ['Z4-A', 'Z4-B'],
  },
  residence_z5: {
    id: 'residence_z5',
    name: 'Z5 - Stangel/Murdough',
    shortName: 'Z5',
    price: 263.00,
    description: 'Over 700 spaces in three lots',
    validLots: ['Z5-A', 'Z5-B', 'Z5-C'],
  },
  residence_z6: {
    id: 'residence_z6',
    name: 'Z6 - Carpenter/Wells/Murray/Honors',
    shortName: 'Z6',
    price: 263.00,
    description: 'Two lots off Flint Avenue',
    validLots: ['Z6-A', 'Z6-B'],
  },
  residence_z7: {
    id: 'residence_z7',
    name: 'Z7 - West Village',
    shortName: 'Z7',
    price: 263.00,
    description: 'North of West Village at Texas Tech Pkwy & Indiana Ave',
    validLots: ['Z7-A'],
  },

  // ============================================
  // GARAGE PERMITS
  // ============================================
  garage_flint: {
    id: 'garage_flint',
    name: 'Flint Avenue Garage',
    shortName: 'Flint',
    price: 517.50,
    description: 'Covered garage near busy campus area - guaranteed parking',
    validLots: ['FLINT'],
  },
  garage_raider: {
    id: 'garage_raider',
    name: 'Raider Park Garage',
    shortName: 'Raider',
    price: 143.00,
    description: 'Covered garage north of campus across Marsha Sharp Freeway',
    validLots: ['RAIDER'],
  },

  // ============================================
  // OTHER PERMITS
  // ============================================
  faculty_staff: {
    id: 'faculty_staff',
    name: 'Faculty/Staff Area Reserved',
    shortName: 'F/S',
    price: 263.00,
    description: 'Surface Area Reserved parking for faculty and staff',
    validLots: ['C1', 'C4', 'CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7'],
  },
  motorcycle: {
    id: 'motorcycle',
    name: 'Motorcycle',
    shortName: 'Moto',
    price: 66.80,
    description: 'Motorcycle designated parking (9-month rate)',
    validLots: [],
  },
  visitor: {
    id: 'visitor',
    name: 'Visitor',
    shortName: 'Visitor',
    price: 0,
    description: 'Pay-per-use: $1.50/hr or $9/day max (surface & garage)',
    validLots: [],
  },
  accessible: {
    id: 'accessible',
    name: 'Accessible',
    shortName: 'ADA',
    price: 0,
    description: 'Accessible parking - designated spaces only',
    validLots: ['C1', 'C4', 'CW1', 'CW2', 'CW3', 'CW4', 'CW5', 'CW6', 'CW7'],
  },
  none: {
    id: 'none',
    name: 'No Permit',
    shortName: 'None',
    price: 0,
    description: 'No parking permit - free after 5:30pm and weekends',
    validLots: [],
    freeTime: '17:30',
  },
};

// Permit Categories for Selection UI (fallback only)
export const PERMIT_CATEGORIES = [
  {
    title: 'Commuter',
    permits: ['commuter_west', 'commuter_north', 'commuter_icc', 'satellite', 'evening_commuter'],
  },
  {
    title: 'Residence Hall',
    permits: ['residence_z1', 'residence_z2', 'residence_z3', 'residence_z4', 'residence_z5', 'residence_z6', 'residence_z7'],
  },
  {
    title: 'Garage',
    permits: ['garage_flint', 'garage_raider'],
  },
  {
    title: 'Other',
    permits: ['faculty_staff', 'motorcycle', 'visitor', 'accessible'],
  },
];

// Get permit info helper
export const getPermitInfo = (permitType: string): PermitInfo => {
  return PERMITS[permitType] ?? PERMITS.none;
};
