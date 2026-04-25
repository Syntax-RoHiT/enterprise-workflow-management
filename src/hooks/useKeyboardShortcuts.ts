

import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description: string;
}

const shortcuts: Shortcut[] = [];

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; description?: string } = {},
) {
  const cb = useCallback(handler, [handler]);

  useEffect(() => {
    const shortcut: Shortcut = {
      key: key.toLowerCase(),
      ctrl: options.ctrl,
      shift: options.shift,
      alt: options.alt,
      handler: cb,
      description: options.description ?? `${options.ctrl ? 'Ctrl+' : ''}${options.shift ? 'Shift+' : ''}${key}`,
    };

    shortcuts.push(shortcut);

    const listener = (e: KeyboardEvent) => {

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {

        if (!shortcut.ctrl) return;
      }

      if (
        e.key.toLowerCase() === shortcut.key &&
        !!e.ctrlKey === !!shortcut.ctrl &&
        !!e.shiftKey === !!shortcut.shift &&
        !!e.altKey === !!shortcut.alt
      ) {
        e.preventDefault();
        shortcut.handler();
      }
    };

    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
      const idx = shortcuts.indexOf(shortcut);
      if (idx >= 0) shortcuts.splice(idx, 1);
    };
  }, [key, cb, options.ctrl, options.shift, options.alt, options.description]);
}

export function getRegisteredShortcuts() {
  return shortcuts.map((s) => ({
    key: s.key,
    ctrl: s.ctrl,
    shift: s.shift,
    alt: s.alt,
    description: s.description,
  }));
}
