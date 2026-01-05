// ============================================================
// PERMIT SELECTION SCREEN
// Premium iOS-first design for RaiderPark - Pure StyleSheet
// Fetches real permit data from Supabase backend
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Pressable,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SFIcon } from '@/components/ui/SFIcon';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { PERMITS, PERMIT_CATEGORIES, type PermitInfo } from '@/constants/permits';
import { useAuthStore } from '@/stores/authStore';
import { usePermitsByCategory, useUpdatePermitType } from '@/hooks/usePermits';
import { formatPrice } from '@/lib/utils';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  FontWeight,
  Shadows,
} from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Icon mapping for permit categories
const CATEGORY_ICONS: Record<string, string> = {
  'commuter': 'car',
  'residence': 'star',
  'garage': 'building-2',
  'other': 'parking',
};

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  'commuter': 'Commuter',
  'residence': 'Residence Hall',
  'garage': 'Garage',
  'other': 'Other',
};

export default function PermitScreen() {
  const [selectedPermit, setSelectedPermit] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Fetch permits from backend
  const { data: permitCategories, isLoading, isError, refetch } = usePermitsByCategory();
  const updatePermitMutation = useUpdatePermitType();

  // Convert backend data to display format, with fallback to constants
  const categories = useMemo(() => {
    if (permitCategories && permitCategories.length > 0) {
      return permitCategories.map(({ category, permits }) => ({
        title: CATEGORY_NAMES[category] || category,
        icon: CATEGORY_ICONS[category] || 'parking',
        permits: permits.map((p): PermitInfo => ({
          id: p.id as any,
          name: p.name,
          shortName: p.short_name,
          price: p.price,
          description: p.description || '',
          validLots: p.valid_lots,
          crossLotTime: p.cross_lot_time || undefined,
          freeTime: p.free_time || undefined,
        })),
      }));
    }
    // Fallback to hardcoded data
    return PERMIT_CATEGORIES.map(cat => ({
      title: cat.title,
      icon: CATEGORY_ICONS[cat.title.toLowerCase()] || 'parking',
      permits: cat.permits.map(id => PERMITS[id]),
    }));
  }, [permitCategories]);

  const handleSelectPermit = useCallback((permitId: string) => {
    Haptics.selectionAsync();
    setSelectedPermit(permitId);
  }, []);

  const handleContinue = async () => {
    if (!selectedPermit) return;

    try {
      // If user is authenticated, save the permit
      if (user) {
        await updatePermitMutation.mutateAsync(selectedPermit);
      }
      // Navigate to schedule screen
      router.push('/onboarding/schedule');
    } catch (error) {
      console.error('Failed to update permit:', error);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/schedule');
  };

  // Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.scarlet[500]} />
          <Text style={styles.loadingText}>Loading permits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error State with Retry
  if (isError && !permitCategories) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <SFIcon name="exclamationmark-triangle" size={48} color={Colors.gray[1]} />
          <Text style={styles.errorTitle}>Unable to load permits</Text>
          <Text style={styles.errorText}>
            Please check your connection and try again
          </Text>
          <Button
            title="Retry"
            variant="primary"
            onPress={() => refetch()}
            style={styles.retryButton}
          />
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Continue without permit</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(600)}
        style={styles.header}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((step, index) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                index === 0 ? styles.progressStepActive : styles.progressStepInactive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.title}>
          What type of parking permit do you have?
        </Text>
        <Text style={styles.subtitle}>
          This helps us show you available spots
        </Text>
      </Animated.View>

      {/* Permit List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category, categoryIndex) => (
          <Animated.View
            key={category.title}
            entering={FadeInRight.delay(100 + categoryIndex * 100).duration(500)}
            style={styles.categoryContainer}
          >
            {/* Category Header */}
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconContainer}>
                <SFIcon name={category.icon as any} size={20} color={Colors.scarlet[500]} />
              </View>
              <Text style={styles.categoryTitle}>
                {category.title}
              </Text>
            </View>

            {/* Permit Cards */}
            <View style={styles.permitCardsContainer}>
              {category.permits.map((permit) => (
                <PermitCard
                  key={permit.id}
                  permit={permit}
                  isSelected={selectedPermit === permit.id}
                  onPress={() => handleSelectPermit(permit.id)}
                />
              ))}
            </View>
          </Animated.View>
        ))}

        {/* No Permit Option */}
        <Animated.View
          entering={FadeInRight.delay(500).duration(500)}
          style={styles.categoryContainer}
        >
          <PermitCard
            permit={PERMITS.none}
            isSelected={selectedPermit === 'none'}
            onPress={() => handleSelectPermit('none')}
          />
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA}>
        <Button
          title="Continue"
          variant="primary"
          size="xl"
          fullWidth
          disabled={!selectedPermit}
          isLoading={updatePermitMutation.isPending}
          onPress={handleContinue}
          style={styles.continueButton}
          rightIcon={<SFIcon name="chevron-right" size={20} color="#FFFFFF" />}
        />
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// PERMIT CARD COMPONENT
// ============================================================

