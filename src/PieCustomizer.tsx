import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';

export default function PieCustomizer({ exit }: { exit: () => void }) {
    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                exit();
                return true;
            },
        );
        return () => {
            backHandler.remove(); // Remove the EventListener
        };
    }, [exit]);

    return (
        <View style={styles.fullScreen}>
            <Text
                style={{
                    fontWeight: 700,
                    fontSize: 38,
                    textAlign: 'center',
                    padding: 16,
                    backgroundColor: '#fff',
                    borderRadius: 16,
                }}
            >
                Something is going to happen here!
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
});
