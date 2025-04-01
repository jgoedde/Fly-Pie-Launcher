import { Image, Text, Vibration, View } from 'react-native';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { Point } from '../maths.ts';
import { PopoverItem } from './popover-item.ts';

export const MENU_WIDTH = 188;
export const MENU_ITEM_HEIGHT = 48;

export function PopoverMenu({
    anchor,
    items,
    selectedPopoverItem,
}: {
    anchor: Point;
    items: PopoverItem[];
    selectedPopoverItem?: PopoverItem;
}) {
    useEffect(() => {
        if (selectedPopoverItem) {
            Vibration.vibrate(10);
        }
    }, [selectedPopoverItem]);

    return (
        <View
            className={
                'absolute z-10 whitespace-nowrap rounded-lg dark:bg-gray-700 dark:text-white bg-gray-200 text-black'
            }
            style={{
                width: MENU_WIDTH,
                height: MENU_ITEM_HEIGHT * items.length,
                left: anchor.x,
                top: anchor.y,
            }}
        >
            <View className={'flex flex-col h-full'}>
                {items.map(s => (
                    <View
                        className={clsx(
                            `flex flex-row items-center gap-3 p-3 ${
                                selectedPopoverItem?.id === s.id &&
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
