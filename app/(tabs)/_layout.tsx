import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Compass, Heart, Building2, MessageSquare } from 'lucide-react-native';
import { C } from '@/constants/theme';

function GlassTabBar() {
  return (
    <View style={s.barWrap} pointerEvents="none">
      {Platform.OS === 'web' ? (
        <View style={s.barFill} />
      ) : (
        <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={s.barOverlay} />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 18,
          right: 18,
          height: 68,
          borderRadius: 34,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
          overflow: Platform.OS === 'ios' ? 'visible' : 'hidden',
        },
        tabBarBackground: () => <GlassTabBar />,
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Compass size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="foryou"
        options={{
          title: 'For You',
          tabBarIcon: ({ color, size }) => (
            <Heart size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="hotels"
        options={{
          title: 'Hotels',
          tabBarIcon: ({ color, size }) => (
            <Building2 size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="chatroom"
        options={{
          title: 'Chatroom',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size - 2} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  barWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    overflow: 'hidden',
  },
  barFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 22, 22, 0.88)',
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  barOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(255,255,255,0.04)',
  },
});
