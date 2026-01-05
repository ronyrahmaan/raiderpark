// ============================================================
// BUS & TRANSIT SCREEN
// Comprehensive Citibus, S1 Shuttle, Raider Ride integration
// Data sourced from official TTU & Citibus resources
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// TTU ON-CAMPUS ROUTES (Official Citibus Data)
// ============================================================
const ON_CAMPUS_ROUTES = [
  {
    id: 'red-raider',
    name: 'Red Raider',
    color: Colors.scarlet.DEFAULT,
    direction: 'Clockwise',
    frequency: 'Every 6 min',
    hours: '7:25 AM - 7:17 PM',
    description: 'Main campus loop - clockwise direction',
    stops: [
      'West Commuter Stop 1',
      'Student Recreation Center',
      'Student Wellness Center',
      'College of Business Administration',
      'Commuter North - Frazier Alumni Pavilion',
      'Holden Hall',
      'Student Union Building (SUB)',
      'University Library',
      'College of Education',
      'Weymouth-Chitwood Hall',
    ],
  },
  {
    id: 'double-t',
    name: 'Double T',
    color: '#1C1C1C',
    direction: 'Counter-Clockwise',
    frequency: 'Every 5 min',
    hours: '7:25 AM - 6:59 PM',
    description: 'Main campus loop - counter-clockwise direction',
    stops: [
      'Weymouth-Chitwood Hall',
      'College of Education',
      'University Library',
      'Student Union Building (SUB)',
      'Holden Hall',
      'Commuter North - Frazier Alumni Pavilion',
      'College of Business Administration',
      'Student Wellness Center',
      'Student Recreation Center',
      'West Commuter Stop 1',
    ],
  },
  {
    id: 'masked-rider',
    name: 'Masked Rider',
    color: '#F59E0B',
    direction: 'Extended Route',
    frequency: 'Every 10-15 min',
    hours: '7:00 AM - 6:00 PM',
    description: 'Extended campus coverage & Health Sciences Center',
    stops: [
      'Student Union Building (SUB)',
      'Health Sciences Center (HSC)',
      'West Campus',
      'Jerry S. Rawls College of Business',
    ],
  },
];

// ============================================================
// S1 SATELLITE LOT SERVICE INFO
// S1 is served by on-campus Citibus routes (continuous loop)
// ============================================================
const S1_SERVICE_INFO = {
  frequency: 7, // Bus every 7 minutes
  operatingHours: {
    start: '7:25 AM',
    end: '7:17 PM', // Red Raider ends last
  },
  estimatedTripTime: 15, // Minutes from S1 to campus center
  routes: ['Red Raider', 'Double T'], // Routes that serve S1
  stopName: 'West Commuter Stop 1', // Official stop name at S1
};

