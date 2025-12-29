import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FavoriteWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isActive: boolean;
  updatedAt: Date;
  team: {
    id: string;
    name: string;
  };
  isFavorite: boolean;
}

export interface RecentWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: Date;
  accessedAt: Date;
  team: {
    id: string;
    name: string;
  };
}

interface FavoritesState {
  favorites: FavoriteWorkflow[];
  recentWorkflows: RecentWorkflow[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setFavorites: (favorites: FavoriteWorkflow[]) => void;
  setRecentWorkflows: (workflows: RecentWorkflow[]) => void;
  addFavorite: (workflow: FavoriteWorkflow) => void;
  removeFavorite: (workflowId: string) => void;
  toggleFavorite: (workflowId: string) => boolean;
  isFavorite: (workflowId: string) => boolean;
  addRecentWorkflow: (workflow: RecentWorkflow) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recentWorkflows: [],
      favoriteIds: new Set(),
      isLoading: false,
      error: null,

      setFavorites: (favorites) => {
        set({
          favorites,
          favoriteIds: new Set(favorites.map((f) => f.id)),
        });
      },

      setRecentWorkflows: (workflows) => {
        set({ recentWorkflows: workflows });
      },

      addFavorite: (workflow) => {
        const { favorites, favoriteIds } = get();
        if (favoriteIds.has(workflow.id)) return;

        const newFavorites = [workflow, ...favorites];
        const newIds = new Set(favoriteIds);
        newIds.add(workflow.id);

        set({
          favorites: newFavorites,
          favoriteIds: newIds,
        });
      },

      removeFavorite: (workflowId) => {
        const { favorites, favoriteIds } = get();
        const newFavorites = favorites.filter((f) => f.id !== workflowId);
        const newIds = new Set(favoriteIds);
        newIds.delete(workflowId);

        set({
          favorites: newFavorites,
          favoriteIds: newIds,
        });
      },

      toggleFavorite: (workflowId) => {
        const { favoriteIds } = get();
        const isFav = favoriteIds.has(workflowId);

        if (isFav) {
          get().removeFavorite(workflowId);
        }

        return !isFav;
      },

      isFavorite: (workflowId) => {
        return get().favoriteIds.has(workflowId);
      },

      addRecentWorkflow: (workflow) => {
        const { recentWorkflows } = get();
        // Remove if already exists
        const filtered = recentWorkflows.filter((w) => w.id !== workflow.id);
        // Add to start
        const newRecent = [workflow, ...filtered].slice(0, 10);
        set({ recentWorkflows: newRecent });
      },

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      clearAll: () => {
        set({
          favorites: [],
          recentWorkflows: [],
          favoriteIds: new Set(),
          error: null,
        });
      },
    }),
    {
      name: 'favorites-storage',
      partialize: (state) => ({
        favorites: state.favorites,
        recentWorkflows: state.recentWorkflows,
      }),
    }
  )
);
