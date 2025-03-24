import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    Vibration,
    View,
} from "react-native";
import {
    GestureEvent,
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from "react-native-gesture-handler";
import { AppDetail } from "react-native-launcher-kit/typescript/Interfaces/InstalledApps";
import { InstalledApps, RNLauncherKitHelper } from "react-native-launcher-kit";
import { HandlerStateChangeEvent } from "react-native-gesture-handler/lib/typescript/handlers/gestureHandlerCommon";
import type { PanGestureHandlerEventPayload } from "react-native-gesture-handler/lib/typescript/handlers/GestureHandlerEventPayload";

type Point = { x: number; y: number };

type AppOrSomething = {
    name: string;
    packageId: string;
    iconUrl: string;
    accent: string;
};

type AppWithDistance = AppOrSomething & {
    left: number;
    top: number;
    distance: number;
};

const CIRCLE_RADIUS = 111; // Distance from center
const HOVER_THRESHOLD = 30; // Max distance to trigger hover effect

type AppPosition = AppOrSomething & { left: number; top: number };

/** Calculates positions for the apps around the center */
const calculateAppPositions: (
    center: Point,
    apps: AppOrSomething[]
) => AppPosition[] = (center, apps) => {
    return apps.map((app, i) => {
        const angle = (i / apps.length) * (2 * Math.PI);
        return {
            left: center.x + CIRCLE_RADIUS * Math.cos(angle),
            top: center.y + CIRCLE_RADIUS * Math.sin(angle),
            name: app.name,
            packageId: app.packageId,
            iconUrl: app.iconUrl,
            accent: app.accent,
        };
    });
};

/** Finds the closest app based on the touch position */
const findClosestApp: (
    touchPoint: Point,
    appPositions: AppPosition[]
) => AppWithDistance | null = (touchPoint, appPositions) => {
    let closestApp: AppWithDistance | null = null;
    let minDistance = Infinity;

    appPositions.forEach((app) => {
        const distance = Math.sqrt(
            Math.pow(touchPoint.x - app.left, 2) +
                Math.pow(touchPoint.y - app.top, 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestApp = { ...app, distance };
        }
    });

    return closestApp;
};

function useInstalledApps() {
    const [appDetails, setAppDetails] = useState<AppDetail[]>([]);

    const queryApps = useCallback(async () => {
        const allApps = await InstalledApps.getApps({
            includeVersion: false,
            includeAccentColor: true,
        });

        setAppDetails([
            allApps[0],
            allApps[21],
            allApps[12],
            allApps[45],
            allApps[9],
            allApps[15],
            allApps[55],
        ]);
    }, []);

    useEffect(() => {
        void queryApps();
    }, [queryApps]);

    const apps = useMemo<AppOrSomething[]>(() => {
        return appDetails.map((a) => ({
            name: a.label,
            packageId: a.packageName,
            iconUrl: a.icon,
            accent: a.accentColor ?? "#000000",
        }));
    }, [appDetails]);

    return { apps };
}

const windowDimensions = Dimensions.get("window");

export default function App() {
    const [shouldShowPie, setShouldShowPie] = useState(false);
    const [center, setCenter] = useState<Point | undefined>();
    const [finalTouch, setFinalTouch] = useState<Point | undefined>();
    const [hoveredApp, setHoveredApp] = useState<string | null>(null);

    const { apps } = useInstalledApps();

    const appPositions = useMemo(
        () => (center ? calculateAppPositions(center, apps) : []),
        [apps, center]
    );

    const onAppSelect = useCallback((app: AppOrSomething) => {
        console.log(app, "app");
        RNLauncherKitHelper.launchApplication(app.packageId);
    }, []);

    const onPanStart = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            let newCenter = {
                x: event.nativeEvent.x,
                y: event.nativeEvent.y,
            };

            // Ensure the pie stays within screen bounds
            if (newCenter.x + CIRCLE_RADIUS > windowDimensions.width) {
                newCenter.x = windowDimensions.width - CIRCLE_RADIUS;
            } else if (newCenter.x - CIRCLE_RADIUS < 0) {
                newCenter.x = CIRCLE_RADIUS;
            }

            if (newCenter.y + CIRCLE_RADIUS > windowDimensions.height) {
                newCenter.y = windowDimensions.height - CIRCLE_RADIUS;
            } else if (newCenter.y - CIRCLE_RADIUS < 0) {
                newCenter.y = CIRCLE_RADIUS;
            }

            setShouldShowPie(true);
            setHoveredApp(null);
            setCenter(newCenter);
        },
        []
    );

    const onPanEnd = useCallback(() => {
        if (center && finalTouch) {
            const selectedApp = findClosestApp(finalTouch, appPositions);
            if (selectedApp && hoveredApp === selectedApp.name) {
                onAppSelect(selectedApp);
            }
        }

        setShouldShowPie(false);
        setCenter(undefined);
        setFinalTouch(undefined);
        setHoveredApp(null);
    }, [appPositions, center, finalTouch, hoveredApp, onAppSelect]);

    const onHandlerStateChange = useCallback(
        (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
            if (event.nativeEvent.state === State.BEGAN) {
                onPanStart(event);
            } else if (
                event.nativeEvent.state === State.END ||
                event.nativeEvent.state === State.FAILED
            ) {
                onPanEnd();
            }
        },
        [onPanEnd, onPanStart]
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

            const closestApp = findClosestApp(touchPoint, appPositions);
            if (closestApp && center) {
                const distanceToCenter = Math.sqrt(
                    Math.pow(touchPoint.x - center.x, 2) +
                        Math.pow(touchPoint.y - center.y, 2)
                );

                const isInsidePie = distanceToCenter <= CIRCLE_RADIUS;
                const shouldHover = isInsidePie
                    ? closestApp.distance <= HOVER_THRESHOLD
                    : true;

                if (shouldHover && closestApp.name !== hoveredApp) {
                    setHoveredApp(closestApp.name);
                    Vibration.vibrate(10);
                } else if (!shouldHover) {
                    setHoveredApp(null);
                }
            } else {
                setHoveredApp(null);
            }
        },
        [center, appPositions, hoveredApp]
    );

    return (
        <GestureHandlerRootView style={styles.container}>
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
                onCancelled={(a) => console.log(a, "a")}
            >
                <View style={styles.fullScreen}>
                    <Text>Touch and hold anywhere.</Text>
                    {shouldShowPie &&
                        center &&
                        appPositions.map((item, index) => (
                            <View
                                style={[
                                    styles.icon,
                                    { left: item.left, top: item.top },
                                    hoveredApp === item.name && {
                                        backgroundColor: item.accent,
                                    },
                                ]}
                                key={"pie-" + item.packageId}
                            >
                                <Image
                                    style={{
                                        width: "75%",
                                        height: "75%",
                                        margin: "auto",
                                    }}
                                    src={item.iconUrl}
                                    key={index}
                                />
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
        justifyContent: "center",
        alignItems: "center",
    },
    icon: {
        position: "absolute",
        // backgroundColor: 'lightblue',
        borderRadius: "100%",
        width: 88,
        height: 88,
        transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    },
    hoveredIcon: {
        backgroundColor: "dodgerblue", // Change color when hovered
    },
});
