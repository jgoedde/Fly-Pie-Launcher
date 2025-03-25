import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Image, StyleSheet, Text, Vibration, View } from 'react-native';
import {
    GestureEvent,
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from 'react-native-gesture-handler';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';
import { HandlerStateChangeEvent } from 'react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon';
import type { PanGestureHandlerEventPayload } from 'react-native-gesture-handler/lib/typescript/handlers/GestureHandlerEventPayload';
import Icon from '@react-native-vector-icons/fontawesome6';
import { useInstalledApps } from './use-installed-apps.ts';
import {
    calculateItemPositions,
    findClosestItem,
    getSafePosition,
} from './pieUtils.ts';

type Point = { x: number; y: number };

type PieItem = {
    accent: string;
    id: string;

    /**
     * An optional link to another pie layer.
     */
    toLayerId?: number;
    iconUrl?: string;
    packageId?: string;
};

type PieItemWithDistance = PieItem & {
    left: number;
    top: number;
    distance: number;
};

export const CIRCLE_RADIUS = 120; // Distance from center
export const HOVER_THRESHOLD = 30; // Max distance to trigger hover effect

type LayerMap = Array<Layer>;

type Layer = {
    id: number;
    name: string;
    isBaseLayer: boolean;
    items: Array<
        string | { linkId: number; faIconCode: string; accentColor: string }
    >;
};

const layers: LayerMap = [
    {
        id: 1,
        name: 'Home',
        isBaseLayer: true,
        items: [
            'com.whatsapp',
            'app.grapheneos.camera',
            'org.mozilla.firefox',
            'com.google.android.apps.maps',
            { linkId: 2, faIconCode: 'arrow-up', accentColor: '#800080' },
        ],
    },
    {
        id: 2,
        name: 'Second level',
        isBaseLayer: false,
        items: [
            { linkId: 1, faIconCode: 'arrow-down', accentColor: '#ff0000' },
            'app.revanced.android.youtube',
            'me.zhanghai.android.files',
        ],
    },
];

export default function App() {
    const [shouldShowPie, setShouldShowPie] = useState(false);
    const [center, setCenter] = useState<Point | undefined>();
    const [finalTouch, setFinalTouch] = useState<Point | undefined>();
    const [hoveredItem, setHoveredItem] = useState<PieItemWithDistance>();
    const [currentLayerId, setCurrentLayerId] = useState(1);

    const currentLayer = useMemo<Layer>(() => {
        return layers.find(layer => layer.id === currentLayerId)!;
    }, [currentLayerId]);

    useEffect(() => {
        console.log(currentLayer, 'currentLayer');
        console.log(currentLayerId, 'currentLayerId');
    }, [currentLayer, currentLayerId]);

    const { apps } = useInstalledApps();

    const pieItems = useMemo<PieItem[]>(() => {
        return currentLayer.items
            .map(item => {
                if (typeof item === 'object') {
                    return {
                        id: `pie-link-${item.linkId}`,
                        toLayerId: item.linkId,
                        accent: item.accentColor,
                        // @ts-expect-error -- something
                        iconUrl: Icon.getImageSourceSync(
                            'solid',
                            item.faIconCode,
                            42,
                            '#fff',
                        ).uri,
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
                    accent: appDetail.accentColor ?? '#000',
                } as PieItem;
            })
            .filter((i: PieItem | undefined): i is PieItem => !!i);
    }, [apps, currentLayerId]);

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
                !closestItem.toLayerId &&
                hoveredItem?.id === closestItem.id
            ) {
                onAppSelect(closestItem);
            }
        }

        setShouldShowPie(false);
        setCenter(undefined);
        setFinalTouch(undefined);
        setHoveredItem(undefined);
        setCurrentLayerId(1);
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
                        center != null &&
                        !currentLayer.isBaseLayer && (
                            <Text
                                style={{
                                    position: 'absolute',
                                    left: center.x,
                                    top: center.y - 60,
                                    fontSize: 32,
                                    transform: [
                                        { translateX: '-50%' },
                                        { translateY: '-50%' },
                                    ],
                                }}
                            >
                                {currentLayer.name}
                            </Text>
                        )}
                    {shouldShowPie &&
                        center != null &&
                        itemPositions.map(item => (
                            <View
                                style={[
                                    styles.app,
                                    { left: item.left, top: item.top },
                                    hoveredItem?.id === item.id && {
                                        backgroundColor: item.accent,
                                    },
                                ]}
                                key={item.id}
                            >
                                <View
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '100%',
                                    }}
                                >
                                    <Image
                                        style={[
                                            styles.icon,
                                            {
                                                ...(item.toLayerId != null && {
                                                    marginLeft: 7,
                                                }),
                                            },
                                        ]}
                                        src={item.iconUrl}
                                    />
                                </View>
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
        position: 'relative',
    },
    app: {
        position: 'absolute',
        borderRadius: '100%',
        width: 88,
        height: 88,
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    },
    icon: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        margin: 'auto',
        width: '65%',
        height: '65%',
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    },
});
