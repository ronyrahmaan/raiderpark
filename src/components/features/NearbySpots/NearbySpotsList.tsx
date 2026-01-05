/**
 * Nearby Spots List Component
 *
 * Scrollable list of nearby parking spots with recommended highlight.
 * Features:
 * - Recommended spot at top
 * - Horizontal scroll alternatives
 * - Empty/loading/error states
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '@/constants/theme';
import { NearbySpotResult, FinderViewState, FreshnessInfo } from '@/types/nearbySpots';
import { NearbySpotCard } from './NearbySpotCard';

// ============================================================
// TYPES
// ============================================================

interface NearbySpotsListProps {
  recommended: NearbySpotResult | null;
  alternatives: NearbySpotResult[];
  viewState: FinderViewState;
  freshness?: FreshnessInfo;
  errorMessage?: string;
  allFullSuggestion?: string | null;
  onRefresh?: () => void;
  onSpotPress?: (spot: NearbySpotResult) => void;
  onNavigate?: (spot: NearbySpotResult) => void;
  isRefreshing?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function NearbySpotsList({
  recommended,
  alternatives,
  viewState,
  freshness,
  errorMessage,
  allFullSuggestion,
  onRefresh,
  onSpotPress,
  onNavigate,
  isRefreshing = false,
}: NearbySpotsListProps) {
  // Loading State
  if (viewState === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.loadingSpinner}>
          <SFIcon name="location.fill" size={32} color={Colors.scarlet[500]} />
        </View>
        <Text style={styles.stateTitle}>Finding nearby spots...</Text>
        <Text style={styles.stateSubtitle}>
          Analyzing availability and predictions
        </Text>
      </View>
    );
  }

  // No Location State
  if (viewState === 'no_location') {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateIcon}>
          <SFIcon name="location.slash.fill" size={40} color={Colors.gray[2]} />
        </View>
        <Text style={styles.stateTitle}>Location Required</Text>
        <Text style={styles.stateSubtitle}>
          Enable location access to find nearby parking spots
        </Text>
      </View>
    );
  }

  // No Permit State
  if (viewState === 'no_permit') {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateIcon}>
          <SFIcon name="car.badge.gearshape.fill" size={40} color={Colors.gray[2]} />
        </View>
        <Text style={styles.stateTitle}>Set Your Permit</Text>
        <Text style={styles.stateSubtitle}>
          Select your permit type to see lots you can park in
        </Text>
      </View>
    );
  }

  // Error State
  if (viewState === 'error') {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateIcon}>
          <SFIcon name="exclamationmark.triangle.fill" size={40} color={Colors.ios.red} />
        </View>
        <Text style={styles.stateTitle}>Something went wrong</Text>
        <Text style={styles.stateSubtitle}>
          {errorMessage || 'Unable to find nearby spots. Pull to retry.'}
        </Text>
      </View>
    );
  }

  // All Full State
  if (viewState === 'all_full') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        {/* Warning Banner */}
        <View style={styles.allFullBanner}>
          <SFIcon name="exclamationmark.circle.fill" size={20} color={Colors.ios.orange} />
          <View style={styles.allFullContent}>
            <Text style={styles.allFullTitle}>All lots are filling up</Text>
            {allFullSuggestion && (
              <Text style={styles.allFullSuggestion}>{allFullSuggestion}</Text>
            )}
          </View>
        </View>

        {/* Show spots anyway */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.scarlet[500]}
            />
          }
        >
          {recommended && (
            <NearbySpotCard
              spot={recommended}
              isRecommended
              onPress={() => onSpotPress?.(recommended)}
              onNavigate={() => onNavigate?.(recommended)}
              animationDelay={100}
            />
          )}
          {alternatives.map((spot, index) => (
            <NearbySpotCard
              key={spot.lot.lot_id}
              spot={spot}
              onPress={() => onSpotPress?.(spot)}
              onNavigate={() => onNavigate?.(spot)}
              animationDelay={200 + index * 100}
            />
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  // Idle / No Results State
  if (viewState === 'idle' || !recommended) {
    return (
      <View style={styles.stateContainer}>
        <View style={styles.stateIcon}>
          <SFIcon name="car.fill" size={40} color={Colors.gray[2]} />
        </View>
        <Text style={styles.stateTitle}>No spots found</Text>
        <Text style={styles.stateSubtitle}>
          Try again or check back in a few minutes
        </Text>
      </View>
    );
  }

  // Success State
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* Freshness Indicator */}
      {freshness && (
        <View style={styles.freshnessRow}>
          <SFIcon
            name="arrow.clockwise"
            size={12}
            color={
              freshness.status === 'fresh'
                ? Colors.status.open
                : freshness.status === 'stale'
                ? Colors.ios.orange
                : Colors.ios.red
            }
          />
          <Text style={styles.freshnessText}>{freshness.formatted}</Text>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.scarlet[500]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recommended Spot */}
        <NearbySpotCard
          spot={recommended}
          isRecommended
          onPress={() => onSpotPress?.(recommended)}
          onNavigate={() => onNavigate?.(recommended)}
          animationDelay={0}
        />

        {/* Alternatives Section */}
        {alternatives.length > 0 && (
          <View style={styles.alternativesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ALTERNATIVES</Text>
              <Text style={styles.sectionCount}>
                {alternatives.length} more
              </Text>
            </View>

            {/* Horizontal Scroll for Compact View */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alternativesScroll}
            >
              {alternatives.map((spot, index) => (
                <AlternativeCompactCard
                  key={spot.lot.lot_id}
                  spot={spot}
                  onPress={() => onSpotPress?.(spot)}
                  animationDelay={200 + index * 50}
                />
              ))}
            </ScrollView>

            {/* Or show full cards */}
            {alternatives.length <= 2 && (
              <View style={styles.alternativesFullList}>
                {alternatives.map((spot, index) => (
                  <NearbySpotCard
                    key={spot.lot.lot_id}
                    spot={spot}
                    onPress={() => onSpotPress?.(spot)}
                    onNavigate={() => onNavigate?.(spot)}
                    showDetails={false}
                    animationDelay={200 + index * 100}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

// ============================================================
// ALTERNATIVE COMPACT CARD
// ============================================================

interface AlternativeCompactCardProps {
  spot: NearbySpotResult;
  onPress?: () => void;
  animationDelay?: number;
}

function AlternativeCompactCard({
  spot,
  onPress,
  animationDelay = 0,
}: AlternativeCompactCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return Colors.status.open;
      case 'busy':
        return Colors.status.busy;
      case 'filling':
        return Colors.status.filling;
      case 'full':
        return Colors.status.full;
      default:
        return Colors.gray[2];
    }
  };

  return (
    <Animated.View entering={FadeIn.delay(animationDelay).duration(300)}>
      <TouchableOpacity
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactLotId}>{spot.lot.lot_id}</Text>
          <View
            style={[
              styles.compactStatus,
              { backgroundColor: getStatusColor(spot.prediction.status) + '30' },
            ]}
          >
            <Text
              style={[
                styles.compactStatusText,
                { color: getStatusColor(spot.prediction.status) },
              ]}
            >
              {spot.lot.occupancy_percent}%
            </Text>
          </View>
        </View>
        <Text style={styles.compactName} numberOfLines={1}>
          {spot.lot.lot_name}
        </Text>
        <Text style={styles.compactDistance}>{spot.distance.formatted}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

import { TouchableOpacity } from 'react-native';

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    minHeight: 200,
  },
  stateIcon: {
    marginBottom: Spacing.md,
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.scarlet[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stateTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stateSubtitle: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
    maxWidth: 280,
  },
  freshnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  freshnessText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  alternativesSection: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  alternativesScroll: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  alternativesFullList: {
    gap: Spacing.sm,
    display: 'none', // Hidden when horizontal scroll is shown
  },
  compactCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    width: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  compactLotId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  compactStatus: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  compactStatusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  compactName: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    marginBottom: Spacing.xs,
  },
  compactDistance: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  allFullBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  allFullContent: {
    flex: 1,
  },
  allFullTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.orange,
    marginBottom: Spacing.xs,
  },
  allFullSuggestion: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
});

export default NearbySpotsList;
