import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/colors';
import AdminChallenges from '../components/AdminChallenges';
import AdminUsers from '../components/AdminUsers';

type Section = 'challenges' | 'users';

/** Panel de administración (solo se muestra a usuarios con rol admin; el backend lo vuelve a exigir). */
export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [section, setSection] = useState<Section>('challenges');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerSub}>ADMIN PANEL</Text>
      <Text style={styles.headerTitle}>Manage LINEDU</Text>

      <View style={styles.tabs}>
        {(['challenges', 'users'] as Section[]).map((key) => (
          <TouchableOpacity key={key} style={[styles.tab, section === key && styles.tabActive]} onPress={() => setSection(key)}>
            <Text style={[styles.tabText, section === key && styles.tabTextActive]}>{key.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        {section === 'challenges' ? <AdminChallenges /> : <AdminUsers />}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 10 },
    headerSub: { color: colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginTop: 10 },
    headerTitle: { color: colors.text, fontSize: 26, fontWeight: 'bold', marginBottom: 14 },
    tabs: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    tabActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    tabText: { color: colors.textMuted, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    tabTextActive: { color: colors.primary },
    content: { paddingBottom: 40 },
  });
