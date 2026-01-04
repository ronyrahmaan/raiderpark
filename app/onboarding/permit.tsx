// ============================================================
// PERMIT SELECTION SCREEN
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
  FadeInRight,
} from 'react-native-reanimated';
import { ChevronRight, Car, Building, Home, Warehouse, CircleParking } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Button } from '@/components/ui/Button';
import { PressableCard } from '@/components/ui/Card';
import { PERMITS, PERMIT_CATEGORIES, type PermitInfo } from '@/constants/permits';
import { PermitType } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/lib/utils';

// Icon mapping for permit categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Commuter': <Car size={20} color="#CC0000" strokeWidth={2} />,
  'Residence Hall': <Home size={20} color="#CC0000" strokeWidth={2} />,
  'Garage': <Warehouse size={20} color="#CC0000" strokeWidth={2} />,
  'Other': <CircleParking size={20} color="#CC0000" strokeWidth={2} />,
};

export default function PermitScreen() {
  const [selectedPermit, setSelectedPermit] = useState<PermitType | null>(null);
  const { updatePermitType, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPermit = useCallback((permitId: PermitType) => {
    Haptics.selectionAsync();
    setSelectedPermit(permitId);
  }, []);

  const handleContinue = async () => {
    if (!selectedPermit) return;

    setIsLoading(true);
    try {
      // If user is authenticated, save the permit
      if (user) {
        await updatePermitType(selectedPermit);
      }
      // Navigate to schedule screen
      router.push('/onboarding/schedule');
    } catch (error) {
      console.error('Failed to update permit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/onboarding/schedule');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(600)}
        className="px-6 pt-4 pb-2"
      >
        {/* Progress Indicator */}
        <View className="flex-row gap-2 mb-6">
          {[1, 2, 3, 4].map((step, index) => (
            <View
              key={step}
              className={`flex-1 h-1 rounded-full ${
                index === 0 ? 'bg-scarlet-500' : 'bg-ios-gray5'
              }`}
            />
          ))}
        </View>

        <Text className="text-3xl font-bold text-black mb-2">
          What type of parking permit do you have?
        </Text>
        <Text className="text-base text-ios-gray">
          This helps us show you available spots
        </Text>
      </Animated.View>

      {/* Permit List */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 py-4"
        showsVerticalScrollIndicator={false}
      >
        {PERMIT_CATEGORIES.map((category, categoryIndex) => (
          <Animated.View
            key={category.title}
            entering={FadeInRight.delay(100 + categoryIndex * 100).duration(500)}
            className="mb-6"
          >
            {/* Category Header */}
            <View className="flex-row items-center mb-3">
              <View className="mr-2">
                {CATEGORY_ICONS[category.title] || <CircleParking size={20} color="#CC0000" />}
              </View>
              <Text className="text-sm font-semibold text-ios-gray uppercase tracking-wider">
                {category.title}
              </Text>
            </View>

            {/* Permit Cards */}
            <View className="gap-3">
              {category.permits.map((permitId) => {
                const permit = PERMITS[permitId];
                return (
                  <PermitCard
                    key={permitId}
                    permit={permit}
                    isSelected={selectedPermit === permitId}
                    onPress={() => handleSelectPermit(permitId)}
                  />
                );
              })}
            </View>
          </Animated.View>
        ))}

        {/* No Permit Option */}
        <Animated.View
          entering={FadeInRight.delay(500).duration(500)}
          className="mb-6"
        >
          <PermitCard
            permit={PERMITS.none}
            isSelected={selectedPermit === 'none'}
            onPress={() => handleSelectPermit('none')}
          />
        </Animated.View>

        {/* Bottom Spacing */}
        <View className="h-24" />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA} className="px-6 pt-4 pb-6 bg-white border-t border-ios-gray5">
        <Button
          title="Continue"
          variant="primary"
          size="xl"
          fullWidth
          disabled={!selectedPermit}
          isLoading={isLoading}
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
// PERMIT CARD COMPONENT
// ============================================================

interface PermitCardProps {
  permit: PermitInfo;
  isSelected: boolean;
  onPress: () => void;
}

function PermitCard({ permit, isSelected, onPress }: PermitCardProps) {
  return (
    <PressableCard
      variant="elevated"
      radius="lg"
      padding="md"
      selected={isSelected}
      onPress={onPress}
      className="flex-row items-center justify-between"
    >
      <View className="flex-1 mr-4">
        <Text className="text-base font-semibold text-black">
          {permit.name}
        </Text>
        <Text className="text-sm text-ios-gray mt-0.5" numberOfLines={1}>
          {permit.description}
        </Text>
      </View>

      <View className="flex-row items-center">
        {permit.price > 0 && (
          <Text className="text-sm font-medium text-ios-gray mr-3">
            {formatPrice(permit.price)}/yr
          </Text>
        )}

        {/* Selection Indicator */}
        <View
          className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
            isSelected
              ? 'bg-scarlet-500 border-scarlet-500'
              : 'bg-white border-ios-gray4'
          }`}
        >
          {isSelected && (
            <View className="w-2 h-2 bg-white rounded-full" />
          )}
        </View>
      </View>
    </PressableCard>
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
});
