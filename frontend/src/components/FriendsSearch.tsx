import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import FeedbackBanner from './FeedbackBanner';
import { SectionTitle, TextField } from './ui';

const SEARCH_DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 2;

interface FoundUser {
  id: number;
  name: string;
  xp: number;
  streak: number;
  isFollowing: boolean;
}

interface Props {
  /** Se llama tras seguir o dejar de seguir, para refrescar el ranking de amigos. */
  onFollowChange: () => void;
}

/** Busca usuarios por nombre y permite seguirlos o dejar de seguirlos. */
export default function FriendsSearch({ onFollowChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    const text = query.trim();
    if (text.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const found = await apiFetch<FoundUser[]>(`/users/search?q=${encodeURIComponent(text)}`);
        if (!cancelled) setResults(found);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Search failed.');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const toggleFollow = async (user: FoundUser) => {
    setPendingId(user.id);
    setError(null);
    try {
      await apiFetch(`/users/${user.id}/follow`, { method: user.isFollowing ? 'DELETE' : 'POST' });
      setResults((list) => list.map((u) => (u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u)));
      onFollowChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setPendingId(null);
    }
  };

  const showEmpty = query.trim().length >= MIN_QUERY_LENGTH && !searching && !error && results.length === 0;

  return (
    <View>
      <SectionTitle>FIND FRIENDS</SectionTitle>
      <TextField placeholder="search by name..." value={query} onChangeText={setQuery} autoCapitalize="none" />

      <View style={styles.list}>
        {searching && <ActivityIndicator color={colors.primary} />}
        {error && <FeedbackBanner type="error" message={error} />}
        {showEmpty && <Text style={styles.empty}>No users match "{query.trim()}".</Text>}

        {results.map((user) => (
          <View key={user.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.meta}>
                {user.xp} XP · {user.streak}🔥
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.followBtn, user.isFollowing && styles.followBtnActive]}
              onPress={() => toggleFollow(user)}
              disabled={pendingId === user.id}
            >
              {pendingId === user.id ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[styles.followText, user.isFollowing && styles.followTextActive]}>
                  {user.isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    list: { gap: 10, marginTop: 12 },
    empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      gap: 12,
    },
    info: { flex: 1 },
    name: { color: colors.text, fontSize: 15, fontWeight: 'bold' },
    meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    followBtn: {
      minWidth: 104,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    followBtnActive: { backgroundColor: colors.primarySoft },
    followText: { color: colors.primary, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    followTextActive: { color: colors.textMuted },
  });
