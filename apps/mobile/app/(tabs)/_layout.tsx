import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useTranslator } from '../../src/i18n/hook';
import { COLORS, FONTS } from '../../src/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslator();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.emerald700,
        tabBarInactiveTintColor: COLORS.ink400,
        tabBarLabelStyle: { fontFamily: FONTS.bodyMedium, fontSize: 11, marginTop: 2 },
        tabBarStyle: {
          backgroundColor: 'rgba(255,255,255,0.94)',
          borderTopColor: COLORS.ink100,
          borderTopWidth: 0.5,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          height: Platform.OS === 'ios' ? 82 : 62,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: t('nav.today'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sunny' : 'sunny-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: t('nav.discover'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: t('nav.pantry'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'basket' : 'basket-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: t('nav.planner'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('nav.favorites'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
