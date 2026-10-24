import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { apiFetch } from '../services/api';
import SecuritySection from '../components/SecuritySection';
import AccountSection from '../components/AccountSection';
import ThemeSelector from '../components/ThemeSelector';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setProfile(await apiFetch<any>('/users/profile'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderStreakGrid = () => {
    const days = Array.from({ length: 30 }, (_, i) => i);
    const streak = profile?.streak || 0;

    return (
      <View style={styles.streakGrid}>
        {days.map((day) => {
          let statusStyle: ViewStyle = styles.streakDayFuture;
          if (day < streak - 1) statusStyle = styles.streakDayActive;
          else if (day === streak - 1) statusStyle = styles.streakDayCurrent;

          return (
            <View key={day} style={[styles.streakDay, statusStyle]} />
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.nameText}>{profile?.name}</Text>
            <View style={styles.levelBadgeRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>LVL {profile?.level}</Text>
              </View>
              <Text style={styles.titleText}>{profile?.title}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.streak}🔥</Text>
                <Text style={styles.statLabel}>Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile?.xp}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>#{profile?.rank}</Text>
                <Text style={styles.statLabel}>Rank</Text>
              </View>
            </View>
          </View>
        </View>

        {/* XP Progress */}
        <View style={styles.xpProgressContainer}>
          <View style={styles.xpTextRow}>
            <Text style={styles.xpLevelText}>XP to Level {profile?.level + 1}</Text>
            <Text style={styles.xpPointsText}>{profile?.xp} / {(profile?.level * 500)}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(profile?.xp / (profile?.level * 500)) * 100}%` }]} />
          </View>
        </View>

        {/* Streak Section */}
        <View style={styles.streakSectionHeader}>
          <Text style={styles.sectionTitle}>30-DAY STREAK</Text>
          <Text style={styles.streakActiveText}>⚡ {profile?.streak} days active</Text>
        </View>
        <View style={styles.streakCard}>
          {renderStreakGrid()}
          
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendText}>Done</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.blockBackground, borderWidth: 1, borderColor: colors.border }]} />
              <Text style={styles.legendText}>Locked</Text>
            </View>
          </View>
        </View>

        {/* Certifications Section */}
        <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
        <View style={styles.certCard}>
          <View style={styles.certIconBg}>
            <Lock color={colors.textMuted} size={24} />
          </View>
          <View style={styles.certInfo}>
            <Text style={styles.certTitle}>Linux Competency Diploma</Text>
            <Text style={styles.certDesc}>Complete all 8 modules to unlock this certification.</Text>
            <View style={styles.certIdBox}>
              <Text style={styles.certIdText}>CREDENTIAL ID</Text>
            </View>
          </View>
        </View>
        
        <AccountSection name={profile?.name ?? ''} email={profile?.email ?? ''} onProfileChanged={fetchProfile} />
        <ThemeSelector />
        <SecuritySection />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  avatarText: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  profileInfo: {
    flex: 1,
  },
  nameText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  levelBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    marginRight: 8,
  },
  levelBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  titleText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  xpProgressContainer: {
    marginBottom: 30,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLevelText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  xpPointsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.cardLight,
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  streakSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  streakActiveText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  streakCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  streakDay: {
    width: '12%',
    aspectRatio: 1,
    borderRadius: 6,
  },
  streakDayActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  streakDayCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.text,
  },
  streakDayFuture: {
    backgroundColor: colors.blockBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  certCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  certIconBg: {
    backgroundColor: colors.cardLight,
    padding: 12,
    borderRadius: 12,
    marginRight: 15,
  },
  certInfo: {
    flex: 1,
  },
  certTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  certDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 15,
  },
  certIdBox: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  certIdText: {
    color: colors.border,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
