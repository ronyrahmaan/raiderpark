/**
 * Events Hooks
 * React Query hooks for parking events
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as eventsService from '@/services/events';
import { EventType } from '@/types/database';

// Query Keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  upcoming: () => [...eventKeys.lists(), 'upcoming'] as const,
  active: () => [...eventKeys.lists(), 'active'] as const,
  byType: (type: EventType) => [...eventKeys.lists(), 'type', type] as const,
  forLot: (lotId: string) => [...eventKeys.all, 'lot', lotId] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
};

/**
 * Hook to get all upcoming events
 */
export function useUpcomingEvents() {
  return useQuery({
    queryKey: eventKeys.upcoming(),
    queryFn: eventsService.getUpcomingEvents,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get active events (happening now or today)
 */
export function useActiveEvents() {
  return useQuery({
    queryKey: eventKeys.active(),
    queryFn: eventsService.getActiveEvents,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}

/**
 * Hook to get events affecting a specific lot
 */
export function useEventsForLot(lotId: string) {
  return useQuery({
    queryKey: eventKeys.forLot(lotId),
    queryFn: () => eventsService.getEventsForLot(lotId),
    enabled: !!lotId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get events by type
 */
export function useEventsByType(eventType: EventType) {
  return useQuery({
    queryKey: eventKeys.byType(eventType),
    queryFn: () => eventsService.getEventsByType(eventType),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get events in a date range
 */
export function useEventsInRange(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: [...eventKeys.lists(), 'range', startDate.toISOString(), endDate.toISOString()],
    queryFn: () => eventsService.getEventsInRange(startDate, endDate),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get single event details
 */
export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => eventsService.getEventById(eventId),
    enabled: !!eventId,
  });
}

/**
 * Hook to check if a lot is affected by any active event
 */
export function useIsLotAffected(lotId: string) {
  const { data: activeEvents } = useActiveEvents();

  return {
    isAffected: activeEvents?.some(event => event.affected_lots.includes(lotId)) ?? false,
    affectingEvents: activeEvents?.filter(event => event.affected_lots.includes(lotId)) ?? [],
  };
}

/**
 * Hook to subscribe to real-time event changes
 */
export function useEventSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = eventsService.subscribeToEvents((event, action) => {
      // Invalidate event queries on any change
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    });

    return () => unsubscribe();
  }, [queryClient]);
}

/**
 * Hook to get the next event affecting user's permit lots
 */
export function useNextEventForPermit(permitLots: string[]) {
  return useQuery({
    queryKey: [...eventKeys.lists(), 'nextForPermit', permitLots],
    queryFn: () => eventsService.getNextEventForPermitLots(permitLots),
    enabled: permitLots.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
