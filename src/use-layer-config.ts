import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from './storage.ts';
import { z } from 'zod';
import { PackageNameSchema } from './use-installed-apps.ts';

export const BROWSER_ACTIONS_RESERVED_LAYER_ID = 9191;

export const LayerPieItemLinkSchema = z.number().min(1);

export type LayerLink = z.infer<typeof LayerPieItemLinkSchema>;

const LayerItemSchema = z.union([PackageNameSchema, LayerPieItemLinkSchema]);

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

export const LayersSchema = z.array(LayerSchema).min(1);

export type Layers = z.infer<typeof LayersSchema>;

export const DEFAULT_LAYERS: Layers = [
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
    const [layers, setLayers] = useMMKVStorage<Layers>(
        'layers',
        storage,
        DEFAULT_LAYERS,
    );

    return { layers, setLayers };
}
