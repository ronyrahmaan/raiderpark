import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Bell, ChevronRight, Clock, AlertTriangle } from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { useParkingStore } from '@/stores/parkingStore';
import { getPermitInfo } from '@/constants/permits';
import { Colors } from '@/constants/theme';

// Status color mapping
const STATUS_COLORS = {
  open: Colors.status.open,
  busy: Colors.status.busy,
  filling: Colors.status.filling,
  full: Colors.status.full,
  closed: Colors.status.closed,
};

const STATUS_LABELS = {
  open: 'Open',
  busy: 'Busy',
  filling: 'Filling',
  full: 'Full',
  closed: 'Closed',
};

export default function HomeScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const {
    lotsForPermit,
    activeEvents,
    isLoading,
    fetchLotsForPermit,
    fetchEvents,
    subscribeToLotUpdates,
  } = useParkingStore();

  const permitInfo = appUser ? getPermitInfo(appUser.permit_type) : null;

  // Fetch data on mount
  useEffect(() => {
    if (appUser?.permit_type) {
      fetchLotsForPermit(appUser.permit_type);
      fetchEvents();
    }
  }, [appUser?.permit_type]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToLotUpdates();
    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(async () => {
    if (appUser?.permit_type) {
      await Promise.all([
        fetchLotsForPermit(appUser.permit_type),
        fetchEvents(),
      ]);
    }
  }, [appUser?.permit_type]);

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get user's first name
  const getFirstName = () => {
    if (appUser?.display_name) {
      return appUser.display_name.split(' ')[0];
    }
    return 'Raider';
  };

  return (
    <SafeAreaView className="flex-1 bg-ios-gray6" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.scarlet.DEFAULT}
          />
        }
      >
        {/* Header */}
        <View className="px-4 pt-2 pb-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                {getGreeting()}, {getFirstName()}
              </Text>
              <Text className="text-base text-gray-500 mt-1">
                {permitInfo?.name ?? 'No Permit'} Parking
              </Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-white items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={20} color={Colors.gray[1]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Events Alert */}
        {activeEvents.length > 0 && (
          <View className="mx-4 mb-4">
            <TouchableOpacity
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center"
              onPress={() => router.push('/events')}
            >
              <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
                <AlertTriangle size={20} color={Colors.ios.orange} />
              </View>
              <View className="flex-1">
                <Text className="text-amber-800 font-semibold">
                  {activeEvents[0].title}
                </Text>
                <Text className="text-amber-600 text-sm">
                  {activeEvents[0].affected_lots.length} lots affected
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.ios.orange} />
            </TouchableOpacity>
          </View>
        )}

        {/* Your Lots Section */}
        <View className="px-4 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-gray-900">
              Your Lots Right Now
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
              <Text className="text-scarlet-500 font-medium">See All</Text>
            </TouchableOpacity>
          </View>

          {/* Lot Cards */}
          <View className="flex-row flex-wrap gap-3">
            {lotsForPermit.slice(0, 6).map((lot) => (
              <TouchableOpacity
                key={lot.lot_id}
                className="bg-white rounded-2xl p-4 flex-1 min-w-[45%]"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
                onPress={() => router.push(`/lot/${lot.lot_id}`)}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xl font-bold text-gray-900">
                    {lot.lot_id}
                  </Text>
                  <View
                    className="px-2 py-1 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[lot.status] + '20' }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: STATUS_COLORS[lot.status] }}
                    >
                      {STATUS_LABELS[lot.status]}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-500 mb-2">
                  {lot.short_name ?? lot.lot_name}
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden"
                  >
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${lot.occupancy_percent}%`,
                        backgroundColor: STATUS_COLORS[lot.status],
                      }}
                    />
                  </View>
                  <Text className="text-sm font-medium text-gray-600 ml-2">
                    {lot.occupancy_percent}%
                  </Text>
                </View>
                {!lot.is_valid_now && lot.valid_after && (
                  <View className="flex-row items-center mt-2">
                    <Clock size={12} color={Colors.gray[1]} />
                    <Text className="text-xs text-gray-400 ml-1">
                      Valid after {lot.valid_after}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Quick Actions
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white rounded-2xl p-4 items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
              onPress={() => router.push('/report')}
            >
              <View className="w-12 h-12 rounded-full bg-scarlet-50 items-center justify-center mb-2">
                <MapPin size={24} color={Colors.scarlet.DEFAULT} />
              </View>
              <Text className="text-sm font-medium text-gray-900">
                I Just Parked
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white rounded-2xl p-4 items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
              onPress={() => router.push('/report?status=full')}
            >
              <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center mb-2">
                <AlertTriangle size={24} color={Colors.status.full} />
              </View>
              <Text className="text-sm font-medium text-gray-900">
                It's Full!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white rounded-2xl p-4 items-center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
              onPress={() => router.push('/events')}
            >
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-2">
                <Clock size={24} color={Colors.ios.blue} />
              </View>
              <Text className="text-sm font-medium text-gray-900">
                Events
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tip of the Day */}
        <View className="mx-4 bg-scarlet-500 rounded-2xl p-4">
          <Text className="text-white font-semibold text-lg mb-1">
            Pro Tip
          </Text>
          <Text className="text-scarlet-100">
            After 2:30 PM, Commuter West permits can park in Commuter North lots
            too. More options, less circling!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
