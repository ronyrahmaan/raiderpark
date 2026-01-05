// ============================================================
// TTU CAMPUS BUILDINGS
// Building data for class scheduling and walk time calculations
// ============================================================

export interface Building {
  id: string;
  name: string;
  shortName: string;
  coordinates: { lat: number; lng: number };
  category: BuildingCategory;
}

export type BuildingCategory =
  | 'academic'
  | 'library'
  | 'student_center'
  | 'athletics'
  | 'residence'
  | 'administration'
  | 'other';

// Major TTU Campus Buildings
export const BUILDINGS: Building[] = [
  // Academic Buildings
  {
    id: 'rawls',
    name: 'Jerry S. Rawls College of Business',
    shortName: 'Rawls',
    coordinates: { lat: 33.5847, lng: -101.8744 },
    category: 'academic',
  },
  {
    id: 'ba',
    name: 'Business Administration',
    shortName: 'BA',
    coordinates: { lat: 33.5840, lng: -101.8752 },
    category: 'academic',
  },
  {
    id: 'holden_hall',
    name: 'Holden Hall',
    shortName: 'HOLDEN',
    coordinates: { lat: 33.5844, lng: -101.8778 },
    category: 'academic',
  },
  {
    id: 'english_philosophy',
    name: 'English/Philosophy Building',
    shortName: 'ENGL',
    coordinates: { lat: 33.5851, lng: -101.8772 },
    category: 'academic',
  },
  {
    id: 'mass_comm',
    name: 'Mass Communications',
    shortName: 'MCOM',
    coordinates: { lat: 33.5837, lng: -101.8765 },
    category: 'academic',
  },
  {
    id: 'chemistry',
    name: 'Chemistry Building',
    shortName: 'CHEM',
    coordinates: { lat: 33.5856, lng: -101.8756 },
    category: 'academic',
  },
  {
    id: 'biology',
    name: 'Biology Building',
    shortName: 'BIOL',
    coordinates: { lat: 33.5863, lng: -101.8748 },
    category: 'academic',
  },
  {
    id: 'math',
    name: 'Mathematics Building',
    shortName: 'MATH',
    coordinates: { lat: 33.5859, lng: -101.8765 },
    category: 'academic',
  },
  {
    id: 'physics',
    name: 'Science Building',
    shortName: 'SCI',
    coordinates: { lat: 33.5862, lng: -101.8757 },
    category: 'academic',
  },
  {
    id: 'electrical_eng',
    name: 'Electrical Engineering',
    shortName: 'EE',
    coordinates: { lat: 33.5835, lng: -101.8795 },
    category: 'academic',
  },
  {
    id: 'civil_eng',
    name: 'Civil Engineering',
    shortName: 'CE',
    coordinates: { lat: 33.5832, lng: -101.8805 },
    category: 'academic',
  },
  {
    id: 'mechanical_eng',
    name: 'Mechanical Engineering',
    shortName: 'ME',
    coordinates: { lat: 33.5838, lng: -101.8812 },
    category: 'academic',
  },
  {
    id: 'petroleum_eng',
    name: 'Petroleum Engineering',
    shortName: 'PETR',
    coordinates: { lat: 33.5828, lng: -101.8815 },
    category: 'academic',
  },
  {
    id: 'computer_science',
    name: 'Computer Science',
    shortName: 'CS',
    coordinates: { lat: 33.5842, lng: -101.8808 },
    category: 'academic',
  },
  {
    id: 'human_sciences',
    name: 'Human Sciences',
    shortName: 'HS',
    coordinates: { lat: 33.5868, lng: -101.8738 },
    category: 'academic',
  },
  {
    id: 'education',
    name: 'College of Education',
    shortName: 'EDUC',
    coordinates: { lat: 33.5872, lng: -101.8762 },
    category: 'academic',
  },
  {
    id: 'art',
    name: 'Art Building',
    shortName: 'ART',
    coordinates: { lat: 33.5879, lng: -101.8751 },
    category: 'academic',
  },
  {
    id: 'architecture',
    name: 'Architecture Building',
    shortName: 'ARCH',
    coordinates: { lat: 33.5875, lng: -101.8741 },
    category: 'academic',
  },
  {
    id: 'ag_sciences',
    name: 'Agricultural Sciences',
    shortName: 'AGRI',
    coordinates: { lat: 33.5890, lng: -101.8738 },
    category: 'academic',
  },
  {
    id: 'law_school',
    name: 'School of Law',
    shortName: 'LAW',
    coordinates: { lat: 33.5821, lng: -101.8725 },
    category: 'academic',
  },
  {
    id: 'hsc',
    name: 'Health Sciences Center',
    shortName: 'HSC',
    coordinates: { lat: 33.5805, lng: -101.8685 },
    category: 'academic',
  },
  {
    id: 'music',
    name: 'School of Music',
    shortName: 'MUSIC',
    coordinates: { lat: 33.5845, lng: -101.8725 },
    category: 'academic',
  },
  {
    id: 'theatre',
    name: 'Theatre & Dance',
    shortName: 'THEA',
    coordinates: { lat: 33.5848, lng: -101.8718 },
    category: 'academic',
  },
  {
    id: 'foreign_lang',
    name: 'Foreign Languages',
    shortName: 'FL',
    coordinates: { lat: 33.5855, lng: -101.8782 },
    category: 'academic',
  },

  // Library
  {
    id: 'library',
    name: 'University Library',
    shortName: 'LIB',
    coordinates: { lat: 33.5847, lng: -101.8762 },
    category: 'library',
  },

  // Student Center
  {
    id: 'sub',
    name: 'Student Union Building',
    shortName: 'SUB',
    coordinates: { lat: 33.5832, lng: -101.8748 },
    category: 'student_center',
  },

  // Athletics
  {
    id: 'rec_center',
    name: 'Robert H. Ewalt Recreation Center',
    shortName: 'REC',
    coordinates: { lat: 33.5812, lng: -101.8832 },
    category: 'athletics',
  },
  {
    id: 'usa',
    name: 'United Supermarkets Arena',
    shortName: 'USA',
    coordinates: { lat: 33.5908, lng: -101.8875 },
    category: 'athletics',
  },
  {
    id: 'jones_att',
    name: 'Jones AT&T Stadium',
    shortName: 'Stadium',
    coordinates: { lat: 33.5912, lng: -101.8722 },
    category: 'athletics',
  },

  // Administration
  {
    id: 'admin',
    name: 'Administration Building',
    shortName: 'ADMIN',
    coordinates: { lat: 33.5848, lng: -101.8788 },
    category: 'administration',
  },
  {
    id: 'doak',
    name: 'Doak Conference Center',
    shortName: 'DOAK',
    coordinates: { lat: 33.5835, lng: -101.8732 },
    category: 'administration',
  },
];

// Group buildings by category
export const BUILDINGS_BY_CATEGORY = BUILDINGS.reduce((acc, building) => {
  if (!acc[building.category]) {
    acc[building.category] = [];
  }
  acc[building.category].push(building);
  return acc;
}, {} as Record<BuildingCategory, Building[]>);

// Get building by ID
export function getBuildingById(id: string): Building | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

// Get building display name
export function getBuildingDisplayName(id: string): string {
  const building = getBuildingById(id);
  return building ? building.shortName : id;
}

// Category labels for UI
export const CATEGORY_LABELS: Record<BuildingCategory, string> = {
  academic: 'Academic',
  library: 'Library',
  student_center: 'Student Center',
  athletics: 'Athletics',
  residence: 'Residence Halls',
  administration: 'Administration',
  other: 'Other',
};
