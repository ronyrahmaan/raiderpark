/**
 * Navigation Utility
 *
 * Opens native maps (Apple Maps on iOS, Google Maps on Android)
 * for turn-by-turn directions to parking lots.
 */

import { Linking, Platform, Alert } from 'react-native';

// ============================================================
// TYPES
// ============================================================

export interface NavigationDestination {
  latitude: number;
  longitude: number;
  label?: string;
}

export type NavigationApp = 'apple' | 'google' | 'waze';

export interface NavigationOptions {
  preferredApp?: NavigationApp;
  travelMode?: 'driving' | 'walking';
}

// ============================================================
// URL BUILDERS
// ============================================================

/**
 * Build Apple Maps URL
 */
function buildAppleMapsUrl(
  destination: NavigationDestination,
  travelMode: 'driving' | 'walking' = 'driving'
): string {
  const { latitude, longitude, label } = destination;
  const dirflg = travelMode === 'walking' ? 'w' : 'd';

  const params = new URLSearchParams({
    daddr: `${latitude},${longitude}`,
    dirflg,
  });

  if (label) {
    params.set('q', label);
  }

  return `maps:?${params.toString()}`;
}

/**
 * Build Google Maps URL (works on both iOS and Android)
 */
function buildGoogleMapsUrl(
  destination: NavigationDestination,
  travelMode: 'driving' | 'walking' = 'driving'
): string {
  const { latitude, longitude, label } = destination;
  const mode = travelMode === 'walking' ? 'walking' : 'driving';

  // Use the universal URL that works on both platforms
  const baseUrl = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams({
    destination: `${latitude},${longitude}`,
    travelmode: mode,
  });

  if (label) {
    params.set('destination_place_id', label);
  }

  return `${baseUrl}&${params.toString()}`;
}

/**
 * Build Waze URL
 */
function buildWazeUrl(destination: NavigationDestination): string {
  const { latitude, longitude } = destination;
  return `waze://?ll=${latitude},${longitude}&navigate=yes`;
}

/**
 * Build URL scheme to open Google Maps app directly
 */
function buildGoogleMapsAppUrl(
  destination: NavigationDestination,
  travelMode: 'driving' | 'walking' = 'driving'
): string {
  const { latitude, longitude } = destination;
  const mode = travelMode === 'walking' ? 'walking' : 'driving';

  if (Platform.OS === 'ios') {
    return `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=${mode}`;
  }

  // Android
  return `google.navigation:q=${latitude},${longitude}&mode=${mode === 'driving' ? 'd' : 'w'}`;
}

// ============================================================
// MAIN NAVIGATION FUNCTIONS
// ============================================================

/**
 * Check if a navigation app is available
 */
