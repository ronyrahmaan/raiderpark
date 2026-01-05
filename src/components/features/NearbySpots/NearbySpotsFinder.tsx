/**
 * Nearby Spots Finder Component
 *
 * Bottom sheet container for the Find Nearby Spot feature.
 * Features:
 * - Drag handle and close button
 * - Mode selector (Now, Planned, Nearby)
 * - Destination picker
 * - Pull to refresh
 */

import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '@/constants/theme';
import { FinderMode, NearbySpotResult, CAMPUS_BUILDINGS } from '@/types/nearbySpots';
import { useNearbySpots, useCampusBuildings } from '@/hooks/useNearbySpots';
import { lightHaptic, successHaptic } from '@/utils/haptics';
import { navigateToLot } from '@/utils/navigation';
import { NearbySpotsList } from './NearbySpotsList';

// ============================================================
// TYPES
// ============================================================

export interface NearbySpotsFinderRef {
  open: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
}

interface NearbySpotsFinderProps {
  onClose?: () => void;
  onSpotPress?: (spot: NearbySpotResult) => void;
  initialMode?: FinderMode;
}

// ============================================================
// CONSTANTS
// ============================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_POINTS = ['50%', '90%'];

// ============================================================
// COMPONENT
// ============================================================

export const NearbySpotsFinder = forwardRef<NearbySpotsFinderRef, NearbySpotsFinderProps>(
  function NearbySpotsFinder(
    { onClose, onSpotPress, initialMode = 'now' },
    ref
  ) {
    const insets = useSafeAreaInsets();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const { getBuildingName } = useCampusBuildings();

    // Use the nearby spots hook
    const {
      recommended,
      alternatives,
      viewState,
      result,
      isRefetching,
      allLotsFull,
      fullSuggestion,
      refetch,
      setMode,
      setDestination,
    } = useNearbySpots({
      autoFetch: true,
      mode: initialMode,
      refetchInterval: 30000,
    });

    // Current mode state
    const [activeMode, setActiveMode] = React.useState<FinderMode>(initialMode);
    const [showDestinationPicker, setShowDestinationPicker] = React.useState(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      open: () => {
        bottomSheetRef.current?.expand();
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
      snapToIndex: (index: number) => {
        bottomSheetRef.current?.snapToIndex(index);
      },
    }));

    // Handle mode change
    const handleModeChange = useCallback((mode: FinderMode) => {
      lightHaptic();
      setActiveMode(mode);
      setMode(mode);
    }, [setMode]);

    // Handle spot press
    const handleSpotPress = useCallback((spot: NearbySpotResult) => {
      onSpotPress?.(spot);
    }, [onSpotPress]);

    // Handle navigate
    const handleNavigate = useCallback(async (spot: NearbySpotResult) => {
      successHaptic();
      await navigateToLot(
        spot.lot.lot_id,
        spot.lot.lot_name,
        spot.lot.center
      );
    }, []);

    // Handle destination select
    const handleDestinationSelect = useCallback((buildingId: string) => {
      setDestination(buildingId);
      setShowDestinationPicker(false);
    }, [setDestination]);

    // Backdrop
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={SNAP_POINTS}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
      >
        <BottomSheetView style={[styles.container, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <SFIcon name="location.magnifyingglass" size={20} color={Colors.scarlet[500]} />
                </View>
                <Text style={styles.headerTitle}>Find Nearby Spot</Text>
              </View>
              <TouchableOpacity
                onPress={() => bottomSheetRef.current?.close()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <SFIcon name="xmark.circle.fill" size={24} color={Colors.gray[3]} />
              </TouchableOpacity>
            </View>

            {/* Freshness & Destination */}
            <View style={styles.subheaderRow}>
              {result?.destination && (
                <TouchableOpacity
                  style={styles.destinationChip}
                  onPress={() => setShowDestinationPicker(true)}
                >
                  <SFIcon name="building.2.fill" size={12} color={Colors.ios.blue} />
                  <Text style={styles.destinationText}>
                    {getBuildingName(result.destination)}
                  </Text>
                  <SFIcon name="chevron.down" size={10} color={Colors.gray[2]} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <ModeSelectorButton
              mode="now"
              label="NOW"
              icon="bolt.fill"
              isActive={activeMode === 'now'}
              onPress={() => handleModeChange('now')}
            />
            <ModeSelectorButton
              mode="planned"
              label="PLANNED"
              icon="clock.fill"
              isActive={activeMode === 'planned'}
              onPress={() => handleModeChange('planned')}
            />
            <ModeSelectorButton
              mode="nearby"
              label="NEARBY"
              icon="location.fill"
              isActive={activeMode === 'nearby'}
              onPress={() => handleModeChange('nearby')}
            />
          </View>

          {/* Spots List */}
          <NearbySpotsList
            recommended={recommended}
            alternatives={alternatives}
            viewState={viewState}
            freshness={result?.freshness}
            allFullSuggestion={fullSuggestion}
            onRefresh={refetch}
            onSpotPress={handleSpotPress}
            onNavigate={handleNavigate}
            isRefreshing={isRefetching}
          />

          {/* Destination Picker Modal */}
          {showDestinationPicker && (
            <DestinationPicker
              onSelect={handleDestinationSelect}
              onClose={() => setShowDestinationPicker(false)}
              currentDestination={result?.destination ?? undefined}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

// ============================================================
// MODE SELECTOR BUTTON
// ============================================================

interface ModeSelectorButtonProps {
  mode: FinderMode;
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}

function ModeSelectorButton({
  mode,
  label,
  icon,
  isActive,
  onPress,
}: ModeSelectorButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.modeButton,
        isActive && styles.modeButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <SFIcon
        name={icon as any}
        size={14}
        color={isActive ? '#FFFFFF' : Colors.gray[1]}
      />
      <Text
        style={[
          styles.modeButtonText,
          isActive && styles.modeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// DESTINATION PICKER
// ============================================================

interface DestinationPickerProps {
  onSelect: (buildingId: string) => void;
  onClose: () => void;
  currentDestination?: string;
}

function DestinationPicker({
  onSelect,
  onClose,
  currentDestination,
}: DestinationPickerProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={styles.pickerOverlay}
    >
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Walking to...</Text>
          <TouchableOpacity onPress={onClose}>
            <SFIcon name="xmark" size={18} color={Colors.gray[1]} />
          </TouchableOpacity>
        </View>

        {CAMPUS_BUILDINGS.map((building) => (
          <TouchableOpacity
            key={building.id}
            style={[
              styles.pickerItem,
              currentDestination === building.id && styles.pickerItemActive,
            ]}
            onPress={() => onSelect(building.id)}
          >
            <SFIcon
              name="building.2.fill"
              size={16}
              color={
                currentDestination === building.id
                  ? Colors.scarlet[500]
                  : Colors.gray[1]
              }
            />
            <View style={styles.pickerItemText}>
              <Text
                style={[
                  styles.pickerItemName,
                  currentDestination === building.id && styles.pickerItemNameActive,
                ]}
              >
                {building.shortName}
              </Text>
              <Text style={styles.pickerItemFull}>{building.name}</Text>
            </View>
            {currentDestination === building.id && (
              <SFIcon name="checkmark" size={16} color={Colors.scarlet[500]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  sheetBackground: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
  },
  handleIndicator: {
    backgroundColor: Colors.gray[4],
    width: 36,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  subheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  destinationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  destinationText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  modeButtonActive: {
    backgroundColor: Colors.scarlet[500],
  },
  modeButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  // Destination Picker
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.md,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  pickerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  pickerItemActive: {
    backgroundColor: Colors.scarlet[50],
  },
  pickerItemText: {
    flex: 1,
  },
  pickerItemName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  pickerItemNameActive: {
    color: Colors.scarlet[500],
  },
  pickerItemFull: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
});

export default NearbySpotsFinder;
