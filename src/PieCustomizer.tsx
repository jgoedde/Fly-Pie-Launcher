import {
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { LayersSchema, useLayers } from './use-layers.ts';
import { useInstalledApps } from './use-installed-apps.ts';
import { ZodError } from 'zod';

export default function PieCustomizer({ exit }: { exit: () => void }) {
    const { apps } = useInstalledApps();
    const { layers, setLayers } = useLayers();
    const [layersStr, setLayersStr] = useState<string>(
        JSON.stringify(layers, undefined, 2),
    );

    const trySave = useCallback(() => {
        try {
            const parsedLayers = JSON.parse(layersStr);

            const parse = LayersSchema.parse(parsedLayers);

            setLayers(parse);
        } catch (e) {
            if (e instanceof ZodError) {
                console.error(e.toString());
            } else if (e instanceof Error) {
                console.error(e.message);
            }
            setLayersStr(JSON.stringify(layers, undefined, 2));
        }
    }, [layers, layersStr, setLayers]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                exit();
                trySave();
                return true;
            },
        );
        return () => {
            backHandler.remove(); // Remove the EventListener
        };
    }, [exit, trySave]);

    return (
        <View style={styles.fullScreen}>
            <ScrollView
                style={{
                    backgroundColor: 'white',
                    height: '70%',
                    width: '100%',
                    flexGrow: 1,
                }}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{
                    flexGrow: 1,
                }}
                automaticallyAdjustKeyboardInsets
            >
                <TextInput
                    editable
                    multiline
                    numberOfLines={4}
                    // maxLength={40}
                    style={{ height: '80%' }}
                    value={layersStr}
                    onChangeText={setLayersStr}
                />
            </ScrollView>
            <ScrollView
                style={{
                    height: '30%',
                    width: '100%',
                    backgroundColor: 'white',
                    padding: 10,
                }}
            >
                <Text
                    style={{
                        fontWeight: 'bold',
                    }}
                >
                    Installed apps:
                </Text>
                <Text>
                    {apps.map(a => `${a.label} - ${a.packageName}`).join('\n')}
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreen: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
