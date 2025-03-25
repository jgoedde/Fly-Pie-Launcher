import { useCallback, useEffect, useState } from 'react';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import { InstalledApps } from 'react-native-launcher-kit';
import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from './storage.ts';

export function useInstalledApps() {
    const [appDetails, setAppDetails] = useState<AppDetail[]>([]);
    const [appListCache, setAppListCache] = useMMKVStorage<AppDetail[]>(
        'applist-cache',
        storage,
        [],
    );

    useEffect(() => {
        console.log(appListCache, 'appListCache');
    }, [appListCache]);

    const queryApps = useCallback(async () => {
        const allApps = await InstalledApps.getApps({
            includeVersion: false,
            includeAccentColor: true,
        });

        console.info('Queried installedApps', allApps);

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

    return { apps: appListCache };
}
