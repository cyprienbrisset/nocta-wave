'use client';

import React from 'react';
import { ChevronDown, Server, Shield, Code, Rocket, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string;
  isDefault: boolean;
  isProduction: boolean;
}

interface EnvironmentIndicatorProps {
  environments: Environment[];
  currentEnvironmentId: string;
  onEnvironmentChange: (environmentId: string) => void;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const environmentIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  dev: Code,
  development: Code,
  staging: Rocket,
  prod: Shield,
  production: Shield,
};

export function EnvironmentIndicator({
  environments,
  currentEnvironmentId,
  onEnvironmentChange,
  className,
  showLabel = true,
  size = 'default',
}: EnvironmentIndicatorProps) {
  const currentEnv = environments.find((e) => e.id === currentEnvironmentId);

  if (!currentEnv) {
    return null;
  }

  const Icon = environmentIcons[currentEnv.slug] || Server;

  const sizeClasses = {
    sm: 'h-7 text-xs gap-1.5 px-2',
    default: 'h-9 text-sm gap-2 px-3',
    lg: 'h-11 text-base gap-2.5 px-4',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    default: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'font-medium border-2 transition-all',
            sizeClasses[size],
            className
          )}
          style={{
            borderColor: currentEnv.color,
            backgroundColor: `${currentEnv.color}15`,
          }}
        >
          <span
            className={cn('rounded-full', iconSizes[size])}
            style={{ backgroundColor: currentEnv.color }}
          />
          {showLabel && (
            <span style={{ color: currentEnv.color }}>{currentEnv.name}</span>
          )}
          {currentEnv.isProduction && (
            <Badge
              variant="destructive"
              className="ml-1 px-1.5 py-0 text-[10px]"
            >
              PROD
            </Badge>
          )}
          <ChevronDown className={cn('text-muted-foreground', iconSizes[size])} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Select Environment</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {environments.map((env) => {
          const EnvIcon = environmentIcons[env.slug] || Server;
          const isSelected = env.id === currentEnvironmentId;

          return (
            <DropdownMenuItem
              key={env.id}
              onClick={() => onEnvironmentChange(env.id)}
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isSelected && 'bg-accent'
              )}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: env.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{env.name}</span>
                  {env.isDefault && (
                    <Badge variant="secondary" className="text-[10px] px-1">
                      Default
                    </Badge>
                  )}
                  {env.isProduction && (
                    <Badge variant="destructive" className="text-[10px] px-1">
                      Prod
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{env.slug}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for toolbars
interface EnvironmentBadgeProps {
  environment: Environment;
  className?: string;
}

export function EnvironmentBadge({ environment, className }: EnvironmentBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        className
      )}
      style={{
        backgroundColor: `${environment.color}20`,
        color: environment.color,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: environment.color }}
      />
      {environment.name}
      {environment.isProduction && (
        <Shield className="h-3 w-3" />
      )}
    </div>
  );
}

// Production warning banner
interface ProductionWarningProps {
  onDismiss?: () => void;
  className?: string;
}

export function ProductionWarning({ onDismiss, className }: ProductionWarningProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-2 bg-red-500/10 border-b border-red-500/20',
        className
      )}
    >
      <div className="flex items-center gap-2 text-red-500">
        <Shield className="h-4 w-4" />
        <span className="text-sm font-medium">
          You are working in the production environment. Changes will affect live workflows.
        </span>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          Dismiss
        </Button>
      )}
    </div>
  );
}

export default EnvironmentIndicator;
