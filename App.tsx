import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    Vibration,
    View,
} from 'react-native';
import {
    GestureEvent,
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from 'react-native-gesture-handler';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { HandlerStateChangeEvent } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler/lib/typescript/handlers/GestureHandlerEventPayload';
import Icon from '@react-native-vector-icons/fontawesome6';

type Point = { x: number; y: number };

type PieItem = {
    accent: string;
    id: string;

    /**
     * An optional link to another pie layer.
     */
    link?: number;
    iconUrl?: string;
    packageId?: string;
};

type PieItemWithDistance = PieItem & {
    left: number;
    top: number;
    distance: number;
};

const CIRCLE_RADIUS = 120; // Distance from center
const HOVER_THRESHOLD = 30; // Max distance to trigger hover effect

/** Calculates positions for the items around the center */
function calculateItemPositions<T>(
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
function findClosestItem<T extends { top: number; left: number }>(
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

function useInstalledApps() {
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

const windowDimensions = Dimensions.get('window');

const layers: Record<number, Array<string | number>> = {
    0: [
        'com.whatsapp',
        'app.grapheneos.camera',
        'org.mozilla.firefox',
        'com.google.android.apps.maps',
        1,
    ],
    1: ['app.revanced.android.youtube', 'me.zhanghai.android.files'],
};

/**
 * Receives a point on the screen that may potentially be close to the borders
 * and outputs a new point with safe padding to the screen's edges.
 */
const getSafePosition = (point: Point) => {
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

export default function App() {
    const [shouldShowPie, setShouldShowPie] = useState(false);
    const [center, setCenter] = useState<Point | undefined>();
    const [finalTouch, setFinalTouch] = useState<Point | undefined>();
    const [hoveredItem, setHoveredItem] = useState<PieItemWithDistance>();
    const [currentLayer, setCurrentLayer] = useState(0);

    const { apps } = useInstalledApps();

    const pieItems = useMemo<PieItem[]>(() => {
        return layers[currentLayer]
            .map(i => {
                if (typeof i === 'number') {
                    return {
                        id: `pie-link-${i}`,
                        link: i,
                        accent: '#0f0f0f',
                    } as PieItem;
                }

                const appDetail = apps.find(a => a.packageName === i);

                if (appDetail == null) {
                    return undefined;
                }

                return {
                    id: `pie-app-${appDetail.packageName}`,
                    iconUrl: appDetail.icon,
                    packageId: appDetail.packageName,
                    accent: appDetail.accentColor ?? '#000',
                } as PieItem;
            })
            .filter((i: PieItem | undefined): i is PieItem => !!i);
    }, [apps, currentLayer]);

    const itemPositions = useMemo(
        () => (center ? calculateItemPositions(center, pieItems) : []),
        [pieItems, center],
    );

    const onAppSelect = useCallback((app: PieItem) => {
        if (app.packageId == null) {
            throw new Error('no package name');
        }

        RNLauncherKitHelper.launchApplication(app.packageId);
    }, []);

    const onPanStart = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            let newCenter = getSafePosition({
                x: event.nativeEvent.x,
                y: event.nativeEvent.y,
            });

            setShouldShowPie(true);
            setHoveredItem(undefined);
            setCenter(newCenter);
        },
        [],
    );

    const onPanEnd = useCallback(() => {
        if (center && finalTouch) {
            const closestItem = findClosestItem(finalTouch, itemPositions);
            if (
                closestItem != null &&
                !closestItem.link &&
                hoveredItem?.id === closestItem.id
            ) {
                onAppSelect(closestItem);
            }
        }

        setShouldShowPie(false);
        setCenter(undefined);
        setFinalTouch(undefined);
        setHoveredItem(undefined);
        setCurrentLayer(0);
    }, [itemPositions, center, finalTouch, hoveredItem, onAppSelect]);

    const onHandlerStateChange = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            if (event.nativeEvent.state === State.BEGAN) {
                onPanStart(event);
            } else if (
                event.nativeEvent.state === State.END ||
                event.nativeEvent.state === State.FAILED // Idea: on failed, open the launcher's settings
            ) {
                onPanEnd();
            }
        },
        [onPanEnd, onPanStart],
    );

    useEffect(() => {
        if (shouldShowPie) {
            Vibration.vibrate(10);
        }
    }, [shouldShowPie]);

    const onGestureEvent = useCallback(
        (event: GestureEvent<PanGestureHandlerEventPayload>) => {
            const touchPoint = {
                x: event.nativeEvent.x - 10, // Apply offset
                y: event.nativeEvent.y - 25,
            };
            setFinalTouch(touchPoint);

            const closestItem = findClosestItem(touchPoint, itemPositions);
            if (closestItem != null && center != null) {
                const distanceToCenter = Math.sqrt(
                    Math.pow(touchPoint.x - center.x, 2) +
                        Math.pow(touchPoint.y - center.y, 2),
                );

                const isInsidePie = distanceToCenter <= CIRCLE_RADIUS;
                const shouldHover = isInsidePie
                    ? closestItem.distance <= HOVER_THRESHOLD
                    : true;

                if (shouldHover && closestItem.id !== hoveredItem?.id) {
                    setHoveredItem(closestItem);
                    Vibration.vibrate(10);
                } else if (!shouldHover) {
                    setHoveredItem(undefined);
                }
            } else {
                setHoveredItem(undefined);
            }
        },
        [center, itemPositions, hoveredItem],
    );

    const timeout = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        if (hoveredItem?.link != null) {
            timeout.current = setTimeout(() => {
                if (hoveredItem?.link != null) {
                    setCurrentLayer(hoveredItem.link);
                    setCenter(
                        getSafePosition({
                            x: hoveredItem.left,
                            y: hoveredItem.top,
                        }),
                    );
                    setHoveredItem(undefined);
                }
            }, 300);

            return () => {
                if (timeout.current) {
                    clearTimeout(timeout.current);
                }
            };
        }
    }, [hoveredItem]);

    return (
        <GestureHandlerRootView style={styles.container}>
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
            >
                <View style={styles.fullScreen}>
                    <Text>Touch and hold anywhere.</Text>
                    {shouldShowPie &&
                        center &&
                        itemPositions.map(item => (
                            <View
                                style={[
                                    styles.icon,
                                    { left: item.left, top: item.top },
                                    hoveredItem?.id === item.id && {
                                        backgroundColor: item.accent,
                                    },
                                ]}
                                key={item.id}
                            >
                                {item.link ? (
                                    <Icon
                                        iconStyle={'solid'}
                                        name={'arrow-up'}
                                        size={42}
                                        color={'#fff'}
                                        style={{
                                            // width: '66%',
                                            // height: '66%',
                                            margin: 'auto',
                                        }}
                                    />
                                ) : (
                                    <Image
                                        style={{
                                            width: '66%',
                                            height: '66%',
                                            margin: 'auto',
                                        }}
                                        src={item.iconUrl}
                                    />
                                )}
                            </View>
                        ))}
                </View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        position: 'absolute',
        // backgroundColor: 'lightblue',
        borderRadius: '100%',
        width: 88,
        height: 88,
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    },
});
