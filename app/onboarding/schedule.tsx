// ============================================================
// SCHEDULE SELECTION SCREEN
// Premium iOS-first design for RaiderPark
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
import { ChevronRight, ChevronLeft, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';

// Days and time slots for the grid
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const FULL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const TIME_SLOTS = [
  { id: 'early_morning', label: 'Early', time: '7-9 AM' },
  { id: 'morning', label: 'Morning', time: '9-11 AM' },
  { id: 'midday', label: 'Midday', time: '11-1 PM' },
  { id: 'afternoon', label: 'Afternoon', time: '1-3 PM' },
  { id: 'late_afternoon', label: 'Late', time: '3-5 PM' },
  { id: 'evening', label: 'Evening', time: '5-7 PM' },
];

type DayKey = typeof FULL_DAYS[number];
type TimeSlotId = typeof TIME_SLOTS[number]['id'];

interface ScheduleSelection {
  [day: string]: Set<string>;
}

export default function ScheduleScreen() {
  const [schedule, setSchedule] = useState<ScheduleSelection>(() => {
    const initial: ScheduleSelection = {};
    FULL_DAYS.forEach((day) => {
      initial[day] = new Set();
    });
    return initial;
  });

  const toggleSlot = useCallback((day: DayKey, slotId: TimeSlotId) => {
    Haptics.selectionAsync();
    setSchedule((prev) => {
      const newSchedule = { ...prev };
      const daySet = new Set(prev[day]);

      if (daySet.has(slotId)) {
        daySet.delete(slotId);
      } else {
        daySet.add(slotId);
      }

      newSchedule[day] = daySet;
      return newSchedule;
    });
  }, []);

  const handleContinue = () => {
    // TODO: Save schedule to store/backend
    router.push('/onboarding/notifications');
  };

  const handleSkip = () => {
    router.push('/onboarding/notifications');
  };

  const handleBack = () => {
    router.back();
  };

  // Count total selected slots
  const totalSelected = Object.values(schedule).reduce(
    (acc, set) => acc + set.size,
    0
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(600)}
        className="px-6 pt-4 pb-2"
      >
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          className="flex-row items-center -ml-2 mb-4"
        >
          <ChevronLeft size={24} color="#CC0000" />
          <Text className="text-base text-scarlet-500">Back</Text>
        </Pressable>

        {/* Progress Indicator */}
        <View className="flex-row gap-2 mb-6">
          {[1, 2, 3, 4].map((step, index) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${
                index <= 1 ? 'bg-scarlet-500' : 'bg-ios-gray5'
              }`}
            />
          ))}
        </View>

        <View className="flex-row items-center mb-2">
          <Calendar size={28} color="#CC0000" strokeWidth={2} className="mr-3" />
          <Text className="text-3xl font-bold text-black flex-1">
            When do you usually need parking?
          </Text>
        </View>
        <Text className="text-base text-ios-gray">
          Helps us predict the best times for you
        </Text>
      </Animated.View>

      {/* Schedule Grid */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-4"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.delay(200).duration(600)}
          className="bg-ios-gray6 rounded-2xl p-4"
        >
          {/* Day Headers */}
          <View className="flex-row mb-3">
            <View className="w-16" />
            {DAYS.map((day) => (
              <View key={day} className="flex-1 items-center">
                <Text className="text-xs font-semibold text-ios-gray uppercase">
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Time Slot Rows */}
          {TIME_SLOTS.map((slot, slotIndex) => (
            <Animated.View
              key={slot.id}
              entering={FadeInUp.delay(300 + slotIndex * 50).duration(400)}
              className="flex-row items-center mb-2"
            >
              {/* Time Label */}
              <View className="w-16">
                <Text className="text-xs font-medium text-black">
                  {slot.label}
                </Text>
                <Text className="text-[10px] text-ios-gray">
                  {slot.time}
                </Text>
              </View>

              {/* Day Cells */}
              {FULL_DAYS.map((day, dayIndex) => {
                const isSelected = schedule[day].has(slot.id);
                return (
                  <View key={day} className="flex-1 px-0.5">
                    <Pressable
                      onPress={() => toggleSlot(day, slot.id as TimeSlotId)}
                      className={`h-10 rounded-lg items-center justify-center ${
                        isSelected
                          ? 'bg-scarlet-500'
                          : 'bg-white border border-ios-gray4'
                      }`}
                      style={isSelected ? styles.selectedCell : undefined}
                    >
                      {isSelected && (
                        <View className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </Animated.View>
          ))}
        </Animated.View>

        {/* Selection Summary */}
        {totalSelected > 0 && (
          <Animated.View
            entering={FadeInUp.delay(500).duration(400)}
            className="mt-4 p-4 bg-scarlet-50 rounded-xl"
          >
            <Text className="text-sm text-scarlet-700">
              <Text className="font-semibold">{totalSelected}</Text> time slots selected.{' '}
              We'll prioritize showing parking availability during these times.
            </Text>
          </Animated.View>
        )}

        {/* Common Schedules */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          className="mt-6"
        >
          <Text className="text-sm font-semibold text-ios-gray uppercase tracking-wider mb-3">
            Quick Presets
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <PresetButton
              label="MWF Morning"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSchedule((prev) => {
                  const newSchedule = { ...prev };
                  ['monday', 'wednesday', 'friday'].forEach((day) => {
                    newSchedule[day] = new Set(['early_morning', 'morning']);
                  });
                  return newSchedule;
                });
              }}
            />
            <PresetButton
              label="TR Afternoon"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSchedule((prev) => {
                  const newSchedule = { ...prev };
                  ['tuesday', 'thursday'].forEach((day) => {
                    newSchedule[day] = new Set(['afternoon', 'late_afternoon']);
                  });
                  return newSchedule;
                });
              }}
            />
            <PresetButton
              label="Full Week"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSchedule((prev) => {
                  const newSchedule = { ...prev };
                  FULL_DAYS.forEach((day) => {
                    newSchedule[day] = new Set(['morning', 'midday', 'afternoon']);
                  });
                  return newSchedule;
                });
              }}
            />
            <PresetButton
              label="Clear All"
              variant="outline"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSchedule((prev) => {
                  const newSchedule = { ...prev };
                  FULL_DAYS.forEach((day) => {
                    newSchedule[day] = new Set();
                  });
                  return newSchedule;
                });
              }}
            />
          </View>
        </Animated.View>

        {/* Bottom Spacing */}
        <View className="h-32" />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA} className="px-6 pt-4 pb-6 bg-white border-t border-ios-gray5">
        <Button
          title="Continue"
          variant="primary"
          size="xl"
          fullWidth
          onPress={handleContinue}
          className="rounded-2xl"
          rightIcon={<ChevronRight size={20} color="#FFFFFF" />}
        />
        <Pressable onPress={handleSkip} className="mt-3 py-2">
          <Text className="text-base text-ios-gray text-center">Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// PRESET BUTTON COMPONENT
// ============================================================

interface PresetButtonProps {
  label: string;
  variant?: 'filled' | 'outline';
  onPress: () => void;
}

function PresetButton({ label, variant = 'filled', onPress }: PresetButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full ${
        variant === 'filled'
          ? 'bg-scarlet-100'
          : 'bg-transparent border border-ios-gray4'
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          variant === 'filled' ? 'text-scarlet-700' : 'text-ios-gray'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  bottomCTA: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedCell: {
    shadowColor: '#CC0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
});
