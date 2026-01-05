// ============================================================
// SPOT OPENING ALERTS SCREEN
// Feature 4.1: Get notified when target lot drops below threshold
// ============================================================

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SFIcon } from '@/components/ui/SFIcon';
import { useAuthStore } from '@/stores/authStore';
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
// TYPES
// ============================================================

interface SpotAlert {
  lotId: string;
  threshold: number;
  enabled: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const THRESHOLD_OPTIONS = [50, 60, 70, 80, 90];

const DEFAULT_ALERTS: SpotAlert[] = [
  { lotId: 'C11', threshold: 80, enabled: true },
  { lotId: 'C1', threshold: 70, enabled: false },
];

// ============================================================
// MAIN SCREEN
// ============================================================

export default function SpotAlertsScreen() {
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [alerts, setAlerts] = useState<SpotAlert[]>(DEFAULT_ALERTS);
  const [globalEnabled, setGlobalEnabled] = useState(true);

  const toggleAlert = useCallback((lotId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAlerts(prev =>
      prev.map(a => (a.lotId === lotId ? { ...a, enabled: !a.enabled } : a))
    );
  }, []);

  const updateThreshold = useCallback((lotId: string, threshold: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAlerts(prev =>
      prev.map(a => (a.lotId === lotId ? { ...a, threshold } : a))
    );
  }, []);

  const addNewAlert = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // In production, show lot picker
    const availableLots = Object.keys(LOTS).filter(
      id => !alerts.find(a => a.lotId === id)
    );
    if (availableLots.length === 0) {
      Alert.alert('All Lots Added', 'You have alerts for all available lots.');
      return;
    }
    setAlerts(prev => [
      ...prev,
      { lotId: availableLots[0], threshold: 80, enabled: true },
    ]);
  }, [alerts]);

  const removeAlert = useCallback((lotId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAlerts(prev => prev.filter(a => a.lotId !== lotId));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <SFIcon name="chevron-left" size={22} color={Colors.ios.blue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spot Alerts</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View entering={FadeIn} style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <SFIcon name="bell-badge" size={32} color={Colors.ios.blue} />
          </View>
          <Text style={styles.heroTitle}>Spot Opening Alerts</Text>
          <Text style={styles.heroSubtitle}>
            Get notified when your favorite lots have spots available
          </Text>
        </Animated.View>

        {/* Global Toggle */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.globalToggleCard}>
          <View style={styles.globalToggleContent}>
            <SFIcon name="bell" size={24} color={Colors.ios.green} />
            <View style={styles.globalToggleText}>
              <Text style={styles.globalToggleTitle}>Enable Alerts</Text>
              <Text style={styles.globalToggleSubtitle}>
                Receive push notifications
              </Text>
            </View>
          </View>
          <Switch
            value={globalEnabled}
            onValueChange={setGlobalEnabled}
            trackColor={{ false: Colors.gray[3], true: Colors.ios.green }}
          />
        </Animated.View>

        {/* How It Works */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.infoCard}>
          <Text style={styles.infoTitle}>HOW IT WORKS</Text>
          <View style={styles.infoUnderline} />
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <Text style={styles.infoStepNumber}>1</Text>
              <Text style={styles.infoStepText}>Choose lots to watch</Text>
            </View>
            <View style={styles.infoStep}>
              <Text style={styles.infoStepNumber}>2</Text>
              <Text style={styles.infoStepText}>Set your threshold (e.g., 80% full)</Text>
            </View>
            <View style={styles.infoStep}>
              <Text style={styles.infoStepNumber}>3</Text>
              <Text style={styles.infoStepText}>Get notified when lot drops below threshold</Text>
            </View>
          </View>
        </Animated.View>

        {/* Your Alerts */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <Text style={styles.sectionTitle}>YOUR ALERTS</Text>

          {alerts.map((alert, index) => {
            const lot = LOTS[alert.lotId];
            return (
              <Animated.View
                key={alert.lotId}
                entering={FadeInDown.delay(250 + index * 50)}
                style={styles.alertCard}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertLotInfo}>
                    <Text style={styles.alertLotId}>{alert.lotId}</Text>
                    <Text style={styles.alertLotName}>{lot?.name || 'Unknown Lot'}</Text>
                  </View>
                  <Switch
                    value={alert.enabled && globalEnabled}
                    onValueChange={() => toggleAlert(alert.lotId)}
                    trackColor={{ false: Colors.gray[3], true: Colors.ios.green }}
                    disabled={!globalEnabled}
                  />
                </View>

                <View style={styles.thresholdSection}>
                  <Text style={styles.thresholdLabel}>Alert when below:</Text>
                  <View style={styles.thresholdOptions}>
                    {THRESHOLD_OPTIONS.map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.thresholdOption,
                          alert.threshold === t && styles.thresholdOptionActive,
                        ]}
                        onPress={() => updateThreshold(alert.lotId, t)}
                      >
                        <Text
                          style={[
                            styles.thresholdOptionText,
                            alert.threshold === t && styles.thresholdOptionTextActive,
                          ]}
                        >
                          {t}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeAlert(alert.lotId)}
                >
                  <SFIcon name="trash" size={16} color={Colors.ios.red} />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {/* Add New Alert */}
          <TouchableOpacity style={styles.addAlertButton} onPress={addNewAlert}>
            <SFIcon name="plus-circle" size={20} color={Colors.ios.blue} />
            <Text style={styles.addAlertText}>Add Lot to Watch</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Pro Tip */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.tipCard}>
          <SFIcon name="lightbulb" size={20} color={Colors.ios.orange} />
          <Text style={styles.tipText}>
            Pro Tip: Set alerts for your backup lots too. When your primary lot is full,
            you'll know which alternatives have space!
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

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    textAlign: 'center',
  },

  // Global Toggle
  globalToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  globalToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  globalToggleText: {
    flex: 1,
  },
  globalToggleTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.light.text,
  },
  globalToggleSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  infoTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
    letterSpacing: 1,
  },
  infoUnderline: {
    width: 60,
    height: 2,
    backgroundColor: Colors.light.text,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  infoSteps: {
    gap: Spacing.sm,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoStepNumber: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ios.blue,
    color: Colors.light.background,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  infoStepText: {
    fontSize: FontSize.md,
    color: Colors.gray[1],
    flex: 1,
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

  // Alert Card
  alertCard: {
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  alertLotInfo: {
    flex: 1,
  },
  alertLotId: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.light.text,
  },
  alertLotName: {
    fontSize: FontSize.sm,
    color: Colors.gray[2],
  },
  thresholdSection: {
    marginBottom: Spacing.md,
  },
  thresholdLabel: {
    fontSize: FontSize.sm,
    color: Colors.gray[1],
    marginBottom: Spacing.sm,
  },
  thresholdOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  thresholdOption: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray[5],
  },
  thresholdOptionActive: {
    backgroundColor: Colors.ios.blue,
  },
  thresholdOptionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.gray[1],
  },
  thresholdOptionTextActive: {
    color: Colors.light.background,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    fontSize: FontSize.sm,
    color: Colors.ios.red,
  },

  // Add Alert
  addAlertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.light.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.ios.blue,
    borderStyle: 'dashed',
  },
  addAlertText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.ios.blue,
  },

  // Tip Card
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
