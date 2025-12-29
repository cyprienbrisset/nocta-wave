'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { KeyboardShortcuts } from '@/lib/keyboard/types';

export type Theme = 'dark' | 'light' | 'system';

export interface EditorSettings {
  showMinimap: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  animateEdges: boolean;
  showConnectionLine: boolean;
}

export interface NotificationSettings {
  mentions: boolean;
  comments: boolean;
  suggestions: boolean;
  workflowShared: boolean;
  templateRated: boolean;
  sound: boolean;
}

interface PreferencesState {
  // Keyboard shortcuts
  keyboardShortcuts: KeyboardShortcuts;

  // Theme
  theme: Theme;

  // Editor settings
  editorSettings: EditorSettings;

  // Notification settings
  notificationSettings: NotificationSettings;

  // Actions
  setKeyboardShortcut: (shortcutId: string, keys: string[]) => void;
  resetKeyboardShortcut: (shortcutId: string) => void;
  resetAllKeyboardShortcuts: () => void;

  setTheme: (theme: Theme) => void;

  setEditorSetting: <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => void;
  resetEditorSettings: () => void;

  setNotificationSetting: <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => void;
  resetNotificationSettings: () => void;

  // Sync with server
  loadFromServer: (data: Partial<PreferencesState>) => void;
  getForServer: () => {
    keyboardShortcuts: KeyboardShortcuts;
    theme: Theme;
    editorSettings: EditorSettings;
    notificationSettings: NotificationSettings;
  };
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  showMinimap: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 20,
  animateEdges: true,
  showConnectionLine: true,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  mentions: true,
  comments: true,
  suggestions: true,
  workflowShared: true,
  templateRated: true,
  sound: true,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      keyboardShortcuts: {},
      theme: 'dark',
      editorSettings: DEFAULT_EDITOR_SETTINGS,
      notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,

      // Keyboard shortcuts
      setKeyboardShortcut: (shortcutId, keys) => {
        set((state) => ({
          keyboardShortcuts: {
            ...state.keyboardShortcuts,
            [shortcutId]: keys,
          },
        }));
      },

      resetKeyboardShortcut: (shortcutId) => {
        set((state) => {
          const { [shortcutId]: _, ...rest } = state.keyboardShortcuts;
          return { keyboardShortcuts: rest };
        });
      },

      resetAllKeyboardShortcuts: () => {
        set({ keyboardShortcuts: {} });
      },

      // Theme
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof document !== 'undefined') {
          const root = document.documentElement;
          root.classList.remove('dark', 'light');

          if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(prefersDark ? 'dark' : 'light');
          } else {
            root.classList.add(theme);
          }
        }
      },

      // Editor settings
      setEditorSetting: (key, value) => {
        set((state) => ({
          editorSettings: {
            ...state.editorSettings,
            [key]: value,
          },
        }));
      },

      resetEditorSettings: () => {
        set({ editorSettings: DEFAULT_EDITOR_SETTINGS });
      },

      // Notification settings
      setNotificationSetting: (key, value) => {
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            [key]: value,
          },
        }));
      },

      resetNotificationSettings: () => {
        set({ notificationSettings: DEFAULT_NOTIFICATION_SETTINGS });
      },

      // Server sync
      loadFromServer: (data) => {
        set((state) => ({
          keyboardShortcuts: data.keyboardShortcuts ?? state.keyboardShortcuts,
          theme: data.theme ?? state.theme,
          editorSettings: data.editorSettings ?? state.editorSettings,
          notificationSettings: data.notificationSettings ?? state.notificationSettings,
        }));
      },

      getForServer: () => {
        const state = get();
        return {
          keyboardShortcuts: state.keyboardShortcuts,
          theme: state.theme,
          editorSettings: state.editorSettings,
          notificationSettings: state.notificationSettings,
        };
      },
    }),
    {
      name: 'ws-flows-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        keyboardShortcuts: state.keyboardShortcuts,
        theme: state.theme,
        editorSettings: state.editorSettings,
        notificationSettings: state.notificationSettings,
      }),
    }
  )
);
