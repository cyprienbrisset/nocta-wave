'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Search,
  FileText,
  Play,
  Settings,
  Plus,
  Save,
  Undo,
  Redo,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  MessageSquare,
  GitBranch,
  FolderOpen,
  Star,
  Clock,
  Terminal,
  Keyboard,
  Palette,
  Users,
  Bell,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { formatKeys } from '@/lib/keyboard/types';
import { DEFAULT_SHORTCUTS, CATEGORY_LABELS } from '@/lib/keyboard/default-shortcuts';
import { cn } from '@/lib/utils';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string[];
  category: 'action' | 'navigation' | 'node' | 'recent' | 'help';
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands?: CommandItem[];
  recentWorkflows?: { id: string; name: string }[];
  onAddNode?: (nodeType: string) => void;
}

// Default commands
const getDefaultCommands = (
  router: ReturnType<typeof useRouter>,
  onClose: () => void
): CommandItem[] => [
  // Navigation
  {
    id: 'nav.workflows',
    label: 'Go to Workflows',
    description: 'View all workflows',
    icon: FileText,
    category: 'navigation',
    action: () => {
      router.push('/workflows');
      onClose();
    },
    keywords: ['workflow', 'list', 'all'],
  },
  {
    id: 'nav.templates',
    label: 'Go to Templates',
    description: 'Browse template gallery',
    icon: LayoutGrid,
    category: 'navigation',
    action: () => {
      router.push('/templates');
      onClose();
    },
    keywords: ['template', 'gallery', 'marketplace'],
  },
  {
    id: 'nav.settings',
    label: 'Go to Settings',
    description: 'Open settings',
    icon: Settings,
    category: 'navigation',
    action: () => {
      router.push('/settings');
      onClose();
    },
    keywords: ['settings', 'preferences', 'config'],
  },
  {
    id: 'nav.shortcuts',
    label: 'Keyboard Shortcuts',
    description: 'View and customize shortcuts',
    icon: Keyboard,
    category: 'navigation',
    action: () => {
      router.push('/settings/shortcuts');
      onClose();
    },
    keywords: ['keyboard', 'shortcut', 'hotkey'],
  },
  {
    id: 'nav.theme',
    label: 'Theme Settings',
    description: 'Change appearance',
    icon: Palette,
    category: 'navigation',
    action: () => {
      router.push('/settings/appearance');
      onClose();
    },
    keywords: ['theme', 'dark', 'light', 'appearance'],
  },
  {
    id: 'nav.team',
    label: 'Team Settings',
    description: 'Manage team members',
    icon: Users,
    category: 'navigation',
    action: () => {
      router.push('/settings/team');
      onClose();
    },
    keywords: ['team', 'members', 'invite'],
  },
  {
    id: 'nav.notifications',
    label: 'Notifications',
    description: 'View notifications',
    icon: Bell,
    category: 'navigation',
    action: () => {
      router.push('/notifications');
      onClose();
    },
    keywords: ['notifications', 'alerts', 'inbox'],
  },

  // Help
  {
    id: 'help.docs',
    label: 'Documentation',
    description: 'Open documentation',
    icon: HelpCircle,
    category: 'help',
    action: () => {
      window.open('/docs', '_blank');
      onClose();
    },
    keywords: ['help', 'docs', 'documentation'],
  },
];

// Node types available for adding
const NODE_TYPES = [
  { type: 'trigger.webhook', label: 'Webhook Trigger', icon: Terminal },
  { type: 'trigger.cron', label: 'Cron Trigger', icon: Clock },
  { type: 'http.request', label: 'HTTP Request', icon: FileText },
  { type: 'transform.map', label: 'Map Transform', icon: FileText },
  { type: 'transform.filter', label: 'Filter Transform', icon: FileText },
  { type: 'logic.condition', label: 'Condition', icon: GitBranch },
  { type: 'logic.switch', label: 'Switch', icon: GitBranch },
];

export function CommandPalette({
  open,
  onOpenChange,
  commands: externalCommands = [],
  recentWorkflows = [],
  onAddNode,
}: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const onClose = useCallback(() => {
    onOpenChange(false);
    setSearch('');
  }, [onOpenChange]);

  const defaultCommands = useMemo(
    () => getDefaultCommands(router, onClose),
    [router, onClose]
  );

  // Combine all commands
  const allCommands = useMemo(() => {
    const combined = [...defaultCommands, ...externalCommands];

    // Add recent workflows
    recentWorkflows.slice(0, 5).forEach((workflow) => {
      combined.push({
        id: `recent.${workflow.id}`,
        label: workflow.name,
        description: 'Recent workflow',
        icon: Clock,
        category: 'recent',
        action: () => {
          router.push(`/workflows/${workflow.id}`);
          onClose();
        },
        keywords: [workflow.name.toLowerCase()],
      });
    });

    // Add node creation commands if handler provided
    if (onAddNode) {
      NODE_TYPES.forEach((node) => {
        combined.push({
          id: `node.${node.type}`,
          label: `Add ${node.label}`,
          description: `Add a ${node.label} node`,
          icon: node.icon,
          category: 'node',
          action: () => {
            onAddNode(node.type);
            onClose();
          },
          keywords: [node.label.toLowerCase(), node.type.toLowerCase(), 'add', 'create', 'node'],
        });
      });
    }

    return combined;
  }, [defaultCommands, externalCommands, recentWorkflows, onAddNode, router, onClose]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return allCommands;

    const searchLower = search.toLowerCase();
    return allCommands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(searchLower);
      const matchDescription = cmd.description?.toLowerCase().includes(searchLower);
      const matchKeywords = cmd.keywords?.some((k) => k.includes(searchLower));
      return matchLabel || matchDescription || matchKeywords;
    });
  }, [allCommands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      recent: [],
      action: [],
      navigation: [],
      node: [],
      help: [],
    };

    filteredCommands.forEach((cmd) => {
      const group = groups[cmd.category];
      if (group) {
        group.push(cmd);
      }
    });

    return groups;
  }, [filteredCommands]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const categoryLabels: Record<string, string> = {
    recent: 'Recent',
    action: 'Actions',
    navigation: 'Navigation',
    node: 'Add Node',
    help: 'Help',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              ref={inputRef}
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[400px]">
            <CommandEmpty>No results found.</CommandEmpty>

            {Object.entries(groupedCommands).map(([category, items]) => {
              if (items.length === 0) return null;

              return (
                <React.Fragment key={category}>
                  <CommandGroup heading={categoryLabels[category]}>
                    {items.map((cmd) => (
                      <CommandItem
                        key={cmd.id}
                        onSelect={cmd.action}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {cmd.icon && <cmd.icon className="h-4 w-4 text-muted-foreground" />}
                          <div>
                            <div className="font-medium">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs text-muted-foreground">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {cmd.shortcut && (
                          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            {formatKeys(cmd.shortcut)}
                          </kbd>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </React.Fragment>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
