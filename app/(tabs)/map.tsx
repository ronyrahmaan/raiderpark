import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Layers, Navigation, ChevronUp } from 'lucide-react-native';
import { useParkingStore } from '@/stores/parkingStore';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';
import { LotWithStatusForPermit } from '@/types/database';

const { width, height } = Dimensions.get('window');

// TTU Campus Center
const TTU_CENTER = {
  latitude: 33.5843,
  longitude: -101.8783,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

// Status colors for markers
const MARKER_COLORS = {
  open: '#34C759',
  busy: '#FFCC00',
  filling: '#FF9500',
  full: '#FF3B30',
  closed: '#8E8E93',
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selectedLot, setSelectedLot] = useState<LotWithStatusForPermit | null>(null);
  const [showAllLots, setShowAllLots] = useState(false);

  const { appUser } = useAuthStore();
  const { lots, lotsForPermit, fetchLots, fetchLotsForPermit } = useParkingStore();

  useEffect(() => {
    fetchLots();
    if (appUser?.permit_type) {
      fetchLotsForPermit(appUser.permit_type);
    }
  }, [appUser?.permit_type]);

  const displayedLots = showAllLots ? lots : lotsForPermit;

  const handleMarkerPress = (lot: LotWithStatusForPermit) => {
    setSelectedLot(lot);
    bottomSheetRef.current?.snapToIndex(1);

    // Center map on selected lot
    // Note: In real implementation, lot would have coordinates
    // mapRef.current?.animateToRegion({
    //   latitude: lot.center.lat,
    //   longitude: lot.center.lng,
    //   latitudeDelta: 0.005,
    //   longitudeDelta: 0.005,
    // });
  };

  const centerOnUser = () => {
    // In real implementation, get user location
    mapRef.current?.animateToRegion(TTU_CENTER, 500);
  };

  return (
    <View className="flex-1">
      {/* Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={TTU_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        mapType="standard"
      >
        {/* Lot Markers - placeholder positions */}
        {lotsForPermit.map((lot, index) => (
          <Marker
            key={lot.lot_id}
            coordinate={{
              // Placeholder coordinates - would come from lot data
              latitude: TTU_CENTER.latitude + (index * 0.002) - 0.005,
              longitude: TTU_CENTER.longitude + ((index % 3) * 0.003) - 0.004,
            }}
            onPress={() => handleMarkerPress(lot)}
          >
            <View
              className="px-2 py-1 rounded-lg"
              style={{
                backgroundColor: MARKER_COLORS[lot.status],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-white font-bold text-sm">{lot.lot_id}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Map Controls */}
      <SafeAreaView
        className="absolute top-0 left-0 right-0"
        edges={['top']}
        pointerEvents="box-none"
      >
        <View className="px-4 pt-2 flex-row justify-between" pointerEvents="box-none">
          {/* Filter Toggle */}
          <TouchableOpacity
            className="bg-white rounded-xl px-4 py-3 flex-row items-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => setShowAllLots(!showAllLots)}
          >
            <Layers size={18} color={Colors.gray[1]} />
            <Text className="ml-2 font-medium text-gray-700">
              {showAllLots ? 'All Lots' : 'My Lots'}
            </Text>
          </TouchableOpacity>

          {/* Center on User */}
          <TouchableOpacity
            className="bg-white rounded-xl p-3"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={centerOnUser}
          >
            <Navigation size={20} color={Colors.ios.blue} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Legend */}
      <View
        className="absolute bottom-32 left-4 bg-white rounded-xl p-3"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <Text className="text-xs font-semibold text-gray-500 mb-2">STATUS</Text>
        {Object.entries(MARKER_COLORS).map(([status, color]) => (
          <View key={status} className="flex-row items-center mb-1">
            <View
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: color }}
            />
            <Text className="text-xs text-gray-600 capitalize">{status}</Text>
          </View>
        ))}
      </View>

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={['12%', '50%', '90%']}
        backgroundStyle={{ backgroundColor: '#FFFFFF' }}
        handleIndicatorStyle={{ backgroundColor: Colors.gray[3] }}
      >
        <BottomSheetScrollView className="flex-1 px-4">
          {selectedLot ? (
            <View>
              {/* Lot Header */}
              <View className="flex-row items-center justify-between mb-4">
                <View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {selectedLot.lot_id}
                  </Text>
                  <Text className="text-base text-gray-500">
                    {selectedLot.lot_name}
                  </Text>
                </View>
                <View
                  className="px-3 py-2 rounded-full"
                  style={{
                    backgroundColor: MARKER_COLORS[selectedLot.status] + '20',
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: MARKER_COLORS[selectedLot.status] }}
                  >
                    {selectedLot.occupancy_percent}% Full
                  </Text>
                </View>
              </View>

              {/* Occupancy Bar */}
              <View className="mb-4">
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedLot.occupancy_percent}%`,
                      backgroundColor: MARKER_COLORS[selectedLot.status],
                    }}
                  />
                </View>
              </View>

              {/* Walk Times */}
              {selectedLot.walk_times && Object.keys(selectedLot.walk_times).length > 0 && (
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-500 mb-2">
                    WALK TIMES
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {Object.entries(selectedLot.walk_times).map(([building, mins]) => (
                      <View
                        key={building}
                        className="bg-gray-100 rounded-lg px-3 py-2"
                      >
                        <Text className="text-xs text-gray-500 capitalize">
                          {building}
                        </Text>
                        <Text className="text-sm font-medium text-gray-900">
                          {mins} min
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Actions */}
              <TouchableOpacity
                className="bg-scarlet-500 rounded-xl py-4 items-center"
                onPress={() => {}}
              >
                <Text className="text-white font-semibold text-base">
                  Navigate to {selectedLot.lot_id}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center justify-center py-2">
                <ChevronUp size={20} color={Colors.gray[2]} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Nearby Lots
              </Text>
              <Text className="text-gray-500 text-sm">
                Tap a lot on the map to see details
              </Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}
