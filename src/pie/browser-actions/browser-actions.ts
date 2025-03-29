import { z } from 'zod';

const BrowserActionSchema = z.object({
    image: z.string(),
    url: z.string().url(),
});

export type BrowserAction = z.infer<typeof BrowserActionSchema>;
