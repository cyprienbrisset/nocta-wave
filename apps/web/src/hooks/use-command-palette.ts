'use client';

import { create } from 'zustand';
import type { CommandItem } from '@/components/command-palette';

interface CommandPaletteState {
  open: boolean;
  commands: CommandItem[];
  recentWorkflows: { id: string; name: string }[];

  // Actions
  setOpen: (open: boolean) => void;
  toggle: () => void;
  registerCommands: (commands: CommandItem[]) => void;
  unregisterCommands: (ids: string[]) => void;
  setRecentWorkflows: (workflows: { id: string; name: string }[]) => void;
  addRecentWorkflow: (workflow: { id: string; name: string }) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  open: false,
  commands: [],
  recentWorkflows: [],

  setOpen: (open) => set({ open }),

  toggle: () => set((state) => ({ open: !state.open })),

  registerCommands: (newCommands) => {
    set((state) => {
      // Remove duplicates by id
      const existingIds = new Set(state.commands.map((c) => c.id));
      const uniqueNew = newCommands.filter((c) => !existingIds.has(c.id));
      return { commands: [...state.commands, ...uniqueNew] };
    });
  },

  unregisterCommands: (ids) => {
    set((state) => ({
      commands: state.commands.filter((c) => !ids.includes(c.id)),
    }));
  },

  setRecentWorkflows: (workflows) => {
    set({ recentWorkflows: workflows.slice(0, 10) });
  },

  addRecentWorkflow: (workflow) => {
    set((state) => {
      // Remove if already exists
      const filtered = state.recentWorkflows.filter((w) => w.id !== workflow.id);
      // Add to front
      return {
        recentWorkflows: [workflow, ...filtered].slice(0, 10),
      };
    });
  },
}));

// Hook for components
export function useCommandPalette() {
  const store = useCommandPaletteStore();
  return {
    open: store.open,
    setOpen: store.setOpen,
    toggle: store.toggle,
    registerCommands: store.registerCommands,
    unregisterCommands: store.unregisterCommands,
  };
}
