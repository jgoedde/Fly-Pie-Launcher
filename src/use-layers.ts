import { useMMKVStorage } from 'react-native-mmkv-storage';
import { storage } from './storage.ts';
import { z } from 'zod';

export const LayerPieItemPackage = z.string().nonempty();

export const LayerPieItemLink = z.object({
    linkId: z.number().min(1),
    faIconCode: z.string().nonempty(),
    accentColor: z.string().nonempty(),
});

export const LayerSchema = z.object({
    id: z.number().min(1),
    name: z.string().nonempty(),
    isBaseLayer: z.boolean(),
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
            // { linkId: 2, faIconCode: 'arrow-up', accentColor: '#800080' },
        ],
    },
    {
        id: 2,
        name: 'Second level',
        isBaseLayer: false,
        items: [
            { linkId: 1, faIconCode: 'arrow-down', accentColor: '#ff0000' },
            'app.revanced.android.youtube',
            'me.zhanghai.android.files',
        ],
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
