import { convertToRGBA } from '../colorUtils.ts';
import { Text } from 'react-native';
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
            className={
                'font-bold mx-auto w-full h-full text-center text-white rounded-full'
            }
            style={[
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
