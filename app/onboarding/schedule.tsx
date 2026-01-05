// ============================================================
// SCHEDULE SELECTION SCREEN
// Premium iOS-first design for RaiderPark
// Multi-class support with building selection
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SFIcon, SFIconName } from '@/components/ui/SFIcon';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { ScheduleEditor } from '@/components/features/ScheduleEditor';
import { useAuthStore } from '@/stores/authStore';
import { Schedule } from '@/types/database';
import {
  Colors,
  BorderRadius,
  Spacing,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// Common schedule presets
interface PresetInfo {
  label: string;
  icon: SFIconName;
  schedule: Schedule;
}

const PRESETS: Record<string, PresetInfo> = {
  mwf_morning: {
    label: 'MWF Morning',
    icon: 'sunrise',
    schedule: {
      monday: { classes: [{ start: '08:00', end: '09:15' }, { start: '09:30', end: '10:45' }] },
      wednesday: { classes: [{ start: '08:00', end: '09:15' }, { start: '09:30', end: '10:45' }] },
      friday: { classes: [{ start: '08:00', end: '09:15' }, { start: '09:30', end: '10:45' }] },
    },
  },
  tr_afternoon: {
    label: 'TR Afternoon',
    icon: 'sun-max',
    schedule: {
      tuesday: { classes: [{ start: '12:30', end: '13:45' }, { start: '14:00', end: '15:15' }] },
      thursday: { classes: [{ start: '12:30', end: '13:45' }, { start: '14:00', end: '15:15' }] },
    },
  },
  full_week: {
    label: 'Full Week',
    icon: 'calendar',
    schedule: {
      monday: { classes: [{ start: '09:00', end: '10:15' }] },
      tuesday: { classes: [{ start: '09:00', end: '10:15' }] },
      wednesday: { classes: [{ start: '09:00', end: '10:15' }] },
      thursday: { classes: [{ start: '09:00', end: '10:15' }] },
      friday: { classes: [{ start: '09:00', end: '10:15' }] },
    },
  },
  evening: {
    label: 'Evening',
    icon: 'moon',
    schedule: {
      monday: { classes: [{ start: '18:00', end: '20:45' }] },
      wednesday: { classes: [{ start: '18:00', end: '20:45' }] },
    },
  },
};

type PresetKey = keyof typeof PRESETS;

export default function ScheduleScreen() {
  const { appUser, updateSchedule } = useAuthStore();
  const [schedule, setSchedule] = useState<Schedule>(appUser?.schedule ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  const handlePreset = useCallback((presetKey: PresetKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const preset = PRESETS[presetKey];
    setSchedule(preset.schedule);
    setActivePreset(presetKey);
  }, []);

  const handleClearAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSchedule({});
    setActivePreset(null);
  }, []);

  const handleScheduleChange = useCallback((newSchedule: Schedule) => {
    setSchedule(newSchedule);
    setActivePreset(null); // Clear preset when manually editing
  }, []);

  const handleContinue = async () => {
    // Save schedule to Supabase via authStore
    if (Object.keys(schedule).length > 0) {
      setIsSaving(true);
      try {
        await updateSchedule(schedule);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error saving schedule:', error);
        // Continue anyway - schedule can be set later
      } finally {
        setIsSaving(false);
      }
    }

    router.push('/onboarding/notifications');
  };

  const handleSkip = () => {
    router.push('/onboarding/notifications');
  };

  const handleBack = () => {
    router.back();
  };

  // Count total classes
  const totalClasses = Object.values(schedule).reduce(
    (acc, day) => acc + (day?.classes?.length ?? 0),
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(600)}
        style={styles.header}
      >
        {/* Back Button */}
        <Pressable onPress={handleBack} style={styles.backButton}>
          <SFIcon name="chevron-left" size={24} color={Colors.scarlet[500]} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((step, index) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                index <= 1 ? styles.progressStepActive : styles.progressStepInactive,
              ]}
            />
          ))}
        </View>

        <View style={styles.titleRow}>
          <SFIcon name="calendar" size={28} color={Colors.scarlet[500]} style={styles.titleIcon} />
          <Text style={styles.title}>
            Add Your Class Schedule
          </Text>
        </View>
        <Text style={styles.subtitle}>
          We'll predict parking availability for your classes
        </Text>
      </Animated.View>

      {/* Schedule Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Presets */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(400)}
          style={styles.presetsSection}
        >
          <View style={styles.presetHeader}>
            <Text style={styles.presetsTitle}>Quick Presets</Text>
            {Object.keys(schedule).length > 0 && (
              <Pressable onPress={handleClearAll}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.presetsRow}>
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
              const preset = PRESETS[key];
              const isActive = activePreset === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handlePreset(key)}
                  style={[
                    styles.presetButton,
                    isActive && styles.presetButtonActive,
                  ]}
                >
                  <SFIcon
                    name={preset.icon}
                    size={16}
                    color={isActive ? Colors.scarlet[600] : Colors.gray[2]}
                  />
                  <Text style={[
                    styles.presetButtonText,
                    isActive && styles.presetButtonTextActive,
                  ]}>
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Schedule Editor */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(400)}
          style={styles.editorSection}
        >
          <Text style={styles.sectionTitle}>YOUR SCHEDULE</Text>
          <ScheduleEditor
            schedule={schedule}
            onChange={handleScheduleChange}
            showWeekend={false}
            showBuildings={true}
          />
        </Animated.View>

        {/* Summary */}
        {totalClasses > 0 && (
          <Animated.View
            entering={FadeInUp.delay(400).duration(400)}
            style={styles.summaryCard}
          >
            <View style={styles.summaryIcon}>
              <SFIcon name="checkmark-circle-fill" size={24} color={Colors.ios.green} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>
                {totalClasses} class{totalClasses !== 1 ? 'es' : ''} added
              </Text>
              <Text style={styles.summaryText}>
                We'll notify you about parking before each class
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Tip Card */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={styles.tipCard}
        >
          <SFIcon name="lightbulb" size={20} color={Colors.ios.orange} />
          <Text style={styles.tipText}>
            Adding class end times helps us predict when parking opens up for others
          </Text>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA}>
        <Button
          title={isSaving ? 'Saving...' : 'Continue'}
          variant="primary"
          size="xl"
          fullWidth
          onPress={handleContinue}
          disabled={isSaving}
          rightIcon={!isSaving ? <SFIcon name="chevron-right" size={20} color={Colors.light.background} /> : undefined}
        />
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
      </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButtonText: {
    fontSize: FontSize.lg,
    color: Colors.scarlet[500],
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: BorderRadius.full,
  },
  progressStepActive: {
    backgroundColor: Colors.scarlet[500],
  },
  progressStepInactive: {
    backgroundColor: Colors.gray[5],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleIcon: {
    marginRight: Spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
  },

  // Presets Section
  presetsSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  presetsTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearAllText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.background,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  presetButtonActive: {
    backgroundColor: Colors.scarlet[50],
    borderWidth: 1,
    borderColor: Colors.scarlet[200],
  },
  presetButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
  },
  presetButtonTextActive: {
    color: Colors.scarlet[600],
  },

  // Editor Section
  editorSection: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Summary Card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.green + '10',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.ios.green + '30',
  },
  summaryIcon: {
    marginRight: Spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  summaryText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.ios.orange + '10',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 18,
  },

  bottomSpacer: {
    height: 140,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  skipButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    fontSize: FontSize.lg,
    color: Colors.gray[1],
    textAlign: 'center',
  },
});
