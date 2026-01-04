/**
 * Parking Lots Service
 * Premium API layer for lot operations
 */

import { supabase } from '@/lib/supabase';
import {
  Lot,
  LotWithStatus,
  LotWithStatusForPermit,
  PermitType,
  OccupancyStatus,
  Report,
} from '@/types/database';

// ============================================================
// LOT QUERIES
// ============================================================

/**
 * Get all lots with current status
 */
export async function getAllLotsWithStatus(): Promise<LotWithStatus[]> {
  const { data, error } = await supabase
    .from('lots_with_status')
    .select('*')
    .order('occupancy_percent', { ascending: true });

  if (error) throw new Error(`Failed to fetch lots: ${error.message}`);
  return data ?? [];
}

/**
 * Get lots valid for a specific permit type with current status
 */
export async function getLotsForPermit(
  permitType: PermitType
): Promise<LotWithStatusForPermit[]> {
  const { data, error } = await supabase.rpc('get_lots_with_status', {
    p_permit_type: permitType,
  });

  if (error) throw new Error(`Failed to fetch lots for permit: ${error.message}`);
  return data ?? [];
}

/**
 * Get single lot with full details
 */
export async function getLotById(lotId: string): Promise<LotWithStatus | null> {
  const { data, error } = await supabase
    .from('lots_with_status')
    .select('*')
    .eq('id', lotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch lot: ${error.message}`);
  }
  return data;
}

/**
 * Get lot details with related data
 */
export async function getLotDetails(lotId: string) {
  const { data, error } = await supabase
    .from('lots')
    .select(`
      *,
      lot_status (*),
      permit_rules (*),
      enforcement_hotspots (*)
    `)
    .eq('id', lotId)
    .single();

  if (error) throw new Error(`Failed to fetch lot details: ${error.message}`);
  return data;
}

/**
 * Check if a permit is valid for a lot at a specific time
 */
export async function isPermitValidForLot(
  lotId: string,
  permitType: PermitType,
  checkTime?: Date
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_permit_valid', {
    p_lot_id: lotId,
    p_permit_type: permitType,
    p_check_time: checkTime?.toISOString(),
  });

  if (error) throw new Error(`Failed to check permit validity: ${error.message}`);
  return data ?? false;
}

// ============================================================
// REPORTING
// ============================================================

/**
 * Submit a parking report
 */
export async function submitReport(params: {
  lotId: string;
  status: OccupancyStatus;
  occupancyEstimate?: number;
  note?: string;
  location?: { lat: number; lng: number };
  isGeofenceTriggered?: boolean;
}): Promise<Report> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user?.id,
      lot_id: params.lotId,
      report_type: 'status_report',
      status: params.status,
      occupancy_estimate: params.occupancyEstimate,
      note: params.note,
      location: params.location
        ? `POINT(${params.location.lng} ${params.location.lat})`
        : null,
      is_geofence_triggered: params.isGeofenceTriggered ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit report: ${error.message}`);
  return data;
}

/**
 * Submit a "I just parked" report
 */
export async function reportParked(
  lotId: string,
  location?: { lat: number; lng: number }
): Promise<Report> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user?.id,
      lot_id: lotId,
      report_type: 'parked',
      location: location
        ? `POINT(${location.lng} ${location.lat})`
        : null,
      is_geofence_triggered: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit parked report: ${error.message}`);
  return data;
}

/**
 * Submit a "I left" report
 */
export async function reportLeft(
  lotId: string,
  location?: { lat: number; lng: number }
): Promise<Report> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user?.id,
      lot_id: lotId,
      report_type: 'left',
      location: location
        ? `POINT(${location.lng} ${location.lat})`
        : null,
      is_geofence_triggered: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to submit left report: ${error.message}`);
  return data;
}

/**
 * Get recent reports for a lot
 */
export async function getRecentReports(
  lotId: string,
  limit = 10
): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('lot_id', lotId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return data ?? [];
}

// ============================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe to lot status changes
 */
export function subscribeToLotStatus(
  callback: (lotId: string, status: any) => void
) {
  const channel = supabase
    .channel('lot_status_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lot_status',
      },
      (payload) => {
        callback(payload.new.lot_id, payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to specific lot status changes
 */
export function subscribeToLot(
  lotId: string,
  callback: (status: any) => void
) {
  const channel = supabase
    .channel(`lot_${lotId}_status`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'lot_status',
        filter: `lot_id=eq.${lotId}`,
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
