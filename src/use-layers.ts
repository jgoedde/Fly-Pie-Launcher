import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from './storage.ts';
import { z } from 'zod';

export const LayerPieItemPackage = z.string().nonempty();

export const LayerPieItemLink = z.number().min(1);

export const LayerSchema = z.object({
    id: z.number().min(1),
    name: z.string().nonempty(),
    color: z.string().min(4).max(9).regex(/^#/),
    isBaseLayer: z.boolean().optional().catch(false),
    items: z.array(z.union([LayerPieItemPackage, LayerPieItemLink])),
});

export type Layer = z.infer<typeof LayerSchema>;

export const LayersSchema = z.array(LayerSchema).min(1);

export type LayerMap = z.infer<typeof LayersSchema>;

const DEFAULT_LAYERS: LayerMap = [
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

export function useLayers() {
    const [layers, setLayers] = useMMKVStorage<LayerMap>(
        'layers',
        storage,
        DEFAULT_LAYERS,
    );

    return { layers, setLayers };
}
