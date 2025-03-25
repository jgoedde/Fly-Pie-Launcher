import { useCallback, useEffect, useState } from 'react';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import { InstalledApps } from 'react-native-launcher-kit';

export function useInstalledApps() {
    const [appDetails, setAppDetails] = useState<AppDetail[]>([]);

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

    return { apps: appDetails };
}
