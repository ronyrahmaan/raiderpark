// ============================================================
// TTU PARKING PERMIT DATA
// ============================================================

import { PermitType } from '@/types/database';

export interface PermitInfo {
  id: PermitType;
  name: string;
  shortName: string;
  price: number; // Annual price in USD
  description: string;
  validLots: string[];
  crossLotTime?: string; // When cross-lot parking starts
  freeTime?: string; // When parking becomes free
}

export const PERMITS: Record<PermitType, PermitInfo> = {
  commuter_west: {
    id: 'commuter_west',
    name: 'Commuter West',
    shortName: 'West',
    price: 143,
    description: 'Lots C11-C16 (Recreation Center area)',
    validLots: ['C11', 'C12', 'C14', 'C15', 'C16'],
    crossLotTime: '14:30',
    freeTime: '17:30',
  },
  commuter_north: {
    id: 'commuter_north',
    name: 'Commuter North',
    shortName: 'North',
    price: 162,
    description: 'Lots C1-C10 (Stadium area)',
    validLots: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10'],
    crossLotTime: '14:30',
    freeTime: '17:30',
  },
  commuter_satellite: {
    id: 'commuter_satellite',
    name: 'Satellite',
    shortName: 'S1',
    price: 44,
    description: 'Satellite lot with bus service',
    validLots: ['S1'],
    freeTime: '17:30',
  },
  residence_z1: {
    id: 'residence_z1',
    name: 'Residence Hall Z1',
    shortName: 'Z1',
    price: 143,
    description: 'Zone 1 Residence Hall Parking',
    validLots: ['Z1-A', 'Z1-B'],
  },
  residence_z2: {
    id: 'residence_z2',
    name: 'Residence Hall Z2',
    shortName: 'Z2',
    price: 143,
    description: 'Zone 2 Residence Hall Parking',
    validLots: ['Z2-A', 'Z2-B'],
  },
  residence_z3: {
    id: 'residence_z3',
    name: 'Residence Hall Z3',
    shortName: 'Z3',
    price: 143,
    description: 'Zone 3 Residence Hall Parking',
    validLots: ['Z3-A', 'Z3-B'],
  },
  residence_z4: {
    id: 'residence_z4',
    name: 'Residence Hall Z4',
    shortName: 'Z4',
    price: 143,
    description: 'Zone 4 Residence Hall Parking',
    validLots: ['Z4-A', 'Z4-B'],
  },
  residence_z5: {
    id: 'residence_z5',
    name: 'Residence Hall Z5',
    shortName: 'Z5',
    price: 143,
    description: 'Zone 5 Residence Hall Parking',
    validLots: ['Z5-A', 'Z5-B'],
  },
  residence_z6: {
    id: 'residence_z6',
    name: 'Residence Hall Z6',
    shortName: 'Z6',
    price: 143,
    description: 'Zone 6 Residence Hall Parking',
    validLots: ['Z6-A', 'Z6-B'],
  },
  faculty_staff: {
    id: 'faculty_staff',
    name: 'Faculty/Staff',
    shortName: 'F/S',
    price: 240,
    description: 'Faculty and Staff Parking',
    validLots: ['F1', 'F2', 'F3', 'F4', 'F5'],
  },
  garage_flint: {
    id: 'garage_flint',
    name: 'Flint Avenue Garage',
    shortName: 'Flint',
    price: 420,
    description: 'Flint Avenue Parking Garage',
    validLots: ['FLINT'],
  },
  garage_raider: {
    id: 'garage_raider',
    name: 'Raider Park Garage',
    shortName: 'Raider',
    price: 420,
    description: 'Raider Park Parking Garage',
    validLots: ['RAIDER'],
  },
  visitor: {
    id: 'visitor',
    name: 'Visitor',
    shortName: 'Visitor',
    price: 0,
    description: 'Visitor/Metered Parking',
    validLots: ['V1', 'V2', 'METERED'],
  },
  none: {
    id: 'none',
    name: 'No Permit',
    shortName: 'None',
    price: 0,
    description: 'No parking permit',
    validLots: [],
  },
};

// Permit Categories for Selection UI
export const PERMIT_CATEGORIES = [
  {
    title: 'Commuter',
    permits: ['commuter_west', 'commuter_north', 'commuter_satellite'] as PermitType[],
  },
  {
    title: 'Residence Hall',
    permits: [
      'residence_z1',
      'residence_z2',
      'residence_z3',
      'residence_z4',
      'residence_z5',
      'residence_z6',
    ] as PermitType[],
  },
  {
    title: 'Garage',
    permits: ['garage_flint', 'garage_raider'] as PermitType[],
  },
  {
    title: 'Other',
    permits: ['faculty_staff', 'visitor'] as PermitType[],
  },
];

// Get permit info helper
export const getPermitInfo = (permitType: PermitType): PermitInfo => {
  return PERMITS[permitType] ?? PERMITS.none;
};
