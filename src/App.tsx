import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Dimensions, Image, Text, Vibration, View } from 'react-native';
import {
    GestureEvent,
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from 'react-native-gesture-handler';
import { IntentAction, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { HandlerStateChangeEvent } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler/lib/typescript/handlers/GestureHandlerEventPayload';
import { useInstalledApps } from './installed-apps/use-installed-apps.ts';
import {
    AppPieItem,
    createDefaultAppPieItem,
    createDefaultBrowserActionPieItem,
    createDefaultLayerSwitchPieItem,
    LayerSwitchPieItem,
    PieItem,
} from './pie/pieItem.ts';
import {
    BROWSER_ACTIONS_RESERVED_LAYER_ID,
    Layer,
    LayerItem,
    useLayerConfig,
} from './pie/layers/use-layer-config.ts';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import PieCustomizer from './pie/PieCustomizer.tsx';
import { LayerSwitchItem } from './pie/LayerSwitchItem.tsx';
import { AppItem } from './pie/AppItem.tsx';
import { BrowserActionItem } from './pie/BrowserActionItem.tsx';
import { useBrowserActions } from './pie/browser-actions/use-browser-actions.ts';
import {
    calculateItemPositions,
    CIRCLE_RADIUS,
    findClosestItem,
    getDistance,
    getSafePosition,
    HOVER_THRESHOLD,
    Point,
    scaleItems,
} from './maths.ts';
import './global.css';
import { useShortcuts } from './pie/shortcuts/use-shortcuts.ts';
import clsx from 'clsx';

const screenDimensions = Dimensions.get('screen');

export default function App() {
    const { layers } = useLayerConfig();
    const { apps, defaultBrowser } = useInstalledApps();
    const { actions: browserActions } = useBrowserActions();

    const [center, setCenter] = useState<Point | undefined>();
    const [currentTouchPoint, setCurrentTouchPoint] = useState<
        Point | undefined
    >();
    const [hoveredItem, setHoveredItem] = useState<PieItem>();
    const [currentLayerId, setCurrentLayerId] = useState(1);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const shortcuts = useShortcuts(
        hoveredItem?.type === 'app' ? hoveredItem.packageName : undefined,
    );

    useEffect(() => {
        if (shortcuts.length === 0) {
            setShortcutDropdownAnchor(undefined);
        }
    }, [shortcuts]);

    const [shortcutDropdownAnchor, setShortcutDropdownAnchor] = useState<
        Point | undefined
    >(undefined);

    const shouldShowPie = useMemo(() => {
        return center != null;
    }, [center]);

    const currentLayer = useMemo<Layer | undefined>(() => {
        return layers.find(layer => layer.id === currentLayerId);
    }, [currentLayerId, layers]);

    /**
     * Resets the state. Switches back to the home layer and sets all the gesture-related states back to initial.
     */
    const reset = useCallback(() => {
        setHoveredItem(undefined);
        setCurrentLayerId(layers.find(l => l.isBaseLayer)?.id ?? 1);
        setCurrentTouchPoint(undefined);
        setCenter(undefined);
        setShortcutDropdownAnchor(undefined);
    }, [layers]);

    const pieItems = useMemo(() => {
        const tp = currentTouchPoint ?? center;

        if (tp == null || center == null) {
            return [];
        }

        const items: PieItem[] = [];

        if (
            currentLayerId === BROWSER_ACTIONS_RESERVED_LAYER_ID &&
            defaultBrowser != null
        ) {
            items.push(
                ...browserActions.map(action =>
                    createDefaultBrowserActionPieItem(
                        `pie-browser-action-${action.url}`,
                        '#ffffff',
                        action.url,
                        action.image,
                    ),
                ),
            );

            const browserApp = toPieItem(defaultBrowser, layers, apps);
            if (browserApp) {
                items.push(browserApp);
            }
        } else {
            items.push(
                ...((currentLayer?.items ?? []) as LayerItem[])
                    // convert items from the layer configuration into internal pie items.
                    // Either an app link or a link to another pie layer.
                    .map(i => toPieItem(i, layers, apps))
                    // filter out apps that could not have been resolved
                    .filter((i: PieItem | undefined): i is PieItem => !!i),
            );
        }

        return scaleItems(tp, center, calculateItemPositions(center, items));
    }, [
        apps,
        browserActions,
        center,
        currentLayer?.items,
        currentLayerId,
        currentTouchPoint,
        defaultBrowser,
        layers,
    ]);

    const isCloseToBorder = useCallback(
        (point: Point) =>
            point.y <= 100 || point.y >= screenDimensions.height - 100,
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
        reset();

        if (!center || !currentTouchPoint) {
            return;
        }

        const closestItem = findClosestItem(currentTouchPoint, pieItems);

        if (closestItem == null || hoveredItem?.id !== closestItem.id) {
            return;
        }

        if (closestItem.type === 'app') {
            RNLauncherKitHelper.launchApplication(closestItem.packageName);
        } else if (
            closestItem.type === 'browserAction' &&
            defaultBrowser != null
        ) {
            RNLauncherKitHelper.launchApplication(defaultBrowser, {
                action: IntentAction.VIEW,
                data: closestItem.url,
            });
        }
    }, [
        center,
        currentTouchPoint,
        reset,
        pieItems,
        hoveredItem?.id,
        defaultBrowser,
    ]);

    const onPanFailed = useCallback(
        (point: Point) => {
            if (isCloseToBorder(point)) {
                setIsCustomizing(true);
            } else {
                reset();
            }
        },
        [isCloseToBorder, reset],
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

            const closestItem = findClosestItem(touchPoint, pieItems);
            if (closestItem != null && center != null) {
                const distanceClosestItemToTouchPoint = getDistance(
                    touchPoint,
                    { x: closestItem.x, y: closestItem.y },
                );
                const distanceToCenter = getDistance(touchPoint, center);

                const isInsidePie = distanceToCenter <= CIRCLE_RADIUS;
                const shouldHover = isInsidePie
                    ? distanceClosestItemToTouchPoint <= HOVER_THRESHOLD
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
        [pieItems, center, hoveredItem?.id],
    );

    const timeout = useRef<NodeJS.Timeout>(null);

    const handleAppLongPress = useCallback(
        (item: AppPieItem) => {
            const isDefaultBrowser = item.packageName === defaultBrowser;

            if (
                isDefaultBrowser &&
                currentLayerId !== BROWSER_ACTIONS_RESERVED_LAYER_ID
            ) {
                setCurrentLayerId(BROWSER_ACTIONS_RESERVED_LAYER_ID);
                setCenter(
                    getSafePosition({
                        x: item.x,
                        y: item.y,
                    }),
                );
                setHoveredItem(undefined);
            } else if (shortcuts.length > 0) {
                const pos = {
                    x: item.x,
                    y: item.y,
                };

                if (item.y >= screenDimensions.height / 2) {
                    pos.y -= 20 + shortcuts.length * 60; // Open menu then from bottom to top
                }

                setShortcutDropdownAnchor(pos);
            }
        },
        [currentLayerId, defaultBrowser, shortcuts.length],
    );

    const handleLayerSwitchLongPress = (item: LayerSwitchPieItem) => {
        setCurrentLayerId(item.targetLayerId);
        setCenter(
            getSafePosition({
                x: item.x,
                y: item.y,
            }),
        );
        setHoveredItem(undefined);
    };

    /**
     * When a link item is hovered for 300ms, the next pie is rendered.
     */
    useEffect(() => {
        if (hoveredItem?.type === 'layerSwitch') {
            timeout.current = setTimeout(
                () => handleLayerSwitchLongPress(hoveredItem),
                300,
            );
        } else if (hoveredItem?.type === 'app') {
            timeout.current = setTimeout(
                () => handleAppLongPress(hoveredItem),
                300,
            );
        }

        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, [currentLayerId, defaultBrowser, handleAppLongPress, hoveredItem]);

    const getPieItem = useCallback(
        (item: PieItem) => {
            switch (item.type) {
                case 'app':
                    return <AppItem pieItem={item} />;
                case 'layerSwitch':
                    return (
                        <LayerSwitchItem
                            isHovered={hoveredItem?.id === item.id}
                            link={item}
                        />
                    );
                case 'browserAction':
                    return <BrowserActionItem action={item} />;
                default:
                    return null;
            }
        },
        [hoveredItem?.id],
    );

    if (isCustomizing) {
        return (
            <View className={'flex-1'}>
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
        <View className={'flex-1'}>
            <GestureHandlerRootView>
                <PanGestureHandler
                    onGestureEvent={onGestureEvent}
                    onHandlerStateChange={onHandlerStateChange}
                >
                    <View
                        className={
                            'flex-1 justify-center items-center relative'
                        }
                    >
                        {shortcutDropdownAnchor != null && (
                            <View
                                className={
                                    'absolute z-10 -translate-x-1/2 rounded-lg dark:bg-gray-700 dark:text-white bg-gray-200 text-black'
                                }
                                style={{
                                    top: shortcutDropdownAnchor.y,
                                    left: shortcutDropdownAnchor.x,
                                }}
                            >
                                <View className={'flex flex-col'}>
                                    {shortcuts.map(s => (
                                        <View
                                            className={
                                                'flex flex-row items-center gap-3 p-3'
                                            }
                                            key={s.id}
                                        >
                                            <View>
                                                <Image
                                                    className={'size-10'}
                                                    src={s.icon}
                                                />
                                            </View>
                                            <View>
                                                <Text
                                                    className={
                                                        'dark:text-white text-black'
                                                    }
                                                >
                                                    {s.label}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        {shouldShowPie &&
                            pieItems.map(item => (
                                <View
                                    className={clsx(
                                        'absolute rounded-full -translate-x-1/2 -translate-y-1/2 justify-center items-center',
                                        shortcutDropdownAnchor != null &&
                                            item.id !== hoveredItem?.id &&
                                            'opacity-20',
                                    )}
                                    style={[
                                        { left: item.x, top: item.y },
                                        {
                                            height: Math.floor(
                                                PIE_ITEM_BASE_SIZE *
                                                    item.scaleFactor,
                                            ),
                                            width: Math.floor(
                                                PIE_ITEM_BASE_SIZE *
                                                    item.scaleFactor,
                                            ),
                                        },
                                    ]}
                                    key={item.id}
                                >
                                    {getPieItem(item)}
                                </View>
                            ))}
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
    layers: Layer[],
    apps: AppDetail[],
): PieItem | undefined {
    if (typeof item === 'number') {
        return createDefaultLayerSwitchPieItem(
            `pie-link-${item}`,
            layers.find(l => l.id === item)?.color ?? '#FFFFFF',
            item,
        );
    }

    const appDetail = apps.find(a => a.packageName === item);

    if (appDetail == null) {
        return undefined;
    }

    return createDefaultAppPieItem(
        `pie-app-${appDetail.packageName}`,
        appDetail.icon,
        appDetail.packageName,
    );
}

const PIE_ITEM_BASE_SIZE = 57;
