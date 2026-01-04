import { View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Bell,
  Car,
  MapPin,
  Shield,
  HelpCircle,
  ChevronRight,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '@/stores/authStore';
import { getPermitInfo } from '@/constants/permits';
import { Colors } from '@/constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { appUser, signOut } = useAuthStore();
  const permitInfo = appUser ? getPermitInfo(appUser.permit_type) : null;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ios-gray6" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="px-4 pt-2 pb-4">
          <Text className="text-2xl font-bold text-gray-900">Settings</Text>
        </View>

        {/* Profile Section */}
        <View className="px-4 mb-6">
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
            onPress={() => router.push('/settings/profile')}
          >
            <View className="w-14 h-14 rounded-full bg-scarlet-100 items-center justify-center mr-4">
              <User size={24} color={Colors.scarlet.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900">
                {appUser?.display_name ?? 'Raider'}
              </Text>
              <Text className="text-gray-500">{appUser?.email}</Text>
            </View>
            <ChevronRight size={20} color={Colors.gray[2]} />
          </TouchableOpacity>
        </View>

        {/* Parking Section */}
        <View className="px-4 mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-2 ml-2">
            PARKING
          </Text>
          <View
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <TouchableOpacity
              className="p-4 flex-row items-center border-b border-gray-100"
              onPress={() => router.push('/settings/permit')}
            >
              <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                <Car size={20} color={Colors.ios.blue} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-gray-900">Permit Type</Text>
                <Text className="text-sm text-gray-500">
                  {permitInfo?.name ?? 'Not Set'}
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.gray[2]} />
            </TouchableOpacity>

            <TouchableOpacity
              className="p-4 flex-row items-center"
              onPress={() => router.push('/settings/schedule')}
            >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-3">
                <MapPin size={20} color={Colors.ios.green} />
              </View>
              <View className="flex-1">
                <Text className="text-base text-gray-900">Class Schedule</Text>
                <Text className="text-sm text-gray-500">
                  Set your arrival times
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.gray[2]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="px-4 mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-2 ml-2">
            NOTIFICATIONS
          </Text>
          <View
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="p-4 flex-row items-center justify-between border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-3">
                  <Bell size={20} color={Colors.ios.orange} />
                </View>
                <Text className="text-base text-gray-900">
                  Departure Reminders
                </Text>
              </View>
              <Switch
                value={appUser?.notification_preferences?.departure_reminders}
                onValueChange={() => {}}
                trackColor={{ false: Colors.gray[3], true: Colors.ios.green }}
              />
            </View>

            <View className="p-4 flex-row items-center justify-between border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-3">
                  <Bell size={20} color={Colors.ios.red} />
                </View>
                <Text className="text-base text-gray-900">Lot Filling Up</Text>
              </View>
              <Switch
                value={appUser?.notification_preferences?.lot_filling}
                onValueChange={() => {}}
                trackColor={{ false: Colors.gray[3], true: Colors.ios.green }}
              />
            </View>

            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3">
                  <Bell size={20} color={Colors.ios.blue} />
                </View>
                <Text className="text-base text-gray-900">Event Closures</Text>
              </View>
              <Switch
                value={appUser?.notification_preferences?.event_closures}
                onValueChange={() => {}}
                trackColor={{ false: Colors.gray[3], true: Colors.ios.green }}
              />
            </View>
          </View>
        </View>

        {/* More Section */}
        <View className="px-4 mb-6">
          <Text className="text-sm font-semibold text-gray-500 mb-2 ml-2">
            MORE
          </Text>
          <View
            className="bg-white rounded-2xl overflow-hidden"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <TouchableOpacity className="p-4 flex-row items-center border-b border-gray-100">
              <View className="w-10 h-10 rounded-full bg-purple-50 items-center justify-center mr-3">
                <Shield size={20} color={Colors.ios.purple} />
              </View>
              <Text className="text-base text-gray-900 flex-1">
                Privacy Policy
              </Text>
              <ChevronRight size={20} color={Colors.gray[2]} />
            </TouchableOpacity>

            <TouchableOpacity className="p-4 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-teal-50 items-center justify-center mr-3">
                <HelpCircle size={20} color={Colors.ios.teal} />
              </View>
              <Text className="text-base text-gray-900 flex-1">
                Help & Support
              </Text>
              <ChevronRight size={20} color={Colors.gray[2]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View className="px-4">
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center justify-center"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
            onPress={handleSignOut}
          >
            <LogOut size={20} color={Colors.ios.red} />
            <Text className="text-red-500 font-semibold ml-2">Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <View className="items-center mt-6">
          <Text className="text-gray-400 text-sm">Raider Park v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
