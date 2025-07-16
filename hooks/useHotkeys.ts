import { useEffect } from 'react';

type HotkeyHandler = () => void;
type Hotkey = [string, HotkeyHandler];

export function useHotkeys(hotkeys: Hotkey[]) {
  useEffect(() => {
    const handlers = new Map<string, HotkeyHandler>();
    
    // Parse hotkeys and create handlers map
    hotkeys.forEach(([key, handler]) => {
      handlers.set(key.toLowerCase(), handler);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      // Build key combination string
      let keyCombo = '';
      
      if (event.metaKey || event.ctrlKey) keyCombo += 'cmd+';
      if (event.altKey) keyCombo += 'alt+';
      if (event.shiftKey) keyCombo += 'shift+';
      
      keyCombo += event.key.toLowerCase();
      
      // Check if we have a handler for this combination
      const handler = handlers.get(keyCombo);
      if (handler) {
        event.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hotkeys]);
}