import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Dimensions, Vibration, View } from 'react-native';
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
    createDefaultLayerSwitchPieItem,
    LayerSwitchPieItem,
    PieItem,
} from './pie/pieItem.ts';
import {
    Layer,
    LayerItem,
    useLayerConfig,
} from './pie/layers/use-layer-config.ts';
import { AppDetail } from 'react-native-launcher-kit/typescript/Interfaces/InstalledApps';
import PieCustomizer from './pie/PieCustomizer.tsx';
import { LayerSwitchItem } from './pie/LayerSwitchItem.tsx';
import { AppItem } from './pie/AppItem.tsx';
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
import { ShortcutUtils } from './ShortcutUtils.ts';
import { clamp } from 'react-native-reanimated';
import {
    MENU_ITEM_HEIGHT,
    MENU_WIDTH,
    PopoverMenu,
} from './pie/PopoverMenu.tsx';
import {
    AppPopoverItem,
    PopoverItem,
    UrlPopoverItem,
} from './pie/popover-item.ts';

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
    const [isCustomizing, setIsCustomizing] = useState(false);
    const shortcuts = useShortcuts(
        hoveredItem?.type === 'app' ? hoveredItem.packageName : undefined,
    );
    const [currentDropDownTouchPoint, setCurrentDropDownTouchPoint] =
        useState<Point>();
    const [selectedPopoverItem, setSelectedPopoverItem] =
        useState<PopoverItem>();
    const [popoverAnchor, setPopoverAnchor] = useState<Point | undefined>(
        undefined,
    );
    const [popoverItems, setPopoverItems] = useState<PopoverItem[]>([]);

    useEffect(() => {
        if (shortcuts.length === 0) {
            setPopoverAnchor(undefined);
        }
    }, [shortcuts]);

    const shouldShowPie = useMemo(() => {
        return center != null;
    }, [center]);

    /**
     * Resets the state. Switches back to the home layer and sets all the gesture-related states back to initial.
     */
    const reset = useCallback(() => {
        setHoveredItem(undefined);
        setCurrentTouchPoint(undefined);
        setCenter(undefined);
        setSelectedPopoverItem(undefined);
        setPopoverAnchor(undefined);
        setCurrentDropDownTouchPoint(undefined);
    }, []);

    const pieItems = useMemo(() => {
        const tp = currentTouchPoint ?? center;

        if (tp == null || center == null) {
            return [];
        }

        const baseLayer = layers.find(l => l.isBaseLayer);

        const items: PieItem[] = [];

        items.push(
            ...((baseLayer?.items ?? []) as LayerItem[])
                // convert items from the layer configuration into internal pie items.
                // Either an app link or a link to another pie layer.
                .map(i => toPieItem(i, layers, apps))
                // filter out apps that could not have been resolved
                .filter((i: PieItem | undefined): i is PieItem => !!i),
        );

        return scaleItems(tp, center, calculateItemPositions(center, items));
    }, [apps, center, currentTouchPoint, layers]);

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

        if (selectedPopoverItem?.type === 'shortcut') {
            void ShortcutUtils.launchShortcut(
                selectedPopoverItem.packageName,
                selectedPopoverItem.id,
            );
        } else if (selectedPopoverItem?.type === 'app') {
            RNLauncherKitHelper.launchApplication(
                selectedPopoverItem.packageName,
            );
        } else if (
            selectedPopoverItem?.type === 'url' &&
            defaultBrowser != null
        ) {
            RNLauncherKitHelper.launchApplication(defaultBrowser, {
                action: IntentAction.VIEW,
                data: selectedPopoverItem.url,
            });
        } else if (hoveredItem.type === 'app') {
            RNLauncherKitHelper.launchApplication(hoveredItem.packageName);
        }
    }, [reset, hoveredItem, selectedPopoverItem, defaultBrowser]);

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

            if (popoverAnchor) {
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
        [popoverAnchor, pieItems, center, hoveredItem?.id],
    );

    const getPopoverAnchorPosition = (item: PieItem, menuHeight: number) => {
        const isTopHalf = item.y < screenDimensions.height / 2;
        return {
            x: clamp(
                item.x - MENU_WIDTH / 2,
                0,
                screenDimensions.width - MENU_WIDTH,
            ),
            y: isTopHalf
                ? clamp(item.y + 30, 0, screenDimensions.height - menuHeight)
                : clamp(
                      item.y - menuHeight - 30,
                      0,
                      screenDimensions.height - menuHeight,
                  ),
        };
    };
    const handleShortcutsLongPress = useCallback(
        (item: AppPieItem) => {
            if (shortcuts.length <= 0) {
                return;
            }

            Vibration.vibrate(10);

            const menuHeight = MENU_ITEM_HEIGHT * shortcuts.length;

            setPopoverItems(
                shortcuts.map(s => ({
                    type: 'shortcut',
                    id: s.id,
                    icon: s.icon,
                    packageName: s.package,
                    label: s.label,
                })),
            );

            setPopoverAnchor(getPopoverAnchorPosition(item, menuHeight));
        },
        [shortcuts],
    );

    const handleLayerSwitchLongPress = useCallback(
        (item: LayerSwitchPieItem) => {
            const items = (
                layers.find(l => l.id === item.targetLayerId)?.items ?? []
            )
                .map(layerItem => {
                    const app = apps.find(x => x.packageName === layerItem);

                    if (!app) {
                        return undefined;
                    }

                    return {
                        type: 'app',
                        label: app.label,
                        icon: app.icon,
                        id: `dropdown-app-${layerItem}`,
                        packageName: layerItem,
                    } as AppPopoverItem;
                })
                .filter(i => !!i) as AppPopoverItem[];

            setPopoverItems(items);

            setPopoverAnchor(
                getPopoverAnchorPosition(item, MENU_ITEM_HEIGHT * items.length),
            );
        },
        [apps, layers],
    );

    const timeout = useRef<NodeJS.Timeout>(null);

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
            hoveredItem.packageName === defaultBrowser
        ) {
            timeout.current = setTimeout(() => {
                const items = browserActions
                    .map(browserAction => {
                        return {
                            type: 'url',
                            icon: browserAction.image,
                            id: `dropdown-url-${browserAction.url}`,
                            url: browserAction.url,
                            label: browserAction.label,
                        } as UrlPopoverItem;
                    })
                    .filter(i => !!i) as UrlPopoverItem[];

                setPopoverItems(items);

                setPopoverAnchor(
                    getPopoverAnchorPosition(
                        hoveredItem,
                        MENU_ITEM_HEIGHT * items.length,
                    ),
                );
            }, 300);
        }

        return () => {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, [
        browserActions,
        defaultBrowser,
        handleLayerSwitchLongPress,
        handleShortcutsLongPress,
        hoveredItem,
    ]);

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
                default:
                    return null;
            }
        },
        [hoveredItem?.id],
    );

    const prevSelectedRef = useRef<PopoverItem | undefined>(undefined);

    useEffect(() => {
        if (!popoverAnchor || !currentDropDownTouchPoint) {
            return;
        }

        // Extract dropdown box coordinates
        const { x: boxX, y: boxY } = popoverAnchor;
        const boxWidth = MENU_WIDTH;
        const boxHeight = MENU_ITEM_HEIGHT * popoverItems.length;
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

        let newSelected: PopoverItem | undefined;

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
                newSelected = popoverItems[index];
            }
        } else {
            // If thumb is outside extended bounds, close the menu
            setPopoverAnchor(undefined);
            setCurrentDropDownTouchPoint(undefined);
            setSelectedPopoverItem(undefined);
        }

        // Prevent unnecessary updates
        if (prevSelectedRef.current !== newSelected) {
            prevSelectedRef.current = newSelected;
            setSelectedPopoverItem(newSelected);
        }
    }, [currentDropDownTouchPoint, popoverAnchor, popoverItems]);

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
                        {popoverAnchor != null && (
                            <PopoverMenu
                                anchor={popoverAnchor}
                                items={popoverItems}
                                selectedPopoverItem={selectedPopoverItem}
                            />
                        )}
                        {shouldShowPie &&
                            pieItems.map(item => (
                                <View
                                    className={clsx(
                                        'absolute rounded-full -translate-x-1/2 -translate-y-1/2 justify-center items-center',
                                        popoverAnchor != null &&
                                            item.id !== hoveredItem?.id &&
                                            'opacity-40',
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
