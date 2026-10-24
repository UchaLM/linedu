import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BookOpen, Flame, Trophy, Users } from 'lucide-react-native';
import { apiFetch } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import FeedbackBanner from '../components/FeedbackBanner';
import { AppButton } from '../components/ui';

const XP_PER_LEVEL = 500;

interface Profile {
  name: string;
  level: number;
  title: string;
  streak: number;
  xp: number;
  rank: number;
  followers: number;
  following: number;
}

/** Pantalla principal: resumen de progreso y accesos rápidos. */
export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [challengeCount, setChallengeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [me, challenges] = await Promise.all([
        apiFetch<Profile>('/users/profile'),
        apiFetch<unknown[]>('/challenges/1'),
      ]);
      setProfile(me);
      setChallengeCount(challenges.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <View style={styles.errorBox}>
          <FeedbackBanner type="error" message={error ?? 'Could not load your summary.'} />
          <AppButton label="RETRY" onPress={() => { setLoading(true); load(); }} />
        </View>
      </SafeAreaView>
    );
  }

  const levelGoal = profile.level * XP_PER_LEVEL;
  const progress = Math.min(profile.xp / levelGoal, 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.greetingSub}>WELCOME BACK</Text>
        <Text style={styles.greeting}>{profile.name}</Text>
        <Text style={styles.title}>
          LVL {profile.level} · {profile.title}
        </Text>

        {error && <FeedbackBanner type="error" message={error} />}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Flame color={colors.primary} size={20} />
            <Text style={styles.statValue}>{profile.streak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={styles.statCard}>
            <BookOpen color={colors.primary} size={20} />
            <Text style={styles.statValue}>{profile.xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy color={colors.primary} size={20} />
            <Text style={styles.statValue}>#{profile.rank}</Text>
            <Text style={styles.statLabel}>Ranking</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardLabel}>NEXT LEVEL</Text>
            <Text style={styles.cardMeta}>
              {profile.xp} / {levelGoal} XP
            </Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>TODAY'S LESSON</Text>
          <Text style={styles.cardText}>
            {challengeCount} command challenge{challengeCount === 1 ? '' : 's'} ready. Finish them all to keep your streak alive.
          </Text>
          <AppButton label="CONTINUE LEARNING" onPress={() => navigation.navigate('Learn')} />
        </View>

        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <Users color={colors.textMuted} size={18} />
            <Text style={[styles.cardMeta, styles.fill]}>
              {profile.following} following · {profile.followers} followers
            </Text>
          </View>
          <AppButton label="SEE THE LEADERBOARD" onPress={() => navigation.navigate('Leaders')} tone="outline" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 10 },
    centered: { justifyContent: 'center', alignItems: 'center' },
    content: { gap: 16, paddingBottom: 30 },
    errorBox: { gap: 16, width: '100%' },
    greetingSub: { color: colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginTop: 10 },
    greeting: { color: colors.text, fontSize: 28, fontWeight: 'bold' },
    title: { color: colors.textMuted, fontSize: 14 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingVertical: 18,
    },
    statValue: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
    statLabel: { color: colors.textMuted, fontSize: 11 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 18, gap: 12 },
    cardLabel: { color: colors.textMuted, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    cardMeta: { color: colors.textMuted, fontSize: 12 },
    cardText: { color: colors.text, fontSize: 15, lineHeight: 22 },
    progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    fill: { flex: 1 },
    progressBg: { height: 6, backgroundColor: colors.cardLight, borderRadius: 3 },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  });
