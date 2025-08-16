import { NativeModules } from 'react-native';

import { PackageName } from './installed-apps/package-name.ts';

export type Shortcut = {
    id: string;
    label: string;
    package: string;
    icon: string;
};

const { ShortcutUtils: ShortcutUtilsModule } = NativeModules;

export interface AppDetail {
    label: string;
    packageName: string;
    icon: string;
    isMonochromeIcon: boolean;
    backgroundColor?: string;
    accentColor?: string;
}

interface ShortcutUtils {
    launchShortcut(packageName: PackageName, shortcutId: string): Promise<void>;
    getShortcuts(packageName: PackageName): Promise<Shortcut[]>;
    getRunnableApps(): Promise<AppDetail[]>;
}

export const ShortcutUtils = ShortcutUtilsModule as ShortcutUtils;
