import { NativeModules } from 'react-native';
import { PackageName } from './use-installed-apps.ts';

const { BrowserUtils: BrowserUtilsModule } = NativeModules;

interface BrowserUtils {
    getDefaultBrowser(): Promise<PackageName | ''>;
}

export const BrowserUtils = BrowserUtilsModule as BrowserUtils;
