/**
 * Reports Service
 * Handle parking report submissions and queries
 */

import { supabase } from '@/lib/supabase';
import { Report, ReportType, OccupancyStatus } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

export interface SubmitReportParams {
  lotId: string;
  reportType: ReportType;
  occupancyStatus?: OccupancyStatus;
  occupancyPercent?: number;
  note?: string;
  location?: { lat: number; lng: number };
  isGeofenceTriggered?: boolean;
}

export interface ReportFilters {
  lotId?: string;
  userId?: string;
  reportType?: ReportType;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================
// REPORT SUBMISSION
// ============================================================

/**
 * Submit a parking report
 */
export async function submitReport(params: SubmitReportParams): Promise<Report> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: user?.id ?? null,
      lot_id: params.lotId,
      report_type: params.reportType,
      occupancy_status: params.occupancyStatus ?? null,
      occupancy_percent: params.occupancyPercent ?? null,
      note: params.note ?? null,
      location: params.location
        ? `POINT(${params.location.lng} ${params.location.lat})`
        : null,
      is_geofence_triggered: params.isGeofenceTriggered ?? false,
    } as any)
    .select()
    .single();

  if (error) throw new Error(`Failed to submit report: ${error.message}`);
  return data as Report;
}

/**
 * Submit a "I just parked" report
 */
export async function submitParkedReport(
  lotId: string,
  location?: { lat: number; lng: number }
): Promise<Report> {
  return submitReport({
    lotId,
    reportType: 'parked',
    location,
  });
}

/**
 * Submit a "I left" report
 */
export async function submitLeftReport(
  lotId: string,
  location?: { lat: number; lng: number }
): Promise<Report> {
  return submitReport({
    lotId,
    reportType: 'left',
    location,
  });
}

/**
 * Submit a status report with occupancy information
 */
export async function submitStatusReport(params: {
  lotId: string;
  status: OccupancyStatus;
  occupancyEstimate?: number;
  note?: string;
  location?: { lat: number; lng: number };
}): Promise<Report> {
  return submitReport({
    lotId: params.lotId,
    reportType: 'status_report',
    occupancyStatus: params.status,
    occupancyPercent: params.occupancyEstimate,
    note: params.note,
    location: params.location,
  });
}

/**
 * Submit a full lot report
 */
export async function submitFullReport(
  lotId: string,
  note?: string,
  location?: { lat: number; lng: number }
): Promise<Report> {
  return submitReport({
    lotId,
    reportType: 'full_report',
    occupancyStatus: 'full',
    note,
    location,
  });
}

// ============================================================
// REPORT QUERIES
// ============================================================

/**
 * Get recent reports (optionally filtered by lot)
 */
export async function getRecentReports(
  lotId?: string,
  limit = 20
): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (lotId) {
    query = query.eq('lot_id', lotId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch recent reports: ${error.message}`);
  return data ?? [];
}

/**
 * Get reports for a specific user
 */
export async function getUserReports(
  userId?: string,
  limit = 50
): Promise<Report[]> {
  // If no userId provided, get current user's reports
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    targetUserId = user?.id;
  }

  if (!targetUserId) {
    throw new Error('No user ID provided and no authenticated user');
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', targetUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch user reports: ${error.message}`);
  return data ?? [];
}

/**
 * Get reports with flexible filters
 */
export async function getReportsWithFilters(
  filters: ReportFilters,
  limit = 50
): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.lotId) {
    query = query.eq('lot_id', filters.lotId);
  }

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.reportType) {
    query = query.eq('report_type', filters.reportType);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch reports: ${error.message}`);
  return data ?? [];
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch report: ${error.message}`);
  }
  return data;
}

/**
 * Get report count for a user
 */
export async function getUserReportCount(userId?: string): Promise<number> {
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    targetUserId = user?.id;
  }

  if (!targetUserId) {
    return 0;
  }

  const { count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUserId);

  if (error) throw new Error(`Failed to get report count: ${error.message}`);
  return count ?? 0;
}

/**
 * Get reports from the last N hours for a lot
 */
export async function getReportsLastNHours(
  lotId: string,
  hours = 1
): Promise<Report[]> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('lot_id', lotId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch recent reports: ${error.message}`);
  return data ?? [];
}

// ============================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe to new reports
 */
export function subscribeToReports(
  callback: (report: Report, action: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  lotId?: string
) {
  const channel = supabase
    .channel('reports_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reports',
        filter: lotId ? `lot_id=eq.${lotId}` : undefined,
      },
      (payload) => {
        callback(
          payload.new as Report,
          payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
