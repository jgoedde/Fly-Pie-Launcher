import { useCallback, useEffect, useState } from 'react';
import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from '../storage.ts';
import { BrowserUtils } from '../BrowserUtils.ts';
import { PackageName } from './package-name.ts';
import { AppDetail, ShortcutUtils } from '../ShortcutUtils.ts';

export function useInstalledApps(): {
    apps: AppDetail[];
    defaultBrowser: PackageName | undefined;
} {
    const [appDetails, setAppDetails] = useState<AppDetail[]>([]);
    const [appListCache, setAppListCache] = useMMKVStorage<AppDetail[]>(
        'applist-cache',
        storage,
        [],
    );
    const [defaultBrowser, setDefaultBrowser] = useState<PackageName>();

    useEffect(() => {
        BrowserUtils.getDefaultBrowser().then(browser =>
            setDefaultBrowser(browser === '' ? undefined : browser),
        );
    }, []);

    const queryApps = useCallback(async () => {
        const allApps = await ShortcutUtils.getRunnableApps();

        setAppDetails(allApps);
    }, []);

    useEffect(() => {
        void queryApps();
    }, [queryApps]);

    useEffect(() => {
        if (appDetails.length !== 0) {
            setAppListCache(appDetails);
        }
    }, [appDetails, setAppListCache]);

    return { apps: appListCache, defaultBrowser };
}
