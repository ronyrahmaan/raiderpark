// ============================================================
// TTU CAMPUS WALK TIMES
// Pre-calculated walk times from parking lots to buildings
// Based on GPS coordinates and average walking speed (80m/min)
// with 20% path adjustment factor for campus walkways
// ============================================================

/**
 * Walk times in minutes from each lot to each building
 * Format: walkTimes[lotId][buildingId] = minutes
 *
 * Calculated using:
 * - Haversine formula for distance
 * - Average walking speed: 80 meters/minute (4.8 km/h)
 * - Path factor: 1.2x (campus paths aren't straight lines)
 */
export const WALK_TIMES: Record<string, Record<string, number>> = {
  // ============================================================
  // C1 - Jones AT&T Stadium Lot (North Campus)
  // GPS: 33.5906, -101.8725
  // ============================================================
  C1: {
    // Academic Buildings
    rawls: 4,
    ba: 5,
    holden_hall: 6,
    english_philosophy: 5,
    mass_comm: 6,
    chemistry: 5,
    biology: 4,
    math: 5,
    physics: 5,
    electrical_eng: 8,
    civil_eng: 9,
    mechanical_eng: 9,
    petroleum_eng: 10,
    computer_science: 8,
    human_sciences: 3,
    education: 4,
    art: 3,
    architecture: 3,
    ag_sciences: 2,
    law_school: 6,
    hsc: 8,
    music: 5,
    theatre: 5,
    foreign_lang: 5,
    // Library & Student Center
    library: 5,
    sub: 6,
    // Athletics
    rec_center: 10,
    usa: 8,
    jones_att: 1,
    // Administration
    admin: 6,
    doak: 5,
  },

  // ============================================================
  // C4 - Rawls Lot (North Campus)
  // GPS: 33.5870, -101.8780
  // ============================================================
  C4: {
    // Academic Buildings
    rawls: 2,
    ba: 3,
    holden_hall: 3,
    english_philosophy: 3,
    mass_comm: 4,
    chemistry: 3,
    biology: 3,
    math: 3,
    physics: 3,
    electrical_eng: 5,
    civil_eng: 6,
    mechanical_eng: 6,
    petroleum_eng: 7,
    computer_science: 5,
    human_sciences: 3,
    education: 3,
    art: 4,
    architecture: 4,
    ag_sciences: 4,
    law_school: 5,
    hsc: 7,
    music: 3,
    theatre: 4,
    foreign_lang: 2,
    // Library & Student Center
    library: 2,
    sub: 3,
    // Athletics
    rec_center: 7,
    usa: 6,
    jones_att: 4,
    // Administration
    admin: 3,
    doak: 4,
  },

  // ============================================================
  // C11 - Recreation Center Lot (West Campus)
  // GPS: 33.5830, -101.8850
  // NOTE: 2-hour time limit
  // ============================================================
  C11: {
    // Academic Buildings
    rawls: 8,
    ba: 7,
    holden_hall: 5,
    english_philosophy: 6,
    mass_comm: 6,
    chemistry: 7,
    biology: 7,
    math: 6,
    physics: 7,
    electrical_eng: 4,
    civil_eng: 3,
    mechanical_eng: 4,
    petroleum_eng: 4,
    computer_science: 3,
    human_sciences: 8,
    education: 7,
    art: 8,
    architecture: 8,
    ag_sciences: 9,
    law_school: 9,
    hsc: 11,
    music: 8,
    theatre: 8,
    foreign_lang: 6,
    // Library & Student Center
    library: 6,
    sub: 7,
    // Athletics
    rec_center: 1,
    usa: 4,
    jones_att: 9,
    // Administration
    admin: 5,
    doak: 8,
  },

  // ============================================================
  // C12 - Arena Lot (West Campus)
  // GPS: 33.5850, -101.8830
  // ============================================================
  C12: {
    // Academic Buildings
    rawls: 7,
    ba: 6,
    holden_hall: 4,
    english_philosophy: 5,
    mass_comm: 5,
    chemistry: 6,
    biology: 6,
    math: 5,
    physics: 6,
    electrical_eng: 3,
    civil_eng: 4,
    mechanical_eng: 4,
    petroleum_eng: 4,
    computer_science: 3,
    human_sciences: 7,
    education: 6,
    art: 7,
    architecture: 7,
    ag_sciences: 8,
    law_school: 8,
    hsc: 10,
    music: 7,
    theatre: 7,
    foreign_lang: 5,
    // Library & Student Center
    library: 5,
    sub: 6,
    // Athletics
    rec_center: 3,
    usa: 2,
    jones_att: 8,
    // Administration
    admin: 4,
    doak: 7,
  },

  // ============================================================
  // C14 - West Lot 14 (West Campus - ICING ZONE)
  // GPS: 33.5810, -101.8880
  // ============================================================
  C14: {
    // Academic Buildings
    rawls: 9,
    ba: 8,
    holden_hall: 6,
    english_philosophy: 7,
    mass_comm: 7,
    chemistry: 8,
    biology: 8,
    math: 7,
    physics: 8,
    electrical_eng: 5,
    civil_eng: 4,
    mechanical_eng: 5,
    petroleum_eng: 5,
    computer_science: 4,
    human_sciences: 9,
    education: 8,
    art: 9,
    architecture: 9,
    ag_sciences: 10,
    law_school: 10,
    hsc: 12,
    music: 9,
    theatre: 9,
    foreign_lang: 7,
    // Library & Student Center
    library: 7,
    sub: 8,
    // Athletics
    rec_center: 4,
    usa: 5,
    jones_att: 10,
    // Administration
    admin: 6,
    doak: 9,
  },

  // ============================================================
  // C15 - West Lot 15 (West Campus - ICING ZONE)
  // GPS: 33.5800, -101.8890
  // ============================================================
  C15: {
    // Academic Buildings
    rawls: 10,
    ba: 9,
    holden_hall: 7,
    english_philosophy: 8,
    mass_comm: 8,
    chemistry: 9,
    biology: 9,
    math: 8,
    physics: 9,
    electrical_eng: 6,
    civil_eng: 5,
    mechanical_eng: 5,
    petroleum_eng: 5,
    computer_science: 5,
    human_sciences: 10,
    education: 9,
    art: 10,
    architecture: 10,
    ag_sciences: 11,
    law_school: 11,
    hsc: 13,
    music: 10,
    theatre: 10,
    foreign_lang: 8,
    // Library & Student Center
    library: 8,
    sub: 9,
    // Athletics
    rec_center: 5,
    usa: 6,
    jones_att: 11,
    // Administration
    admin: 7,
    doak: 10,
  },

  // ============================================================
  // C16 - West Lot 16 (West Campus - ICING ZONE)
  // GPS: 33.5790, -101.8900
  // ============================================================
  C16: {
    // Academic Buildings
    rawls: 11,
    ba: 10,
    holden_hall: 8,
    english_philosophy: 9,
    mass_comm: 9,
    chemistry: 10,
    biology: 10,
    math: 9,
    physics: 10,
    electrical_eng: 7,
    civil_eng: 6,
    mechanical_eng: 6,
    petroleum_eng: 6,
    computer_science: 6,
    human_sciences: 11,
    education: 10,
    art: 11,
    architecture: 11,
    ag_sciences: 12,
    law_school: 12,
    hsc: 14,
    music: 11,
    theatre: 11,
    foreign_lang: 9,
    // Library & Student Center
    library: 9,
    sub: 10,
    // Athletics
    rec_center: 6,
    usa: 7,
    jones_att: 12,
    // Administration
    admin: 8,
    doak: 11,
  },

  // ============================================================
  // S1 - Satellite Lot (Remote)
  // GPS: 33.5700, -101.9000
  // NOTE: Includes shuttle ride time (8 min) + wait (4 min avg)
  // These times are TOTAL times including shuttle
  // ============================================================
  S1: {
    // Academic Buildings - All include ~12 min shuttle time + walk from stop
    rawls: 16,
    ba: 16,
    holden_hall: 15,
    english_philosophy: 15,
    mass_comm: 15,
    chemistry: 16,
    biology: 16,
    math: 15,
    physics: 16,
    electrical_eng: 14,
    civil_eng: 14,
    mechanical_eng: 14,
    petroleum_eng: 14,
    computer_science: 14,
    human_sciences: 17,
    education: 16,
    art: 17,
    architecture: 17,
    ag_sciences: 18,
    law_school: 17,
    hsc: 19,
    music: 16,
    theatre: 16,
    foreign_lang: 15,
    // Library & Student Center
    library: 15,
    sub: 14, // Main shuttle stop near SUB
    // Athletics
    rec_center: 13,
    usa: 14,
    jones_att: 17,
    // Administration
    admin: 15,
    doak: 16,
  },
};

