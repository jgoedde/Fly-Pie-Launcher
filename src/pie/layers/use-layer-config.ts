import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from '../../storage.ts';
import { z } from 'zod';

export const BROWSER_ACTIONS_RESERVED_LAYER_ID = 9191;

export const LayerPieItemPackageSchema = z.string().nonempty();

export const LayerPieItemLinkSchema = z.number().min(1);

const LayerItemSchema = z.union([
    LayerPieItemPackageSchema,
    LayerPieItemLinkSchema,
]);

export type LayerItem = z.infer<typeof LayerItemSchema>;

export const LayerSchema = z.object({
    id: z
        .number()
        .min(1)
        .refine(num => num !== BROWSER_ACTIONS_RESERVED_LAYER_ID, {
            message:
                'Layer ID 9191 is an internal reserved ID, please use something else.',
        }),
    name: z.string().nonempty(),
    color: z.string().min(4).max(9).regex(/^#/),
    isBaseLayer: z.boolean().optional().catch(false),
    items: z.array(LayerItemSchema),
});

export type Layer = z.infer<typeof LayerSchema>;

const DEFAULT_LAYERS: Layer[] = [
    {
        id: 1,
        name: 'Home',
        isBaseLayer: true,
        color: '#AEAEAE',
        items: [
            'me.zhanghai.android.files',
            'com.android.phone',
            'md.obsidian',
            'com.whatsapp',
            'app.grapheneos.camera',
            'org.mozilla.firefox',
            'app.alextran.immich',
            'com.google.android.apps.maps',
            'app.revanced.android.apps.youtube.music',
            'com.google.android.deskclock',
            2,
        ],
    },
    {
        id: 2,
        name: 'Second level',
        color: '#EAEAEA',
        items: [1, 'app.revanced.android.youtube', 'me.zhanghai.android.files'],
    },
];

export function useLayerConfig() {
    const [layers, setLayers] = useMMKVStorage<Layer[]>(
        'layers',
        storage,
        DEFAULT_LAYERS,
    );

    return { layers, setLayers };
}
