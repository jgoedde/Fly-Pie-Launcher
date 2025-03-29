import { Image } from 'react-native';
import React from 'react';
import { AppPieItem } from './pieItem.ts';

export function AppItem({ pieItem }: { pieItem: AppPieItem }) {
    return (
        <Image
            className={'absolute top-1/2 left-1/2 m-auto w-full h-full'}
            style={{
                transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
            }}
            src={pieItem.iconBase64}
        />
    );
}
