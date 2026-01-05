/**
 * Events Service
 * Handle game days, concerts, icing, and other parking disruptions
 */

import { supabase } from '@/lib/supabase';
import { ParkingEvent, EventType } from '@/types/database';

// ============================================================
// EVENT QUERIES
// ============================================================

/**
 * Get all upcoming events
 */
export async function getUpcomingEvents(): Promise<ParkingEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch events: ${error.message}`);
  return data ?? [];
}

/**
 * Get active events (happening now or today)
 */
export async function getActiveEvents(): Promise<ParkingEvent[]> {
  const { data, error } = await supabase
    .from('active_events')
    .select('*');

  if (error) throw new Error(`Failed to fetch active events: ${error.message}`);
  return data ?? [];
}

/**
 * Get events affecting a specific lot
 */
export async function getEventsForLot(lotId: string): Promise<ParkingEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .contains('affected_lot_ids', [lotId])
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch events for lot: ${error.message}`);
  return data ?? [];
}

/**
 * Get events by type
 */
export async function getEventsByType(eventType: EventType): Promise<ParkingEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_type', eventType)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch events by type: ${error.message}`);
  return data ?? [];
}

/**
 * Get events for a specific date range
 */
export async function getEventsInRange(
  startDate: Date,
  endDate: Date
): Promise<ParkingEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', startDate.toISOString())
    .lte('ends_at', endDate.toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch events in range: ${error.message}`);
  return data ?? [];
}

/**
 * Get single event by ID
 */
export async function getEventById(eventId: string): Promise<ParkingEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch event: ${error.message}`);
  }
  return data;
}

// ============================================================
// EVENT UTILITIES
// ============================================================

/**
 * Check if there's an active event affecting a lot
 */
export async function isLotAffectedByEvent(lotId: string): Promise<boolean> {
  const activeEvents = await getActiveEvents();
  return activeEvents.some(event => event.affected_lot_ids.includes(lotId));
}

/**
 * Get the next event affecting the user's permit lots
 */
export async function getNextEventForPermitLots(
  permitLots: string[]
): Promise<ParkingEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch next event: ${error.message}`);

  const events = (data ?? []) as ParkingEvent[];

  // Find first event that affects any of the user's lots
  const affectingEvent = events.find(event =>
    event.affected_lot_ids.some((lot: string) => permitLots.includes(lot))
  );

  return affectingEvent ?? null;
}

// ============================================================
// EVENT TYPE HELPERS
// ============================================================

export const EVENT_TYPE_INFO = {
  football: {
    label: 'Football Game',
    icon: '🏈',
    color: '#CC0000',
    description: 'Stadium lots close early',
  },
  basketball: {
    label: 'Basketball Game',
    icon: '🏀',
    color: '#FF6B00',
    description: 'Arena lots may be affected',
  },
  baseball: {
    label: 'Baseball Game',
    icon: '⚾',
    color: '#EF4444',
    description: 'Dan Law Field area affected',
  },
  concert: {
    label: 'Concert',
    icon: '🎵',
    color: '#8B5CF6',
    description: 'Arena lots affected',
  },
  graduation: {
    label: 'Graduation',
    icon: '🎓',
    color: '#10B981',
    description: 'Multiple lots affected',
  },
  university: {
    label: 'University Event',
    icon: '🏫',
    color: '#3B82F6',
    description: 'Campus-wide event',
  },
  icing: {
    label: 'Tower Icing',
    icon: '❄️',
    color: '#06B6D4',
    description: 'C14-C16 may close',
  },
  construction: {
    label: 'Construction',
    icon: '🚧',
    color: '#F59E0B',
    description: 'Temporary lot closure',
  },
  other: {
    label: 'Other Event',
    icon: '📅',
    color: '#6B7280',
    description: 'Check details',
  },
} as const;

export function getEventTypeInfo(eventType: EventType) {
  return EVENT_TYPE_INFO[eventType] ?? EVENT_TYPE_INFO.other;
}

// ============================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================

/**
 * Subscribe to event changes
 */
export function subscribeToEvents(
  callback: (event: ParkingEvent, action: 'INSERT' | 'UPDATE' | 'DELETE') => void
) {
  const channel = supabase
    .channel('events_realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
      },
      (payload) => {
        callback(
          payload.new as ParkingEvent,
          payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
