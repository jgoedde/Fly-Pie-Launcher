import { Point } from '../maths.ts';
import { PackageName } from '../installed-apps/package-name.ts';

interface BasePieItem extends Point {
    /**
     * The internal ID of an item within the pie.
     */
    id: string;

    /**
     * The scaling of an item within the pie.
     * min: 0.85;
     * max: 1.3;
     */
    scaleFactor: number;

    type: 'app' | 'layerSwitch';
}

export type AppPieItem = BasePieItem & {
    iconBase64: string;
    packageName: PackageName;
    type: 'app';
};

export function createDefaultAppPieItem(
    id: string,
    iconBase64: string,
    packageName: PackageName,
): AppPieItem {
    return {
        iconBase64,
        scaleFactor: 1,
        y: 0,
        packageName,
        x: 0,
        type: 'app',
        id,
    };
}

export type LayerSwitchPieItem = BasePieItem & {
    accent: string;
    targetLayerId: number;
    type: 'layerSwitch';
};

export function createDefaultLayerSwitchPieItem(
    id: string,
    accent: string,
    targetLayerId: number,
): LayerSwitchPieItem {
    return {
        scaleFactor: 1,
        y: 0,
        x: 0,
        type: 'layerSwitch',
        id,
        targetLayerId,
        accent,
    };
}

export type PieItem = AppPieItem | LayerSwitchPieItem;