// ============================================================
// PERMIT PRICING (2024-2025)
// ============================================================
const PERMIT_PRICES = {
  satellite: 44,
  commuter_west: 162,
  commuter_north: 162,
  residence_hall: 263,
  flint_garage: 517,
  raider_park_garage: 143,
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function parseTime(timeStr: string): number {
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
  if (period === 'AM' && hours === 12) totalMinutes -= 12 * 60;
  return totalMinutes;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function BusScreen() {
  const router = useRouter();
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'routes' | 'schedule' | 'raider-ride'>('routes');

  // Calculate S1 service status (continuous loop every 7 minutes)
  const s1ServiceStatus = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();

    // No service on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isActive: false,
        nextBusIn: null,
        serviceEndsIn: null,
        message: 'No service on weekends',
      };
    }

    const startMinutes = parseTime(S1_SERVICE_INFO.operatingHours.start);
    const endMinutes = parseTime(S1_SERVICE_INFO.operatingHours.end);

    // Before service starts
    if (currentMinutes < startMinutes) {
      return {
        isActive: false,
        nextBusIn: startMinutes - currentMinutes,
        serviceEndsIn: null,
        message: `Service starts at ${S1_SERVICE_INFO.operatingHours.start}`,
      };
    }

    // After service ends
    if (currentMinutes > endMinutes) {
      return {
        isActive: false,
        nextBusIn: null,
        serviceEndsIn: null,
        message: 'Service ended for today',
      };
    }

    // Service is active - calculate next bus based on frequency
    const minutesSinceStart = currentMinutes - startMinutes;
    const minutesUntilNextBus = S1_SERVICE_INFO.frequency - (minutesSinceStart % S1_SERVICE_INFO.frequency);

    return {
      isActive: true,
      nextBusIn: minutesUntilNextBus <= S1_SERVICE_INFO.frequency ? minutesUntilNextBus : S1_SERVICE_INFO.frequency,
      serviceEndsIn: endMinutes - currentMinutes,
      message: `Buses every ${S1_SERVICE_INFO.frequency} minutes`,
    };
  }, []);

  // Raider Ride availability
  const raiderRideStatus = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const isActive = hours >= 18 || hours < 3;
    return {
      isActive,
      hours: '6:00 PM - 2:45 AM',
      status: isActive ? 'Active Now' : 'Starts at 6 PM',
    };
  }, []);

  // Cost savings calculation
  const costSavings = useMemo(() => {
    const savings = PERMIT_PRICES.commuter_west - PERMIT_PRICES.satellite;
    return {
      savings,
      satellitePrice: PERMIT_PRICES.satellite,
      commuterWestPrice: PERMIT_PRICES.commuter_west,
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const openGoPass = () => {
    Linking.openURL('https://apps.apple.com/us/app/gopass/id978969498');
  };

  const openLiveTracker = () => {
    Linking.openURL('https://live.goswift.ly/lubbock-citibus');
  };

  const openTechRideApp = () => {
    Linking.openURL('https://apps.apple.com/us/app/techride/id1438876227');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bus & Transit</Text>
        <TouchableOpacity style={styles.headerAction} onPress={openLiveTracker}>
          <SFIcon name="navigate" size={20} color={Colors.ios.blue} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.tabActive]}
          onPress={() => setActiveTab('routes')}
        >
          <SFIcon
            name="bus"
            size={16}
            color={activeTab === 'routes' ? Colors.scarlet.DEFAULT : Colors.gray[2]}
          />
          <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>
            Routes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <SFIcon
            name="clock"
            size={16}
            color={activeTab === 'schedule' ? Colors.scarlet.DEFAULT : Colors.gray[2]}
          />
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
            S1 Shuttle
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'raider-ride' && styles.tabActive]}
          onPress={() => setActiveTab('raider-ride')}
        >
          <SFIcon
            name="moon"
            size={16}
            color={activeTab === 'raider-ride' ? Colors.scarlet.DEFAULT : Colors.gray[2]}
          />
          <Text style={[styles.tabText, activeTab === 'raider-ride' && styles.tabTextActive]}>
            Raider Ride
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.scarlet.DEFAULT}
          />
        }
      >
        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <>
            {/* Quick Info Banner */}
            <Animated.View entering={FadeIn} style={styles.quickInfoBanner}>
              <View style={styles.quickInfoIcon}>
                <SFIcon name="info" size={16} color={Colors.ios.blue} />
              </View>
              <Text style={styles.quickInfoText}>
                All on-campus routes are <Text style={styles.quickInfoBold}>FREE</Text> for everyone.
                Show your TTU ID for free off-campus rides.
              </Text>
            </Animated.View>

            {/* On-Campus Routes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>On-Campus Routes</Text>
              <Text style={styles.sectionSubtitle}>
                Free Citibus service when classes are in session
              </Text>

              {ON_CAMPUS_ROUTES.map((route, index) => (
                <Animated.View
                  key={route.id}
                  entering={FadeInDown.delay(index * 100).springify()}
                >
                  <TouchableOpacity
                    style={[
                      styles.routeCard,
                      selectedRoute === route.id && styles.routeCardSelected,
                    ]}
                    onPress={() =>
                      setSelectedRoute(selectedRoute === route.id ? null : route.id)
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.routeHeader}>
                      <View style={[styles.routeColorBadge, { backgroundColor: route.color }]}>
                        <Text style={styles.routeColorBadgeText}>
                          {route.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.routeInfo}>
                        <Text style={styles.routeName}>{route.name}</Text>
                        <Text style={styles.routeDirection}>{route.direction}</Text>
                      </View>
                      <View style={styles.routeFrequencyBadge}>
                        <Text style={styles.routeFrequencyText}>{route.frequency}</Text>
                      </View>
                    </View>

                    <View style={styles.routeMeta}>
                      <View style={styles.routeMetaItem}>
                        <SFIcon name="clock" size={14} color={Colors.gray[2]} />
                        <Text style={styles.routeMetaText}>{route.hours}</Text>
                      </View>
                    </View>

                    {selectedRoute === route.id && (
                      <Animated.View entering={FadeIn} style={styles.routeDetails}>
                        <Text style={styles.routeStopsTitle}>Route Stops</Text>
                        <View style={styles.routeStopsContainer}>
                          {route.stops.map((stop, stopIndex) => (
                            <View key={stopIndex} style={styles.routeStopItem}>
                              <View style={[styles.routeStopDot, { backgroundColor: route.color }]} />
                              <Text style={styles.routeStopText}>{stop}</Text>
                              {stopIndex < route.stops.length - 1 && (
                                <View style={[styles.routeStopLine, { backgroundColor: route.color + '30' }]} />
                              )}
                            </View>
                          ))}
                        </View>
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>

            {/* App Links */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Track Buses Live</Text>
              <View style={styles.appsRow}>
                <TouchableOpacity style={styles.appCard} onPress={openGoPass}>
                  <View style={[styles.appIcon, { backgroundColor: '#4CAF50' + '15' }]}>
                    <SFIcon name="ticket" size={24} color="#4CAF50" />
                  </View>
                  <Text style={styles.appName}>GoPass</Text>
                  <Text style={styles.appDesc}>Digital pass & tracking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.appCard} onPress={openLiveTracker}>
                  <View style={[styles.appIcon, { backgroundColor: Colors.ios.blue + '15' }]}>
                    <SFIcon name="navigate" size={24} color={Colors.ios.blue} />
                  </View>
                  <Text style={styles.appName}>Live Tracker</Text>
                  <Text style={styles.appDesc}>Real-time bus location</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Game Day Info */}
            <View style={styles.gameDayCard}>
              <View style={styles.gameDayHeader}>
                <View style={styles.gameDayIcon}>
                  <SFIcon name="trophy" size={20} color={Colors.ios.orange} />
                </View>
                <View style={styles.gameDayInfo}>
                  <Text style={styles.gameDayTitle}>Game Day Shuttles</Text>
                  <Text style={styles.gameDaySubtitle}>Football & Basketball</Text>
                </View>
              </View>
              <View style={styles.gameDayDetails}>
                <View style={styles.gameDayDetailRow}>
                  <Text style={styles.gameDayLabel}>Football:</Text>
                  <Text style={styles.gameDayValue}>
                    $6 round trip via GoPass, 3hr before - 1hr after
                  </Text>
                </View>
                <View style={styles.gameDayDetailRow}>
                  <Text style={styles.gameDayLabel}>Basketball:</Text>
                  <Text style={styles.gameDayValue}>
                    FREE from S1 lot, 90min before - 60min after
                  </Text>
                </View>
                <View style={styles.gameDayDetailRow}>
                  <Text style={styles.gameDayLabel}>Pickup:</Text>
                  <Text style={styles.gameDayValue}>
                    John Walker Soccer Complex (Texas Tech Pkwy)
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* S1 Shuttle Tab */}
        {activeTab === 'schedule' && (
          <>
            {/* Park at S1 + Bus = Best Value Banner */}
            <Animated.View entering={FadeIn} style={styles.bestValueBanner}>
              <View style={styles.bestValueIcon}>
                <SFIcon name="bus" size={24} color={Colors.ios.green} />
              </View>
              <View style={styles.bestValueContent}>
                <Text style={styles.bestValueTitle}>PARK AT S1 + BUS = BEST VALUE</Text>
                <View style={styles.bestValueStatus}>
                  <View style={styles.bestValueStatusDot} />
                  <Text style={styles.bestValueStatusText}>S1 is OPEN (23% full)</Text>
                </View>
              </View>
            </Animated.View>

            {/* S1 Hero Card */}
            <Animated.View entering={FadeIn} style={styles.s1HeroCard}>
              <View style={styles.s1HeroHeader}>
                <View style={[
                  styles.s1HeroIcon,
                  s1ServiceStatus.isActive && { backgroundColor: Colors.ios.green + '15' }
                ]}>
                  <SFIcon name="bus" size={32} color={s1ServiceStatus.isActive ? Colors.ios.green : Colors.gray[2]} />
                </View>
                <View style={styles.s1HeroInfo}>
                  <Text style={styles.s1HeroTitle}>S1 Satellite Service</Text>
                  <View style={[
                    styles.s1StatusBadge,
                    s1ServiceStatus.isActive && styles.s1StatusBadgeActive
                  ]}>
                    <View style={[
                      styles.s1StatusDot,
                      s1ServiceStatus.isActive && styles.s1StatusDotActive
                    ]} />
                    <Text style={[
                      styles.s1StatusText,
                      s1ServiceStatus.isActive && styles.s1StatusTextActive
                    ]}>
                      {s1ServiceStatus.isActive ? 'Buses Running' : 'Service Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Service Status */}
              {s1ServiceStatus.isActive ? (
                <View style={styles.nextBusCard}>
                  <View style={styles.nextBusInfo}>
                    <Text style={styles.nextBusLabel}>Next Bus Arrives</Text>
                    <Text style={styles.nextBusSubtext}>
                      Continuous loop service
                    </Text>
                    <Text style={styles.nextBusNote}>
                      Served by Red Raider & Double T routes
                    </Text>
                  </View>
                  <View style={styles.nextBusCountdown}>
                    <Text style={styles.countdownNumber}>~{s1ServiceStatus.nextBusIn}</Text>
                    <Text style={styles.countdownLabel}>min</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.noBusCard}>
                  <SFIcon name="moon" size={24} color={Colors.gray[2]} />
                  <Text style={styles.noBusText}>{s1ServiceStatus.message}</Text>
                  <Text style={styles.noBusSubtext}>
                    Service hours: {S1_SERVICE_INFO.operatingHours.start} - {S1_SERVICE_INFO.operatingHours.end}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Service Info Cards */}
            <View style={styles.serviceInfoGrid}>
              <View style={styles.serviceInfoCard}>
                <SFIcon name="clock" size={24} color={Colors.ios.blue} />
                <Text style={styles.serviceInfoValue}>Every {S1_SERVICE_INFO.frequency} min</Text>
                <Text style={styles.serviceInfoLabel}>Bus Frequency</Text>
              </View>
              <View style={styles.serviceInfoCard}>
                <SFIcon name="timer" size={24} color={Colors.ios.orange} />
                <Text style={styles.serviceInfoValue}>~{S1_SERVICE_INFO.estimatedTripTime} min</Text>
                <Text style={styles.serviceInfoLabel}>To Campus Center</Text>
              </View>
              <View style={styles.serviceInfoCard}>
                <SFIcon name="sunrise" size={24} color={Colors.ios.green} />
                <Text style={styles.serviceInfoValue}>{S1_SERVICE_INFO.operatingHours.start}</Text>
                <Text style={styles.serviceInfoLabel}>First Bus</Text>
              </View>
              <View style={styles.serviceInfoCard}>
                <SFIcon name="sunset" size={24} color={Colors.ios.purple} />
                <Text style={styles.serviceInfoValue}>{S1_SERVICE_INFO.operatingHours.end}</Text>
                <Text style={styles.serviceInfoLabel}>Last Bus</Text>
              </View>
            </View>

            {/* Live Bus Tracking - Wireframe Style */}
            <View style={styles.liveTrackingCard}>
              <Text style={styles.liveTrackingTitle}>LIVE BUS TRACKING</Text>
              <View style={styles.liveTrackingUnderline} />

              <View style={styles.liveTrackingRoute}>
                <Text style={styles.liveTrackingRouteLabel}>Route:</Text>
                <Text style={styles.liveTrackingRouteValue}>S1 → Campus</Text>
              </View>

              <TouchableOpacity style={styles.viewOnMapButton} onPress={openLiveTracker}>
                <SFIcon name="map" size={16} color={Colors.ios.blue} />
                <Text style={styles.viewOnMapText}>[ View on Map ]</Text>
              </TouchableOpacity>

              <Text style={styles.poweredByText}>Powered by Citibus GoPass API</Text>
            </View>

            {/* Detailed Comparison Section */}
            <Animated.View entering={FadeInDown.delay(100)} style={styles.comparisonCard}>
              <Text style={styles.comparisonTitle}>COMPARISON</Text>
              <View style={styles.comparisonUnderline} />

              {/* Drive to C11 Option */}
              <View style={styles.comparisonOption}>
                <View style={styles.comparisonOptionHeader}>
                  <View style={[styles.comparisonOptionIcon, { backgroundColor: Colors.status.filling + '15' }]}>
                    <SFIcon name="car" size={18} color={Colors.status.filling} />
                  </View>
                  <Text style={styles.comparisonOptionTitle}>Drive to C11:</Text>
                </View>
                <View style={styles.comparisonDetails}>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={styles.comparisonBullet}>•</Text>
                    <Text style={styles.comparisonDetailText}>12 min searching for spot</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={styles.comparisonBullet}>•</Text>
                    <Text style={styles.comparisonDetailText}>Walk 4 min to class</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={styles.comparisonBullet}>•</Text>
                    <Text style={styles.comparisonDetailText}>Total: ~16 min</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={styles.comparisonBullet}>•</Text>
                    <Text style={styles.comparisonDetailText}>Cost: $143/year</Text>
                  </View>
                </View>
              </View>

              {/* Park at S1 + Bus Option */}
              <View style={[styles.comparisonOption, styles.comparisonOptionHighlight]}>
                <View style={styles.comparisonOptionHeader}>
                  <View style={[styles.comparisonOptionIcon, { backgroundColor: Colors.ios.green + '15' }]}>
                    <SFIcon name="bus" size={18} color={Colors.ios.green} />
                  </View>
                  <Text style={[styles.comparisonOptionTitle, { color: Colors.ios.green }]}>Park at S1 + Bus:</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>BEST</Text>
                  </View>
                </View>
                <View style={styles.comparisonDetails}>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={[styles.comparisonBullet, { color: Colors.ios.green }]}>•</Text>
                    <Text style={styles.comparisonDetailText}>Park immediately</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={[styles.comparisonBullet, { color: Colors.ios.green }]}>•</Text>
                    <Text style={styles.comparisonDetailText}>Bus 8 min to campus</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={[styles.comparisonBullet, { color: Colors.ios.green }]}>•</Text>
                    <Text style={styles.comparisonDetailText}>Walk 2 min to class</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={[styles.comparisonBullet, { color: Colors.ios.green }]}>•</Text>
                    <Text style={styles.comparisonDetailText}>Total: ~10 min</Text>
                  </View>
                  <View style={styles.comparisonDetailRow}>
                    <Text style={[styles.comparisonBullet, { color: Colors.ios.green }]}>•</Text>
                    <Text style={styles.comparisonDetailText}>
                      Cost: $44/year{' '}
                      <Text style={styles.savingsHighlight}>(SAVE $99!)</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* S1 Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <SFIcon name="pin" size={16} color={Colors.ios.blue} />
                <Text style={styles.infoTitle}>S1 Lot Location</Text>
              </View>
              <Text style={styles.infoText}>
                Located at John Walker Soccer Complex on Texas Tech Parkway (1090 Texas Tech Pkwy).
                Look for the "{S1_SERVICE_INFO.stopName}" bus stop on the north side.
              </Text>
              <View style={styles.infoRoutes}>
                <Text style={styles.infoRoutesLabel}>Routes serving S1:</Text>
                <View style={styles.infoRoutesTags}>
                  {S1_SERVICE_INFO.routes.map((route) => (
                    <View key={route} style={[
                      styles.infoRouteTag,
                      { backgroundColor: route === 'Red Raider' ? Colors.scarlet.DEFAULT + '15' : Colors.ios.blue + '15' }
                    ]}>
                      <Text style={[
                        styles.infoRouteTagText,
                        { color: route === 'Red Raider' ? Colors.scarlet.DEFAULT : Colors.ios.blue }
                      ]}>{route}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Important Notes */}
            <View style={styles.notesCard}>
              <Text style={styles.notesTitle}>Important Notes</Text>
              <View style={styles.noteItem}>
                <SFIcon name="exclamationmark-triangle" size={14} color={Colors.ios.orange} />
                <Text style={styles.noteText}>No service on weekends or university holidays</Text>
              </View>
              <View style={styles.noteItem}>
                <SFIcon name="exclamationmark-triangle" size={14} color={Colors.ios.orange} />
                <Text style={styles.noteText}>Limited service during summer sessions</Text>
              </View>
              <View style={styles.noteItem}>
                <SFIcon name="checkmark-circle" size={14} color={Colors.ios.green} />
                <Text style={styles.noteText}>Free for all TTU students with valid ID</Text>
              </View>
            </View>
          </>
        )}

        {/* Raider Ride Tab */}
        {activeTab === 'raider-ride' && (
          <>
            {/* Raider Ride Hero */}
            <Animated.View entering={FadeIn} style={styles.raiderRideHero}>
              <View style={styles.raiderRideHeader}>
                <View style={[
                  styles.raiderRideIcon,
                  raiderRideStatus.isActive && styles.raiderRideIconActive
                ]}>
                  <SFIcon
                    name="moon"
                    size={32}
                    color={raiderRideStatus.isActive ? '#FFFFFF' : Colors.ios.purple}
                  />
                </View>
                <View style={styles.raiderRideInfo}>
                  <Text style={styles.raiderRideTitle}>Raider Ride</Text>
                  <View style={[
                    styles.raiderRideStatusBadge,
                    raiderRideStatus.isActive && styles.raiderRideStatusBadgeActive
                  ]}>
                    <View style={[
                      styles.raiderRideStatusDot,
                      raiderRideStatus.isActive && styles.raiderRideStatusDotActive
                    ]} />
                    <Text style={[
                      styles.raiderRideStatusText,
                      raiderRideStatus.isActive && styles.raiderRideStatusTextActive
                    ]}>
                      {raiderRideStatus.status}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.raiderRideDesc}>
                Free on-demand nighttime shuttle for TTU students. Request rides via the TechRide app.
              </Text>
            </Animated.View>

            {/* How it Works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How It Works</Text>

              <View style={styles.stepsContainer}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Download TechRide App</Text>
                    <Text style={styles.stepDesc}>
                      Available on iOS and Android
                    </Text>
                  </View>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Sign in with eRaider</Text>
                    <Text style={styles.stepDesc}>
                      Use your TTU credentials
                    </Text>
                  </View>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Request Your Ride</Text>
                    <Text style={styles.stepDesc}>
                      Select pickup & drop-off locations
                    </Text>
                  </View>
                </View>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Show Student ID</Text>
                    <Text style={styles.stepDesc}>
                      Valid TTU ID required to board
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.downloadAppButton} onPress={openTechRideApp}>
                <SFIcon name="arrow-down-to-line" size={18} color="#FFFFFF" />
                <Text style={styles.downloadAppText}>Download TechRide App</Text>
              </TouchableOpacity>
            </View>

            {/* Service Details */}
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Service Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hours</Text>
                <Text style={styles.detailValue}>6:00 PM - 2:45 AM daily</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Availability</Text>
                <Text style={styles.detailValue}>7 days a week (when classes in session)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vehicles</Text>
                <Text style={styles.detailValue}>White 10-passenger vans</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Routes</Text>
                <Text style={styles.detailValue}>Fixed routes (clockwise & counter-clockwise)</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cost</Text>
                <Text style={[styles.detailValue, { color: Colors.ios.green, fontWeight: FontWeight.semibold }]}>
                  FREE for students
                </Text>
              </View>
            </View>

            {/* Note */}
            <View style={styles.noteCard}>
              <SFIcon name="info" size={16} color={Colors.gray[1]} />
              <Text style={styles.noteText}>
                Raider Ride does not operate on TTU holidays. Service runs from the night
                before first day of classes through Sunday morning following commencement.
              </Text>
            </View>
          </>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  headerAction: {
    width: 40,
    height: 40,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[6],
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.scarlet[50],
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[2],
  },
  tabTextActive: {
    color: Colors.scarlet.DEFAULT,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Quick Info Banner
  quickInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.blue + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.blue + '20',
  },
  quickInfoIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  quickInfoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    lineHeight: 18,
  },
  quickInfoBold: {
    fontWeight: FontWeight.bold,
  },

  // Section
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.md,
  },

  // Route Card
  routeCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  routeCardSelected: {
    borderWidth: 2,
    borderColor: Colors.scarlet.DEFAULT,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeColorBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  routeColorBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  routeInfo: {
    flex: 1,
  },
  routeName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  routeDirection: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginTop: 2,
  },
  routeFrequencyBadge: {
    backgroundColor: Colors.ios.green + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  routeFrequencyText: {
    fontSize: FontSize.xs,
    color: Colors.ios.green,
    fontWeight: FontWeight.semibold,
  },
  routeMeta: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  routeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeMetaText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginLeft: 6,
  },
  routeDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  routeStopsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  routeStopsContainer: {
    paddingLeft: Spacing.sm,
  },
  routeStopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    position: 'relative',
  },
  routeStopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
    zIndex: 1,
  },
  routeStopLine: {
    position: 'absolute',
    left: 4,
    top: 20,
    width: 2,
    height: 24,
  },
  routeStopText: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    flex: 1,
  },

  // Apps Row
  appsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  appCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  appDesc: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginTop: 2,
    textAlign: 'center',
  },

  // Game Day Card
  gameDayCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  gameDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  gameDayIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  gameDayInfo: {
    flex: 1,
  },
  gameDayTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#92400E',
  },
  gameDaySubtitle: {
    fontSize: FontSize.xs,
    color: '#B45309',
  },
  gameDayDetails: {
    gap: Spacing.sm,
  },
  gameDayDetailRow: {
    flexDirection: 'row',
  },
  gameDayLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#92400E',
    width: 80,
  },
  gameDayValue: {
    fontSize: FontSize.sm,
    color: '#B45309',
    flex: 1,
  },

  // Best Value Banner
  bestValueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.green + '10',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.ios.green + '30',
  },
  bestValueIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.green + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  bestValueContent: {
    flex: 1,
  },
  bestValueTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
    letterSpacing: 0.5,
  },
  bestValueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bestValueStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.ios.green,
    marginRight: 6,
  },
  bestValueStatusText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },

  // Comparison Card
  comparisonCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[4],
    ...Shadows.sm,
  },
  comparisonTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  comparisonUnderline: {
    width: 50,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  comparisonOption: {
    marginBottom: Spacing.md,
  },
  comparisonOptionHighlight: {
    backgroundColor: Colors.ios.green + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: Colors.ios.green + '30',
  },
  comparisonOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  comparisonOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  comparisonOptionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    flex: 1,
  },
  recommendedBadge: {
    backgroundColor: Colors.ios.green,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  recommendedBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  comparisonDetails: {
    paddingLeft: 40,
  },
  comparisonDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  comparisonBullet: {
    fontSize: FontSize.md,
    color: Colors.gray[2],
    marginRight: 8,
    marginTop: -2,
  },
  comparisonDetailText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    flex: 1,
    lineHeight: 20,
  },
  savingsHighlight: {
    color: Colors.ios.green,
    fontWeight: FontWeight.bold,
  },

  // Live Tracking Card (Wireframe Style)
  liveTrackingCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[4],
  },
  liveTrackingTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  liveTrackingUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  liveTrackingRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  liveTrackingRouteLabel: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    marginRight: Spacing.sm,
  },
  liveTrackingRouteValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewOnMapText: {
    fontSize: FontSize.md,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
    marginLeft: Spacing.sm,
  },
  poweredByText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    fontStyle: 'italic',
  },

  // S1 Hero Card
  s1HeroCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.ios.green + '30',
    ...Shadows.md,
  },
  s1HeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  s1HeroIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.green + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  s1HeroInfo: {
    flex: 1,
  },
  s1HeroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  s1HeroSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 4,
  },

  // Next Bus
  nextBusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.ios.green + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  nextBusInfo: {
    flex: 1,
  },
  nextBusLabel: {
    fontSize: FontSize.xs,
    color: Colors.ios.green,
    fontWeight: FontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nextBusTime: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
    marginTop: 2,
  },
  nextBusArrival: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  nextBusCountdown: {
    alignItems: 'center',
    backgroundColor: Colors.ios.green,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  countdownLabel: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium,
  },
  noBusCard: {
    alignItems: 'center',
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  noBusText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginTop: Spacing.sm,
  },
  noBusSubtext: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 4,
  },

  // Savings Card
  savingsCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  savingsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#065F46',
    marginLeft: Spacing.sm,
  },
  savingsComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  savingsItem: {
    alignItems: 'center',
  },
  savingsItemLabel: {
    fontSize: FontSize.sm,
    color: '#047857',
  },
  savingsItemPrice: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#065F46',
  },
  savingsItemPriceStrike: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  savingsVs: {},
  savingsVsText: {
    fontSize: FontSize.sm,
    color: '#047857',
    fontWeight: FontWeight.medium,
  },
  savingsNote: {
    fontSize: FontSize.sm,
    color: '#047857',
    textAlign: 'center',
  },

  // Schedule Section
  scheduleSection: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  scheduleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  scheduleSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginLeft: Spacing.sm,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  scheduleGridItem: {
    backgroundColor: Colors.gray[6],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  scheduleGridTime: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    fontWeight: FontWeight.medium,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.ios.blue + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.blue + '20',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.blue,
    marginLeft: Spacing.sm,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },
  infoRoutes: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.ios.blue + '20',
  },
  infoRoutesLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginBottom: Spacing.xs,
  },
  infoRoutesTags: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  infoRouteTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  infoRouteTagText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // S1 Status Badge
  s1StatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[5],
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  s1StatusBadgeActive: {
    backgroundColor: Colors.ios.green + '15',
  },
  s1StatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[3],
    marginRight: 6,
  },
  s1StatusDotActive: {
    backgroundColor: Colors.ios.green,
  },
  s1StatusText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    fontWeight: FontWeight.medium,
  },
  s1StatusTextActive: {
    color: Colors.ios.green,
  },

  // Service Info Grid
  serviceInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  serviceInfoCard: {
    width: '48%',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  serviceInfoValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginTop: Spacing.sm,
  },
  serviceInfoLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginTop: 2,
  },

  // Track Live Card
  trackLiveCard: {
    backgroundColor: Colors.ios.blue + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.blue + '20',
  },
  trackLiveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  trackLiveIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.ios.blue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  trackLiveText: {
    flex: 1,
  },
  trackLiveTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  trackLiveDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  trackLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ios.blue,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  trackLiveButtonText: {
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Notes Card
  notesCard: {
    backgroundColor: Colors.ios.orange + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.orange + '20',
  },
  notesTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
    marginBottom: Spacing.sm,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  noteText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginLeft: Spacing.sm,
    flex: 1,
  },

  // Next Bus Subtext
  nextBusSubtext: {
    fontSize: FontSize.sm,
    color: Colors.ios.green,
    marginTop: 2,
  },
  nextBusNote: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginTop: 4,
  },

  // Raider Ride Hero
  raiderRideHero: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.ios.purple + '30',
    ...Shadows.md,
  },
  raiderRideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  raiderRideIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.purple + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  raiderRideIconActive: {
    backgroundColor: Colors.ios.purple,
  },
  raiderRideInfo: {
    flex: 1,
  },
  raiderRideTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  raiderRideStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[5],
  },
  raiderRideStatusBadgeActive: {
    backgroundColor: Colors.ios.green + '15',
  },
  raiderRideStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[2],
    marginRight: 6,
  },
  raiderRideStatusDotActive: {
    backgroundColor: Colors.ios.green,
  },
  raiderRideStatusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
  },
  raiderRideStatusTextActive: {
    color: Colors.ios.green,
  },
  raiderRideDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },

  // Steps
  stepsContainer: {
    marginBottom: Spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  stepDesc: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },

  // Download Button
  downloadAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ios.purple,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  downloadAppText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Details Card
  detailsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  detailsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  detailValue: {
    fontSize: FontSize.sm,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
  },

  // Note Card (Raider Ride)
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  noteCardText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 18,
    marginLeft: Spacing.sm,
  },
});
