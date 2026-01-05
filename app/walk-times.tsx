// ============================================================
// WALK TIME CALCULATOR SCREEN
// Feature 4.3: Walking time from any lot to any building
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { LOTS } from '@/constants/lots';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
} from '@/constants/theme';

// ============================================================
// DATA
// ============================================================

interface Building {
  id: string;
  name: string;
  shortName: string;
  category: string;
}

const BUILDINGS: Building[] = [
  { id: 'library', name: 'University Library', shortName: 'Library', category: 'Academic' },
  { id: 'sub', name: 'Student Union Building', shortName: 'SUB', category: 'Student Life' },
  { id: 'rec', name: 'Student Recreation Center', shortName: 'Rec Center', category: 'Athletics' },
  { id: 'coe', name: 'College of Engineering', shortName: 'Engineering', category: 'Academic' },
  { id: 'ba', name: 'Rawls College of Business', shortName: 'Business', category: 'Academic' },
  { id: 'english', name: 'English Building', shortName: 'English', category: 'Academic' },
  { id: 'chem', name: 'Chemistry Building', shortName: 'Chemistry', category: 'Academic' },
  { id: 'jones', name: 'Jones AT&T Stadium', shortName: 'Stadium', category: 'Athletics' },
  { id: 'united', name: 'United Supermarkets Arena', shortName: 'USA Arena', category: 'Athletics' },
  { id: 'hsc', name: 'Health Sciences Center', shortName: 'HSC', category: 'Health' },
  { id: 'admin', name: 'Administration Building', shortName: 'Admin', category: 'Admin' },
  { id: 'media', name: 'Media & Communication', shortName: 'MCOM', category: 'Academic' },
];

// Walk time matrix (lot -> building in minutes)
// In production, this would be calculated from GPS coordinates
const WALK_TIMES: Record<string, Record<string, number>> = {
  C1: { library: 8, sub: 6, rec: 12, coe: 10, ba: 7, english: 9, chem: 11, jones: 15, united: 18, hsc: 20, admin: 5, media: 8 },
  C11: { library: 5, sub: 4, rec: 2, coe: 8, ba: 6, english: 7, chem: 9, jones: 12, united: 14, hsc: 18, admin: 6, media: 5 },
  C4: { library: 7, sub: 5, rec: 10, coe: 3, ba: 8, english: 10, chem: 6, jones: 14, united: 16, hsc: 19, admin: 8, media: 9 },
  C16: { library: 12, sub: 10, rec: 15, coe: 14, ba: 11, english: 13, chem: 15, jones: 8, united: 20, hsc: 22, admin: 11, media: 12 },
  R18: { library: 6, sub: 8, rec: 14, coe: 12, ba: 9, english: 4, chem: 7, jones: 16, united: 12, hsc: 15, admin: 7, media: 6 },
  S1: { library: 18, sub: 16, rec: 22, coe: 20, ba: 17, english: 19, chem: 21, jones: 25, united: 28, hsc: 30, admin: 17, media: 18 },
};

// ============================================================
// MAIN SCREEN
// ============================================================

