import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import FeedbackBanner from '../components/FeedbackBanner';
import FriendsSearch from '../components/FriendsSearch';

type Scope = 'all' | 'friends';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Trophy } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import { apiFetch } from '../services/api';

export default function LeadersScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setError(null);
      setLeaders(await apiFetch<any[]>(`/users/leaderboard?scope=${scope}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard])
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Trophy color={colors.primary} size={24} />
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>
      <View style={styles.scopeRow}>
        {(['all', 'friends'] as Scope[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.scopeBtn, scope === option && styles.scopeBtnActive]}
            onPress={() => setScope(option)}
          >
            <Text style={[styles.scopeText, scope === option && styles.scopeTextActive]}>
              {option === 'all' ? 'EVERYONE' : 'FRIENDS'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.listContainer}>
        {error && <FeedbackBanner type="error" message={error} />}
        {!error && scope === 'friends' && leaders.length <= 1 && (
          <Text style={styles.empty}>You are not following anyone yet. Search for friends below.</Text>
        )}
        {leaders.map((user) => (
          <View 
            key={user.id} 
            style={[styles.userCard, user.isYou && styles.userCardActive]}
          >
            <View style={styles.rankContainer}>
              {user.medal ? (
                <Text style={styles.medalText}>{user.medal}</Text>
              ) : (
                <Text style={[styles.rankText, user.isYou && { color: colors.primary }]}>#{user.rank}</Text>
              )}
            </View>
            
            <View style={styles.userInfo}>
              <Text style={[styles.userName, user.isYou && { color: colors.primary }]}>
                {user.name} {user.isYou && <Text style={styles.youBadge}>• YOU</Text>}
              </Text>
              <Text style={styles.streakText}>
                {user.streak}🔥 streak
              </Text>
            </View>

            <Text style={[styles.xpText, user.isYou && { color: colors.primary }]}>
              {user.xp} XP
            </Text>
          </View>
        ))}

        <FriendsSearch onFollowChange={fetchLeaderboard} />
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
    paddingTop: 20,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  scopeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  scopeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  scopeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scopeTextActive: {
    color: colors.primary,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 10,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 30,
  },
  listContainer: {
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  medalText: {
    fontSize: 20,
  },
  rankText: {
    color: colors.textMuted,
    fontWeight: 'bold',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  youBadge: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: 'normal',
  },
  streakText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  xpText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  }
});
