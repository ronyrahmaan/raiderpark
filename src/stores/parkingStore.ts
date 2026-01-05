import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  LotWithStatus,
  LotWithStatusForPermit,
  ParkingEvent,
  LotPrediction,
  OccupancyStatus,
  PermitType,
} from '@/types/database';

interface ParkingState {
  // Lot Data
  lots: LotWithStatus[];
  lotsForPermit: LotWithStatusForPermit[];
  selectedLot: LotWithStatus | null;

  // Events
  events: ParkingEvent[];
  activeEvents: ParkingEvent[];

  // Predictions
  predictions: Record<string, LotPrediction[]>; // keyed by lot_id

  // UI State
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;

  // Actions
  fetchLots: () => Promise<void>;
  fetchLotsForPermit: (permitType: PermitType) => Promise<void>;
  fetchLotDetails: (lotId: string) => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchPredictions: (lotId: string, date: string) => Promise<void>;

  // Reporting
  submitReport: (
    lotId: string,
    status: OccupancyStatus,
    occupancyEstimate?: number,
    note?: string
  ) => Promise<void>;

  // Real-time
  subscribeToLotUpdates: () => () => void;

  // Helpers
  setSelectedLot: (lot: LotWithStatus | null) => void;
  clearError: () => void;
}

export const useParkingStore = create<ParkingState>((set, get) => ({
  // Initial State
  lots: [],
  lotsForPermit: [],
  selectedLot: null,
  events: [],
  activeEvents: [],
  predictions: {},
  isLoading: false,
  lastUpdated: null,
  error: null,

  // Fetch All Lots with Status
  fetchLots: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('lots_with_status')
        .select('*')
        .order('occupancy_percent', { ascending: true });

      if (error) throw error;
      set({ lots: data ?? [], lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch Lots Valid for User's Permit
  fetchLotsForPermit: async (permitType: PermitType) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('get_lots_with_status', {
        p_permit_type: permitType,
      } as any);

      if (error) throw error;
      set({ lotsForPermit: (data ?? []) as LotWithStatusForPermit[], lastUpdated: new Date() });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch Single Lot Details
  fetchLotDetails: async (lotId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('lots_with_status')
        .select('*')
        .eq('id', lotId)
        .single();

      if (error) throw error;
      set({ selectedLot: data });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch Events
  fetchEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch all upcoming events
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('ends_at', new Date().toISOString())
        .order('starts_at', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch active events (happening now or today)
      const { data: active, error: activeError } = await supabase
        .from('active_events')
        .select('*');

      if (activeError) throw activeError;

      set({
        events: allEvents ?? [],
        activeEvents: active ?? [],
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch Predictions for a Lot
  fetchPredictions: async (lotId: string, date: string) => {
    try {
      // Parse date and create range for the day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('lot_predictions')
        .select('*')
        .eq('lot_id', lotId)
        .gte('predicted_for', startOfDay.toISOString())
        .lte('predicted_for', endOfDay.toISOString())
        .order('predicted_for', { ascending: true });

      if (error) throw error;

      set((state) => ({
        predictions: {
          ...state.predictions,
          [lotId]: data ?? [],
        },
      }));
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  },

  // Submit a Parking Report
  submitReport: async (lotId, status, occupancyEstimate, note) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('reports').insert({
        user_id: user?.id,
        lot_id: lotId,
        report_type: 'status_report',
        occupancy_status: status,
        occupancy_percent: occupancyEstimate,
        note,
        is_geofence_triggered: false,
      } as any);

      if (error) throw error;

      // Refresh lot data after report
      await get().fetchLots();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // Subscribe to Real-time Lot Updates
  subscribeToLotUpdates: () => {
    const channel = supabase
      .channel('lot_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lot_status',
        },
        async () => {
          // Refresh lots when status changes
          await get().fetchLots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // Set Selected Lot
  setSelectedLot: (lot) => set({ selectedLot: lot }),

  // Clear Error
  clearError: () => set({ error: null }),
}));
