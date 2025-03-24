import React, {useCallback, useMemo, useState} from 'react';
import {Dimensions, StyleSheet, Text, Vibration, View} from 'react-native';
import {
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from 'react-native-gesture-handler';

type Point = {x: number; y: number};

type AppOrSomething = {name: string; packageId: string};

type AppWithDistance = AppOrSomething & {
    left: number;
    top: number;
    distance: number;
};

const CIRCLE_RADIUS = 111; // Distance from center
const HOVER_THRESHOLD = 30; // Max distance to trigger hover effect

const apps: AppOrSomething[] = [
    {name: 'W', packageId: 'com.whatsapp'},
    {name: 'M', packageId: 'TODO'},
    {name: 'A', packageId: 'TODO'},
    {name: 'B', packageId: 'TODO'},
    {name: 'C', packageId: 'TODO'},
    {name: 'D', packageId: 'TODO'},
    {name: 'E', packageId: 'TODO'},
];

type AppPosition = {left: number; top: number; name: string; packageId: string};

/** Calculates positions for the apps around the center */
const calculateAppPositions: (
    center: Point | undefined,
) => AppPosition[] = center => {
    if (!center) {
        return [];
    }

    return apps.map((app, i) => {
        const angle = (i / apps.length) * (2 * Math.PI);
        return {
            left: center.x + CIRCLE_RADIUS * Math.cos(angle),
            top: center.y + CIRCLE_RADIUS * Math.sin(angle),
            name: app.name,
            packageId: app.packageId,
        };
    });
};

/** Finds the closest app based on the touch position */
const findClosestApp: (
    touchPoint: Point,
    appPositions: AppPosition[],
) => AppWithDistance | null = (touchPoint, appPositions) => {
    let closestApp: AppWithDistance | null = null;
    let minDistance = Infinity;

    appPositions.forEach(app => {
        const distance = Math.sqrt(
            Math.pow(touchPoint.x - app.left, 2) +
                Math.pow(touchPoint.y - app.top, 2),
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestApp = {...app, distance};
        }
    });

    return closestApp;
};

const windowDimensions = Dimensions.get('window');

export default function App() {
    const [shouldShowPie, setShouldShowPie] = useState(false);
    const [center, setCenter] = useState<Point | undefined>();
    const [finalTouch, setFinalTouch] = useState<Point | undefined>();
    const [hoveredApp, setHoveredApp] = useState<string | null>(null);

    const appPositions = useMemo(() => calculateAppPositions(center), [center]);

    const onHandlerStateChange = useCallback(
        (event: any) => {
            if (event.nativeEvent.state === State.BEGAN) {
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
            } else if (event.nativeEvent.state === State.END) {
                if (center && finalTouch) {
                    const selectedApp = findClosestApp(
                        finalTouch,
                        appPositions,
                    );
                    if (selectedApp && hoveredApp === selectedApp.name) {
                        console.log(selectedApp, 'selectedApp');
                    }
                }
                setShouldShowPie(false);
                setCenter(undefined);
                setFinalTouch(undefined);
                setHoveredApp(null);
            }
        },
        [center, finalTouch, hoveredApp, appPositions],
    );

    const onGestureEvent = useCallback(
        (event: any) => {
            const touchPoint = {
                x: event.nativeEvent.x - 10, // Apply offset
                y: event.nativeEvent.y - 25,
            };
            setFinalTouch(touchPoint);

            const closestApp = findClosestApp(touchPoint, appPositions);
            if (closestApp && center) {
                const distanceToCenter = Math.sqrt(
                    Math.pow(touchPoint.x - center.x, 2) +
                        Math.pow(touchPoint.y - center.y, 2),
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
        [center, appPositions, hoveredApp],
    );

    return (
        <GestureHandlerRootView style={styles.container}>
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}>
                <View style={styles.fullScreen}>
                    <Text>Touch and hold anywhere.</Text>
                    {shouldShowPie &&
                        center &&
                        appPositions.map((item, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.icon,
                                    {left: item.left, top: item.top},
                                    hoveredApp === item.name &&
                                        styles.hoveredIcon,
                                ]}>
                                <Text>{item.name}</Text>
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
        backgroundColor: 'lightblue',
        borderRadius: '100%',
        width: 64,
        height: 64,
        transform: [{translateX: '-50%'}, {translateY: '-50%'}],
    },
    hoveredIcon: {
        backgroundColor: 'dodgerblue', // Change color when hovered
    },
});
