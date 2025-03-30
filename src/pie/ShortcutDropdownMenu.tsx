import { Image, Text, Vibration, View } from 'react-native';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { Point } from '../maths.ts';
import { Shortcut } from '../ShortcutUtils.ts';

export const MENU_WIDTH = 188;
export const MENU_ITEM_HEIGHT = 48;

export function ShortcutDropdownMenu({
    anchor,
    shortcuts,
    selectedShortcut,
}: {
    anchor: Point;
    shortcuts: Shortcut[];
    selectedShortcut?: Shortcut;
}) {
    useEffect(() => {
        if (selectedShortcut) {
            Vibration.vibrate(10);
        }
    }, [selectedShortcut]);

    return (
        <View
            className={
                'absolute z-10 whitespace-nowrap rounded-lg dark:bg-gray-700 dark:text-white bg-gray-200 text-black'
            }
            style={{
                width: MENU_WIDTH,
                height: MENU_ITEM_HEIGHT * shortcuts.length,
                left: anchor.x,
                top: anchor.y,
            }}
        >
            <View className={'flex flex-col h-full'}>
                {shortcuts.map(s => (
                    <View
                        className={clsx(
                            `flex flex-row items-center gap-3 p-3 ${
                                selectedShortcut?.id === s.id &&
                                'dark:bg-gray-600 bg-gray-300'
                            }`,
                        )}
                        style={{
                            height: MENU_ITEM_HEIGHT,
                        }}
                        key={s.id}
                    >
                        <View>
                            <Image className={'size-10'} src={s.icon} />
                        </View>
                        <View>
                            <Text
                                className={
                                    'dark:text-white text-black truncate'
                                }
                            >
                                {s.label}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}
