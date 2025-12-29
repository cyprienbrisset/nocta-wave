import { ShortcutDefinition, KeyboardShortcuts, parseKeys, matchesKeyCombo } from './types';
import { DEFAULT_SHORTCUTS } from './default-shortcuts';

export class ShortcutManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private userBindings: KeyboardShortcuts = {};
  private enabled: boolean = true;
  private listeners: Set<(event: KeyboardEvent) => void> = new Set();

  constructor() {
    // Initialize with default shortcuts (without actions)
    DEFAULT_SHORTCUTS.forEach((shortcut) => {
      this.shortcuts.set(shortcut.id, {
        ...shortcut,
        action: () => {}, // Placeholder, will be bound later
      });
    });
  }

  /**
   * Register an action handler for a shortcut
   */
  registerAction(shortcutId: string, action: () => void, when?: () => boolean): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.action = action;
      if (when) shortcut.when = when;
    }
  }

  /**
   * Unregister an action handler
   */
  unregisterAction(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.action = () => {};
      shortcut.when = undefined;
    }
  }

  /**
   * Load user's custom key bindings
   */
  loadUserBindings(bindings: KeyboardShortcuts): void {
    this.userBindings = { ...bindings };
  }

  /**
   * Get the current keys for a shortcut (user binding or default)
   */
  getKeys(shortcutId: string): string[] {
    if (this.userBindings[shortcutId]) {
      return this.userBindings[shortcutId];
    }
    const shortcut = this.shortcuts.get(shortcutId);
    return shortcut?.defaultKeys || [];
  }

  /**
   * Set custom keys for a shortcut
   */
  setKeys(shortcutId: string, keys: string[]): void {
    this.userBindings[shortcutId] = keys;
  }

  /**
   * Reset a shortcut to its default keys
   */
  resetToDefault(shortcutId: string): void {
    delete this.userBindings[shortcutId];
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetAllToDefaults(): void {
    this.userBindings = {};
  }

  /**
   * Get all user customizations
   */
  getUserBindings(): KeyboardShortcuts {
    return { ...this.userBindings };
  }

  /**
   * Get all registered shortcuts
   */
  getAllShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values()).filter((s) => s.category === category);
  }

  /**
   * Check for conflicting key bindings
   */
  hasConflict(shortcutId: string, newKeys: string[]): string | null {
    const newCombo = parseKeys(newKeys);

    for (const [id, shortcut] of this.shortcuts) {
      if (id === shortcutId) continue;

      const existingKeys = this.getKeys(id);
      if (existingKeys.length === 0) continue;

      const existingCombo = parseKeys(existingKeys);

      // Check if combos match
      if (
        existingCombo.key === newCombo.key &&
        existingCombo.ctrl === newCombo.ctrl &&
        existingCombo.meta === newCombo.meta &&
        existingCombo.alt === newCombo.alt &&
        existingCombo.shift === newCombo.shift
      ) {
        return id;
      }
    }

    return null;
  }

  /**
   * Enable/disable shortcut handling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Handle a keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.enabled) return false;

    // Skip if user is typing in an input/textarea
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow some shortcuts even in inputs
      const allowedInInputs = ['nav.commandPalette', 'edit.undo', 'edit.redo'];
      let found = false;

      for (const shortcutId of allowedInInputs) {
        const keys = this.getKeys(shortcutId);
        if (keys.length === 0) continue;

        const combo = parseKeys(keys);
        if (matchesKeyCombo(event, combo)) {
          const shortcut = this.shortcuts.get(shortcutId);
          if (shortcut && (!shortcut.when || shortcut.when())) {
            event.preventDefault();
            shortcut.action();
            return true;
          }
        }
      }

      return false;
    }

    // Check all shortcuts
    for (const [id, shortcut] of this.shortcuts) {
      const keys = this.getKeys(id);
      if (keys.length === 0) continue;

      const combo = parseKeys(keys);
      if (matchesKeyCombo(event, combo)) {
        // Check condition
        if (shortcut.when && !shortcut.when()) {
          continue;
        }

        event.preventDefault();
        shortcut.action();
        return true;
      }
    }

    return false;
  }

  /**
   * Add a global keyboard listener
   */
  attachToDocument(): () => void {
    const handler = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };

    document.addEventListener('keydown', handler);

    return () => {
      document.removeEventListener('keydown', handler);
    };
  }
}

// Singleton instance
let instance: ShortcutManager | null = null;

export function getShortcutManager(): ShortcutManager {
  if (!instance) {
    instance = new ShortcutManager();
  }
  return instance;
}

export function resetShortcutManager(): void {
  instance = null;
}
