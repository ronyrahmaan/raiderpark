/**
 * Background Geofence Hook
 * Provides React interface to the background geofence service
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isBackgroundGeofenceSupported,
  isBackgroundGeofenceRunning,
  startBackgroundGeofence,
  stopBackgroundGeofence,
  getGeofenceSettings,
  setGeofenceSettings,
  onGeofenceEvent,
  getLastGeofenceEvent,
  getCurrentLotId,
} from '@/services/backgroundGeofence';

interface GeofenceEvent {
  type: 'enter' | 'exit';
  lotId: string;
  lotName: string;
  timestamp: number;
  location: { latitude: number; longitude: number };
}

interface GeofenceSettings {
  autoReportEnabled: boolean;
  autoReportOnEnter: boolean;
  autoReportOnExit: boolean;
}

interface UseBackgroundGeofenceResult {
  /** Whether background geofence is supported on this device/build */
  isSupported: boolean;
  /** Whether background geofence is currently running */
  isRunning: boolean;
  /** Current lot ID (if detected) */
  currentLotId: string | null;
  /** Last geofence event (enter or exit) */
  lastEvent: GeofenceEvent | null;
  /** Current settings */
  settings: GeofenceSettings;
  /** Loading state */
  isLoading: boolean;
  /** Start background geofence monitoring */
  start: () => Promise<boolean>;
  /** Stop background geofence monitoring */
  stop: () => Promise<void>;
  /** Update settings */
  updateSettings: (settings: Partial<GeofenceSettings>) => Promise<void>;
  /** Toggle auto-report on/off */
  toggleAutoReport: () => Promise<void>;
}

const DEFAULT_SETTINGS: GeofenceSettings = {
  autoReportEnabled: false,
  autoReportOnEnter: true,
  autoReportOnExit: true,
};

export function useBackgroundGeofence(): UseBackgroundGeofenceResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentLotId, setCurrentLotId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<GeofenceEvent | null>(null);
  const [settings, setSettings] = useState<GeofenceSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize state on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        // Check support
        const supported = await isBackgroundGeofenceSupported();
        setIsSupported(supported);

        // Check if running
        const running = await isBackgroundGeofenceRunning();
        setIsRunning(running);

        // Get settings
        const storedSettings = await getGeofenceSettings();
        setSettings(storedSettings);

        // Get current state
        const lotId = await getCurrentLotId();
        setCurrentLotId(lotId);

        const event = await getLastGeofenceEvent();
        setLastEvent(event);
      } catch (error) {
        console.error('Failed to initialize background geofence:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Subscribe to geofence events
  useEffect(() => {
    const unsubscribe = onGeofenceEvent((event) => {
      setLastEvent(event);
      if (event.type === 'enter') {
        setCurrentLotId(event.lotId);
      } else {
        setCurrentLotId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Start background geofence
  const start = useCallback(async (): Promise<boolean> => {
    try {
      const success = await startBackgroundGeofence();
      setIsRunning(success);
      return success;
    } catch (error) {
      console.error('Failed to start background geofence:', error);
      return false;
    }
  }, []);

  // Stop background geofence
  const stop = useCallback(async (): Promise<void> => {
    try {
      await stopBackgroundGeofence();
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop background geofence:', error);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<GeofenceSettings>): Promise<void> => {
    try {
      await setGeofenceSettings(newSettings);
      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error('Failed to update geofence settings:', error);
    }
  }, []);

  // Toggle auto-report
  const toggleAutoReport = useCallback(async (): Promise<void> => {
    const newValue = !settings.autoReportEnabled;
    await updateSettings({ autoReportEnabled: newValue });

    // If enabling, also start the service
    if (newValue && !isRunning) {
      await start();
    }
  }, [settings.autoReportEnabled, isRunning, updateSettings, start]);

  return {
    isSupported,
    isRunning,
    currentLotId,
    lastEvent,
    settings,
    isLoading,
    start,
    stop,
    updateSettings,
    toggleAutoReport,
  };
}

export default useBackgroundGeofence;
