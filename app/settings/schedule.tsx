// ============================================================
// CLASS SCHEDULE SETTINGS SCREEN
// Full-featured schedule editor with multi-class support
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import { ScheduleEditor } from '@/components/features/ScheduleEditor';
import { useAuthStore } from '@/stores/authStore';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
  ColoredShadows,
} from '@/constants/theme';
import { Schedule } from '@/types/database';
import * as Haptics from 'expo-haptics';

export default function ScheduleSettingsScreen() {
  const router = useRouter();
  const { appUser, updateSchedule } = useAuthStore();

  const [schedule, setSchedule] = useState<Schedule>(
    appUser?.schedule ?? {}
  );
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(() => {
    return JSON.stringify(schedule) !== JSON.stringify(appUser?.schedule ?? {});
  }, [schedule, appUser?.schedule]);

  // Count total classes
  const totalClasses = useMemo(() => {
    return Object.values(schedule).reduce(
      (acc, day) => acc + (day?.classes?.length ?? 0),
      0
    );
  }, [schedule]);

  // Count active days
  const activeDays = useMemo(() => {
    return Object.keys(schedule).filter(
      (key) => schedule[key as keyof Schedule]?.classes?.length
    ).length;
  }, [schedule]);

  const handleScheduleChange = useCallback((newSchedule: Schedule) => {
    setSchedule(newSchedule);
  }, []);

  const handleSave = async () => {
    if (!appUser) return;

    setIsSaving(true);
    try {
      await updateSchedule(schedule);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('Success', 'Your schedule has been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving schedule:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Schedule',
      'Are you sure you want to remove all classes from your schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => setSchedule({}),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.infoBanner}>
          <View style={styles.infoBannerIcon}>
            <SFIcon name="info-circle" size={20} color={Colors.ios.blue} />
          </View>
          <Text style={styles.infoBannerText}>
            Add your class times and buildings. We'll use this to give you
            personalized parking predictions and departure reminders.
          </Text>
        </Animated.View>

        {/* Stats Cards */}
        {totalClasses > 0 && (
          <Animated.View entering={FadeInDown.delay(150)} style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalClasses}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeDays}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
            <TouchableOpacity
              style={[styles.statCard, styles.statCardAction]}
              onPress={handleClearAll}
            >
              <SFIcon name="trash" size={20} color={Colors.status.full} />
              <Text style={styles.statLabelAction}>Clear All</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Schedule Editor */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.editorSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>YOUR SCHEDULE</Text>
          </View>
          <ScheduleEditor
            schedule={schedule}
            onChange={handleScheduleChange}
            showWeekend={true}
            showBuildings={true}
          />
        </Animated.View>

        {/* Tips Section */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>TIPS</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipRow}>
              <SFIcon name="checkmark-circle" size={16} color={Colors.ios.green} />
              <Text style={styles.tipText}>
                Tap a day to add or remove classes
              </Text>
            </View>
            <View style={styles.tipRow}>
              <SFIcon name="checkmark-circle" size={16} color={Colors.ios.green} />
              <Text style={styles.tipText}>
                Add multiple classes per day with the + button
              </Text>
            </View>
            <View style={styles.tipRow}>
              <SFIcon name="checkmark-circle" size={16} color={Colors.ios.green} />
              <Text style={styles.tipText}>
                Select a building for walk time calculations
              </Text>
            </View>
            <View style={styles.tipRow}>
              <SFIcon name="checkmark-circle" size={16} color={Colors.ios.green} />
              <Text style={styles.tipText}>
                We'll notify you about parking before each class
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <Animated.View entering={FadeIn} style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.light.background} />
            ) : (
              <>
                <SFIcon name="checkmark" size={20} color={Colors.light.background} />
                <Text style={styles.saveButtonText}>Save Schedule</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.ios.blue + '10',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.ios.blue + '20',
  },
  infoBannerIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  infoBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.light.text,
    lineHeight: 20,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  statCardAction: {
    backgroundColor: Colors.status.full + '10',
    borderWidth: 1,
    borderColor: Colors.status.full + '20',
  },
  statValue: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.scarlet[500],
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginTop: 2,
  },
  statLabelAction: {
    fontSize: FontSize.xs,
    color: Colors.status.full,
    marginTop: 4,
    fontWeight: FontWeight.medium,
  },

  // Editor Section
  editorSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Tips Section
  tipsSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  tipsTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  tipsCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },

  bottomSpacer: {
    height: 40,
  },

  // Save Button
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: 32,
    paddingTop: Spacing.md,
    backgroundColor: Colors.gray[6],
    ...Shadows.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...ColoredShadows.scarlet,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray[3],
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.background,
  },
});
