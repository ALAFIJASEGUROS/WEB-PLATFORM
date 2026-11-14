// Aseguradoras activas. Cada una elige su implementación (simulada o API real)
// según sus variables de entorno; sin configuración, todas son simuladas.
import type { InsurerAdapter } from "./adapter";
import { bolivarAdapter } from "./bolivar";
import { SURA_CONFIG } from "./mock/insurers";
import { createMockAdapter } from "./mock/tariff";

export const INSURERS: InsurerAdapter[] = [createMockAdapter(SURA_CONFIG), bolivarAdapter()];
