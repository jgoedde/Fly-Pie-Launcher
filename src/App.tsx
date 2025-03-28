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
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import { HandlerStateChangeEvent } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler/lib/typescript/handlers/GestureHandlerEventPayload';
import { useInstalledApps } from './use-installed-apps.ts';
import {
    calculateItemPositions,
    CIRCLE_RADIUS,
    findClosestItem,
    getSafePosition,
    HOVER_THRESHOLD,
    PieItem,
    PieItemWithDistance,
    Point,
    scaleItems,
} from './pieUtils.ts';
import {
    Layer,
    LayerItem,
    Layers,
    useLayerConfig,
} from './use-layer-config.ts';
import { convertToRGBA } from './colorUtils.ts';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import PieCustomizer from './PieCustomizer.tsx';
import { ShortcutUtils } from './ShortcutUtils.ts';

export default function App() {
    const { layers } = useLayerConfig();
    const { apps } = useInstalledApps();

    const [center, setCenter] = useState<Point | undefined>();
    const [currentTouchPoint, setCurrentTouchPoint] = useState<
        Point | undefined
    >();
    const [hoveredApp, setHoveredApp] = useState<PieItemWithDistance>();
    const [currentLayerId, setCurrentLayerId] = useState(1);
    const [isCustomizing, setIsCustomizing] = useState(false);

    const shouldShowPie = useMemo(() => {
        return center != null;
    }, [center]);

    const currentLayer = useMemo<Layer | undefined>(() => {
        return layers.find(layer => layer.id === currentLayerId);
    }, [currentLayerId, layers]);

    const pieItems = useMemo<PieItem[]>(
        () =>
            ((currentLayer?.items ?? []) as LayerItem[])
                // convert items from the layer configuration into internal pie items.
                // Either an app link or a link to another pie layer.
                .map(i => toPieItem(i, layers, apps))
                // filter out apps that could not have been resolved
                .filter((i: PieItem | undefined): i is PieItem => !!i),
        [apps, currentLayer?.items, layers],
    );

    const reset = useCallback(() => {
        setHoveredApp(undefined);
        setCurrentLayerId(1);
        setCurrentTouchPoint(undefined);
        setCenter(undefined);
    }, []);

    useEffect(() => {
        if (hoveredApp?.packageId != null) {
            ShortcutUtils.getShortcuts(hoveredApp.packageId).then(shortcuts => {
                console.info('Got shortcuts!', shortcuts);
                const shortcut = shortcuts[0];

                if (!shortcut) {
                    return;
                }
            });
        }
    }, [hoveredApp]);

    const itemPositions = useMemo(
        () => (center ? calculateItemPositions(center, pieItems) : []),
        [pieItems, center],
    );

    const scaledPieItems = useMemo(() => {
        const tp = currentTouchPoint ?? center;

        if (tp == null || center == null) {
            return [];
        }

        return scaleItems(tp, center, itemPositions);
    }, [center, currentTouchPoint, itemPositions]);

    const onAppSelect = useCallback(
        (app: PieItem) => {
            if (app.packageId == null) {
                throw new Error('no package name');
            }

            reset();
            RNLauncherKitHelper.launchApplication(app.packageId);
        },
        [reset],
    );

    const isCloseToBorder = useCallback(
        (point: Point) =>
            point.y <= 100 || point.y >= Dimensions.get('screen').height - 100,
        [],
    );

    const onPanStart = useCallback(
        (point: Point) => {
            if (isCloseToBorder(point)) {
                return;
            }

            let newCenter = getSafePosition(point);

            setHoveredApp(undefined);
            setCenter(newCenter);
        },
        [isCloseToBorder],
    );

    const onPanEnd = useCallback(() => {
        if (center && currentTouchPoint) {
            const closestItem = findClosestItem(
                currentTouchPoint,
                itemPositions,
            );
            if (
                closestItem != null &&
                !closestItem.toLayerId &&
                hoveredApp?.id === closestItem.id
            ) {
                onAppSelect(closestItem);
            }
        }

        reset();
    }, [
        center,
        currentTouchPoint,
        reset,
        itemPositions,
        hoveredApp?.id,
        onAppSelect,
    ]);

    const onPanFailed = useCallback(
        (point: Point) => {
            if (isCloseToBorder(point)) {
                setIsCustomizing(true);
            } else {
                onPanEnd();
            }
        },
        [isCloseToBorder, onPanEnd],
    );

    const onHandlerStateChange = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            const point = { x: event.nativeEvent.x, y: event.nativeEvent.y };
            const state = event.nativeEvent.state;

            if (state === State.BEGAN) {
                onPanStart(point);
            } else if (state === State.END) {
                onPanEnd();
            } else if (state === State.FAILED) {
                onPanFailed(point);
            }
        },
        [onPanEnd, onPanFailed, onPanStart],
    );

    useEffect(
        function vibrateOnPieAppearance() {
            if (shouldShowPie) {
                Vibration.vibrate(10);
            }
        },
        [shouldShowPie],
    );

    /**
     * Event fired on thumb move.
     */
    const onGestureEvent = useCallback(
        (event: GestureEvent<PanGestureHandlerEventPayload>) => {
            const touchPoint = {
                x: event.nativeEvent.x,
                y: event.nativeEvent.y,
            };
            setCurrentTouchPoint(touchPoint);

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

                if (shouldHover && closestItem.id !== hoveredApp?.id) {
                    setHoveredApp(closestItem);
                    Vibration.vibrate(10);
                } else if (!shouldHover) {
                    setHoveredApp(undefined);
                }
            } else {
                setHoveredApp(undefined);
            }
        },
        [center, itemPositions, hoveredApp],
    );

    const timeout = useRef<NodeJS.Timeout>(null);

    useEffect(
        /**
         * When a link item is hovered for 300ms, the next pie is rendered.
         */
        function navigateOnHold() {
            if (hoveredApp?.toLayerId != null) {
                timeout.current = setTimeout(() => {
                    if (hoveredApp?.toLayerId != null) {
                        setCurrentLayerId(hoveredApp.toLayerId);
                        setCenter(
                            getSafePosition({
                                x: hoveredApp.x,
                                y: hoveredApp.y,
                            }),
                        );
                        setHoveredApp(undefined);
                    }
                }, 300);

                return () => {
                    if (timeout.current) {
                        clearTimeout(timeout.current);
                    }
                };
            }
        },
        [hoveredApp],
    );

    const pie = useMemo(
        () =>
            scaledPieItems.map(item => (
                <View
                    style={[
                        styles.app,
                        { left: item.x, top: item.y },
                        {
                            height: Math.floor(PIE_ITEM_BASE_SIZE * item.scale),
                            width: Math.floor(PIE_ITEM_BASE_SIZE * item.scale),
                        },
                    ]}
                    key={item.id}
                >
                    {item.toLayerId == null ? (
                        <Image style={styles.icon} src={item.iconUrl} />
                    ) : (
                        <Text
                            style={[
                                styles.layerItem,
                                {
                                    fontSize: Math.floor(44 * item.scale),
                                },
                                {
                                    backgroundColor:
                                        'rgba' +
                                        convertToRGBA(
                                            item.accent,
                                            hoveredApp?.id === item.id
                                                ? '1.0'
                                                : '0.5',
                                        ),
                                },
                            ]}
                        >
                            {item.toLayerId}
                        </Text>
                    )}
                </View>
            )),
        [hoveredApp?.id, scaledPieItems],
    );

    if (isCustomizing) {
        return (
            <View style={styles.container}>
                <PieCustomizer
                    exit={() => {
                        setIsCustomizing(false);
                        reset();
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <GestureHandlerRootView>
                <PanGestureHandler
                    onGestureEvent={onGestureEvent}
                    onHandlerStateChange={onHandlerStateChange}
                >
                    <View style={styles.fullScreen}>
                        {shouldShowPie && pie}
                    </View>
                </PanGestureHandler>
            </GestureHandlerRootView>
        </View>
    );
}

/**
 * Converts a layer item into a PieItem representation.
 *
 * @param item - The item to convert, either a layer ID (number) or a package name (string).
 * @param layers - The mapping of layer IDs to their details.
 * @param apps - The list of app details to lookup package information.
 * @returns The corresponding PieItem or undefined if no matching app is found.
 */
function toPieItem(
    item: LayerItem,
    layers: Layers,
    apps: AppDetail[],
): PieItem | undefined {
    if (typeof item === 'number') {
        return {
            id: `pie-link-${item}`,
            toLayerId: item,
            accent: layers.find(l => l.id === item)?.color ?? '#FFFFFF',
        } as PieItem;
    }

    const appDetail = apps.find(a => a.packageName === item);

    if (appDetail == null) {
        return undefined;
    }

    return {
        id: `pie-app-${appDetail.packageName}`,
        iconUrl: appDetail.icon,
        packageId: appDetail.packageName,
        accent: appDetail.accentColor ?? '#000000',
    } as PieItem;
}

const PIE_ITEM_BASE_SIZE = 57;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    app: {
        position: 'absolute',
        borderRadius: '100%',
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        margin: 'auto',
        width: '100%',
        height: '100%',
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    },
    layerItem: {
        fontWeight: 700,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        textAlignVertical: 'center',
        color: 'white',
        borderRadius: 100,
    },
});
