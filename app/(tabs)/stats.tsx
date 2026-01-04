import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Clock, MapPin, Award } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function StatsScreen() {
  // Placeholder stats - would come from user_stats table
  const stats = {
    totalTrips: 47,
    avgTimeSaved: 12,
    favoriteSpot: 'C11',
    reportCount: 23,
    accuracy: 94,
    level: 'Veteran',
    streak: 5,
  };

  return (
    <SafeAreaView className="flex-1 bg-ios-gray6" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="px-4 pt-2 pb-4">
          <Text className="text-2xl font-bold text-gray-900">Your Stats</Text>
          <Text className="text-base text-gray-500 mt-1">
            This Semester
          </Text>
        </View>

        {/* Main Stats Cards */}
        <View className="px-4 flex-row gap-3 mb-4">
          <View
            className="flex-1 bg-white rounded-2xl p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-2">
              <TrendingUp size={20} color={Colors.ios.blue} />
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              {stats.totalTrips}
            </Text>
            <Text className="text-sm text-gray-500">Total Trips</Text>
          </View>

          <View
            className="flex-1 bg-white rounded-2xl p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mb-2">
              <Clock size={20} color={Colors.ios.green} />
            </View>
            <Text className="text-3xl font-bold text-gray-900">
              {stats.avgTimeSaved}
              <Text className="text-lg text-gray-500"> min</Text>
            </Text>
            <Text className="text-sm text-gray-500">Avg. Time Saved</Text>
          </View>
        </View>

        {/* Where You Park */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Where You Park
          </Text>
          <View
            className="bg-white rounded-2xl p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            {/* Bar chart placeholder */}
            <View className="space-y-3">
              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-medium text-gray-700">C11</Text>
                  <Text className="text-gray-500">62%</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-scarlet-500 rounded-full"
                    style={{ width: '62%' }}
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-medium text-gray-700">C12</Text>
                  <Text className="text-gray-500">24%</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-scarlet-400 rounded-full"
                    style={{ width: '24%' }}
                  />
                </View>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="font-medium text-gray-700">C16</Text>
                  <Text className="text-gray-500">14%</Text>
                </View>
                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-scarlet-300 rounded-full"
                    style={{ width: '14%' }}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Reporter Stats */}
        <View className="px-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Reporter Status
          </Text>
          <View
            className="bg-white rounded-2xl p-4"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-amber-100 items-center justify-center mr-4">
                <Award size={28} color="#F59E0B" />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  {stats.level}
                </Text>
                <Text className="text-gray-500">
                  {stats.reportCount} reports submitted
                </Text>
              </View>
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {stats.accuracy}%
                </Text>
                <Text className="text-sm text-gray-500">Accuracy</Text>
              </View>
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {stats.streak}
                </Text>
                <Text className="text-sm text-gray-500">Day Streak</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Insights */}
        <View className="px-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Insights
          </Text>
          <View
            className="bg-gradient-to-r from-scarlet-500 to-scarlet-600 rounded-2xl p-4"
            style={{ backgroundColor: Colors.scarlet.DEFAULT }}
          >
            <Text className="text-white font-semibold text-base mb-2">
              Optimization Tip
            </Text>
            <Text className="text-scarlet-100 text-sm leading-5">
              You'd save 8 minutes per day if you arrived 15 minutes earlier.
              Tuesdays are your hardest parking day - consider the satellite lot
              on those days.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
