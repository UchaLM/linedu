import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import FeedbackBanner, { FeedbackType } from './FeedbackBanner';
import { AppButton } from './ui';

interface ManagedUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  xp: number;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

/** Gestión de usuarios para el administrador: ver, cambiar el rol y eliminar. */
export default function AdminUsers() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user: me } = useAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: FeedbackType; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await apiFetch<ManagedUser[]>('/admin/users'));
    } catch (e) {
      setNotice({ type: 'error', message: errorText(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: number, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    setNotice(null);
    try {
      await action();
      setConfirmDeleteId(null);
      setNotice({ type: 'success', message: success });
      await load();
    } catch (e) {
      setNotice({ type: 'error', message: errorText(e) });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;

  return (
    <View style={styles.wrap}>
      {notice && <FeedbackBanner type={notice.type} message={notice.message} />}

      {users.map((u) => {
        const isMe = u.id === me?.id;
        const busy = busyId === u.id;
        const nextRole = u.role === 'admin' ? 'user' : 'admin';

        return (
          <View key={u.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name}>{u.name}</Text>
              <Text style={[styles.badge, u.role === 'admin' && styles.badgeAdmin]}>{u.role.toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>
              {u.email} · {u.xp} XP
            </Text>

            {isMe ? (
              <Text style={styles.meta}>This is you.</Text>
            ) : confirmDeleteId === u.id ? (
              <View style={styles.actions}>
                <View style={styles.action}>
                  <AppButton label="CONFIRM DELETE" tone="danger" busy={busy} onPress={() => run(u.id, () => apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' }), 'User deleted.')} />
                </View>
                <View style={styles.action}>
                  <AppButton label="KEEP" tone="outline" disabled={busy} onPress={() => setConfirmDeleteId(null)} />
                </View>
              </View>
            ) : (
              <View style={styles.actions}>
                <View style={styles.action}>
                  <AppButton
                    label={`MAKE ${nextRole.toUpperCase()}`}
                    tone="outline"
                    busy={busy}
                    onPress={() => run(u.id, () => apiFetch(`/admin/users/${u.id}/role`, { method: 'PUT', body: { role: nextRole } }), `${u.name} is now ${nextRole}.`)}
                  />
                </View>
                <View style={styles.action}>
                  <AppButton label="DELETE" tone="danger" disabled={busy} onPress={() => setConfirmDeleteId(u.id)} />
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: 12 },
    loader: { marginTop: 40 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    name: { color: colors.text, fontSize: 16, fontWeight: 'bold', flex: 1 },
    meta: { color: colors.textMuted, fontSize: 12 },
    badge: {
      color: colors.textMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 1,
    },
    badgeAdmin: { color: colors.primary, borderColor: colors.primary },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    action: { flex: 1 },
  });