/**
 * Get walk time from a lot to a building
 */
export function getWalkTime(lotId: string, buildingId: string): number | undefined {
  return WALK_TIMES[lotId]?.[buildingId];
}

/**
 * Get all walk times from a specific lot
 */
export function getWalkTimesForLot(lotId: string): Record<string, number> | undefined {
  return WALK_TIMES[lotId];
}

/**
 * Find nearest lot to a building (excluding satellite)
 */
export function findNearestLot(
  buildingId: string,
  excludeLots: string[] = ['S1']
): { lotId: string; minutes: number } | null {
  let nearest: { lotId: string; minutes: number } | null = null;

  for (const [lotId, walkTimes] of Object.entries(WALK_TIMES)) {
    if (excludeLots.includes(lotId)) continue;

    const time = walkTimes[buildingId];
    if (time !== undefined) {
      if (!nearest || time < nearest.minutes) {
        nearest = { lotId, minutes: time };
      }
    }
  }

  return nearest;
}

/**
 * Get lots sorted by walk time to a building
 */
export function getLotsByWalkTime(buildingId: string): Array<{ lotId: string; minutes: number }> {
  const lots: Array<{ lotId: string; minutes: number }> = [];

  for (const [lotId, walkTimes] of Object.entries(WALK_TIMES)) {
    const time = walkTimes[buildingId];
    if (time !== undefined) {
      lots.push({ lotId, minutes: time });
    }
  }

  return lots.sort((a, b) => a.minutes - b.minutes);
}

/**
 * Common building shortcuts for quick access
 */
export const BUILDING_SHORTCUTS: Record<string, string> = {
  lib: 'library',
  rec: 'rec_center',
  eng: 'electrical_eng',
  cs: 'computer_science',
  biz: 'rawls',
  law: 'law_school',
  med: 'hsc',
  arena: 'usa',
  stadium: 'jones_att',
};

export default WALK_TIMES;
