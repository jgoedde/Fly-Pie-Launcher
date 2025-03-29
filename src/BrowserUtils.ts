import { NativeModules } from 'react-native';

import { PackageName } from './installed-apps/package-name.ts';

const { BrowserUtils: BrowserUtilsModule } = NativeModules;

interface BrowserUtils {
    getDefaultBrowser(): Promise<PackageName | ''>;
}

export const BrowserUtils = BrowserUtilsModule as BrowserUtils;
