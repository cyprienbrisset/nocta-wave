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
  message: string;
  expiresIn: number;
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
    // Tokens are set as HTTP-only cookies by the server
    return api.post<AuthResponse>('/auth/login', data);
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Tokens are set as HTTP-only cookies by the server
    return api.post<AuthResponse>('/auth/register', data);
  },

  async logout(): Promise<void> {
    // Server will clear cookies
    await api.post('/auth/logout', {});
  },

  async refreshToken(): Promise<AuthResponse> {
    // Refresh token is sent via HTTP-only cookie
    return api.post<AuthResponse>('/auth/refresh', {});
  },

  async getMe(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },
};
