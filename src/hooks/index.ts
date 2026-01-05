// ============================================================
// HOOKS INDEX
// Export all custom hooks for easy importing
// ============================================================

export * from './useLocation';
export * from './useLots';
export * from './useEvents';
export * from './usePredictions';
export * from './useGeofenceDetection';
export * from './usePermits';
export * from './useNearbySpots';
export * from './useUserStats';

// Re-export from useReports with explicit naming to avoid conflicts
export {
  reportKeys,
  useUserReports,
  useFilteredReports,
  useReport,
  useUserReportCount,
  useSubmitParkedReport,
  useSubmitLeftReport,
  useSubmitStatusReport,
  useSubmitFullReport,
  useReportSubscription,
  useReports,
  // Re-export with aliases to avoid conflicts with useLots
  useRecentReports as useRecentLotReports,
  useSubmitReport as useSubmitLotReport,
} from './useReports';
