import {
    Alert,
    Animated,
    Button,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    useColorScheme,
    View,
} from 'react-native';
import React, { useState } from 'react';
import {
    DEFAULT_LAYERS,
    Layer,
    LayerLink,
    Layers,
    LayersSchema,
} from './use-layer-config.ts';
import { ZodError } from 'zod';
import { PackageName } from './use-installed-apps.ts';
import FlatList = Animated.FlatList;

export default function PieCustomizer({ exit }: { exit: () => void }) {
    // const { apps } = useInstalledApps();
    // const { layers, setLayers } = useLayerConfig();
    const [layersLocal, setLayersLocal] = useState<Layers>(DEFAULT_LAYERS);
    const colorScheme = useColorScheme();

    const colors = {
        background: colorScheme === 'dark' ? '#121212' : '#ffffff',
        text: colorScheme === 'dark' ? '#ffffff' : '#000000',
        inputBackground: colorScheme === 'dark' ? '#333333' : '#f0f0f0',
        borderColor: colorScheme === 'dark' ? '#444444' : '#cccccc',
        buttonColor: colorScheme === 'dark' ? '#888888' : '#444444',
    };

    const handleUpdateLayer = (index: number, key: keyof Layer, value: any) => {
        const updatedLayers = [...layersLocal];
        updatedLayers[index] = { ...updatedLayers[index], [key]: value };
        setLayersLocal(updatedLayers);
    };

    const handleAddItem = (index: number, value: PackageName | LayerLink) => {
        const updatedLayers = [...layersLocal];
        updatedLayers[index].items.push(value);
        setLayersLocal(updatedLayers);
    };

    const handleUpdateItem = (
        index: number,
        itemIndex: number,
        value: PackageName | LayerLink,
    ) => {
        const updatedLayers = [...layersLocal];
        updatedLayers[index].items[itemIndex] = value;
        setLayersLocal(updatedLayers);
    };

    const handleRemoveItem = (layerIndex: number, itemIndex: number) => {
        const updatedLayers = [...layersLocal];
        updatedLayers[layerIndex].items.splice(itemIndex, 1);
        setLayersLocal(updatedLayers);
    };

    const handleAddLayer = () => {
        const newLayer: Layer = {
            id: layersLocal.length + 1,
            name: `New Layer ${layersLocal.length + 1}`,
            color: '#ffffff',
            isBaseLayer: false,
            items: [],
        };
        setLayersLocal([...layersLocal, newLayer]);
    };

    const handleRemoveLayer = (index: number) => {
        if (layersLocal.length === 1) {
            Alert.alert('Error', 'At least one layer must exist.');
            return;
        }
        const updatedLayers = layersLocal.filter((_, i) => i !== index);
        setLayersLocal(updatedLayers);
    };

    const handleValidate = () => {
        try {
            LayersSchema.parse(layersLocal);
            Alert.alert('Validation', 'All layers are valid!');
        } catch (e) {
            if (e instanceof ZodError) {
                Alert.alert(
                    'Validation Error',
                    e.errors.map(err => err.message).join('\n'),
                );
            }
        }
    };

    return (
        <FlatList
            data={layersLocal}
            style={[
                styles.flatList,
                {
                    backgroundColor: colors.background,
                },
            ]}
            contentContainerStyle={styles.contentContainer}
            ListHeaderComponent={
                <Text
                    style={[
                        styles.headline,
                        {
                            color: colors.text,
                        },
                    ]}
                >
                    Edit Layers
                </Text>
            }
            ListFooterComponent={
                <View style={styles.listFooter}>
                    <Button
                        title="Add Layer"
                        onPress={handleAddLayer}
                        color={colors.buttonColor}
                    />
                    <Button
                        title="Validate Layers"
                        onPress={handleValidate}
                        color={colors.buttonColor}
                    />

                    <Button
                        title="Save"
                        onPress={handleValidate}
                        color={colors.buttonColor}
                    />
                </View>
            }
            keyExtractor={layer => layer.id.toString()}
            renderItem={({ item, index }) => (
                <View
                    style={[
                        styles.layerWrapper,
                        {
                            borderColor: colors.borderColor,
                        },
                    ]}
                >
                    <Text style={{ color: colors.text }}>ID: {item.id}</Text>
                    <TextInput
                        placeholder="Layer Name"
                        placeholderTextColor={
                            colorScheme === 'dark' ? '#bbb' : '#666'
                        }
                        value={item.name}
                        onChangeText={text =>
                            handleUpdateLayer(index, 'name', text)
                        }
                        style={[
                            styles.layerTextInput,
                            {
                                backgroundColor: colors.inputBackground,
                                color: colors.text,
                            },
                        ]}
                    />
                    <TextInput
                        placeholder="Color (#hex)"
                        placeholderTextColor={
                            colorScheme === 'dark' ? '#bbb' : '#666'
                        }
                        value={item.color}
                        onChangeText={text =>
                            handleUpdateLayer(index, 'color', text)
                        }
                        style={[
                            styles.layerTextInput,
                            {
                                backgroundColor: colors.inputBackground,
                                color: colors.text,
                            },
                        ]}
                    />
                    <View style={styles.baseLayer}>
                        <Text style={{ color: colors.text }}>Base Layer: </Text>
                        <Switch
                            value={item.isBaseLayer || false}
                            onValueChange={val =>
                                handleUpdateLayer(index, 'isBaseLayer', val)
                            }
                        />
                    </View>

                    <Text style={{ color: colors.text }}>Items:</Text>
                    {item.items.map((layerItem, itemIndex) => (
                        <View key={itemIndex} style={styles.layerItemWrapper}>
                            <TextInput
                                placeholder="Package name or link to other layer (ID)"
                                placeholderTextColor={
                                    colorScheme === 'dark' ? '#bbb' : '#666'
                                }
                                value={layerItem ?? ''}
                                onChangeText={text =>
                                    handleUpdateItem(index, itemIndex, text)
                                }
                                style={[
                                    styles.layerTextInput,
                                    {
                                        backgroundColor: colors.inputBackground,
                                        flex: 1,
                                        color: colors.text,
                                    },
                                ]}
                            />
                            <Button
                                title="Remove"
                                onPress={() =>
                                    handleRemoveItem(index, itemIndex)
                                }
                                color="red"
                            />
                        </View>
                    ))}

                    <View style={{ display: 'flex', gap: 5 }}>
                        <Button
                            title="Add App"
                            onPress={() =>
                                handleAddItem(index, 'new.package.name')
                            }
                            color={colors.buttonColor}
                        />
                        <Button
                            title="Add layer link"
                            onPress={() =>
                                handleAddItem(index, item.items.length + 1)
                            }
                            color={colors.buttonColor}
                        />
                        <Button
                            title="Remove Layer"
                            onPress={() => handleRemoveLayer(index)}
                            color="red"
                        />
                    </View>
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    flatList: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 80,
        paddingBottom: 40,
    },
    headline: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    listFooter: { display: 'flex', gap: 5 },
    layerWrapper: {
        marginBottom: 20,
        padding: 10,
        borderWidth: 1,
        borderRadius: 5,
    },
    layerTextInput: {
        borderBottomWidth: 1,
        marginBottom: 10,
        padding: 5,
    },
    baseLayer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    layerItemWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
});
