// ============================================================
// SCHEDULE EDITOR COMPONENT
// Premium multi-class schedule editor for RaiderPark
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { Schedule, DaySchedule, ClassTime } from '@/types/database';
import { BUILDINGS, Building, BUILDINGS_BY_CATEGORY, CATEGORY_LABELS, BuildingCategory } from '@/constants/buildings';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================

type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface ClassBlock extends ClassTime {
  id: string; // Unique ID for React keys
}

interface DayWithClasses {
  key: DayKey;
  label: string;
  short: string;
  classes: ClassBlock[];
  isEnabled: boolean;
}

interface ScheduleEditorProps {
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
  showWeekend?: boolean;
  showBuildings?: boolean;
  compact?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const WEEKDAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
];

const WEEKEND: { key: DayKey; label: string; short: string }[] = [
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIME_OPTIONS = generateTimeOptions();

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      options.push(`${h}:${m}`);
    }
  }
  return options;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================
// TIME PICKER MODAL
// ============================================================

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  currentTime: string;
  minTime?: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}

function TimePickerModal({
  visible,
  title,
  currentTime,
  minTime,
  onSelect,
  onClose,
}: TimePickerModalProps) {
  const [selectedTime, setSelectedTime] = useState(currentTime);

  const availableOptions = useMemo(() => {
    if (!minTime) return TIME_OPTIONS;
    const minIndex = TIME_OPTIONS.indexOf(minTime);
    return TIME_OPTIONS.slice(minIndex + 1);
  }, [minTime]);

  const currentIndex = availableOptions.indexOf(selectedTime);

  const handleIncrement = () => {
    const nextIndex = Math.min(currentIndex + 1, availableOptions.length - 1);
    setSelectedTime(availableOptions[nextIndex]);
    Haptics.selectionAsync();
  };

  const handleDecrement = () => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    setSelectedTime(availableOptions[prevIndex]);
    Haptics.selectionAsync();
  };

  const quickTimes = minTime
    ? ['09:00', '10:00', '12:00', '14:00', '16:00'].filter(t => t > minTime)
    : ['07:00', '08:00', '09:00', '10:00', '12:00'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <SFIcon name="xmark" size={22} color={Colors.gray[1]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity
              onPress={() => {
                onSelect(selectedTime);
                onClose();
              }}
              hitSlop={8}
            >
              <SFIcon name="checkmark" size={22} color={Colors.ios.blue} />
            </TouchableOpacity>
          </View>

          <View style={styles.timePickerContainer}>
            <TouchableOpacity
              onPress={handleDecrement}
              style={styles.chevronButton}
              disabled={currentIndex === 0}
            >
              <SFIcon
                name="chevron-up"
                size={28}
                color={currentIndex === 0 ? Colors.gray[4] : Colors.ios.blue}
              />
            </TouchableOpacity>

            <View style={styles.selectedTimeContainer}>
              <Text style={styles.selectedTimeText}>
                {formatTime(selectedTime)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleIncrement}
              style={styles.chevronButton}
              disabled={currentIndex === availableOptions.length - 1}
            >
              <SFIcon
                name="chevron-down"
                size={28}
                color={currentIndex === availableOptions.length - 1 ? Colors.gray[4] : Colors.ios.blue}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.quickSelectContainer}>
            <Text style={styles.quickSelectLabel}>Quick Select</Text>
            <View style={styles.quickSelectButtons}>
              {quickTimes.slice(0, 5).map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.quickSelectButton,
                    selectedTime === time && styles.quickSelectButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedTime(time);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.quickSelectButtonText,
                      selectedTime === time && styles.quickSelectButtonTextActive,
                    ]}
                  >
                    {formatTime(time).replace(' ', '\n')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ============================================================
// BUILDING PICKER MODAL
// ============================================================

interface BuildingPickerModalProps {
  visible: boolean;
  currentBuilding?: string;
  onSelect: (buildingId: string | undefined) => void;
  onClose: () => void;
}

function BuildingPickerModal({
  visible,
  currentBuilding,
  onSelect,
  onClose,
}: BuildingPickerModalProps) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const modalHeight = screenHeight * 0.65; // 65% of screen height

  // Build flat list of all buildings grouped by category
  const buildingItems = useMemo(() => {
    const categories: BuildingCategory[] = ['academic', 'library', 'student_center', 'athletics', 'administration'];
    const items: { type: 'header' | 'building'; title?: string; building?: Building }[] = [];

    categories.forEach((cat) => {
      const buildings = BUILDINGS_BY_CATEGORY[cat];
      if (buildings && buildings.length > 0) {
        items.push({ type: 'header', title: CATEGORY_LABELS[cat] });
        buildings.forEach((b) => {
          items.push({ type: 'building', building: b });
        });
      }
    });

    return items;
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.buildingModalOverlay}>
        <Pressable style={styles.buildingModalDismiss} onPress={onClose} />
        <View style={[
          styles.buildingModalContent,
          { height: modalHeight, paddingBottom: insets.bottom }
        ]}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          <View style={styles.buildingModalHeader}>
            <Text style={styles.buildingModalTitle}>Select Building</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <SFIcon name="xmark-circle-fill" size={28} color={Colors.gray[3]} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.buildingList}
            contentContainerStyle={styles.buildingListContent}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            {/* No Building Option */}
            <TouchableOpacity
              style={[
                styles.buildingOption,
                !currentBuilding && styles.buildingOptionSelected,
              ]}
              onPress={() => {
                onSelect(undefined);
                onClose();
              }}
            >
              <View style={styles.buildingOptionIcon}>
                <SFIcon name="building-2" size={20} color={Colors.gray[2]} />
              </View>
              <Text style={styles.buildingOptionName}>No building selected</Text>
              {!currentBuilding && (
                <SFIcon name="checkmark-circle-fill" size={22} color={Colors.ios.blue} />
              )}
            </TouchableOpacity>

            {/* Building List */}
            {buildingItems.map((item, index) => {
              if (item.type === 'header') {
                return (
                  <View key={`header-${index}`} style={styles.buildingSectionHeader}>
                    <Text style={styles.buildingSectionTitle}>{item.title}</Text>
                  </View>
                );
              }

              const building = item.building!;
              return (
                <TouchableOpacity
                  key={building.id}
                  style={[
                    styles.buildingOption,
                    currentBuilding === building.id && styles.buildingOptionSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelect(building.id);
                    onClose();
                  }}
                >
                  <View style={styles.buildingOptionIcon}>
                    <SFIcon name="building-2" size={20} color={Colors.gray[1]} />
                  </View>
                  <View style={styles.buildingOptionText}>
                    <Text style={styles.buildingOptionName}>{building.shortName}</Text>
                    <Text style={styles.buildingOptionFullName}>{building.name}</Text>
                  </View>
                  {currentBuilding === building.id && (
                    <SFIcon name="checkmark-circle-fill" size={22} color={Colors.ios.blue} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// CLASS BLOCK COMPONENT
// ============================================================

interface ClassBlockCardProps {
  classBlock: ClassBlock;
  index: number;
  total: number;
  showBuildings: boolean;
  onUpdateStart: (time: string) => void;
  onUpdateEnd: (time: string) => void;
  onUpdateBuilding: (buildingId: string | undefined) => void;
  onDelete: () => void;
}

function ClassBlockCard({
  classBlock,
  index,
  total,
  showBuildings,
  onUpdateStart,
  onUpdateEnd,
  onUpdateBuilding,
  onDelete,
}: ClassBlockCardProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showBuildingPicker, setShowBuildingPicker] = useState(false);

  const building = classBlock.building
    ? BUILDINGS.find((b) => b.id === classBlock.building)
    : undefined;

  return (
    <Animated.View
      entering={SlideInRight.springify()}
      exiting={SlideOutRight}
      layout={Layout.springify()}
      style={styles.classBlockCard}
    >
      <View style={styles.classBlockHeader}>
        <View style={styles.classBlockNumber}>
          <Text style={styles.classBlockNumberText}>{index + 1}</Text>
        </View>
        <Text style={styles.classBlockTitle}>
          Class {index + 1}{total > 1 ? ` of ${total}` : ''}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDelete();
          }}
          hitSlop={8}
          style={styles.classBlockDelete}
        >
          <SFIcon name="trash" size={18} color={Colors.status.full} />
        </TouchableOpacity>
      </View>

      {/* Time Row */}
      <View style={styles.classBlockTimeRow}>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowStartPicker(true)}
        >
          <SFIcon name="clock" size={16} color={Colors.ios.blue} />
          <Text style={styles.timeButtonLabel}>Start</Text>
          <Text style={styles.timeButtonValue}>{formatTime(classBlock.start)}</Text>
        </TouchableOpacity>

        <View style={styles.timeArrow}>
          <SFIcon name="arrow-right" size={16} color={Colors.gray[3]} />
        </View>

        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowEndPicker(true)}
        >
          <SFIcon name="clock" size={16} color={Colors.ios.orange} />
          <Text style={styles.timeButtonLabel}>End</Text>
          <Text style={styles.timeButtonValue}>{formatTime(classBlock.end)}</Text>
        </TouchableOpacity>
      </View>

      {/* Building Row */}
      {showBuildings && (
        <TouchableOpacity
          style={styles.buildingButton}
          onPress={() => setShowBuildingPicker(true)}
        >
          <SFIcon name="building-2" size={16} color={Colors.ios.purple} />
          <Text style={styles.buildingButtonLabel}>Building</Text>
          <Text style={[
            styles.buildingButtonValue,
            !building && styles.buildingButtonPlaceholder,
          ]}>
            {building ? building.shortName : 'Select building'}
          </Text>
          <SFIcon name="chevron-right" size={14} color={Colors.gray[3]} />
        </TouchableOpacity>
      )}

      {/* Time Picker Modals */}
      <TimePickerModal
        visible={showStartPicker}
        title="Class Start Time"
        currentTime={classBlock.start}
        onSelect={onUpdateStart}
        onClose={() => setShowStartPicker(false)}
      />
      <TimePickerModal
        visible={showEndPicker}
        title="Class End Time"
        currentTime={classBlock.end}
        minTime={classBlock.start}
        onSelect={onUpdateEnd}
        onClose={() => setShowEndPicker(false)}
      />
      <BuildingPickerModal
        visible={showBuildingPicker}
        currentBuilding={classBlock.building}
        onSelect={onUpdateBuilding}
        onClose={() => setShowBuildingPicker(false)}
      />
    </Animated.View>
  );
}

// ============================================================
// DAY CARD COMPONENT
// ============================================================

interface DayCardProps {
  day: DayWithClasses;
  showBuildings: boolean;
  onToggle: () => void;
  onAddClass: () => void;
  onUpdateClass: (classId: string, updates: Partial<ClassTime>) => void;
  onDeleteClass: (classId: string) => void;
}

function DayCard({
  day,
  showBuildings,
  onToggle,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
}: DayCardProps) {
  const [isExpanded, setIsExpanded] = useState(day.isEnabled);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
    setIsExpanded(!day.isEnabled);
  };

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      layout={Layout.springify()}
      style={[styles.dayCard, day.isEnabled && styles.dayCardEnabled]}
    >
      {/* Day Header */}
      <TouchableOpacity style={styles.dayHeader} onPress={handleToggle}>
        <View style={[
          styles.dayToggle,
          day.isEnabled ? styles.dayToggleEnabled : styles.dayToggleDisabled,
        ]}>
          {day.isEnabled ? (
            <SFIcon name="checkmark" size={16} color={Colors.light.background} />
          ) : (
            <Text style={styles.dayToggleText}>{day.short}</Text>
          )}
        </View>

        <View style={styles.dayInfo}>
          <Text style={[
            styles.dayLabel,
            day.isEnabled ? styles.dayLabelEnabled : styles.dayLabelDisabled,
          ]}>
            {day.label}
          </Text>
          {day.isEnabled && day.classes.length > 0 && (
            <Text style={styles.dayClassCount}>
              {day.classes.length} class{day.classes.length !== 1 ? 'es' : ''}
            </Text>
          )}
        </View>

        <View style={styles.dayExpandIcon}>
          <SFIcon
            name={day.isEnabled ? 'chevron-down' : 'plus'}
            size={18}
            color={day.isEnabled ? Colors.gray[2] : Colors.gray[3]}
          />
        </View>
      </TouchableOpacity>

      {/* Classes */}
      {day.isEnabled && (
        <Animated.View
          entering={FadeIn}
          style={styles.dayContent}
        >
          {day.classes.map((classBlock, index) => (
            <ClassBlockCard
              key={classBlock.id}
              classBlock={classBlock}
              index={index}
              total={day.classes.length}
              showBuildings={showBuildings}
              onUpdateStart={(time) => onUpdateClass(classBlock.id, { start: time })}
              onUpdateEnd={(time) => onUpdateClass(classBlock.id, { end: time })}
              onUpdateBuilding={(building) => onUpdateClass(classBlock.id, { building })}
              onDelete={() => onDeleteClass(classBlock.id)}
            />
          ))}

          {/* Add Class Button */}
          <TouchableOpacity
            style={styles.addClassButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onAddClass();
            }}
          >
            <SFIcon name="plus-circle" size={18} color={Colors.ios.blue} />
            <Text style={styles.addClassText}>Add another class</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ============================================================
// MAIN SCHEDULE EDITOR COMPONENT
// ============================================================

export function ScheduleEditor({
  schedule,
  onChange,
  showWeekend = false,
  showBuildings = true,
  compact = false,
}: ScheduleEditorProps) {
  const days = showWeekend ? [...WEEKDAYS, ...WEEKEND] : WEEKDAYS;

  // Convert schedule to internal format with IDs
  const daysWithClasses: DayWithClasses[] = useMemo(() => {
    return days.map((day) => {
      const daySchedule = schedule[day.key];
      const classes: ClassBlock[] = daySchedule?.classes?.map((c) => ({
        ...c,
        id: generateId(),
      })) ?? [];

      return {
        ...day,
        classes,
        isEnabled: !!daySchedule,
      };
    });
  }, [schedule, days]);

  const toggleDay = useCallback((dayKey: DayKey) => {
    onChange({
      ...schedule,
      [dayKey]: schedule[dayKey]
        ? undefined
        : { classes: [{ start: '08:00', end: '09:15' }] },
    });
  }, [schedule, onChange]);

  const addClass = useCallback((dayKey: DayKey) => {
    const currentDay = schedule[dayKey];
    const lastClass = currentDay?.classes?.[currentDay.classes.length - 1];
    const newStart = lastClass?.end ?? '08:00';
    const newEnd = getEndTime(newStart);

    onChange({
      ...schedule,
      [dayKey]: {
        classes: [
          ...(currentDay?.classes ?? []),
          { start: newStart, end: newEnd },
        ],
      },
    });
  }, [schedule, onChange]);

  const updateClass = useCallback((dayKey: DayKey, classId: string, updates: Partial<ClassTime>) => {
    const currentDay = schedule[dayKey];
    if (!currentDay) return;

    // Find index by comparing times (since IDs are regenerated)
    const classIndex = daysWithClasses
      .find((d) => d.key === dayKey)
      ?.classes.findIndex((c) => c.id === classId);

    if (classIndex === undefined || classIndex === -1) return;

    const updatedClasses = [...currentDay.classes];
    updatedClasses[classIndex] = {
      ...updatedClasses[classIndex],
      ...updates,
    };

    // If start time changed, ensure end time is after start
    if (updates.start && updatedClasses[classIndex].end <= updates.start) {
      updatedClasses[classIndex].end = getEndTime(updates.start);
    }

    onChange({
      ...schedule,
      [dayKey]: { classes: updatedClasses },
    });
  }, [schedule, daysWithClasses, onChange]);

  const deleteClass = useCallback((dayKey: DayKey, classId: string) => {
    const currentDay = schedule[dayKey];
    if (!currentDay) return;

    const classIndex = daysWithClasses
      .find((d) => d.key === dayKey)
      ?.classes.findIndex((c) => c.id === classId);

    if (classIndex === undefined || classIndex === -1) return;

    const updatedClasses = currentDay.classes.filter((_, i) => i !== classIndex);

    if (updatedClasses.length === 0) {
      // Remove the day entirely
      const { [dayKey]: _, ...rest } = schedule;
      onChange(rest);
    } else {
      onChange({
        ...schedule,
        [dayKey]: { classes: updatedClasses },
      });
    }
  }, [schedule, daysWithClasses, onChange]);

  return (
    <View style={styles.container}>
      {daysWithClasses.map((day) => (
        <DayCard
          key={day.key}
          day={day}
          showBuildings={showBuildings}
          onToggle={() => toggleDay(day.key)}
          onAddClass={() => addClass(day.key)}
          onUpdateClass={(classId, updates) => updateClass(day.key, classId, updates)}
          onDeleteClass={(classId) => deleteClass(day.key, classId)}
        />
      ))}
    </View>
  );
}

// Helper to get end time 1:15 after start
function getEndTime(start: string): string {
  const [hours, minutes] = start.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + 75; // Add 1 hour 15 minutes
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },

  // Day Card
  dayCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  dayCardEnabled: {
    ...Shadows.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  dayToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dayToggleEnabled: {
    backgroundColor: Colors.scarlet[500],
  },
  dayToggleDisabled: {
    backgroundColor: Colors.gray[5],
  },
  dayToggleText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  dayLabelEnabled: {
    color: Colors.light.text,
  },
  dayLabelDisabled: {
    color: Colors.gray[2],
  },
  dayClassCount: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 2,
  },
  dayExpandIcon: {
    padding: Spacing.xs,
  },
  dayContent: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },

  // Class Block Card
  classBlockCard: {
    backgroundColor: Colors.gray[6],
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  classBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  classBlockNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.scarlet[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  classBlockNumberText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.scarlet[600],
  },
  classBlockTitle: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
  },
  classBlockDelete: {
    padding: Spacing.xs,
  },

  // Time Row
  classBlockTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  timeButtonLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  timeButtonValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    textAlign: 'right',
  },
  timeArrow: {
    paddingHorizontal: Spacing.xs,
  },

  // Building Button
  buildingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  buildingButtonLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  buildingButtonValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
    textAlign: 'right',
    marginRight: Spacing.xs,
  },
  buildingButtonPlaceholder: {
    color: Colors.gray[3],
  },

  // Add Class Button
  addClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  addClassText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    width: 300,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  timePickerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  chevronButton: {
    padding: Spacing.sm,
  },
  selectedTimeContainer: {
    backgroundColor: Colors.scarlet[50],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.xs,
  },
  selectedTimeText: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.scarlet[600],
  },
  quickSelectContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  quickSelectLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  quickSelectButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  quickSelectButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray[5],
  },
  quickSelectButtonActive: {
    backgroundColor: Colors.scarlet[500],
  },
  quickSelectButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
    textAlign: 'center',
  },
  quickSelectButtonTextActive: {
    color: Colors.light.background,
  },

  // Building Modal
  buildingModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  buildingModalDismiss: {
    flex: 1,
  },
  buildingModalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gray[4],
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  buildingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  buildingModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  buildingList: {
    flex: 1,
  },
  buildingListContent: {
    paddingBottom: Spacing.xxl,
  },
  buildingSectionHeader: {
    backgroundColor: Colors.gray[6],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  buildingSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buildingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  buildingOptionSelected: {
    backgroundColor: Colors.ios.blue + '08',
  },
  buildingOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[5],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  buildingOptionText: {
    flex: 1,
  },
  buildingOptionName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  buildingOptionFullName: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginTop: 1,
  },
});

export default ScheduleEditor;
