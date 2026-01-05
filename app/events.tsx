import { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import { useUpcomingEvents, useActiveEvents } from '@/hooks/useEvents';
import { EVENT_TYPE_INFO, getEventTypeInfo } from '@/services/events';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight, Shadows } from '@/constants/theme';
import { ParkingEvent } from '@/types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - Spacing.md * 2 - 12) / 7;

type EventType = keyof typeof EVENT_TYPE_INFO;

function formatEventDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (eventDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (eventDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatEventTime(startTime: string, endTime: string): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  return `${formatTime(start)} - ${formatTime(end)}`;
}

// ============================================================
// FULL MONTH CALENDAR COMPONENT
// ============================================================

interface MonthCalendarProps {
  events: ParkingEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

function MonthCalendar({ events, selectedDate, onSelectDate }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Get calendar grid for the month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Create array with empty slots for days before month starts
    const days: (Date | null)[] = [];

    // Add empty slots for days before the 1st
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // Map events to dates
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ParkingEvent[]>();
    events.forEach(event => {
      const dateKey = new Date(event.starts_at).toDateString();
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(event);
    });
    return map;
  }, [events]);

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Split days into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={calendarStyles.container}>
      {/* Month Header with Navigation */}
      <View style={calendarStyles.header}>
        <Pressable onPress={goToPrevMonth} style={calendarStyles.navButton}>
          <SFIcon name="chevron-left" size={20} color={Colors.ios.blue} />
        </Pressable>
        <Text style={calendarStyles.monthText}>
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
        </Text>
        <Pressable onPress={goToNextMonth} style={calendarStyles.navButton}>
          <SFIcon name="chevron-right" size={20} color={Colors.ios.blue} />
        </Pressable>
      </View>

      {/* Day Names */}
      <View style={calendarStyles.dayNamesRow}>
        {dayNames.map((name, index) => (
          <View key={index} style={calendarStyles.dayNameCell}>
            <Text style={calendarStyles.dayNameText}>{name}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={calendarStyles.weekRow}>
          {week.map((date, dayIndex) => {
            if (!date) {
              return <View key={`empty-${dayIndex}`} style={calendarStyles.dayCell} />;
            }

            const dateKey = date.toDateString();
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = selectedDate?.toDateString() === dateKey;
            const isPast = date < today;

            return (
              <Pressable
                key={dateKey}
                style={[
                  calendarStyles.dayCell,
                  isSelected && calendarStyles.dayCellSelected,
                  isToday && calendarStyles.dayCellToday,
                ]}
                onPress={() => onSelectDate(date)}
              >
                <Text
                  style={[
                    calendarStyles.dayText,
                    isPast && calendarStyles.dayTextPast,
                    isToday && calendarStyles.dayTextToday,
                    isSelected && calendarStyles.dayTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayEvents.length > 0 && (
                  <View style={calendarStyles.eventIconsRow}>
                    {dayEvents.slice(0, 2).map((event, i) => (
                      <Text key={i} style={calendarStyles.eventIcon}>
                        {getEventTypeInfo(event.event_type).icon}
                      </Text>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
          {/* Pad the last week if needed */}
          {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
            <View key={`pad-${i}`} style={calendarStyles.dayCell} />
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={calendarStyles.legend}>
        {Object.entries(EVENT_TYPE_INFO).map(([type, info]) => (
          <View key={type} style={calendarStyles.legendItem}>
            <Text style={calendarStyles.legendIcon}>{info.icon}</Text>
            <Text style={calendarStyles.legendText}>{info.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
    paddingBottom: Spacing.xs,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayNameText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayCellSelected: {
    backgroundColor: Colors.scarlet[50],
    borderRadius: BorderRadius.md,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: Colors.scarlet[500],
    borderRadius: BorderRadius.md,
  },
  dayText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  dayTextPast: {
    color: Colors.gray[3],
  },
  dayTextToday: {
    color: Colors.scarlet[500],
    fontWeight: FontWeight.bold,
  },
  dayTextSelected: {
    color: Colors.scarlet[600],
    fontWeight: FontWeight.bold,
  },
  eventIconsRow: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  eventIcon: {
    fontSize: 12,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray[5],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendIcon: {
    fontSize: 14,
  },
  legendText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
});

// Filter chip component with selection state
function FilterChip({
  type,
  info,
  selected,
  onPress
}: {
  type: string;
  info: { icon: string; label: string; color: string };
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterChip,
        selected && { backgroundColor: info.color + '20', borderColor: info.color },
      ]}
      onPress={onPress}
    >
      <Text style={styles.filterChipIcon}>{info.icon}</Text>
      <Text style={[styles.filterChipLabel, selected && { color: info.color, fontWeight: FontWeight.semibold }]}>
        {info.label}
      </Text>
      {selected && (
        <View style={[styles.filterChipCheck, { backgroundColor: info.color }]}>
          <SFIcon name="checkmark" size={10} color={Colors.light.background} />
        </View>
      )}
    </Pressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Get alternative lots for an event
function getAlternativeLots(affectedLots: string[]): string[] {
  // Recommend lots that are typically available as alternatives
  const alternatives = ['C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'S1'];
  const affectedSet = new Set(affectedLots.map(l => l.toUpperCase()));
  return alternatives.filter(lot => !affectedSet.has(lot)).slice(0, 3);
}

interface DetailedEventCardProps {
  event: ParkingEvent;
  isActive: boolean;
  onPress: () => void;
  index: number;
}

function DetailedEventCard({ event, isActive, onPress, index }: DetailedEventCardProps) {
  const typeInfo = getEventTypeInfo(event.event_type);
  const alternativeLots = getAlternativeLots(event.affected_lot_ids);

  const eventDate = new Date(event.starts_at);
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const monthName = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = eventDate.getDate();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      layout={Layout.springify()}
      style={styles.detailedCard}
    >
      {/* Card accent bar */}
      <View style={[styles.detailedCardAccent, { backgroundColor: typeInfo.color }]} />

      <Pressable style={styles.detailedCardContent} onPress={onPress}>
        {/* Header row */}
        <View style={styles.detailedCardHeader}>
          <Text style={styles.detailedCardIcon}>{typeInfo.icon}</Text>
          <Text style={styles.detailedCardDate}>
            {dayName}, {monthName} {dayNum}
          </Text>
          <Text style={styles.detailedCardSeparator}>–</Text>
          <Text style={styles.detailedCardTitle} numberOfLines={1}>
            {event.name}
          </Text>
          {isActive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>

        {/* Affected Lots Section */}
        {event.affected_lot_ids.length > 0 && event.event_type !== 'icing' && (
          <View style={styles.detailedSection}>
            <Text style={styles.detailedSectionLabel}>AFFECTED LOTS:</Text>
            <View style={styles.detailedSectionContent}>
              <Text style={styles.detailedBullet}>•</Text>
              <Text style={styles.detailedText}>
                {event.affected_lot_ids.join(', ')}
              </Text>
            </View>
            {(event.event_type === 'football' || event.event_type === 'basketball') && (
              <View style={styles.detailedSectionContent}>
                <Text style={styles.detailedBullet}>•</Text>
                <Text style={styles.detailedText}>Satellite (S1) open with shuttle</Text>
              </View>
            )}
          </View>
        )}

        {/* Alternatives Section */}
        {alternativeLots.length > 0 && event.affected_lot_ids.length > 0 && event.event_type !== 'icing' && (
          <View style={styles.detailedSection}>
            <Text style={styles.detailedSectionLabel}>ALTERNATIVES:</Text>
            <View style={styles.detailedSectionContent}>
              <Text style={styles.detailedBullet}>•</Text>
              <Text style={styles.detailedText}>
                {alternativeLots.join('-')} (Commuter West) –{' '}
                <Text style={styles.recommendedText}>RECOMMENDED</Text>
              </Text>
            </View>
            <View style={styles.detailedSectionContent}>
              <Text style={styles.detailedBullet}>•</Text>
              <Text style={styles.detailedText}>S1 with bus service</Text>
            </View>
          </View>
        )}

        {/* Icing/Ice specific notice */}
        {event.event_type === 'icing' && (
          <View style={styles.detailedSection}>
            <Text style={styles.detailedSectionLabel}>POTENTIAL CLOSURES:</Text>
            <View style={styles.detailedSectionContent}>
              <Text style={styles.detailedBullet}>•</Text>
              <Text style={styles.detailedText}>
                {event.affected_lot_ids.length > 0
                  ? `${event.affected_lot_ids.join(', ')} (Tower Icing Zone)`
                  : 'C14, C15, C16 (Tower Icing Zone)'}
              </Text>
            </View>
            <Text style={styles.detailedNotice}>
              We'll notify you if closures are confirmed.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.detailedActions}>
          <TouchableOpacity style={styles.actionLink}>
            <Text style={styles.actionLinkText}>[Add to Calendar]</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionLink}>
            <Text style={styles.actionLinkText}>[Set Reminder]</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================
// MOCK PLACEHOLDER EVENTS
// ============================================================

// Helper to create mock dates relative to today
function getMockDate(daysFromNow: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const now = new Date().toISOString();

const MOCK_EVENTS: ParkingEvent[] = [
  {
    id: 'mock-1',
    name: 'Football vs Oklahoma State',
    description: 'Big 12 Conference game at Jones AT&T Stadium',
    event_type: 'football',
    starts_at: getMockDate(7, 14),
    ends_at: getMockDate(7, 18),
    affected_lot_ids: ['C1', 'C2', 'C4'],
    impact_level: 5,
    venue: 'Jones AT&T Stadium',
    expected_attendance: 60000,
    arrival_recommendation: '2 hours',
    alternative_lots: ['C11', 'C12', 'C13', 'S1'],
    source: 'scraped',
    source_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'mock-2',
    name: 'Ice Advisory',
    description: 'KTXT tower icing conditions expected',
    event_type: 'icing',
    starts_at: getMockDate(14, 6),
    ends_at: getMockDate(14, 18),
    affected_lot_ids: ['C14', 'C15', 'C16'],
    impact_level: 3,
    venue: null,
    expected_attendance: null,
    arrival_recommendation: null,
    alternative_lots: ['C11', 'C12', 'S1'],
    source: 'manual',
    source_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'mock-3',
    name: 'Basketball vs Kansas',
    description: 'Men\'s basketball game at United Supermarkets Arena',
    event_type: 'basketball',
    starts_at: getMockDate(10, 19),
    ends_at: getMockDate(10, 22),
    affected_lot_ids: ['C7', 'C8'],
    impact_level: 4,
    venue: 'United Supermarkets Arena',
    expected_attendance: 15000,
    arrival_recommendation: '1 hour',
    alternative_lots: ['C11', 'C12', 'S1'],
    source: 'scraped',
    source_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'mock-4',
    name: 'Spring Graduation Ceremony',
    description: 'Commencement ceremonies at Jones AT&T Stadium',
    event_type: 'graduation',
    starts_at: getMockDate(21, 9),
    ends_at: getMockDate(21, 14),
    affected_lot_ids: ['C1', 'C2', 'C3', 'C4', 'C5'],
    impact_level: 5,
    venue: 'Jones AT&T Stadium',
    expected_attendance: 30000,
    arrival_recommendation: '2 hours',
    alternative_lots: ['C11', 'C12', 'C13', 'C14', 'S1'],
    source: 'scraped',
    source_url: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'mock-5',
    name: 'Campus Construction',
    description: 'Road work near Engineering building',
    event_type: 'construction',
    starts_at: getMockDate(3, 7),
    ends_at: getMockDate(5, 17),
    affected_lot_ids: ['C9'],
    impact_level: 2,
    venue: null,
    expected_attendance: null,
    arrival_recommendation: null,
    alternative_lots: ['C10', 'C11'],
    source: 'manual',
    source_url: null,
    created_at: now,
    updated_at: now,
  },
];

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.delay(200)}
      style={styles.emptyStateContainer}
    >
      {/* Illustration */}
      <View style={styles.emptyStateIllustration}>
        {/* Background circles */}
        <View style={styles.emptyStateBgCircle1} />
        <View style={styles.emptyStateBgCircle2} />

        {/* Main icon container */}
        <View style={styles.emptyStateIconMain}>
          <SFIcon
            name={hasFilters ? "line-3-horizontal-decrease-circle" : "checkmark-seal-fill"}
            size={48}
            color={hasFilters ? Colors.ios.orange : Colors.ios.green}
          />
        </View>

        {/* Floating decorative elements */}
        <View style={[styles.emptyStateFloatingIcon, styles.floatingIcon1]}>
          <Text style={styles.floatingEmoji}>🚗</Text>
        </View>
        <View style={[styles.emptyStateFloatingIcon, styles.floatingIcon2]}>
          <Text style={styles.floatingEmoji}>✨</Text>
        </View>
        <View style={[styles.emptyStateFloatingIcon, styles.floatingIcon3]}>
          <Text style={styles.floatingEmoji}>🅿️</Text>
        </View>
      </View>

      {/* Text content */}
      <Text style={styles.emptyStateTitle}>
        {hasFilters ? 'No Matching Events' : 'All Clear!'}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {hasFilters
          ? 'No events match your current filters'
          : 'No parking disruptions scheduled'}
      </Text>
      <Text style={styles.emptyStateText}>
        {hasFilters
          ? 'Try selecting different event types or dates to see more results.'
          : 'All lots are operating normally. Park wherever your permit allows and have a great day on campus!'}
      </Text>

      {/* Action buttons */}
      {hasFilters ? (
        <TouchableOpacity style={styles.clearFiltersButton} onPress={onClearFilters}>
          <SFIcon name="arrow-counterclockwise" size={16} color={Colors.ios.blue} />
          <Text style={styles.clearFiltersText}>Reset Filters</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyStateTip}>
          <View style={styles.emptyStateTipIcon}>
            <SFIcon name="lightbulb-fill" size={16} color={Colors.ios.orange} />
          </View>
          <Text style={styles.emptyStateTipText}>
            We'll notify you when new events are added that may affect parking.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function EventsScreen() {
  const router = useRouter();
  const { data: upcomingEvents, isLoading: upcomingLoading, refetch: refetchUpcoming } = useUpcomingEvents();
  const { data: activeEvents, isLoading: activeLoading, refetch: refetchActive } = useActiveEvents();

  // Filter state - selected event types
  const [selectedFilters, setSelectedFilters] = useState<Set<EventType>>(new Set());
  // Calendar state - selected date for filtering
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const isLoading = upcomingLoading || activeLoading;

  // Navigate to event detail
  const handleEventPress = useCallback((eventId: string) => {
    router.push(`/event/${eventId}`);
  }, [router]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchUpcoming(), refetchActive()]);
  }, [refetchUpcoming, refetchActive]);

  const toggleFilter = useCallback((type: EventType) => {
    setSelectedFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedFilters(new Set());
    setSelectedDate(null);
  }, []);

  const handleDateSelect = useCallback((date: Date) => {
    // Toggle date selection
    if (selectedDate?.toDateString() === date.toDateString()) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  }, [selectedDate]);

  // Filter events based on selected types and date
  const filterEvents = useCallback((events: ParkingEvent[] | undefined) => {
    if (!events) return [];
    let filtered = events;

    // Filter by type
    if (selectedFilters.size > 0) {
      filtered = filtered.filter(e => selectedFilters.has(e.event_type as EventType));
    }

    // Filter by date
    if (selectedDate) {
      const dateStr = selectedDate.toDateString();
      filtered = filtered.filter(e => new Date(e.starts_at).toDateString() === dateStr);
    }

    return filtered;
  }, [selectedFilters, selectedDate]);

  // Use mock events if no real data available (for demo/development)
  const realUpcomingEvents = upcomingEvents ?? [];
  const realActiveEvents = activeEvents ?? [];
  const useMockData = realUpcomingEvents.length === 0 && realActiveEvents.length === 0 && !isLoading;

  const displayUpcomingEvents = useMockData ? MOCK_EVENTS : realUpcomingEvents;
  const displayActiveEvents = useMockData ? [] : realActiveEvents;

  const activeEventIds = new Set(displayActiveEvents.map((e) => e.id));
  const futureEvents = displayUpcomingEvents.filter((e) => !activeEventIds.has(e.id));

  // Apply filters
  const filteredActiveEvents = filterEvents(displayActiveEvents);
  const filteredFutureEvents = filterEvents(futureEvents);

  const groupedEvents = filteredFutureEvents.reduce((groups, event) => {
    const dateKey = formatEventDate(event.starts_at);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, ParkingEvent[]>);

  const hasEvents = filteredActiveEvents.length > 0 || filteredFutureEvents.length > 0;
  const totalEventCount = displayActiveEvents.length + futureEvents.length;
  const hasFilters = selectedFilters.size > 0 || selectedDate !== null;
  const allEvents = [...displayActiveEvents, ...futureEvents];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Events</Text>
          {totalEventCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalEventCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.scarlet.DEFAULT} />
        }
      >
        {/* Full Month Calendar with Legend */}
        <MonthCalendar
          events={allEvents}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
        />

        {/* Selected date filter indicator */}
        {selectedDate && (
          <View style={styles.dateFilterBar}>
            <Text style={styles.dateFilterText}>
              Showing events for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.dateFilterClear}>
              <SFIcon name="xmark-circle-fill" size={18} color={Colors.gray[2]} />
            </TouchableOpacity>
          </View>
        )}

        {!hasEvents && !isLoading ? (
          <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
        ) : (
          <View style={styles.eventsListContainer}>
            {/* Section Header */}
            <View style={styles.upcomingSectionHeader}>
              <Text style={styles.upcomingSectionTitle}>UPCOMING EVENTS</Text>
              <View style={styles.upcomingSectionUnderline} />
            </View>

            {/* Active Events */}
            {filteredActiveEvents.map((event, index) => (
              <DetailedEventCard
                key={event.id}
                event={event}
                isActive={true}
                index={index}
                onPress={() => handleEventPress(event.id)}
              />
            ))}

            {/* Future Events (not grouped by date anymore) */}
            {filteredFutureEvents.map((event, index) => (
              <DetailedEventCard
                key={event.id}
                event={event}
                isActive={false}
                index={filteredActiveEvents.length + index}
                onPress={() => handleEventPress(event.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  headerBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.scarlet.DEFAULT,
    minWidth: 22,
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
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

  // Filter Section
  filterSection: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray[5],
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  filterTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[6],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  filterChipLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },
  filterChipCheck: {
    marginLeft: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Section
  sectionContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[5],
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
  },

  // Event Card - Redesigned
  eventCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    marginBottom: 10,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  eventCardActive: {
    borderWidth: 1,
    borderColor: Colors.status.full + '40',
  },
  eventAccentBar: {
    height: 3,
    width: '100%',
  },
  eventCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  eventDateColumn: {
    width: 48,
    alignItems: 'center',
    marginRight: Spacing.md,
    paddingRight: Spacing.md,
    borderRightWidth: 1,
    borderRightColor: Colors.gray[5],
  },
  eventDateDay: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    lineHeight: 28,
  },
  eventDateMonth: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[2],
    letterSpacing: 0.5,
  },
  eventDetails: {
    flex: 1,
  },
  eventBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.status.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.background,
    marginRight: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
    letterSpacing: 0.5,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  eventTypeBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  eventTypeLabel: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
  },
  eventTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginBottom: 4,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventMetaText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginLeft: 5,
  },
  affectedLotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  affectedLotsText: {
    fontSize: FontSize.sm,
    color: Colors.ios.orange,
    fontWeight: FontWeight.medium,
    marginLeft: 5,
  },
  eventChevron: {
    paddingLeft: Spacing.sm,
  },

  // Empty State - Enhanced
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  emptyStateIllustration: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  emptyStateBgCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.ios.green + '08',
  },
  emptyStateBgCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.ios.green + '12',
  },
  emptyStateIconMain: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  emptyStateFloatingIcon: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  floatingIcon1: {
    top: 10,
    right: 10,
  },
  floatingIcon2: {
    bottom: 20,
    left: 5,
  },
  floatingIcon3: {
    top: 30,
    left: 15,
  },
  floatingEmoji: {
    fontSize: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: 12,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.ios.blue,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  clearFiltersText: {
    fontSize: FontSize.md,
    color: Colors.light.background,
    fontWeight: FontWeight.semibold,
  },
  emptyStateTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.lg,
    maxWidth: 300,
    gap: Spacing.sm,
  },
  emptyStateTipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.ios.orange + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 18,
  },

  // Info Box - Redesigned
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    backgroundColor: Colors.ios.blue + '08',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.ios.blue + '20',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.ios.blue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.blue,
    marginBottom: 2,
  },
  infoText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 18,
  },
  infoActionButton: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Date Filter Bar
  dateFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.scarlet[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.scarlet[200],
  },
  dateFilterText: {
    fontSize: FontSize.sm,
    color: Colors.scarlet[600],
    fontWeight: FontWeight.medium,
  },
  dateFilterClear: {
    padding: 4,
  },

  // Events List Container
  eventsListContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },

  // Upcoming Section Header (wireframe style)
  upcomingSectionHeader: {
    marginBottom: Spacing.md,
  },
  upcomingSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
    marginBottom: 6,
  },
  upcomingSectionUnderline: {
    width: 60,
    height: 2,
    backgroundColor: Colors.scarlet[500],
  },

  // Detailed Event Card (wireframe style)
  detailedCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[4],
    overflow: 'hidden',
  },
  detailedCardAccent: {
    height: 4,
    width: '100%',
  },
  detailedCardContent: {
    padding: Spacing.md,
  },
  detailedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  detailedCardIcon: {
    fontSize: 18,
  },
  detailedCardDate: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  detailedCardSeparator: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  detailedCardTitle: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.light.text,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.status.full,
    marginLeft: 'auto',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.background,
    marginRight: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: Colors.light.background,
    letterSpacing: 0.5,
  },

  // Detailed Card Sections
  detailedSection: {
    marginTop: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  detailedSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailedSectionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  detailedBullet: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginRight: 6,
    marginTop: -1,
  },
  detailedText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },
  recommendedText: {
    fontWeight: FontWeight.bold,
    color: Colors.ios.green,
  },
  detailedNotice: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 12,
  },

  // Action Links
  detailedActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray[5],
  },
  actionLink: {
    paddingVertical: 4,
  },
  actionLinkText: {
    fontSize: FontSize.sm,
    color: Colors.ios.blue,
    fontWeight: FontWeight.medium,
  },
});
