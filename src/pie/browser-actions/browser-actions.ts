import { z } from 'zod';

const BrowserActionSchema = z.object({
    image: z.string(),
    url: z.string().url(),
    label: z.string().nonempty(),
});

export type BrowserAction = z.infer<typeof BrowserActionSchema>;
