import { NativeModules } from 'react-native';

import { PackageName } from './installed-apps/package-name.ts';

export type Shortcut = {
    id: string;
    label: string;
    package: string;
    icon: string;
};

const { ShortcutUtils: ShortcutUtilsModule } = NativeModules;

interface ShortcutUtils {
    launchShortcut(packageName: PackageName, shortcutId: string): Promise<void>;
    getShortcuts(packageName: PackageName): Promise<Shortcut[]>;
}

export const ShortcutUtils = ShortcutUtilsModule as ShortcutUtils;
