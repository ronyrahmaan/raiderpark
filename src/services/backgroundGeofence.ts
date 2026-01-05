/**
 * Background Geofence Service
 * Automatically detects when user enters/exits parking lots
 * and can auto-submit reports without user action
 *
 * NOTE: This ONLY works in dev build (EAS Build), NOT in Expo Go
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectCurrentLot, GeofenceResult } from '@/utils/geofence';
import { submitReportWithRetry } from './reportQueue';
import { OccupancyStatus } from '@/types/database';

// ============================================================
// CONSTANTS
// ============================================================

const GEOFENCE_TASK_NAME = 'RAIDERPARK_BACKGROUND_GEOFENCE';
const STORAGE_KEY_LAST_LOT = '@raiderpark/last_detected_lot';
const STORAGE_KEY_LAST_EVENT = '@raiderpark/last_geofence_event';
const STORAGE_KEY_AUTO_REPORT = '@raiderpark/auto_report_enabled';

// Geofence detection radius (meters)
const GEOFENCE_RADIUS = 75;

// Minimum time between auto-reports for same lot (15 minutes)
const MIN_TIME_BETWEEN_REPORTS = 15 * 60 * 1000;

// ============================================================
// TYPES
// ============================================================

interface GeofenceEvent {
  type: 'enter' | 'exit';
  lotId: string;
  lotName: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface GeofenceSettings {
  autoReportEnabled: boolean;
  autoReportOnEnter: boolean; // Report "parked" when entering
  autoReportOnExit: boolean; // Report "left" when exiting
}

// ============================================================
// EVENT LISTENERS
// ============================================================

type GeofenceEventCallback = (event: GeofenceEvent) => void;
const eventListeners: GeofenceEventCallback[] = [];

/**
 * Subscribe to geofence enter/exit events
 */
export function onGeofenceEvent(callback: GeofenceEventCallback): () => void {
  eventListeners.push(callback);
  return () => {
    const index = eventListeners.indexOf(callback);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  };
}

function notifyListeners(event: GeofenceEvent) {
  eventListeners.forEach(callback => callback(event));
}

// ============================================================
// BACKGROUND TASK DEFINITION
// ============================================================

// Define the background location task
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background geofence error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };

    if (locations && locations.length > 0) {
      const location = locations[0];
      await processLocationUpdate(location);
    }
  }
});

/**
 * Process a location update and check for geofence enter/exit
 */
async function processLocationUpdate(location: Location.LocationObject) {
  const { latitude, longitude } = location.coords;

  // Detect current lot
  const result = detectCurrentLot(latitude, longitude, GEOFENCE_RADIUS);

  // Get previous lot state
  const previousLotId = await AsyncStorage.getItem(STORAGE_KEY_LAST_LOT);
  const currentLotId = result.isInLot ? result.lotId : null;

  // Detect enter/exit events
  if (previousLotId !== currentLotId) {
    const timestamp = Date.now();

    // EXIT event - user left a lot
    if (previousLotId && !currentLotId) {
      const exitEvent: GeofenceEvent = {
        type: 'exit',
        lotId: previousLotId,
        lotName: result.nearbyLots.find(l => l.lot.id === previousLotId)?.lot.name || previousLotId,
        timestamp,
        location: { latitude, longitude },
      };

      console.log(`[Geofence] EXIT: ${previousLotId}`);
      await handleGeofenceEvent(exitEvent);
    }

    // ENTER event - user entered a lot
    if (currentLotId && result.lotName) {
      const enterEvent: GeofenceEvent = {
        type: 'enter',
        lotId: currentLotId,
        lotName: result.lotName,
        timestamp,
        location: { latitude, longitude },
      };

      console.log(`[Geofence] ENTER: ${currentLotId}`);
      await handleGeofenceEvent(enterEvent);
    }

    // Update stored lot
    await AsyncStorage.setItem(
      STORAGE_KEY_LAST_LOT,
      currentLotId || ''
    );
  }
}

/**
 * Handle a geofence enter/exit event
 */
async function handleGeofenceEvent(event: GeofenceEvent) {
  // Store event
  await AsyncStorage.setItem(STORAGE_KEY_LAST_EVENT, JSON.stringify(event));

  // Notify listeners (for UI updates)
  notifyListeners(event);

  // Check if auto-report is enabled
  const settings = await getGeofenceSettings();

  if (settings.autoReportEnabled) {
    // Check cooldown
    const canReport = await checkReportCooldown(event.lotId);

    if (canReport) {
      if (event.type === 'enter' && settings.autoReportOnEnter) {
        // Auto-submit "parked" report
        await submitAutoReport(event, 'parked');
      } else if (event.type === 'exit' && settings.autoReportOnExit) {
        // Auto-submit "left" report
        await submitAutoReport(event, 'left');
      }
    }
  }
}

