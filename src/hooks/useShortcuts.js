import { useEffect, useRef } from 'react';

export function useShortcuts(shortcuts) {
    const shortcutsRef = useRef(shortcuts);

    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const currentShortcuts = shortcutsRef.current;

            // Escape to close
            if (e.key === 'Escape' && currentShortcuts.Escape) {
                currentShortcuts.Escape(e);
            }

            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'س') && currentShortcuts.Save) {
                e.preventDefault();
                currentShortcuts.Save(e);
            }

            // Ctrl/Cmd + N to new item
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyN' || e.key === 'n' || e.key === 'N' || e.key === 'ى') && currentShortcuts.New) {
                e.preventDefault();
                currentShortcuts.New(e);
            }

            // Ctrl/Cmd + F for search
            if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'ب') && currentShortcuts.Search) {
                e.preventDefault();
                currentShortcuts.Search(e);
            }

            // Ctrl/Cmd + / for help panel
            if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === 'ظ') && currentShortcuts.Help) {
                e.preventDefault();
                currentShortcuts.Help(e);
            }

            // Ctrl/Cmd + [1-9] for global navigation
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9' && currentShortcuts.GlobalNav) {
                e.preventDefault();
                currentShortcuts.GlobalNav(e.key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}
