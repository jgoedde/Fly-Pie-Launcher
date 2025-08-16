import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    BackHandler,
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
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
import { AppDetail, Shortcut, ShortcutUtils } from './ShortcutUtils.ts';
import { clamp } from 'react-native-reanimated';
import {
    MENU_ITEM_HEIGHT,
    MENU_WIDTH,
    ShortcutDropdownMenu,
} from './pie/ShortcutDropdownMenu.tsx';

const screenDimensions = Dimensions.get('screen');

export default function App() {
    const { layers: oldLayers } = useLayerConfig();
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
    const [currentDropDownTouchPoint, setCurrentDropDownTouchPoint] =
        useState<Point>();
    const [selectedShortcut, setSelectedShortcut] = useState<Shortcut>();
    const [showsAllApps, setShowsAllApps] = useState<boolean>(false);

    const layers = useMemo(() => {
        return oldLayers.map(l => ({
            ...l,
            color:
                apps.find(x => x.isMonochromeIcon && x.backgroundColor != null)
                    ?.backgroundColor ?? l.color,
        }));
    }, [apps, oldLayers]);

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
        setSelectedShortcut(undefined);
        setShortcutDropdownAnchor(undefined);
        setCurrentDropDownTouchPoint(undefined);
        setShowsAllApps(false);
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

            const newCenter = getSafePosition(point);

            setHoveredItem(undefined);
            setCenter(newCenter);
        },
        [isCloseToBorder],
    );

    const onPanEnd = useCallback(() => {
        reset();

        if (!hoveredItem) {
            return;
        }

        if (selectedShortcut != null) {
            void ShortcutUtils.launchShortcut(
                selectedShortcut.package,
                selectedShortcut.id,
            );
        } else if (hoveredItem.type === 'app') {
            RNLauncherKitHelper.launchApplication(hoveredItem.packageName);
        } else if (
            hoveredItem.type === 'browserAction' &&
            defaultBrowser != null
        ) {
            RNLauncherKitHelper.launchApplication(defaultBrowser, {
                action: IntentAction.VIEW,
                data: hoveredItem.url,
            });
        }
    }, [reset, hoveredItem, selectedShortcut, defaultBrowser]);

    const onPanFailed = useCallback(
        (point: Point) => {
            if (isCloseToBorder(point)) {
                setIsCustomizing(true);
            } else {
                reset();

                setShowsAllApps(true);
            }
        },
        [isCloseToBorder, reset],
    );

    const onHandlerStateChange = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            if (showsAllApps) {
                return;
            }

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
        [onPanEnd, onPanFailed, onPanStart, showsAllApps],
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
            if (showsAllApps) {
                return;
            }

            const touchPoint = {
                x: event.nativeEvent.x,
                y: event.nativeEvent.y,
            };

            if (shortcutDropdownAnchor) {
                setCurrentDropDownTouchPoint(touchPoint);
                return;
            } else {
                setCurrentTouchPoint(touchPoint);
            }

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
        [
            showsAllApps,
            shortcutDropdownAnchor,
            pieItems,
            center,
            hoveredItem?.id,
        ],
    );

    const timeout = useRef<NodeJS.Timeout>(null);

    const handleShortcutsLongPress = useCallback(
        (item: AppPieItem) => {
            if (shortcuts.length <= 0) {
                return;
            }

            Vibration.vibrate(10);

            const isTopHalf = item.y < screenDimensions.height / 2;
            const menuHeight = MENU_ITEM_HEIGHT * shortcuts.length;
            setShortcutDropdownAnchor({
                x: clamp(
                    item.x - MENU_WIDTH / 2,
                    0,
                    screenDimensions.width - MENU_WIDTH,
                ),
                y: isTopHalf
                    ? clamp(
                          item.y + 30,
                          0,
                          screenDimensions.height - menuHeight,
                      )
                    : clamp(
                          item.y - menuHeight - 30,
                          0,
                          screenDimensions.height - menuHeight,
                      ),
            });
        },
        [shortcuts.length],
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
        } else if (
            hoveredItem?.type === 'app' &&
            hoveredItem.packageName !== defaultBrowser
        ) {
            timeout.current = setTimeout(
                () => handleShortcutsLongPress(hoveredItem),
                666,
            );
        } else if (
            hoveredItem?.type === 'app' &&
            hoveredItem.packageName === defaultBrowser &&
            currentLayerId !== BROWSER_ACTIONS_RESERVED_LAYER_ID
        ) {
            timeout.current = setTimeout(() => {
                setCurrentLayerId(BROWSER_ACTIONS_RESERVED_LAYER_ID);
                setCenter(
                    getSafePosition({ x: hoveredItem.x, y: hoveredItem.y }),
                );
                setHoveredItem(undefined);
            }, 300);
        }

        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, [currentLayerId, defaultBrowser, handleShortcutsLongPress, hoveredItem]);

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

    const prevSelectedRef = useRef<Shortcut | undefined>(undefined);

    useEffect(() => {
        if (!shortcutDropdownAnchor || !currentDropDownTouchPoint) {
            return;
        }

        // Extract dropdown box coordinates
        const { x: boxX, y: boxY } = shortcutDropdownAnchor;
        const boxWidth = MENU_WIDTH;
        const boxHeight = MENU_ITEM_HEIGHT * shortcuts.length;
        // Define extended bounds (80px for Y, 50px for X)
        const extendedBox = {
            left: boxX - 50,
            right: boxX + boxWidth + 50,
            top: boxY - 80,
            bottom: boxY + boxHeight + 80,
        };

        // Check if thumb is inside the extended boundary
        const isThumbInsideExtendedBox =
            currentDropDownTouchPoint.x >= extendedBox.left &&
            currentDropDownTouchPoint.x <= extendedBox.right &&
            currentDropDownTouchPoint.y >= extendedBox.top &&
            currentDropDownTouchPoint.y <= extendedBox.bottom;

        let newSelected;

        if (isThumbInsideExtendedBox) {
            // Check if thumb is inside the actual menu
            const isThumbInsideMenu =
                currentDropDownTouchPoint.x >= boxX &&
                currentDropDownTouchPoint.x <= boxX + boxWidth &&
                currentDropDownTouchPoint.y >= boxY &&
                currentDropDownTouchPoint.y <= boxY + boxHeight;

            if (isThumbInsideMenu) {
                const index = Math.floor(
                    (currentDropDownTouchPoint.y - boxY) / MENU_ITEM_HEIGHT,
                );
                newSelected = shortcuts[index];
            }
        } else {
            // If thumb is outside extended bounds, close the menu
            setShortcutDropdownAnchor(undefined);
            setCurrentDropDownTouchPoint(undefined);
            setSelectedShortcut(undefined);
        }

        // Prevent unnecessary updates
        if (prevSelectedRef.current !== newSelected) {
            prevSelectedRef.current = newSelected;
            setSelectedShortcut(newSelected);
        }
    }, [currentDropDownTouchPoint, shortcutDropdownAnchor, shortcuts]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (showsAllApps) {
                    reset();
                }
                return true;
            },
        );
        return () => {
            backHandler.remove(); // Remove the EventListener
        };
    }, [reset, showsAllApps]);

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

    if (showsAllApps) {
        return (
            <ScrollView
                horizontal={false}
                showsVerticalScrollIndicator
                className={'w-full flex-grow'}
                contentContainerClassName={'justify-center items-center py-14'}
                contentContainerStyle={{
                    flexGrow: 1,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 22,
                }}
            >
                {apps.map(app => (
                    <TouchableOpacity
                        key={`app-list-item-${app.packageName}`}
                        onPress={() => {
                            reset();
                            RNLauncherKitHelper.launchApplication(
                                app.packageName,
                            );
                        }}
                    >
                        <View className={'flex flex-col gap-y-3'}>
                            <View
                                className={'rounded-full'}
                                style={{
                                    width: 111,
                                    height: 64,
                                }}
                            >
                                <AppItem
                                    pieItem={{
                                        x: 0,
                                        y: 0,
                                        id: app.packageName,
                                        packageName: app.packageName,
                                        type: 'app',
                                        scaleFactor: 1,
                                        iconBase64: app.icon,
                                        accentColor: app.accentColor,
                                        isMonochromeIcon: app.isMonochromeIcon,
                                        backgroundColor: app.backgroundColor,
                                    }}
                                    style={{
                                        width: 64,
                                        height: 64,
                                    }}
                                />
                            </View>
                            <View className={'h-12'}>
                                <Text
                                    style={{
                                        borderColor: app.accentColor ?? '#000',
                                        maxWidth: 111,
                                        /* width: 44,*/
                                    }}
                                    numberOfLines={1}
                                    className={
                                        'rounded-md mx-auto text-center bg-black text-white px-3 py-1 border-2'
                                    }
                                >
                                    {app.label}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    }

    return (
        <View className={'flex-1'}>
            <GestureHandlerRootView>
                <PanGestureHandler
                    onGestureEvent={onGestureEvent}
                    onHandlerStateChange={onHandlerStateChange}
                >
                    <View className={'flex-1 relative'}>
                        {shortcutDropdownAnchor != null && (
                            <ShortcutDropdownMenu
                                anchor={shortcutDropdownAnchor}
                                shortcuts={shortcuts}
                                selectedShortcut={selectedShortcut}
                            />
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
                                    key={`pie-item-${item.id}`}
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
        appDetail.isMonochromeIcon,
        appDetail.accentColor,
        appDetail.backgroundColor,
    );
}

const PIE_ITEM_BASE_SIZE = 57;
