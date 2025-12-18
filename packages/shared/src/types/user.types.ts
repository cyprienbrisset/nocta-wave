// User and Team Types

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithTeam extends User {
  team: Team;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  user: Omit<User, 'createdAt' | 'updatedAt'>;
  team: Pick<Team, 'id' | 'name' | 'slug'>;
}

export interface AuthResponse extends AuthTokens {
  user: AuthUser['user'];
  team: AuthUser['team'];
}

export interface JwtPayload {
  sub: string; // userId
  email: string;
  teamId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
