/**
 * Parking Permits Service
 * Fetches permit types and rules from Supabase backend
 */

import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================

export interface PermitType {
  id: string;
  name: string;
  short_name: string;
  price: number;
  description: string | null;
  category: 'commuter' | 'residence' | 'garage' | 'other';
  valid_lots: string[];
  cross_lot_time: string | null;
  free_time: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface PermitCategory {
  category: string;
  permit_ids: string[];
  permit_count: number;
}

export interface PermitRule {
  id: string;
  lot_id: string;
  permit_type: string;
  valid_from: string;
  valid_until: string;
  valid_days: number[];
  notes: string | null;
}

// ============================================================
// FETCH PERMIT TYPES
// ============================================================

/**
 * Fetch all active permit types from database
 */
export async function fetchAllPermitTypes(): Promise<PermitType[]> {
  const { data, error } = await supabase
    .from('permit_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching permit types:', error);
    throw new Error(`Failed to fetch permit types: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch a single permit type by ID
 */
export async function fetchPermitTypeById(permitId: string): Promise<PermitType | null> {
  const { data, error } = await supabase
    .from('permit_types')
    .select('*')
    .eq('id', permitId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching permit type:', error);
    throw new Error(`Failed to fetch permit type: ${error.message}`);
  }

  return data;
}

/**
 * Fetch permit types grouped by category
 */
export async function fetchPermitsByCategory(): Promise<Map<string, PermitType[]>> {
  const permits = await fetchAllPermitTypes();

  const grouped = new Map<string, PermitType[]>();

  permits.forEach(permit => {
    const category = permit.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(permit);
  });

  return grouped;
}

/**
 * Fetch permit categories view
 */
export async function fetchPermitCategories(): Promise<PermitCategory[]> {
  const { data, error } = await supabase
    .from('permit_categories')
    .select('*');

  if (error) {
    console.error('Error fetching permit categories:', error);
    throw new Error(`Failed to fetch permit categories: ${error.message}`);
  }

  return data ?? [];
}

// ============================================================
// FETCH PERMIT RULES
// ============================================================

/**
 * Fetch permit rules for a specific permit type
 */
export async function fetchPermitRules(permitType: string): Promise<PermitRule[]> {
  const { data, error } = await supabase
    .from('permit_rules')
    .select('*')
    .eq('permit_type', permitType);

  if (error) {
    console.error('Error fetching permit rules:', error);
    throw new Error(`Failed to fetch permit rules: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Fetch all lots valid for a permit type
 */
export async function fetchValidLotsForPermit(permitType: string): Promise<string[]> {
  // First try to get from permit_types table (quick reference)
  const permit = await fetchPermitTypeById(permitType);
  if (permit && permit.valid_lots.length > 0) {
    return permit.valid_lots;
  }

  // Fallback to permit_rules table
  const rules = await fetchPermitRules(permitType);
  return [...new Set(rules.map(r => r.lot_id))];
}

// ============================================================
// PERMIT VALIDATION
// ============================================================

/**
 * Check if a permit is valid for a specific lot at a given time
 */
export async function isPermitValidForLot(
  permitType: string,
  lotId: string,
  checkTime?: Date
): Promise<boolean> {
  const time = checkTime ?? new Date();

  // Use the database RPC function if available
  // @ts-expect-error - RPC function types not in generated schema yet
  const { data, error } = await supabase.rpc('is_permit_valid', {
    p_lot_id: lotId,
    p_permit_type: permitType,
    p_check_time: time.toISOString(),
  });

  if (error) {
    console.error('Error checking permit validity:', error);
    // Fallback to simple check
    const permit = await fetchPermitTypeById(permitType);
    return permit?.valid_lots.includes(lotId) ?? false;
  }

  return data ?? false;
}

// Cached parking config values
let cachedParkingConfig: {
  freeTime: string;
  crossLotTime: string;
  loadedAt: number;
} | null = null;

const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch parking config from database (with caching)
 */
async function getParkingConfig(): Promise<{ freeTime: string; crossLotTime: string }> {
  // Return cached if still valid
  if (cachedParkingConfig && Date.now() - cachedParkingConfig.loadedAt < CONFIG_CACHE_TTL) {
    return cachedParkingConfig;
  }

  try {
    const { data: rawData, error } = await supabase
      .from('parking_config')
      .select('key, value')
      .in('key', ['free_parking_time', 'cross_lot_time']);

    if (error) throw error;

    const data = (rawData || []) as Array<{ key: string; value: string }>;

    const config = {
      freeTime: '17:30',
      crossLotTime: '14:30',
      loadedAt: Date.now(),
    };

    data.forEach((row) => {
      const value = typeof row.value === 'string' ? row.value.replace(/"/g, '') : row.value;
      if (row.key === 'free_parking_time') config.freeTime = value;
      if (row.key === 'cross_lot_time') config.crossLotTime = value;
    });

    cachedParkingConfig = config;
    return config;
  } catch (err) {
    console.error('Error fetching parking config:', err);
    // Return defaults on error
    return { freeTime: '17:30', crossLotTime: '14:30' };
  }
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if parking is currently free (after hours or weekend)
 * Uses database config for flexible rules
 */
export async function isParkingFreeAsync(checkTime?: Date): Promise<boolean> {
  const now = checkTime ?? new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend - parking is free
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  const config = await getParkingConfig();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const freeTimeMinutes = parseTimeToMinutes(config.freeTime);

  return currentMinutes >= freeTimeMinutes;
}

/**
 * Check if parking is currently free (synchronous, uses cached/default values)
 */
export function isParkingFree(checkTime?: Date): boolean {
  const now = checkTime ?? new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const dayOfWeek = now.getDay();

  // Weekend - parking is free
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Use cached config or default
  const freeTime = cachedParkingConfig?.freeTime ?? '17:30';
  const currentMinutes = hours * 60 + minutes;
  const freeTimeMinutes = parseTimeToMinutes(freeTime);

  return currentMinutes >= freeTimeMinutes;
}

/**
 * Check if cross-lot parking is allowed (async, fetches from database)
 */
export async function isCrossLotAllowedAsync(checkTime?: Date): Promise<boolean> {
  const now = checkTime ?? new Date();
  const dayOfWeek = now.getDay();

  // Weekend - cross-lot always allowed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  const config = await getParkingConfig();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const crossLotMinutes = parseTimeToMinutes(config.crossLotTime);

  return currentMinutes >= crossLotMinutes;
}

/**
 * Check if cross-lot parking is allowed (synchronous, uses cached/default values)
 */
export function isCrossLotAllowed(checkTime?: Date): boolean {
  const now = checkTime ?? new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const dayOfWeek = now.getDay();

  // Weekend - cross-lot always allowed
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Use cached config or default
  const crossLotTime = cachedParkingConfig?.crossLotTime ?? '14:30';
  const currentMinutes = hours * 60 + minutes;
  const crossLotMinutes = parseTimeToMinutes(crossLotTime);

  return currentMinutes >= crossLotMinutes;
}

/**
 * Preload parking config (call on app startup)
 */
export async function preloadParkingConfig(): Promise<void> {
  await getParkingConfig();
}

// ============================================================
// PERMIT INFO HELPERS
// ============================================================

/**
 * Get display text for permit validity status
 */
export function getPermitValidityText(permit: PermitType): string {
  const now = new Date();

  if (isParkingFree(now)) {
    return 'Free parking now';
  }

  if (permit.cross_lot_time && isCrossLotAllowed(now)) {
    return 'Cross-lot parking allowed';
  }

  return `Valid in: ${permit.valid_lots.join(', ') || 'N/A'}`;
}

/**
 * Format price for display
 */
export function formatPermitPrice(price: number): string {
  if (price === 0) return 'Free';
  return `$${price}/yr`;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    commuter: 'Commuter',
    residence: 'Residence Hall',
    garage: 'Garage',
    other: 'Other',
  };
  return names[category] || category;
}

/**
 * Get category icon name
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    commuter: 'car',
    residence: 'star',
    garage: 'building-2',
    other: 'more-horizontal',
  };
  return icons[category] || 'help-circle';
}
