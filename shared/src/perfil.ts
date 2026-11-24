import { z } from 'zod';

export const PerfilSchema = z.enum(['MASTER', 'VETERINARIO', 'ATENDENTE']);
export type Perfil = z.infer<typeof PerfilSchema>;
