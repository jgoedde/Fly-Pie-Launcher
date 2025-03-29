import { z } from 'zod';

export const PackageNameSchema = z.string().nonempty();
export type PackageName = z.infer<typeof PackageNameSchema>;