/**
 * Submit an automatic report
 */
async function submitAutoReport(
  event: GeofenceEvent,
  reportType: 'parked' | 'left'
) {
  try {
    await submitReportWithRetry({
      lotId: event.lotId,
      occupancyStatus: reportType === 'parked' ? 'busy' : 'open', // Conservative estimate
      isGeofenceTriggered: true,
      location: { lat: event.location.latitude, lng: event.location.longitude },
    });

    console.log(`[Geofence] Auto-report submitted: ${reportType} at ${event.lotId}`);

    // Update cooldown
    await AsyncStorage.setItem(
      `@raiderpark/last_report_${event.lotId}`,
      Date.now().toString()
    );
  } catch (error) {
    console.error('[Geofence] Auto-report failed:', error);
  }
}

/**
 * Check if we can submit a report (cooldown check)
 */
async function checkReportCooldown(lotId: string): Promise<boolean> {
  const lastReportTime = await AsyncStorage.getItem(`@raiderpark/last_report_${lotId}`);

  if (!lastReportTime) return true;

  const elapsed = Date.now() - parseInt(lastReportTime, 10);
  return elapsed >= MIN_TIME_BETWEEN_REPORTS;
}

// ============================================================
// SETTINGS
// ============================================================

/**
 * Get geofence settings
 */
export async function getGeofenceSettings(): Promise<GeofenceSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_AUTO_REPORT);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to get geofence settings:', error);
  }

  // Default settings
  return {
    autoReportEnabled: false, // Off by default - user must opt in
    autoReportOnEnter: true,
    autoReportOnExit: true,
  };
}

/**
 * Update geofence settings
 */
export async function setGeofenceSettings(settings: Partial<GeofenceSettings>): Promise<void> {
  const current = await getGeofenceSettings();
  const updated = { ...current, ...settings };
  await AsyncStorage.setItem(STORAGE_KEY_AUTO_REPORT, JSON.stringify(updated));
}

// ============================================================
// SERVICE CONTROL
// ============================================================

/**
 * Check if background geofencing is supported
 * (Only works in dev build, not Expo Go)
 */
export async function isBackgroundGeofenceSupported(): Promise<boolean> {
  try {
    // Check if TaskManager is available
    const isAvailable = await TaskManager.isAvailableAsync();
    if (!isAvailable) return false;

    // Check if we have background location permission
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Start background geofence monitoring
 */
export async function startBackgroundGeofence(): Promise<boolean> {
  try {
    // Check if already running
    const isRunning = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK_NAME);
    if (isRunning) {
      console.log('[Geofence] Already running');
      return true;
    }

    // Request background location permission
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Geofence] Background location permission denied');
      return false;
    }

    // Start background location updates
    await Location.startLocationUpdatesAsync(GEOFENCE_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 30000, // Check every 30 seconds
      distanceInterval: 50, // Or when moved 50 meters
      deferredUpdatesInterval: 60000, // Batch updates every minute
      showsBackgroundLocationIndicator: true, // iOS indicator
      foregroundService: {
        notificationTitle: 'RaiderPark',
        notificationBody: 'Auto-detecting parking lots',
        notificationColor: '#CC0000', // Scarlet
      },
    });

    console.log('[Geofence] Background monitoring started');
    return true;
  } catch (error) {
    console.error('[Geofence] Failed to start:', error);
    return false;
  }
}

/**
 * Stop background geofence monitoring
 */
export async function stopBackgroundGeofence(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(GEOFENCE_TASK_NAME);
      console.log('[Geofence] Background monitoring stopped');
    }
  } catch (error) {
    console.error('[Geofence] Failed to stop:', error);
  }
}

/**
 * Check if background geofence is currently running
 */
export async function isBackgroundGeofenceRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(GEOFENCE_TASK_NAME);
  } catch {
    return false;
  }
}

// ============================================================
// EVENT INSPECTION
// ============================================================

/**
 * Get the last geofence event
 */
export async function getLastGeofenceEvent(): Promise<GeofenceEvent | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_LAST_EVENT);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Get the current detected lot (if any)
 */
export async function getCurrentLotId(): Promise<string | null> {
  try {
    const lotId = await AsyncStorage.getItem(STORAGE_KEY_LAST_LOT);
    return lotId || null;
  } catch {
    return null;
  }
}
