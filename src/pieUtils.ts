import { Point } from 'react-native-gesture-handler/lib/typescript/web/interfaces';
import { Dimensions } from 'react-native';
import { CIRCLE_RADIUS } from './App.tsx';

const windowDimensions = Dimensions.get('window');

/** Calculates positions for the items around the center */
export function calculateItemPositions<T>(
    center: Point,
    items: T[],
): (T & { left: number; top: number })[] {
    return items.map((item, i) => {
        const angle = (i / items.length) * (2 * Math.PI) - Math.PI / 2; // Start from top (12 o'clock)

        return {
            ...item,
            left: Math.round(center.x + CIRCLE_RADIUS * Math.cos(angle)),
            top: Math.round(center.y + CIRCLE_RADIUS * Math.sin(angle)),
        };
    });
}

/** Finds the closest app based on the touch position */
export function findClosestItem<T extends { top: number; left: number }>(
    touchPoint: Point,
    items: T[],
): (T & { distance: number }) | null {
    let closestItem: (T & { distance: number }) | null = null;
    let minDistance = Infinity;

    items.forEach(app => {
        const distance = Math.sqrt(
            Math.pow(touchPoint.x - app.left, 2) +
                Math.pow(touchPoint.y - app.top, 2),
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestItem = { ...app, distance };
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
