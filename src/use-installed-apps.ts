import { useCallback, useEffect, useState } from 'react';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import { InstalledApps } from 'react-native-launcher-kit';
import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from './storage.ts';
import { z } from 'zod';
import { BrowserUtils } from './BrowserUtils.ts';

export const PackageNameSchema = z.string().nonempty();

export type PackageName = z.infer<typeof PackageNameSchema>;

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
        const allApps = await InstalledApps.getApps({
            includeVersion: false,
            includeAccentColor: true,
        });

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
