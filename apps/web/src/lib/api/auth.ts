import { api } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  message: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
  teamMemberships: Array<{
    id: string;
    role: string;
    team: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export const authApi = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    api.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    return response;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    api.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
    api.setToken(null);
    localStorage.removeItem('refreshToken');
  },

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await api.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    api.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    return response;
  },

  async getMe(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },
};
