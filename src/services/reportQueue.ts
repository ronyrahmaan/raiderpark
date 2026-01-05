/**
 * Report Queue Service
 * Handles offline storage and retry for failed parking reports
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';
import { submitReport } from './lots';
import { OccupancyStatus } from '@/types/database';

// ============================================================
// TYPES
// ============================================================

export interface QueuedReport {
  id: string;
  lotId: string;
  occupancyStatus: OccupancyStatus;
  occupancyPercent?: number;
  note?: string;
  location?: { lat: number; lng: number };
  isGeofenceTriggered?: boolean;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export type QueueStatus = 'idle' | 'syncing' | 'offline';

// ============================================================
// CONSTANTS
// ============================================================

const QUEUE_STORAGE_KEY = '@raiderpark/report_queue';
const MAX_RETRY_COUNT = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute
const POLL_INTERVAL = 30000; // Check every 30 seconds

// ============================================================
// QUEUE STATE
// ============================================================

let queuedReports: QueuedReport[] = [];
let isProcessing = false;
let queueStatus: QueueStatus = 'idle';
let statusListeners: ((status: QueueStatus, pendingCount: number) => void)[] = [];
let pollIntervalId: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

// ============================================================
// NETWORK HELPERS
// ============================================================

/**
 * Check if device has internet connection
 */
async function isConnected(): Promise<boolean> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected === true && networkState.isInternetReachable === true;
  } catch {
    // If we can't check, assume connected and let the request fail
    return true;
  }
}

// ============================================================
// STORAGE HELPERS
// ============================================================

async function loadQueue(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      queuedReports = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load report queue:', error);
  }
}

async function saveQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queuedReports));
  } catch (error) {
    console.error('Failed to save report queue:', error);
  }
}

// ============================================================
// STATUS NOTIFICATIONS
// ============================================================

function notifyListeners() {
  statusListeners.forEach(listener => {
    listener(queueStatus, queuedReports.length);
  });
}

function setQueueStatus(status: QueueStatus) {
  queueStatus = status;
  notifyListeners();
}

/**
 * Subscribe to queue status changes
 */
export function subscribeToQueueStatus(
  callback: (status: QueueStatus, pendingCount: number) => void
): () => void {
  statusListeners.push(callback);
  // Immediately notify with current status
  callback(queueStatus, queuedReports.length);

  return () => {
    statusListeners = statusListeners.filter(l => l !== callback);
  };
}

// ============================================================
// QUEUE OPERATIONS
// ============================================================

/**
 * Generate unique ID for queued report
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate retry delay with exponential backoff
 */
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(
    BASE_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  );
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return delay + jitter;
}

/**
 * Add report to queue (for offline storage)
 */
