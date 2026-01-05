// ============================================================
// PERMIT TYPE SELECTION SCREEN
// Select parking permit type for RaiderPark
// Fetches real permit data from Supabase backend
// ============================================================

import { useState, useMemo } from 'react';
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
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
import { PERMITS, PERMIT_CATEGORIES, type PermitInfo } from '@/constants/permits';
import { usePermitsByCategory, useUpdatePermitType } from '@/hooks/usePermits';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
  Shadows,
  ColoredShadows,
} from '@/constants/theme';

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  'commuter': 'Commuter',
  'residence': 'Residence Hall',
  'garage': 'Garage',
  'other': 'Other',
};

export default function PermitScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();

  const [selectedPermit, setSelectedPermit] = useState<string>(
    appUser?.permit_type ?? 'none'
  );

  // Fetch permits from backend
  const { data: permitCategories, isLoading, isError, refetch } = usePermitsByCategory();
  const updatePermitMutation = useUpdatePermitType();

  const hasChanges = selectedPermit !== appUser?.permit_type;

  // Convert backend data to display format, with fallback to constants
  const categories = useMemo(() => {
    if (permitCategories && permitCategories.length > 0) {
      return permitCategories.map(({ category, permits }) => ({
        title: CATEGORY_NAMES[category] || category,
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
      permits: cat.permits.map(id => PERMITS[id]),
    }));
  }, [permitCategories]);

  const handleSave = async () => {
    if (!hasChanges) return;

    try {
      await updatePermitMutation.mutateAsync(selectedPermit);
      Alert.alert('Success', 'Permit type updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating permit type:', error);
      Alert.alert('Error', 'Failed to update permit type. Please try again.');
    }
  };

  const renderPermitItem = (permit: PermitInfo) => {
    const isSelected = selectedPermit === permit.id;
    const isCurrent = appUser?.permit_type === permit.id;

    return (
      <TouchableOpacity
        key={permit.id}
        style={[
          styles.permitItem,
          isSelected && styles.permitItemSelected,
        ]}
        onPress={() => setSelectedPermit(permit.id)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.permitIcon,
            isSelected ? styles.permitIconSelected : styles.permitIconDefault,
          ]}
        >
          {isSelected ? (
            <SFIcon name="checkmark" size={20} color="#FFFFFF" />
          ) : (
            <SFIcon name="car" size={20} color={Colors.gray[1]} />
          )}
        </View>

        <View style={styles.permitInfo}>
          <View style={styles.permitNameRow}>
            <Text
              style={[
                styles.permitName,
                isSelected && styles.permitNameSelected,
              ]}
            >
              {permit.name}
            </Text>
            {isCurrent && !isSelected && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <Text style={styles.permitDescription}>
            {permit.description}
          </Text>
          {permit.validLots.length > 0 && (
            <Text style={styles.validLots}>
              Valid in: {permit.validLots.slice(0, 5).join(', ')}
              {permit.validLots.length > 5
                ? ` +${permit.validLots.length - 5} more`
                : ''}
            </Text>
          )}
        </View>

        <View style={styles.priceContainer}>
          {permit.price > 0 ? (
            <View style={styles.priceRow}>
              <SFIcon name="dollarsign" size={14} color={Colors.gray[1]} />
              <Text style={styles.priceText}>
                {permit.price}
              </Text>
            </View>
          ) : (
            <Text style={styles.freeText}>Free</Text>
          )}
          <Text style={styles.perYearText}>/year</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <SFIcon name="exclamationmark-triangle" size={48} color={Colors.gray[1]} />
          <Text style={styles.errorTitle}>Unable to load permits</Text>
          <Text style={styles.errorText}>
            Please check your connection and try again
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            Select your TTU parking permit type to see which lots you can park in
            and get personalized recommendations.
          </Text>
        </View>

        {/* Permit Categories */}
        {categories.map((category) => (
          <View key={category.title} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {category.title.toUpperCase()}
            </Text>
            <View style={styles.card}>
              {category.permits.map((permit, index) => (
                <View key={permit.id}>
                  {renderPermitItem(permit)}
                  {index < category.permits.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* No Permit Option */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            NO PERMIT
          </Text>
          <View style={styles.card}>
            {renderPermitItem(PERMITS.none)}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              updatePermitMutation.isPending ? styles.saveButtonDisabled : styles.saveButtonActive,
            ]}
            onPress={handleSave}
            disabled={updatePermitMutation.isPending}
          >
            {updatePermitMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <SFIcon name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  Save Changes
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[6],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.scarlet[500],
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120,
  },
  infoBanner: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
  },
  infoBannerText: {
    fontSize: FontSize.sm,
    color: '#1E40AF',
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  permitItem: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  permitItemSelected: {
    backgroundColor: Colors.scarlet[50],
  },
  permitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  permitIconSelected: {
    backgroundColor: Colors.scarlet[500],
  },
  permitIconDefault: {
    backgroundColor: Colors.gray[5],
  },
  permitInfo: {
    flex: 1,
  },
  permitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  permitName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: '#111827',
  },
  permitNameSelected: {
    color: Colors.scarlet[600],
  },
  currentBadge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: BorderRadius.sm,
  },
  currentBadgeText: {
    fontSize: FontSize.xs,
    color: '#4B5563',
  },
  permitDescription: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginTop: 2,
  },
  validLots: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
    marginTop: Spacing.xs,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#374151',
  },
  freeText: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  perYearText: {
    fontSize: FontSize.xs,
    color: Colors.gray[2],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray[5],
    marginLeft: 64,
  },
  saveButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingBottom: 32,
    paddingTop: Spacing.md,
    backgroundColor: Colors.gray[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButton: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...ColoredShadows.scarlet,
  },
  saveButtonActive: {
    backgroundColor: Colors.scarlet[500],
  },
  saveButtonDisabled: {
    backgroundColor: Colors.gray[2],
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
    marginLeft: Spacing.sm,
  },
});
