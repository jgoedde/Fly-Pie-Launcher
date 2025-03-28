import { Dimensions } from 'react-native';
import { PackageName } from './use-installed-apps.ts';

const windowDimensions = Dimensions.get('window');

export interface Point {
    x: number;
    y: number;
}

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

    type: 'app' | 'layerSwitch' | 'browserAction';
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

export type BrowserActionPieItem = BasePieItem & {
    iconBase64: string;
    accent: string;
    url: string;
    type: 'browserAction';
};

export function createDefaultBrowserActionPieItem(
    id: string,
    accent: string,
    url: string,
    iconBase64: string,
): BrowserActionPieItem {
    return {
        scaleFactor: 1,
        y: 0,
        x: 0,
        type: 'browserAction',
        id,
        url,
        accent,
        iconBase64,
    };
}

export type PieItem = AppPieItem | LayerSwitchPieItem | BrowserActionPieItem;

export const CIRCLE_RADIUS = 120; // Distance from center
export const HOVER_THRESHOLD = 30; // Max distance to trigger hover effect

/** Calculates positions for the items around the center */
export function calculateItemPositions(
    center: Point,
    items: PieItem[],
): PieItem[] {
    return items.map((item, i) => {
        const angle = (i / items.length) * (2 * Math.PI) - Math.PI / 2; // Start from top (12 o'clock)

        return {
            ...item,
            x: Math.round(center.x + CIRCLE_RADIUS * Math.cos(angle)),
            y: Math.round(center.y + CIRCLE_RADIUS * Math.sin(angle)),
        };
    });
}

/** Finds the closest app based on the touch position */
export function findClosestItem(
    touchPoint: Point,
    items: PieItem[],
): PieItem | null {
    let closestItem: PieItem | null = null;
    let minDistance = Infinity;

    items.forEach(app => {
        const distance = Math.sqrt(
            Math.pow(touchPoint.x - app.x, 2) +
                Math.pow(touchPoint.y - app.y, 2),
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestItem = app;
        }
    });

    return closestItem;
}

/**
 * Receives a point on the screen that may potentially be close to the borders
 * and outputs a new point with safe padding to the screen's edges.
 */
export const getSafePosition = (point: Point) => {
    let newPoint = {
        x: point.x,
        y: point.y,
    };

    // Ensure the pie stays within screen bounds
    if (newPoint.x + CIRCLE_RADIUS > windowDimensions.width) {
        newPoint.x = windowDimensions.width - (CIRCLE_RADIUS + 30);
    } else if (newPoint.x - CIRCLE_RADIUS < 0) {
        newPoint.x = CIRCLE_RADIUS + 30;
    }

    if (newPoint.y + CIRCLE_RADIUS > windowDimensions.height) {
        newPoint.y = windowDimensions.height - CIRCLE_RADIUS - 30;
    } else if (newPoint.y - CIRCLE_RADIUS < 0) {
        newPoint.y = CIRCLE_RADIUS + 30;
    }
    return newPoint;
};

/**
 * Scales items based on their distance from a touch point, with a smooth effect.
 * The closest item to the touch point is scaled the most, while farther items scale down.
 * The scaling effect is reduced when the touch point is near the initial point.
 *
 * @param touchPoint - The current touch position.
 * @param initialPoint - The initial reference point for scaling adjustment.
 * @param items - An array of items with x, y coordinates.
 * @returns The items with an additional `scale` property.
 */
export function scaleItems(
    touchPoint: Point,
    initialPoint: Point,
    items: PieItem[],
): PieItem[] {
    if (items.length === 0) {
        return [];
    }

    const initialDistance = Math.hypot(
        initialPoint.x - touchPoint.x,
        initialPoint.y - touchPoint.y,
    );
    const scaleFactor = Math.min(
        1,
        Math.max(
            0,
            (initialDistance - CIRCLE_RADIUS / 4) /
                (CIRCLE_RADIUS - CIRCLE_RADIUS / 4),
        ),
    );

    const distances = items.map(item => ({
        item,
        distance: Math.hypot(item.x - touchPoint.x, item.y - touchPoint.y),
    }));

    const minDistance = Math.min(...distances.map(d => d.distance));
    const maxDistance = Math.max(...distances.map(d => d.distance));

    const minScale = 0.85;
    const maxScale = 1.3;

    return distances.map(({ item, distance }) => {
        const normalizedDistance =
            maxDistance === minDistance
                ? 1
                : (maxDistance - distance) / (maxDistance - minDistance);
        const scale =
            minScale + (maxScale - minScale) * normalizedDistance * scaleFactor;
        return { ...item, scaleFactor: scale };
    });
}

export function getDistance(a: Point, b: Point): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}
