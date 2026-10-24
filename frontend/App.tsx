import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, ParamListBase, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BookOpen, Bot, Home, Shield, Trophy, User } from 'lucide-react-native';

import HomeScreen from './src/screens/HomeScreen';
import LearnScreen from './src/screens/LearnScreen';
import LeadersScreen from './src/screens/LeadersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminScreen from './src/screens/AdminScreen';
import LoginScreen from './src/screens/LoginScreen';
import AssistantModal from './src/components/AssistantModal';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import type { Palette } from './src/theme/colors';
import { registerForPush } from './src/services/pushNotifications';

const Tab = createBottomTabNavigator();

const TAB_BAR_HEIGHT = 49;
const FAB_GAP = 100; // deja libre el botón principal de cada pantalla
const FAB_SCREENS = ['Home', 'Learn']; // en el resto taparía contenido

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { status } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  let content: React.ReactNode;
  if (status === 'loading') {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else {
    content = status === 'signedIn' ? <MainApp /> : <LoginScreen />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {content}
    </>
  );
}

function MainApp() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const navigationRef = useNavigationContainerRef<ParamListBase>();
  const [currentRoute, setCurrentRoute] = useState('Home');

  // Avisos push (rachas, nuevos seguidores). Si el dispositivo no lo soporta, la app sigue igual.
  useEffect(() => {
    registerForPush();
  }, []);

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        border: colors.border,
        text: colors.text,
        primary: colors.primary,
      },
    };
  }, [colors, isDark]);

  return (
    <View style={styles.flex}>
      <NavigationContainer
        theme={navigationTheme}
        ref={navigationRef}
        onStateChange={() => setCurrentRoute(navigationRef.getCurrentRoute()?.name ?? 'Home')}
      >
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingTop: 5,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
          />
          <Tab.Screen
            name="Learn"
            component={LearnScreen}
            options={{ tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
          />
          <Tab.Screen
            name="Leaders"
            component={LeadersScreen}
            options={{ tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} /> }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
          />
          {user?.role === 'admin' && (
            <Tab.Screen
              name="Admin"
              component={AdminScreen}
              options={{ tabBarIcon: ({ color, size }) => <Shield color={color} size={size} /> }}
            />
          )}
        </Tab.Navigator>
      </NavigationContainer>

      {FAB_SCREENS.includes(currentRoute) && (
        <TouchableOpacity
          style={[styles.fab, { bottom: TAB_BAR_HEIGHT + insets.bottom + FAB_GAP }]}
          onPress={() => setAssistantOpen(true)}
          accessibilityLabel="Open AI assistant"
        >
          <Bot color={colors.primary} size={22} />
        </TouchableOpacity>
      )}
      <AssistantModal visible={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    fab: {
      position: 'absolute',
      right: 20,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
