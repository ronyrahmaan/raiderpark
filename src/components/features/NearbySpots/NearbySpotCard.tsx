/**
 * Nearby Spot Card Component
 *
 * Displays a single nearby parking lot with scoring details.
 * Follows iOS design patterns with triple redundancy (icon + color + text).
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { SFIcon, SFIconName } from '@/components/ui/SFIcon';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';
import { NearbySpotResult } from '@/types/nearbySpots';
import { OccupancyStatus } from '@/types/database';
import { lightHaptic, mediumHaptic } from '@/utils/haptics';
import { navigateToLot } from '@/utils/navigation';

// ============================================================
// TYPES
// ============================================================

interface NearbySpotCardProps {
  spot: NearbySpotResult;
  isRecommended?: boolean;
  onPress?: () => void;
  onNavigate?: () => void;
  showDetails?: boolean;
  animationDelay?: number;
}

// ============================================================
// STATUS CONFIGURATION
// ============================================================

interface StatusConfig {
  color: string;
  bgColor: string;
  icon: SFIconName;
  label: string;
}

const STATUS_CONFIG: Record<OccupancyStatus, StatusConfig> = {
  open: {
    color: Colors.status.open,
    bgColor: '#D1FAE5',
    icon: 'checkmark.circle.fill',
    label: 'Open',
  },
  busy: {
    color: Colors.status.busy,
    bgColor: '#FEF3C7',
    icon: 'circle.lefthalf.filled',
    label: 'Busy',
  },
  filling: {
    color: Colors.status.filling,
    bgColor: '#FFEDD5',
    icon: 'exclamationmark.triangle.fill',
    label: 'Filling',
  },
  full: {
    color: Colors.status.full,
    bgColor: '#FEE2E2',
    icon: 'xmark.circle.fill',
    label: 'Full',
  },
  closed: {
    color: Colors.status.closed,
    bgColor: '#F3F4F6',
    icon: 'nosign',
    label: 'Closed',
  },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getChanceLabel(chance: number): string {
  if (chance >= 85) return 'Good bet';
  if (chance >= 60) return 'Might find spot';
  if (chance >= 30) return 'Limited spots';
  return 'Likely full';
}

function getTrendIcon(trend: string | null): SFIconName | null {
  switch (trend) {
    case 'rising':
      return 'arrow.up.right';
    case 'falling':
      return 'arrow.down.right';
    case 'stable':
      return 'arrow.right';
    default:
      return null;
  }
}

function getTrendLabel(trend: string | null): string {
  switch (trend) {
    case 'rising':
      return 'filling up';
    case 'falling':
      return 'emptying';
    case 'stable':
      return 'stable';
    default:
      return '';
  }
}

function buildAccessibilityLabel(spot: NearbySpotResult): string {
  const statusConfig = STATUS_CONFIG[spot.prediction.status];
  const trendLabel = getTrendLabel(spot.lot.trend ?? null);

  let label = `Lot ${spot.lot.lot_id}, ${spot.lot.lot_name}. `;
  label += `Status: ${statusConfig.label}. `;
  label += `${spot.lot.occupancy_percent} percent full`;
  if (trendLabel) label += ` and ${trendLabel}`;
  label += `. `;
  label += `${spot.prediction.chanceOfSpot} percent chance of finding a spot. `;
  label += `${spot.distance.formatted} away, ${spot.driveTime.formatted}. `;
  if (spot.walkTime.minutes && spot.walkTime.toBuilding) {
    label += `${spot.walkTime.minutes} minute walk to ${spot.walkTime.toBuilding}. `;
  }
  if (spot.flags.isRecommended) {
    label += 'This is the recommended lot.';
  }

  return label;
}

// ============================================================
// COMPONENT
// ============================================================

export function NearbySpotCard({
  spot,
  isRecommended = false,
  onPress,
  onNavigate,
  showDetails = true,
  animationDelay = 0,
}: NearbySpotCardProps) {
  const statusConfig = STATUS_CONFIG[spot.prediction.status];
  const trendIcon = getTrendIcon(spot.lot.trend ?? null);

  const handlePress = useCallback(() => {
    lightHaptic();
    onPress?.();
  }, [onPress]);

  const handleNavigate = useCallback(async () => {
    mediumHaptic();
    if (onNavigate) {
      onNavigate();
    } else {
      await navigateToLot(
        spot.lot.lot_id,
        spot.lot.lot_name,
        spot.lot.center
      );
    }
  }, [onNavigate, spot]);

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        accessibilityLabel={buildAccessibilityLabel(spot)}
        accessibilityRole="button"
        accessibilityHint="Double tap to view lot details"
        style={[
          styles.card,
          isRecommended && styles.recommendedCard,
          Shadows.md,
        ]}
      >
        {/* Recommended Badge */}
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <SFIcon name="star.fill" size={10} color="#FFFFFF" />
            <Text style={styles.recommendedText}>RECOMMENDED</Text>
          </View>
        )}

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.lotId}>{spot.lot.lot_id}</Text>
            <Text style={styles.lotName} numberOfLines={1}>
              {spot.lot.lot_name}
            </Text>
          </View>

          {/* Status Badge - Triple Redundancy */}
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <SFIcon name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Distance & Drive Time */}
        <View style={styles.distanceRow}>
          <View style={styles.distanceItem}>
            <SFIcon name="location.fill" size={12} color={Colors.gray[1]} />
            <Text style={styles.distanceText}>{spot.distance.formatted}</Text>
          </View>
          <View style={styles.distanceDot} />
          <View style={styles.distanceItem}>
            <SFIcon name="car.fill" size={12} color={Colors.gray[1]} />
            <Text style={styles.distanceText}>{spot.driveTime.formatted}</Text>
          </View>
          {spot.flags.requiresShuttle && (
            <>
              <View style={styles.distanceDot} />
              <View style={styles.distanceItem}>
                <SFIcon name="bus.fill" size={12} color={Colors.ios.blue} />
                <Text style={[styles.distanceText, { color: Colors.ios.blue }]}>
                  +shuttle
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Occupancy Bar */}
        <View style={styles.occupancyContainer}>
          <View style={styles.occupancyBar}>
            <Animated.View
              entering={FadeIn.delay(animationDelay + 200).duration(600)}
              style={[
                styles.occupancyFill,
                {
                  width: `${spot.lot.occupancy_percent}%`,
                  backgroundColor: statusConfig.color,
                },
              ]}
            />
          </View>
          <Text style={styles.occupancyPercent}>{spot.lot.occupancy_percent}%</Text>
        </View>

        {/* Prediction & Walk Time */}
        <View style={styles.predictionRow}>
          {/* Current Status */}
          <View style={styles.predictionItem}>
            <SFIcon
              name="circle.fill"
              size={8}
              color={statusConfig.color}
            />
            <Text style={styles.predictionLabel}>
              {spot.prediction.chanceOfSpot}% chance
            </Text>
          </View>

          {/* Trend */}
          {trendIcon && (
            <View style={styles.predictionItem}>
              <SFIcon name={trendIcon} size={12} color={Colors.gray[1]} />
              <Text style={styles.predictionLabel}>
                {spot.prediction.occupancyAtArrival}% at arrival
              </Text>
            </View>
          )}

          {/* Walk Time */}
          {spot.walkTime.minutes && spot.walkTime.toBuilding && (
            <View style={styles.predictionItem}>
              <SFIcon name="figure.walk" size={12} color={Colors.gray[1]} />
              <Text style={styles.predictionLabel}>
                {spot.walkTime.minutes} min to {spot.walkTime.toBuilding}
              </Text>
            </View>
          )}
        </View>

        {/* Flags */}
        {(spot.flags.isIcingZone || spot.flags.hasTimeLimit) && (
          <View style={styles.flagsRow}>
            {spot.flags.isIcingZone && (
              <View style={[styles.flagBadge, styles.icingBadge]}>
                <SFIcon name="snowflake" size={10} color={Colors.ios.blue} />
                <Text style={styles.flagText}>Icing Zone</Text>
              </View>
            )}
            {spot.flags.hasTimeLimit && (
              <View style={[styles.flagBadge, styles.timeLimitBadge]}>
                <SFIcon name="clock.fill" size={10} color={Colors.ios.orange} />
                <Text style={styles.flagText}>
                  {spot.flags.timeLimitMinutes}min limit
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {showDetails && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton]}
              onPress={handleNavigate}
              activeOpacity={0.8}
              accessibilityLabel="Navigate to this lot"
              accessibilityRole="button"
            >
              <SFIcon name="arrow.triangle.turn.up.right.diamond.fill" size={16} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.detailsButton]}
              onPress={handlePress}
              activeOpacity={0.8}
              accessibilityLabel="View lot details"
              accessibilityRole="button"
            >
              <SFIcon name="info.circle" size={16} color={Colors.scarlet[500]} />
              <Text style={styles.detailsButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Score Badge (Development Only) */}
        {__DEV__ && spot.breakdown && (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              Score: {spot.score}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
  },
  recommendedCard: {
    borderWidth: 2,
    borderColor: Colors.scarlet[500],
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.scarlet[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lotId: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginRight: Spacing.sm,
  },
  lotName: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  statusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  distanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  distanceDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.gray[3],
    marginHorizontal: Spacing.sm,
  },
  occupancyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  occupancyBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.gray[5],
    borderRadius: 3,
    overflow: 'hidden',
  },
  occupancyFill: {
    height: '100%',
    borderRadius: 3,
  },
  occupancyPercent: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    minWidth: 36,
    textAlign: 'right',
  },
  predictionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  predictionLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  flagsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  icingBadge: {
    backgroundColor: '#DBEAFE',
  },
  timeLimitBadge: {
    backgroundColor: '#FFEDD5',
  },
  flagText: {
    fontSize: FontSize.xs,
    color: Colors.gray[1],
    fontWeight: FontWeight.medium,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  navigateButton: {
    backgroundColor: Colors.scarlet[500],
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  detailsButton: {
    backgroundColor: Colors.scarlet[50],
  },
  detailsButtonText: {
    color: Colors.scarlet[500],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  scoreBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeight.medium,
  },
});

export default NearbySpotCard;
