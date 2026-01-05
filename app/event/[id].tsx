// ============================================================
// EVENT DETAIL SCREEN
// Full event information with calendar/reminder integration
// ============================================================

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { SFIcon } from '@/components/ui/SFIcon';
import { useEvent } from '@/hooks/useEvents';
import { getEventTypeInfo } from '@/services/events';
import { LOTS, getLotById } from '@/constants/lots';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// HELPERS
// ============================================================

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatClosureTime(dateString: string | null): string {
  if (!dateString) return 'Event start';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getAlternativeLots(affectedLots: string[]): string[] {
  // Get lots that are NOT affected
  const affectedSet = new Set(affectedLots);
  const alternatives = Object.values(LOTS)
    .filter(lot => !affectedSet.has(lot.id))
    .filter(lot => lot.area === 'commuter_west' || lot.area === 'commuter_north' || lot.area === 'satellite')
    .slice(0, 5)
    .map(lot => lot.id);

  return alternatives;
}

// ============================================================
// COMPONENTS
// ============================================================

function ActionButton({
  icon,
  label,
  color,
  onPress,
  loading,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.actionButton, { backgroundColor: color + '15' }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <SFIcon name={icon} size={20} color={color} />
      )}
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconContainer, { backgroundColor: iconColor + '15' }]}>
        <SFIcon name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function LotChip({
  lotId,
  variant,
}: {
  lotId: string;
  variant: 'affected' | 'alternative';
}) {
  const router = useRouter();
  const lot = getLotById(lotId);
  const isAffected = variant === 'affected';

  return (
    <Pressable
      style={[
        styles.lotChip,
        isAffected ? styles.lotChipAffected : styles.lotChipAlternative,
      ]}
      onPress={() => router.push(`/lot/${lotId}`)}
    >
      <Text
        style={[
          styles.lotChipText,
          isAffected ? styles.lotChipTextAffected : styles.lotChipTextAlternative,
        ]}
      >
        {lot?.short_name || lotId}
      </Text>
      <SFIcon
        name="chevron-right"
        size={12}
        color={isAffected ? Colors.status.full : Colors.ios.green}
      />
    </Pressable>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(id);

  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [isSettingReminder, setIsSettingReminder] = useState(false);

  const typeInfo = event ? getEventTypeInfo(event.event_type) : null;
  const alternativeLots = event ? getAlternativeLots(event.affected_lot_ids) : [];

  const handleAddToCalendar = useCallback(async () => {
    if (!event) return;

    setIsAddingToCalendar(true);
    try {
      // Request calendar permission
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable calendar access in Settings to add events.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(
        (c) => c.allowsModifications && c.source.name === 'Default'
      ) || calendars.find((c) => c.allowsModifications);

      if (!defaultCalendar) {
        Alert.alert('Error', 'No writable calendar found on this device.');
        return;
      }

      // Create event
      const eventDetails = {
        title: `🚗 Parking Alert: ${event.name}`,
        notes: `Affected lots: ${event.affected_lot_ids.join(', ')}\n\n${event.description || ''}\n\nAlternatives: ${alternativeLots.join(', ')}`,
        startDate: new Date(event.starts_at),
        endDate: new Date(event.ends_at),
        alarms: [{ relativeOffset: -120 }], // 2 hours before
      };

      await Calendar.createEventAsync(defaultCalendar.id, eventDetails);

      Alert.alert(
        'Added to Calendar',
        `"${event.name}" has been added to your calendar with a reminder 2 hours before.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error adding to calendar:', err);
      Alert.alert('Error', 'Failed to add event to calendar. Please try again.');
    } finally {
      setIsAddingToCalendar(false);
    }
  }, [event, alternativeLots]);

  const handleSetReminder = useCallback(async () => {
    if (!event) return;

    setIsSettingReminder(true);
    try {
      // Request notification permission
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to set reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Schedule notification 2 hours before event
      const eventStartTime = new Date(event.starts_at);
      const reminderTime = new Date(eventStartTime.getTime() - 2 * 60 * 60 * 1000);

      // Check if reminder time is in the future
      if (reminderTime <= new Date()) {
        Alert.alert(
          'Too Late',
          'This event starts in less than 2 hours. Plan accordingly!',
          [{ text: 'OK' }]
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚗 Parking Alert',
          body: `${event.name} - Lots ${event.affected_lot_ids.join(', ')} affected. Use alternatives: ${alternativeLots.slice(0, 3).join(', ')}`,
          data: { eventId: event.id, type: 'event_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderTime,
        },
      });

      Alert.alert(
        'Reminder Set',
        `You'll be notified 2 hours before "${event.name}".`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error setting reminder:', err);
      Alert.alert('Error', 'Failed to set reminder. Please try again.');
    } finally {
      setIsSettingReminder(false);
    }
  }, [event, alternativeLots]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.scarlet.DEFAULT} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
          </Pressable>
          <Text style={styles.headerTitle}>Event</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <SFIcon name="exclamationmark-triangle" size={48} color={Colors.gray[3]} />
          <Text style={styles.errorText}>Event not found</Text>
          <Pressable style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isActive =
    new Date(event.starts_at) <= new Date() &&
    new Date(event.ends_at) >= new Date();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </Pressable>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.heroCard, { borderTopColor: typeInfo?.color }]}
        >
          {/* Status Badge */}
          {isActive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>HAPPENING NOW</Text>
            </View>
          )}

          {/* Type Badge */}
          <View style={[styles.typeBadge, { backgroundColor: typeInfo?.color + '15' }]}>
            <Text style={styles.typeBadgeIcon}>{typeInfo?.icon}</Text>
            <Text style={[styles.typeBadgeText, { color: typeInfo?.color }]}>
              {typeInfo?.label}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.eventTitle}>{event.name}</Text>

          {/* Description */}
          {event.description && (
            <Text style={styles.eventDescription}>{event.description}</Text>
          )}
        </Animated.View>

        {/* Info Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>DETAILS</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="calendar"
              iconColor={Colors.ios.blue}
              label="Date"
              value={formatFullDate(event.starts_at)}
            />
            <View style={styles.infoDivider} />
            <InfoRow
              icon="clock"
              iconColor={Colors.ios.green}
              label="Time"
              value={`${formatTime(event.starts_at)} - ${formatTime(event.ends_at)}`}
            />
            {event.venue && (
              <>
                <View style={styles.infoDivider} />
                <InfoRow
                  icon="pin"
                  iconColor={Colors.ios.orange}
                  label="Venue"
                  value={event.venue}
                />
              </>
            )}
          </View>
        </Animated.View>

        {/* Affected Lots */}
        {event.affected_lot_ids.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>AFFECTED LOTS</Text>
            <View style={styles.lotsCard}>
              <View style={styles.lotsWarning}>
                <SFIcon name="exclamationmark-circle-fill" size={20} color={Colors.status.full} />
                <Text style={styles.lotsWarningText}>
                  These lots will be closed or restricted during this event
                </Text>
              </View>
              <View style={styles.lotsGrid}>
                {event.affected_lot_ids.map((lotId) => (
                  <LotChip key={lotId} lotId={lotId} variant="affected" />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Alternative Lots */}
        {alternativeLots.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>RECOMMENDED ALTERNATIVES</Text>
            <View style={styles.lotsCard}>
              <View style={styles.lotsSuccess}>
                <SFIcon name="checkmark-circle-fill" size={20} color={Colors.ios.green} />
                <Text style={styles.lotsSuccessText}>
                  These lots should have available parking
                </Text>
              </View>
              <View style={styles.lotsGrid}>
                {alternativeLots.map((lotId) => (
                  <LotChip key={lotId} lotId={lotId} variant="alternative" />
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(400)}
          style={styles.actionsSection}
        >
          <ActionButton
            icon="calendar-badge-plus"
            label="Add to Calendar"
            color={Colors.ios.blue}
            onPress={handleAddToCalendar}
            loading={isAddingToCalendar}
          />
          <ActionButton
            icon="bell-badge"
            label="Set Reminder"
            color={Colors.ios.orange}
            onPress={handleSetReminder}
            loading={isSettingReminder}
          />
        </Animated.View>

        {/* Tips */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={styles.tipCard}
        >
          <SFIcon name="lightbulb" size={20} color={Colors.ios.orange} />
          <Text style={styles.tipText}>
            Arrive early on event days. Lots near the stadium fill up 2-3 hours before kickoff.
          </Text>
        </Animated.View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.gray[1],
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.gray[2],
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.lg,
  },
  errorButtonText: {
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
    backgroundColor: Colors.light.background,
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
  headerSpacer: {
    width: 40,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.light.background,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderTopWidth: 4,
    ...Shadows.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.status.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.background,
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
    letterSpacing: 0.5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  typeBadgeIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  eventDescription: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    lineHeight: 22,
  },

  // Sections
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginBottom: 2,
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray[5],
    marginLeft: 52,
  },

  // Lots Card
  lotsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  lotsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.status.full + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  lotsWarningText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.status.full,
    fontWeight: FontWeight.medium,
  },
  lotsSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.green + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  lotsSuccessText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.ios.green,
    fontWeight: FontWeight.medium,
  },
  lotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  lotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  lotChipAffected: {
    backgroundColor: Colors.status.full + '15',
    borderWidth: 1,
    borderColor: Colors.status.full + '30',
  },
  lotChipAlternative: {
    backgroundColor: Colors.ios.green + '15',
    borderWidth: 1,
    borderColor: Colors.ios.green + '30',
  },
  lotChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  lotChipTextAffected: {
    color: Colors.status.full,
  },
  lotChipTextAlternative: {
    color: Colors.ios.green,
  },

  // Actions
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },
});
