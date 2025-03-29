import { Image, StyleSheet } from 'react-native';
import React from 'react';
import { BrowserActionPieItem } from './pieUtils.ts';

export function BrowserActionItem({
    action,
}: {
    action: BrowserActionPieItem;
}) {
    return <Image style={styles.icon} src={action.iconBase64} />;
}

const styles = StyleSheet.create({
    icon: {
        position: 'absolute',
        top: '50%',
        borderRadius: 100,
        left: '50%',
        margin: 'auto',
        width: '100%',
        height: '100%',
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    },
});
