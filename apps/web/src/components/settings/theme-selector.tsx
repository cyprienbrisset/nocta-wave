'use client';

import React from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/themes/theme-provider';
import { ThemeMode, ThemeDefinition } from '@/lib/themes/themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { mode, setMode, resolvedMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          {resolvedMode === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMode('light')}>
          <Sun className="h-4 w-4 mr-2" />
          Light
          {mode === 'light' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode('dark')}>
          <Moon className="h-4 w-4 mr-2" />
          Dark
          {mode === 'dark' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode('system')}>
          <Monitor className="h-4 w-4 mr-2" />
          System
          {mode === 'system' && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ThemeModeRadioProps {
  className?: string;
}

export function ThemeModeRadio({ className }: ThemeModeRadioProps) {
  const { mode, setMode } = useTheme();

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-base">Appearance</Label>
      <RadioGroup
        value={mode}
        onValueChange={(value) => setMode(value as ThemeMode)}
        className="grid grid-cols-3 gap-4"
      >
        <div>
          <RadioGroupItem
            value="light"
            id="light"
            className="peer sr-only"
          />
          <Label
            htmlFor="light"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <Sun className="mb-3 h-6 w-6" />
            Light
          </Label>
        </div>
        <div>
          <RadioGroupItem
            value="dark"
            id="dark"
            className="peer sr-only"
          />
          <Label
            htmlFor="dark"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <Moon className="mb-3 h-6 w-6" />
            Dark
          </Label>
        </div>
        <div>
          <RadioGroupItem
            value="system"
            id="system"
            className="peer sr-only"
          />
          <Label
            htmlFor="system"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
          >
            <Monitor className="mb-3 h-6 w-6" />
            System
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

interface ThemeColorPickerProps {
  className?: string;
}

export function ThemeColorPicker({ className }: ThemeColorPickerProps) {
  const { theme, themes, setTheme, resolvedMode } = useTheme();

  // Filter themes by current mode
  const availableThemes = themes.filter((t) => t.mode === resolvedMode);

  return (
    <div className={cn('space-y-4', className)}>
      <Label className="text-base">Accent Color</Label>
      <div className="grid grid-cols-5 gap-2">
        {availableThemes.map((t) => (
          <ThemeColorButton
            key={t.id}
            theme={t}
            isSelected={theme.id === t.id}
            onClick={() => setTheme(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface ThemeColorButtonProps {
  theme: ThemeDefinition;
  isSelected: boolean;
  onClick: () => void;
}

function ThemeColorButton({ theme, isSelected, onClick }: ThemeColorButtonProps) {
  // Extract the primary color
  const primaryColor = `hsl(${theme.colors.primary})`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-10 h-10 rounded-full border-2 transition-all',
        isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:border-muted'
      )}
      style={{ backgroundColor: primaryColor }}
      title={theme.name}
    >
      {isSelected && (
        <Check className="absolute inset-0 m-auto h-5 w-5 text-primary-foreground" />
      )}
    </button>
  );
}

interface FullThemeSettingsProps {
  className?: string;
}

export function FullThemeSettings({ className }: FullThemeSettingsProps) {
  return (
    <div className={cn('space-y-8', className)}>
      <ThemeModeRadio />
      <ThemeColorPicker />
    </div>
  );
}

export default ThemeSelector;
