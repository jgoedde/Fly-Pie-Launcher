import { PackageName } from '../../installed-apps/package-name.ts';
import { useCallback, useEffect, useState } from 'react';
import { Shortcut, ShortcutUtils } from '../../ShortcutUtils.ts';

export function useShortcuts(app?: PackageName): Shortcut[] {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

    const queryShortcuts = useCallback(async (packageName: PackageName) => {
        const s = await ShortcutUtils.getShortcuts(packageName);
        setShortcuts(s);
    }, []);

    useEffect(() => {
        if (!app) {
            setShortcuts([]);
        } else {
            void queryShortcuts(app);
        }
    }, [app, queryShortcuts]);

    return shortcuts;
}
