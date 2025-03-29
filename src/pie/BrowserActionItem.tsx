import { Image } from 'react-native';
import React from 'react';
import { BrowserActionPieItem } from './pieItem.ts';

export function BrowserActionItem({
    action,
}: {
    action: BrowserActionPieItem;
}) {
    return (
        <Image
            className={
                'absolute top-1/2 left-1/2 m-auto rounded-full w-full h-full'
            }
            style={{
                transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
            }}
            src={action.iconBase64}
        />
    );
}