interface PermitCardProps {
  permit: PermitInfo;
  isSelected: boolean;
  onPress: () => void;
}

function PermitCard({ permit, isSelected, onPress }: PermitCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, {
      damping: 15,
      stiffness: 400,
    });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  const cardStyle: ViewStyle[] = [
    cardStyles.card,
    isSelected ? cardStyles.cardSelected : cardStyles.cardUnselected,
    isSelected ? cardStyles.cardSelectedShadow : cardStyles.cardShadow,
  ];

  return (
    <AnimatedPressable
      style={[animatedStyle, ...cardStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      <View style={cardStyles.contentContainer}>
        <Text style={cardStyles.permitName}>
          {permit.name}
        </Text>
        <Text style={cardStyles.permitDescription} numberOfLines={1}>
          {permit.description}
        </Text>
      </View>

      <View style={cardStyles.rightContainer}>
        {permit.price > 0 && (
          <Text style={cardStyles.priceText}>
            {formatPrice(permit.price)}/yr
          </Text>
        )}

        {/* Selection Indicator */}
        <View
          style={[
            cardStyles.selectionIndicator,
            isSelected
              ? cardStyles.selectionIndicatorSelected
              : cardStyles.selectionIndicatorUnselected,
          ]}
        >
          {isSelected && (
            <View style={cardStyles.selectionIndicatorDot} />
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.gray[1],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: Colors.gray[1],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    minWidth: 120,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
  title: {
    ...Typography.largeTitle,
    color: Colors.light.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: FontWeight.regular,
    color: Colors.gray[1],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  categoryContainer: {
    marginBottom: Spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryIconContainer: {
    marginRight: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  permitCardsContainer: {
    gap: Spacing.md,
  },
  bottomSpacer: {
    height: 96,
  },
  bottomCTA: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.light.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[5],
    ...Shadows.md,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
  },
  continueButton: {
    borderRadius: BorderRadius.lg,
  },
  skipButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: FontWeight.regular,
    color: Colors.gray[1],
    textAlign: 'center',
  },
});

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.light.background,
    overflow: 'hidden',
  },
  cardUnselected: {
    borderWidth: 0,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: Colors.scarlet[500],
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardSelectedShadow: {
    shadowColor: Colors.scarlet[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  contentContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  permitName: {
    fontSize: 16,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  permitDescription: {
    fontSize: 14,
    fontWeight: FontWeight.regular,
    color: Colors.gray[1],
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
    marginRight: Spacing.md,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIndicatorUnselected: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.gray[4],
  },
  selectionIndicatorSelected: {
    backgroundColor: Colors.scarlet[500],
    borderColor: Colors.scarlet[500],
  },
  selectionIndicatorDot: {
    width: 8,
    height: 8,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.full,
  },
});
