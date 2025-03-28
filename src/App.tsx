import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Animated,
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

export default function App() {
    const { layers } = useLayerConfig();
    const { apps } = useInstalledApps();

    const [center, setCenter] = useState<Point | undefined>();
    const [currentTouchPoint, setCurrentTouchPoint] = useState<
        Point | undefined
    >();
    const [hoveredItem, setHoveredItem] = useState<PieItemWithDistance>();
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
        setHoveredItem(undefined);
        setCurrentLayerId(1);
        setCurrentTouchPoint(undefined);
        setCenter(undefined);
    }, []);

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

    const onAppSelect = useCallback((app: PieItem) => {
        if (app.packageId == null) {
            throw new Error('no package name');
        }

        reset();
        RNLauncherKitHelper.launchApplication(app.packageId);
    }, [reset]);

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

            setHoveredItem(undefined);
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
                hoveredItem?.id === closestItem.id
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
        hoveredItem?.id,
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

    useEffect(
        /**
         * When a link item is hovered for 300ms, the next pie is rendered.
         */
        function navigateOnHold() {
            if (hoveredItem?.toLayerId != null) {
                timeout.current = setTimeout(() => {
                    if (hoveredItem?.toLayerId != null) {
                        setCurrentLayerId(hoveredItem.toLayerId);
                        setCenter(
                            getSafePosition({
                                x: hoveredItem.x,
                                y: hoveredItem.y,
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
        },
        [hoveredItem],
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
                                            hoveredItem?.id === item.id
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
        [hoveredItem?.id, scaledPieItems],
    );

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (shouldShowPie) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 188, // Fade-in duration
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 188, // Fade-out duration
                useNativeDriver: true,
            }).start();
        }
    }, [fadeAnim, shouldShowPie]);

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

    // noinspection XmlDeprecatedElement
    return (
        <GestureHandlerRootView>
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
            >
                <View style={styles.fullScreen}>
                    {shouldShowPie && (
                        <Animated.View style={[{ opacity: fadeAnim }]}>
                            {pie}
                        </Animated.View>
                    )}
                </View>
            </PanGestureHandler>
        </GestureHandlerRootView>
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
        // justifyContent: 'center',
        // alignItems: 'center',
        // position: 'relative',
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
