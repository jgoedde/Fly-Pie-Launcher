import { Image } from 'react-native';
import React from 'react';
import { AppPieItem } from './pieItem.ts';
import { StyleProp } from 'react-native/Libraries/StyleSheet/StyleSheet';
import { ImageStyle } from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

export function AppItem({
    pieItem,
    style,
}: {
    pieItem: AppPieItem;
    style?: StyleProp<ImageStyle>;
}) {
    return (
        <Image
            className={'absolute top-1/2 left-1/2 m-auto w-full h-full'}
            style={{
                // @ts-ignore
                ...style,
                transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
            }}
            src={pieItem.iconBase64}
        />
    );
}
