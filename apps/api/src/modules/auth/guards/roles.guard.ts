import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TeamRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<TeamRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.currentRole as TeamRole;

    if (!userRole) {
      throw new ForbiddenException('User has no role in current team');
    }

    // Check role hierarchy
    const roleHierarchy: TeamRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const hasRequiredRole = requiredRoles.some(
      (role) => roleHierarchy.indexOf(role) >= userRoleIndex,
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
