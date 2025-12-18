import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User } from '@/lib/api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentTeamId: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setCurrentTeam: (teamId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      currentTeamId: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          await authApi.login({ email, password });
          const user = await authApi.getMe();
          const defaultTeamId = user.teamMemberships[0]?.team.id || null;
          set({
            user,
            isAuthenticated: true,
            currentTeamId: defaultTeamId,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name?: string) => {
        set({ isLoading: true });
        try {
          await authApi.register({ email, password, name });
          const user = await authApi.getMe();
          const defaultTeamId = user.teamMemberships[0]?.team.id || null;
          set({
            user,
            isAuthenticated: true,
            currentTeamId: defaultTeamId,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore errors during logout
        }
        set({
          user: null,
          isAuthenticated: false,
          currentTeamId: null,
        });
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          const user = await authApi.getMe();
          const { currentTeamId } = get();
          const validTeamId =
            currentTeamId &&
            user.teamMemberships.some((m) => m.team.id === currentTeamId)
              ? currentTeamId
              : user.teamMemberships[0]?.team.id || null;
          set({
            user,
            isAuthenticated: true,
            currentTeamId: validTeamId,
            isLoading: false,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      setCurrentTeam: (teamId: string) => {
        set({ currentTeamId: teamId });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ currentTeamId: state.currentTeamId }),
    },
  ),
);
