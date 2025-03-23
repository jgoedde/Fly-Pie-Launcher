import React, {useCallback, useState} from 'react';
import {StyleSheet, Text, Vibration, View} from 'react-native';
import {
    GestureHandlerRootView,
    PanGestureHandler,
    State,
} from 'react-native-gesture-handler';
import {Point} from 'react-native-gesture-handler/lib/typescript/web/interfaces';

type AppOrSomething = {name: string; packageId: string};

const apps: AppOrSomething[] = [
    {name: 'W', packageId: 'com.whatsapp'},
    {name: 'M', packageId: 'TODO'},
    {name: 'A', packageId: 'TODO'},
    {name: 'B', packageId: 'TODO'},
    {name: 'C', packageId: 'TODO'},
    {name: 'D', packageId: 'TODO'},
    {name: 'E', packageId: 'TODO'},
];

const CIRCLE_RADIUS = 111; // Distance from center
const HOVER_THRESHOLD = 30; // Max distance to trigger hover effect

type AppWithDistance = AppOrSomething & {distance: number};

export default function App() {
    const [shouldShowPie, setShouldShowPie] = useState(false);
    const [center, setCenter] = useState<Point | undefined>();
    const [finalTouch, setFinalTouch] = useState<Point | undefined>();
    const [hoveredApp, setHoveredApp] = useState<string | null>(null);

    const getAppPositions = useCallback(() => {
        if (!center) {
            return [];
        }

        return apps.map((_, i) => {
            const angle = (i / apps.length) * (2 * Math.PI);
            return {
                left: center.x + CIRCLE_RADIUS * Math.cos(angle),
                top: center.y + CIRCLE_RADIUS * Math.sin(angle),
                name: apps[i].name,
                packageId: apps[i].packageId,
            };
        });
    }, [center]);

    const getClosestApp = useCallback<
        (touchPoint: Point) => AppWithDistance | null
    >(
        touchPoint => {
            const positions = getAppPositions();
            let closestApp: AppWithDistance | null = null;
            let minDistance = Infinity;

            positions.forEach(app => {
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
        },
        [getAppPositions],
    );

    const onGestureEvent = useCallback(
        (event: any) => {
            const touchPoint = {
                x: event.nativeEvent.x - 10, // Apply offset
                y: event.nativeEvent.y - 25,
            };
            setFinalTouch(touchPoint);

            const closestApp = getClosestApp(touchPoint);

            if (closestApp && center) {
                const distanceToCenter = Math.sqrt(
                    Math.pow(touchPoint.x - center.x, 2) +
                        Math.pow(touchPoint.y - center.y, 2),
                );

                const isInsidePie = distanceToCenter <= CIRCLE_RADIUS; // Check if inside circle

                if (isInsidePie && closestApp.distance <= HOVER_THRESHOLD) {
                    if (closestApp.name !== hoveredApp) {
                        setHoveredApp(closestApp.name);
                        Vibration.vibrate(10); // Short vibration only inside pie
                    }
                } else if (!isInsidePie) {
                    setHoveredApp(closestApp.name); // Outside circle → Auto-select closest
                    if (closestApp.name !== hoveredApp) {
                        Vibration.vibrate(10); // Short vibration only inside pie
                    }
                } else {
                    setHoveredApp(null); // Reset if too far inside the pie
                }
            } else {
                setHoveredApp(null); // Reset if no app found
            }
        },
        [center, getClosestApp, hoveredApp],
    );

    const onHandlerStateChange = (event: any) => {
        if (event.nativeEvent.state === State.BEGAN) {
            setShouldShowPie(true);
            setHoveredApp(null);
            setCenter({
                x: event.nativeEvent.x,
                y: event.nativeEvent.y,
            });
        } else if (event.nativeEvent.state === State.END) {
            if (center && finalTouch) {
                const selectedApp = getClosestApp(finalTouch);
                if (selectedApp && hoveredApp === selectedApp.name) {
                    console.log(selectedApp, 'selectedApp');
                }
            }
            setShouldShowPie(false);
            setCenter(undefined);
            setFinalTouch(undefined);
            setHoveredApp(null);
        }
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}>
                <View style={styles.fullScreen}>
                    <Text>Touch and hold anywhere.</Text>
                    {shouldShowPie &&
                        center &&
                        getAppPositions().map((item, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.icon,
                                    {
                                        left: item.left,
                                        top: item.top,
                                    },
                                    hoveredApp === item.name &&
                                        styles.hoveredIcon, // Highlight hovered app
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
