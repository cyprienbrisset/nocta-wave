'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  ThemeMode,
  ThemeDefinition,
  themes,
  darkTheme,
  lightTheme,
  getTheme,
  applyTheme,
  getSystemThemePreference,
} from './themes';

interface ThemeContextValue {
  mode: ThemeMode;
  theme: ThemeDefinition;
  themes: ThemeDefinition[];
  setMode: (mode: ThemeMode) => void;
  setTheme: (themeId: string) => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-mode';
const THEME_ID_STORAGE_KEY = 'theme-id';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultThemeId?: string;
}

export function ThemeProvider({
  children,
  defaultMode = 'system',
  defaultThemeId = 'dark',
}: ThemeProviderProps) {
  const [mode, setModeState] = useState<ThemeMode>(defaultMode);
  const [themeId, setThemeId] = useState<string>(defaultThemeId);
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('dark');

  // Get the actual theme object
  const theme = getTheme(themeId) || darkTheme;

  // Resolve the actual mode based on system preference if mode is 'system'
  const resolveMode = useCallback((): 'light' | 'dark' => {
    if (mode === 'system') {
      return getSystemThemePreference();
    }
    return mode;
  }, [mode]);

  // Load saved preferences on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    const savedThemeId = localStorage.getItem(THEME_ID_STORAGE_KEY);

    if (savedMode) {
      setModeState(savedMode);
    }
    if (savedThemeId) {
      setThemeId(savedThemeId);
    }
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    const resolved = resolveMode();
    setResolvedMode(resolved);

    // Select the appropriate theme based on mode
    let activeTheme = theme;
    if (mode === 'system' || mode !== theme.mode) {
      // If mode doesn't match theme's mode, find a matching theme
      const matchingTheme = themes.find((t) => t.mode === resolved);
      if (matchingTheme) {
        activeTheme = matchingTheme;
      } else {
        activeTheme = resolved === 'dark' ? darkTheme : lightTheme;
      }
    }

    applyTheme(activeTheme);
  }, [mode, theme, resolveMode]);

  // Listen for system preference changes
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = resolveMode();
      setResolvedMode(resolved);
      const activeTheme = resolved === 'dark' ? darkTheme : lightTheme;
      applyTheme(activeTheme);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode, resolveMode]);

  // Update mode and persist
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  }, []);

  // Update theme and persist
  const setTheme = useCallback((newThemeId: string) => {
    const newTheme = getTheme(newThemeId);
    if (newTheme) {
      setThemeId(newThemeId);
      localStorage.setItem(THEME_ID_STORAGE_KEY, newThemeId);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme,
        themes,
        setMode,
        setTheme,
        resolvedMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
