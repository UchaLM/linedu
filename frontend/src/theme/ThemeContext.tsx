import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, Palette } from './colors';
import { getItem, setItem } from '../services/storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'linedu.theme';
const MODES: ThemeMode[] = ['system', 'light', 'dark'];

interface ThemeContextValue {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    getItem(THEME_KEY).then((saved) => {
      if (saved && MODES.includes(saved as ThemeMode)) setModeState(saved as ThemeMode);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setItem(THEME_KEY, next);
  }, []);

  // Sin preferencia del sistema se usa el tema oscuro, que es la identidad de la app.
  const isDark = mode === 'system' ? systemScheme !== 'light' : mode === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ colors: isDark ? darkColors : lightColors, isDark, mode, setMode }),
    [isDark, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
