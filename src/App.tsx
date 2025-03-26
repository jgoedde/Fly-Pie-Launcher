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
import PieCustomizer from './PieCustomizer.tsx';
import { Layer, useLayers } from './use-layers.ts';
import { alpharize } from './colorUtils.ts';

export default function App() {
    const { layers } = useLayers();
    const { apps } = useInstalledApps();

    const [shouldShowPie, setShouldShowPie] = useState(false);
    const [center, setCenter] = useState<Point | undefined>();
    const [finalTouch, setFinalTouch] = useState<Point | undefined>();
    const [hoveredItem, setHoveredItem] = useState<PieItemWithDistance>();
    const [currentLayerId, setCurrentLayerId] = useState(1);
    const [isCustomizing, setIsCustomizing] = useState(false);

    const currentLayer = useMemo<Layer>(() => {
        return layers.find(layer => layer.id === currentLayerId)!;
    }, [currentLayerId, layers]);

    const pieItems = useMemo<PieItem[]>(() => {
        return currentLayer.items
            .map(item => {
                if (typeof item === 'number') {
                    return {
                        id: `pie-link-${item}`,
                        toLayerId: item,
                        accent:
                            layers.find(l => l.id === item)?.color ?? '#FFFFFF',
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
            })
            .filter((i: PieItem | undefined): i is PieItem => !!i);
    }, [apps, currentLayer.items, layers]);

    const reset = useCallback(() => {
        setShouldShowPie(false);
        setHoveredItem(undefined);
        setCurrentLayerId(1);
        setFinalTouch(undefined);
        setCenter(undefined);
    }, []);

    const itemPositions = useMemo(
        () => (center ? calculateItemPositions(center, pieItems) : []),
        [pieItems, center],
    );

    const scaledPieItems = useMemo(() => {
        const tp = finalTouch ?? center;

        if (tp == null || center == null) {
            return [];
        }

        return scaleItems(tp, center, itemPositions);
    }, [center, finalTouch, itemPositions]);

    const onAppSelect = useCallback((app: PieItem) => {
        if (app.packageId == null) {
            throw new Error('no package name');
        }

        RNLauncherKitHelper.launchApplication(app.packageId);
    }, []);

    const isCloseToBorder = useCallback(
        (point: Point) =>
            point.y <= 100 || point.y >= Dimensions.get('screen').height - 100,
        [],
    );

    const onPanStart = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            if (
                isCloseToBorder({
                    x: event.nativeEvent.x,
                    y: event.nativeEvent.y,
                })
            ) {
                return;
            }

            let newCenter = getSafePosition({
                x: event.nativeEvent.x,
                y: event.nativeEvent.y,
            });

            setShouldShowPie(true);
            setHoveredItem(undefined);
            setCenter(newCenter);
        },
        [isCloseToBorder],
    );

    const onPanEnd = useCallback(() => {
        if (center && finalTouch) {
            const closestItem = findClosestItem(finalTouch, itemPositions);
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
        finalTouch,
        reset,
        itemPositions,
        hoveredItem?.id,
        onAppSelect,
    ]);

    const onHandlerStateChange = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            if (event.nativeEvent.state === State.BEGAN) {
                onPanStart(event);
            } else if (event.nativeEvent.state === State.END) {
                onPanEnd();
            } else if (event.nativeEvent.state === State.FAILED) {
                if (
                    isCloseToBorder({
                        x: event.nativeEvent.x,
                        y: event.nativeEvent.y,
                    })
                ) {
                    setIsCustomizing(true);
                } else {
                    onPanEnd();
                }
            }
        },
        [isCloseToBorder, onPanEnd, onPanStart],
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
    }, [hoveredItem]);

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
                        {shouldShowPie &&
                            scaledPieItems.map(item => (
                                <View
                                    style={[
                                        styles.app,
                                        { left: item.x, top: item.y },
                                        {
                                            height: Math.floor(
                                                PIE_ITEM_BASE_SIZE * item.scale,
                                            ),
                                            width: Math.floor(
                                                PIE_ITEM_BASE_SIZE * item.scale,
                                            ),
                                        },
                                    ]}
                                    key={item.id}
                                >
                                    {item.toLayerId == null ? (
                                        <Image
                                            style={styles.icon}
                                            src={item.iconUrl}
                                        />
                                    ) : (
                                        <Text
                                            style={[
                                                styles.layerItem,
                                                {
                                                    fontSize: Math.floor(
                                                        44 * item.scale,
                                                    ),
                                                },
                                                {
                                                    backgroundColor:
                                                        'rgba' +
                                                        alpharize(
                                                            item.accent,
                                                            hoveredItem?.id ===
                                                                item.id
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
                            ))}
                    </View>
                </PanGestureHandler>
            </GestureHandlerRootView>
        </View>
    );
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