export async function isNavigationAppAvailable(app: NavigationApp): Promise<boolean> {
  try {
    let url: string;

    switch (app) {
      case 'apple':
        url = 'maps://';
        break;
      case 'google':
        url = Platform.OS === 'ios' ? 'comgooglemaps://' : 'google.navigation:';
        break;
      case 'waze':
        url = 'waze://';
        break;
      default:
        return false;
    }

    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
}

/**
 * Get available navigation apps
 */
export async function getAvailableNavigationApps(): Promise<NavigationApp[]> {
  const apps: NavigationApp[] = [];

  // Apple Maps is always available on iOS
  if (Platform.OS === 'ios') {
    apps.push('apple');
  }

  // Check Google Maps
  if (await isNavigationAppAvailable('google')) {
    apps.push('google');
  }

  // Check Waze
  if (await isNavigationAppAvailable('waze')) {
    apps.push('waze');
  }

  return apps;
}

/**
 * Open navigation to a destination
 * Automatically chooses the best available app
 */
export async function navigateToDestination(
  destination: NavigationDestination,
  options: NavigationOptions = {}
): Promise<boolean> {
  const { preferredApp, travelMode = 'driving' } = options;

  // If preferred app is specified and available, use it
  if (preferredApp) {
    const isAvailable = await isNavigationAppAvailable(preferredApp);
    if (isAvailable) {
      return openNavigationApp(preferredApp, destination, travelMode);
    }
  }

  // Auto-select best available app
  const availableApps = await getAvailableNavigationApps();

  if (availableApps.length === 0) {
    // Fallback to Google Maps web
    const url = buildGoogleMapsUrl(destination, travelMode);
    return Linking.openURL(url).then(() => true).catch(() => false);
  }

  // Priority: Apple Maps (iOS) > Google Maps > Waze
  const appToUse = Platform.OS === 'ios'
    ? availableApps.find(a => a === 'apple') ?? availableApps[0]
    : availableApps.find(a => a === 'google') ?? availableApps[0];

  return openNavigationApp(appToUse, destination, travelMode);
}

/**
 * Open a specific navigation app
 */
async function openNavigationApp(
  app: NavigationApp,
  destination: NavigationDestination,
  travelMode: 'driving' | 'walking'
): Promise<boolean> {
  let url: string;

  switch (app) {
    case 'apple':
      url = buildAppleMapsUrl(destination, travelMode);
      break;
    case 'google':
      // Try app URL first, fallback to web
      try {
        const appUrl = buildGoogleMapsAppUrl(destination, travelMode);
        const canOpen = await Linking.canOpenURL(appUrl);
        url = canOpen ? appUrl : buildGoogleMapsUrl(destination, travelMode);
      } catch {
        url = buildGoogleMapsUrl(destination, travelMode);
      }
      break;
    case 'waze':
      url = buildWazeUrl(destination);
      break;
    default:
      return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Failed to open navigation:', error);
    return false;
  }
}

/**
 * Show navigation app picker and navigate
 */
export async function showNavigationPicker(
  destination: NavigationDestination,
  travelMode: 'driving' | 'walking' = 'driving'
): Promise<void> {
  const availableApps = await getAvailableNavigationApps();

  if (availableApps.length === 0) {
    // Open Google Maps web directly
    const url = buildGoogleMapsUrl(destination, travelMode);
    Linking.openURL(url);
    return;
  }

  if (availableApps.length === 1) {
    // Only one app, open it directly
    openNavigationApp(availableApps[0], destination, travelMode);
    return;
  }

  // Show picker
  const buttons = availableApps.map(app => ({
    text: getAppDisplayName(app),
    onPress: () => openNavigationApp(app, destination, travelMode),
  }));

  buttons.push({ text: 'Cancel', onPress: () => Promise.resolve(false) });

  Alert.alert(
    'Open in Maps',
    'Choose navigation app:',
    buttons as any,
    { cancelable: true }
  );
}

/**
 * Get display name for navigation app
 */
function getAppDisplayName(app: NavigationApp): string {
  switch (app) {
    case 'apple':
      return 'Apple Maps';
    case 'google':
      return 'Google Maps';
    case 'waze':
      return 'Waze';
    default:
      return 'Maps';
  }
}

// ============================================================
// PARKING LOT SPECIFIC
// ============================================================

/**
 * Navigate to a parking lot
 */
export async function navigateToLot(
  lotId: string,
  lotName: string,
  center: { lat: number; lng: number },
  options: NavigationOptions = {}
): Promise<boolean> {
  const destination: NavigationDestination = {
    latitude: center.lat,
    longitude: center.lng,
    label: `${lotName} Parking Lot`,
  };

  return navigateToDestination(destination, {
    ...options,
    travelMode: 'driving',
  });
}

/**
 * Navigate to a campus building (walking)
 */
export async function navigateToBuilding(
  buildingName: string,
  coordinates: { latitude: number; longitude: number },
  options: NavigationOptions = {}
): Promise<boolean> {
  const destination: NavigationDestination = {
    ...coordinates,
    label: buildingName,
  };

  return navigateToDestination(destination, {
    ...options,
    travelMode: 'walking',
  });
}