export default function WalkTimesScreen() {
  const router = useRouter();
  const [selectedLot, setSelectedLot] = useState<string>('C11');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('library');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuildings = useMemo(() => {
    if (!searchQuery) return BUILDINGS;
    const query = searchQuery.toLowerCase();
    return BUILDINGS.filter(
      b =>
        b.name.toLowerCase().includes(query) ||
        b.shortName.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const walkTime = useMemo(() => {
    return WALK_TIMES[selectedLot]?.[selectedBuilding] || 10;
  }, [selectedLot, selectedBuilding]);

  const selectLot = useCallback((lotId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLot(lotId);
  }, []);

  const selectBuilding = useCallback((buildingId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedBuilding(buildingId);
  }, []);

  const availableLots = Object.keys(WALK_TIMES);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Walk Times</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Result */}
        <Animated.View entering={FadeIn} style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultEndpoint}>
              <View style={styles.resultIcon}>
                <SFIcon name="car" size={20} color={Colors.ios.blue} />
              </View>
              <Text style={styles.resultLabel}>{selectedLot}</Text>
            </View>
            <View style={styles.resultArrow}>
              <SFIcon name="arrow-right" size={16} color={Colors.gray[2]} />
            </View>
            <View style={styles.resultEndpoint}>
              <View style={[styles.resultIcon, { backgroundColor: Colors.ios.green + '15' }]}>
                <SFIcon name="building-2" size={20} color={Colors.ios.green} />
              </View>
              <Text style={styles.resultLabel}>
                {BUILDINGS.find(b => b.id === selectedBuilding)?.shortName}
              </Text>
            </View>
          </View>
          <View style={styles.resultTime}>
            <Text style={styles.resultTimeValue}>{walkTime}</Text>
            <Text style={styles.resultTimeUnit}>min walk</Text>
          </View>
          <View style={styles.resultMeta}>
            <View style={styles.resultMetaItem}>
              <SFIcon name="figure-walk" size={14} color={Colors.gray[2]} />
              <Text style={styles.resultMetaText}>~{Math.round(walkTime * 80)} steps</Text>
            </View>
            <View style={styles.resultMetaItem}>
              <SFIcon name="flame" size={14} color={Colors.ios.orange} />
              <Text style={styles.resultMetaText}>~{Math.round(walkTime * 5)} cal</Text>
            </View>
          </View>
        </Animated.View>

        {/* Select Lot */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={styles.sectionTitle}>FROM LOT</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lotsScroll}
          >
            {availableLots.map(lotId => (
              <TouchableOpacity
                key={lotId}
                style={[
                  styles.lotChip,
                  selectedLot === lotId && styles.lotChipActive,
                ]}
                onPress={() => selectLot(lotId)}
              >
                <Text
                  style={[
                    styles.lotChipText,
                    selectedLot === lotId && styles.lotChipTextActive,
                  ]}
                >
                  {lotId}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Search Buildings */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.searchSection}>
          <Text style={styles.sectionTitle}>TO BUILDING</Text>
          <View style={styles.searchContainer}>
            <SFIcon name="magnifyingglass" size={18} color={Colors.gray[2]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search buildings..."
              placeholderTextColor={Colors.gray[2]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <SFIcon name="xmark-circle-fill" size={18} color={Colors.gray[2]} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Buildings Grid */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.buildingsGrid}>
          {filteredBuildings.map((building, index) => {
            const time = WALK_TIMES[selectedLot]?.[building.id] || 10;
            const isSelected = selectedBuilding === building.id;
            return (
              <TouchableOpacity
                key={building.id}
                style={[
                  styles.buildingCard,
                  isSelected && styles.buildingCardActive,
                ]}
                onPress={() => selectBuilding(building.id)}
              >
                <View style={styles.buildingHeader}>
                  <Text
                    style={[
                      styles.buildingName,
                      isSelected && styles.buildingNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {building.shortName}
                  </Text>
                  {isSelected && (
                    <SFIcon name="checkmark-circle-fill" size={16} color={Colors.ios.blue} />
                  )}
                </View>
                <Text style={styles.buildingCategory}>{building.category}</Text>
                <View style={styles.buildingTime}>
                  <SFIcon name="figure-walk" size={12} color={Colors.gray[2]} />
                  <Text style={styles.buildingTimeText}>{time} min</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Quick Comparison */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.comparisonCard}>
          <Text style={styles.comparisonTitle}>QUICK COMPARISON</Text>
          <View style={styles.comparisonUnderline} />
          <Text style={styles.comparisonSubtitle}>
            Walk times to {BUILDINGS.find(b => b.id === selectedBuilding)?.shortName}:
          </Text>
          <View style={styles.comparisonList}>
            {availableLots
              .map(lotId => ({
                lotId,
                time: WALK_TIMES[lotId]?.[selectedBuilding] || 10,
              }))
              .sort((a, b) => a.time - b.time)
              .map((item, index) => (
                <View
                  key={item.lotId}
                  style={[
                    styles.comparisonRow,
                    item.lotId === selectedLot && styles.comparisonRowActive,
                  ]}
                >
                  <Text style={styles.comparisonRank}>{index + 1}</Text>
                  <Text
                    style={[
                      styles.comparisonLot,
                      item.lotId === selectedLot && styles.comparisonLotActive,
                    ]}
                  >
                    {item.lotId}
                  </Text>
                  <View style={styles.comparisonTimeBar}>
                    <View
                      style={[
                        styles.comparisonTimeFill,
                        {
                          width: `${Math.min(100, (item.time / 30) * 100)}%`,
                          backgroundColor:
                            item.time <= 5
                              ? Colors.ios.green
                              : item.time <= 10
                              ? Colors.ios.blue
                              : item.time <= 15
                              ? Colors.ios.orange
                              : Colors.ios.red,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.comparisonTime}>{item.time} min</Text>
                </View>
              ))}
          </View>
        </Animated.View>

        {/* Tip */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.tipCard}>
          <SFIcon name="lightbulb" size={20} color={Colors.ios.orange} />
          <Text style={styles.tipText}>
            Walk times are estimates at a normal pace (~3 mph). Add 2-3 minutes
            for crowded times between classes.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[5],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
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
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Result Card
  resultCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultEndpoint: {
    alignItems: 'center',
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ios.blue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  resultLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  resultArrow: {
    paddingHorizontal: Spacing.lg,
  },
  resultTime: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  resultTimeValue: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.ios.blue,
  },
  resultTimeUnit: {
    fontSize: FontSize.lg,
    color: Colors.gray[2],
    marginLeft: Spacing.xs,
  },
  resultMeta: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  resultMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultMetaText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },

  // Section Title
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gray[1],
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },

  // Lots Scroll
  lotsScroll: {
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  lotChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.gray[4],
  },
  lotChipActive: {
    backgroundColor: Colors.ios.blue,
    borderColor: Colors.ios.blue,
  },
  lotChipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  lotChipTextActive: {
    color: Colors.light.background,
  },

  // Search
  searchSection: {
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.light.text,
  },

  // Buildings Grid
  buildingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  buildingCard: {
    width: '48%',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[5],
  },
  buildingCardActive: {
    borderColor: Colors.ios.blue,
    backgroundColor: Colors.ios.blue + '08',
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buildingName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    flex: 1,
  },
  buildingNameActive: {
    color: Colors.ios.blue,
  },
  buildingCategory: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginTop: 2,
  },
  buildingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  buildingTimeText: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
  },

  // Comparison
  comparisonCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  comparisonTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  comparisonUnderline: {
    width: 80,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  comparisonSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
    marginBottom: Spacing.md,
  },
  comparisonList: {
    gap: Spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  comparisonRowActive: {
    backgroundColor: Colors.ios.blue + '08',
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  comparisonRank: {
    width: 20,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.gray[2],
  },
  comparisonLot: {
    width: 36,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  comparisonLotActive: {
    color: Colors.ios.blue,
  },
  comparisonTimeBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray[5],
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  comparisonTimeFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  comparisonTime: {
    width: 50,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    textAlign: 'right',
  },

  // Tip
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.ios.orange + '10',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    lineHeight: 20,
  },
});
