import { convertToRGBA } from '../colorUtils.ts';
import { StyleSheet, Text } from 'react-native';
import React from 'react';
import { LayerSwitchPieItem } from './pieItem.ts';

export function LayerSwitchItem({
    isHovered,
    link,
}: {
    isHovered: boolean;
    link: LayerSwitchPieItem;
}) {
    return (
        <Text
            style={[
                styles.layerItem,
                {
                    fontSize: Math.floor(44 * link.scaleFactor),
                },
                {
                    backgroundColor:
                        'rgba' +
                        convertToRGBA(link.accent, isHovered ? '1.0' : '0.5'),
                },
            ]}
        >
            {link.targetLayerId}
        </Text>
    );
}

const styles = StyleSheet.create({
    layerItem: {
        fontWeight: 700,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        height: '100%',
        textAlign: 'center',
        textAlignVertical: 'center',
        color: 'white',
        borderRadius: 100,
    },
});
