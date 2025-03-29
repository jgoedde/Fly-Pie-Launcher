import { Image, StyleSheet } from 'react-native';
import React from 'react';
import { AppPieItem } from './pieUtils.ts';

export function AppItem({ pieItem }: { pieItem: AppPieItem }) {
    return <Image style={styles.icon} src={pieItem.iconBase64} />;
}

const styles = StyleSheet.create({
    icon: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        margin: 'auto',
        width: '100%',
        height: '100%',
        transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    },
});
