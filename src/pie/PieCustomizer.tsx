import {
    Alert,
    BackHandler,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { LayerSchema, useLayerConfig } from './layers/use-layer-config.ts';
import { useInstalledApps } from '../installed-apps/use-installed-apps.ts';
import { z, ZodError } from 'zod';

export default function PieCustomizer({ exit }: { exit: () => void }) {
    const { apps } = useInstalledApps();
    const { layers, setLayers } = useLayerConfig();
    const [layersStr, setLayersStr] = useState<string>(
        JSON.stringify(layers, undefined, 2),
    );

    const trySave = useCallback(() => {
        try {
            const parsedLayers = JSON.parse(layersStr);

            const parse = z
                .array(LayerSchema)
                .min(1, { message: 'At least one layer must be defined.' })
                .refine(it => it.filter(l => l.isBaseLayer).length === 1, {
                    message: 'There must be a maximum of one base layer',
                })
                .parse(parsedLayers);

            setLayers(parse);
        } catch (e) {
            if (e instanceof ZodError) {
                displayZodErrors(e);
            } else if (e instanceof Error) {
                Alert.alert(
                    'Layers',
                    'An unknown error occurred.\n' + e.message,
                );
            }
            setLayersStr(JSON.stringify(layers, undefined, 2));
        }
    }, [layers, layersStr, setLayers]);

    const displayZodErrors = (error: ZodError) => {
        if (!error || !error.errors) {
            return;
        }

        // Format error messages
        const errorMessages = error.errors.map(err => {
            const fieldPath =
                err.path.length > 0 ? err.path.join(' → ') : 'General Error'; // Handle global errors
            return `${fieldPath}: ${err.message}`;
        });

        // Show Alert dialog
        Alert.alert('Validation Errors', errorMessages.join('\n\n'), [
            { text: 'OK' },
        ]);
    };
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
        <View className={'flex flex-col justify-center items-center'}>
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
