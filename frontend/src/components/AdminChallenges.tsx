import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import FeedbackBanner, { FeedbackType } from './FeedbackBanner';
import { AppButton, TextField } from './ui';

interface Challenge {
  id: number;
  instruction: string;
  validRegex: string;
  blocks: string[];
  xpReward: number;
}

interface FormState {
  id: number | null; // null = alta
  instruction: string;
  validRegex: string;
  blocks: string; // separados por coma
  xpReward: string;
}

const EMPTY_FORM: FormState = { id: null, instruction: '', validRegex: '', blocks: '', xpReward: '10' };

const toForm = (c: Challenge): FormState => ({
  id: c.id,
  instruction: c.instruction,
  validRegex: c.validRegex,
  blocks: c.blocks.join(', '),
  xpReward: String(c.xpReward),
});

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.');

/** ABM de retos: consulta, alta, modificación y baja. Los permisos los exige el backend. */
export default function AdminChallenges() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: FeedbackType; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await apiFetch<Challenge[]>('/admin/challenges'));
    } catch (e) {
      setNotice({ type: 'error', message: errorText(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    const blocks = form.blocks.split(',').map((b) => b.trim()).filter(Boolean);
    const xpReward = Number(form.xpReward);

    if (!form.instruction.trim()) return setNotice({ type: 'error', message: 'Write the instruction.' });
    if (!form.validRegex) return setNotice({ type: 'error', message: 'Write the validation regex.' });
    if (blocks.length < 2) return setNotice({ type: 'error', message: 'Add at least 2 blocks, separated by commas.' });
    if (!Number.isInteger(xpReward) || xpReward < 1) return setNotice({ type: 'error', message: 'XP must be a whole number.' });

    setBusy(true);
    setNotice(null);
    try {
      const body = { instruction: form.instruction.trim(), validRegex: form.validRegex, blocks, xpReward };
      await apiFetch(form.id === null ? '/admin/challenges' : `/admin/challenges/${form.id}`, {
        method: form.id === null ? 'POST' : 'PUT',
        body,
      });
      setNotice({ type: 'success', message: form.id === null ? 'Challenge created.' : 'Challenge updated.' });
      setForm(null);
      await load();
    } catch (e) {
      setNotice({ type: 'error', message: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    setNotice(null);
    try {
      await apiFetch(`/admin/challenges/${id}`, { method: 'DELETE' });
      setConfirmDeleteId(null);
      setNotice({ type: 'success', message: 'Challenge deleted.' });
      await load();
    } catch (e) {
      setNotice({ type: 'error', message: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const update = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;

  return (
    <View style={styles.wrap}>
      {notice && <FeedbackBanner type={notice.type} message={notice.message} />}

      {form ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{form.id === null ? 'NEW CHALLENGE' : `EDIT CHALLENGE #${form.id}`}</Text>
          <TextField placeholder="instruction (what the student must do)" value={form.instruction} onChangeText={(t) => update({ instruction: t })} autoCapitalize="sentences" multiline />
          <TextField placeholder="validation regex, e.g. ^ls -la$" value={form.validRegex} onChangeText={(t) => update({ validRegex: t })} autoCorrect={false} />
          <TextField placeholder="blocks: correct ones + distractors, comma separated" value={form.blocks} onChangeText={(t) => update({ blocks: t })} autoCorrect={false} multiline />
          <TextField placeholder="XP reward" value={form.xpReward} onChangeText={(t) => update({ xpReward: t })} keyboardType="number-pad" />
          <Text style={styles.hint}>
            The student's blocks are joined with spaces and checked against the regex, so ^ls -la$ accepts the blocks "ls" then "-la".
          </Text>
          <AppButton label={form.id === null ? 'CREATE' : 'SAVE CHANGES'} onPress={save} busy={busy} />
          <AppButton label="CANCEL" onPress={() => { setForm(null); setNotice(null); }} tone="outline" disabled={busy} />
        </View>
      ) : (
        <AppButton label="+ NEW CHALLENGE" onPress={() => { setForm(EMPTY_FORM); setNotice(null); }} />
      )}

      {items.length === 0 && <Text style={styles.empty}>There are no challenges yet.</Text>}

      {items.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardLabel}>
            #{c.id} · {c.xpReward} XP
          </Text>
          <Text style={styles.instruction}>{c.instruction}</Text>
          <Text style={styles.mono}>{c.validRegex}</Text>
          <Text style={styles.meta}>{c.blocks.join(' · ')}</Text>

          {confirmDeleteId === c.id ? (
            <View style={styles.actions}>
              <View style={styles.action}>
                <AppButton label="CONFIRM DELETE" onPress={() => remove(c.id)} tone="danger" busy={busy} />
              </View>
              <View style={styles.action}>
                <AppButton label="KEEP" onPress={() => setConfirmDeleteId(null)} tone="outline" disabled={busy} />
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <View style={styles.action}>
                <AppButton label="EDIT" onPress={() => { setForm(toForm(c)); setNotice(null); }} tone="outline" disabled={busy} />
              </View>
              <View style={styles.action}>
                <AppButton label="DELETE" onPress={() => setConfirmDeleteId(c.id)} tone="danger" disabled={busy} />
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { gap: 14 },
    loader: { marginTop: 40 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 10 },
    cardLabel: { color: colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
    instruction: { color: colors.text, fontSize: 15, lineHeight: 21 },
    mono: { color: colors.textMuted, fontFamily: 'monospace', fontSize: 12 },
    meta: { color: colors.textMuted, fontSize: 12 },
    hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
    empty: { color: colors.textMuted, textAlign: 'center', paddingVertical: 12 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    action: { flex: 1 },
  });