export async function queueReport(report: Omit<QueuedReport, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
  const queuedReport: QueuedReport = {
    ...report,
    id: generateId(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  queuedReports.push(queuedReport);
  await saveQueue();
  notifyListeners();

  return queuedReport.id;
}

/**
 * Remove report from queue
 */
async function removeFromQueue(id: string): Promise<void> {
  queuedReports = queuedReports.filter(r => r.id !== id);
  await saveQueue();
  notifyListeners();
}

/**
 * Update report in queue (increment retry count, store error)
 */
async function updateQueuedReport(
  id: string,
  updates: Partial<QueuedReport>
): Promise<void> {
  const index = queuedReports.findIndex(r => r.id === id);
  if (index !== -1) {
    queuedReports[index] = { ...queuedReports[index], ...updates };
    await saveQueue();
  }
}

// ============================================================
// SUBMIT WITH RETRY
// ============================================================

export interface SubmitResult {
  success: boolean;
  queued: boolean;
  error?: string;
  queuedReportId?: string;
}

/**
 * Submit report with automatic retry and offline queueing
 */
export async function submitReportWithRetry(params: {
  lotId: string;
  occupancyStatus: OccupancyStatus;
  occupancyPercent?: number;
  note?: string;
  location?: { lat: number; lng: number };
  isGeofenceTriggered?: boolean;
}): Promise<SubmitResult> {
  // Check network status
  const connected = await isConnected();

  if (!connected) {
    // No connection - queue for later
    const queuedId = await queueReport(params);
    setQueueStatus('offline');
    return {
      success: false,
      queued: true,
      queuedReportId: queuedId,
      error: 'No internet connection. Report saved and will sync when online.',
    };
  }

  // Try to submit
  try {
    await submitReport(params);
    return { success: true, queued: false };
  } catch (error) {
    // Submission failed - queue for retry
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const queuedId = await queueReport({
      ...params,
      lastError: errorMessage,
    });

    // Start processing queue in background
    processQueue();

    return {
      success: false,
      queued: true,
      queuedReportId: queuedId,
      error: 'Report saved. Will retry automatically.',
    };
  }
}

// ============================================================
// QUEUE PROCESSING
// ============================================================

/**
 * Process all queued reports
 */
export async function processQueue(): Promise<void> {
  if (isProcessing || queuedReports.length === 0) {
    return;
  }

  // Check network
  const connected = await isConnected();
  if (!connected) {
    setQueueStatus('offline');
    return;
  }

  isProcessing = true;
  setQueueStatus('syncing');

  // Process each report
  for (const report of [...queuedReports]) {
    // Skip if max retries exceeded
    if (report.retryCount >= MAX_RETRY_COUNT) {
      console.warn(`Report ${report.id} exceeded max retries, removing from queue`);
      await removeFromQueue(report.id);
      continue;
    }

    try {
      await submitReport({
        lotId: report.lotId,
        occupancyStatus: report.occupancyStatus,
        occupancyPercent: report.occupancyPercent,
        note: report.note,
        location: report.location,
        isGeofenceTriggered: report.isGeofenceTriggered,
      });

      // Success - remove from queue
      await removeFromQueue(report.id);
      console.log(`Successfully synced queued report ${report.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Failed to sync report ${report.id}:`, errorMessage);

      // Update retry count
      await updateQueuedReport(report.id, {
        retryCount: report.retryCount + 1,
        lastError: errorMessage,
      });

      // Wait before next retry with exponential backoff
      const delay = getRetryDelay(report.retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  isProcessing = false;
  setQueueStatus(queuedReports.length > 0 ? 'offline' : 'idle');
}

// ============================================================
// APP STATE & NETWORK MONITORING
// ============================================================

/**
 * Handle app state changes (foreground/background)
 */
function handleAppStateChange(nextAppState: AppStateStatus) {
  if (nextAppState === 'active' && queuedReports.length > 0) {
    // App came to foreground - try to process queue
    console.log('App active, checking queued reports...');
    processQueue();
  }
}

/**
 * Periodic check for network and process queue
 */
async function pollNetworkAndProcess() {
  if (queuedReports.length === 0) {
    return;
  }

  const connected = await isConnected();
  if (connected) {
    processQueue();
  } else {
    setQueueStatus('offline');
  }
}

/**
 * Initialize queue service and network listener
 */
export async function initializeReportQueue(): Promise<void> {
  // Load persisted queue
  await loadQueue();

  // Listen for app state changes
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Start periodic polling for network changes
  pollIntervalId = setInterval(pollNetworkAndProcess, POLL_INTERVAL);

  // Process any existing queue
  processQueue();
}

/**
 * Cleanup queue service
 */
export function cleanupReportQueue(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }

  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

// ============================================================
// QUEUE INSPECTION
// ============================================================

/**
 * Get current queue status
 */
export function getQueueStatus(): { status: QueueStatus; pendingCount: number } {
  return {
    status: queueStatus,
    pendingCount: queuedReports.length,
  };
}

/**
 * Get all queued reports
 */
export function getQueuedReports(): QueuedReport[] {
  return [...queuedReports];
}

/**
 * Clear all queued reports (manual cleanup)
 */
export async function clearQueue(): Promise<void> {
  queuedReports = [];
  await saveQueue();
  setQueueStatus('idle');
  notifyListeners();
}

/**
 * Manually retry a specific report
 */
export async function retryReport(id: string): Promise<SubmitResult> {
  const report = queuedReports.find(r => r.id === id);
  if (!report) {
    return { success: false, queued: false, error: 'Report not found in queue' };
  }

  const connected = await isConnected();
  if (!connected) {
    return { success: false, queued: true, error: 'No internet connection' };
  }

  try {
    await submitReport({
      lotId: report.lotId,
      occupancyStatus: report.occupancyStatus,
      occupancyPercent: report.occupancyPercent,
      note: report.note,
      location: report.location,
      isGeofenceTriggered: report.isGeofenceTriggered,
    });

    await removeFromQueue(id);
    return { success: true, queued: false };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateQueuedReport(id, {
      retryCount: report.retryCount + 1,
      lastError: errorMessage,
    });
    return { success: false, queued: true, error: errorMessage };
  }
}
