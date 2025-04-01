import { PackageName } from '../installed-apps/package-name.ts';

export type PopoverItem = AppPopoverItem | ShortcutPopoverItem | UrlPopoverItem;

export interface BasePopoverItem {
    type: string;
    id: string;
    icon: string;
    label: string;
}

export interface AppPopoverItem extends BasePopoverItem {
    type: 'app';
    packageName: PackageName;
}

export interface ShortcutPopoverItem extends BasePopoverItem {
    type: 'shortcut';
    packageName: PackageName;
}

export interface UrlPopoverItem extends BasePopoverItem {
    type: 'url';
    url: string;
}
