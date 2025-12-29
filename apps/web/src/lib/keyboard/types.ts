export type ShortcutCategory =
  | 'edit'
  | 'navigation'
  | 'view'
  | 'debug'
  | 'collaboration'
  | 'file'
  | 'custom';

export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  label: string;
  description: string;
  defaultKeys: string[];
  action: () => void;
  when?: () => boolean; // Condition for when shortcut is active
  global?: boolean; // Works across all contexts
}

export interface ShortcutBinding {
  id: string;
  keys: string[];
}

export interface KeyboardShortcuts {
  [shortcutId: string]: string[];
}

export interface KeyCombo {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export function parseKeys(keys: string[]): KeyCombo {
  const combo: KeyCombo = { key: '' };

  for (const k of keys) {
    const lower = k.toLowerCase();
    if (lower === 'ctrl' || lower === 'control') {
      combo.ctrl = true;
    } else if (lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === '⌘') {
      combo.meta = true;
    } else if (lower === 'alt' || lower === 'option' || lower === '⌥') {
      combo.alt = true;
    } else if (lower === 'shift' || lower === '⇧') {
      combo.shift = true;
    } else {
      combo.key = lower;
    }
  }

  return combo;
}

export function formatKeys(keys: string[]): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  return keys
    .map((k) => {
      const lower = k.toLowerCase();
      if (lower === 'ctrl' || lower === 'control') {
        return isMac ? '⌃' : 'Ctrl';
      }
      if (lower === 'meta' || lower === 'cmd' || lower === 'command') {
        return isMac ? '⌘' : 'Win';
      }
      if (lower === 'alt' || lower === 'option') {
        return isMac ? '⌥' : 'Alt';
      }
      if (lower === 'shift') {
        return isMac ? '⇧' : 'Shift';
      }
      if (lower === 'enter' || lower === 'return') {
        return '↵';
      }
      if (lower === 'escape' || lower === 'esc') {
        return 'Esc';
      }
      if (lower === 'backspace') {
        return '⌫';
      }
      if (lower === 'delete') {
        return 'Del';
      }
      if (lower === 'arrowup') {
        return '↑';
      }
      if (lower === 'arrowdown') {
        return '↓';
      }
      if (lower === 'arrowleft') {
        return '←';
      }
      if (lower === 'arrowright') {
        return '→';
      }
      return k.toUpperCase();
    })
    .join(isMac ? '' : '+');
}

export function matchesKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const key = event.key.toLowerCase();

  // Handle special cases
  const comboKey = combo.key.toLowerCase();
  const eventKey = key === ' ' ? 'space' : key;

  if (eventKey !== comboKey) {
    return false;
  }

  // Check modifiers
  if (combo.ctrl && !event.ctrlKey) return false;
  if (combo.meta && !event.metaKey) return false;
  if (combo.alt && !event.altKey) return false;
  if (combo.shift && !event.shiftKey) return false;

  // Ensure no extra modifiers are pressed
  if (!combo.ctrl && event.ctrlKey) return false;
  if (!combo.meta && event.metaKey) return false;
  if (!combo.alt && event.altKey) return false;
  if (!combo.shift && event.shiftKey) return false;

  return true;
}
