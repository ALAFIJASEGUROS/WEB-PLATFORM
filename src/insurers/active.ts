// Aseguradoras activas. Cada una elige su implementación (simulada o API real)
// según sus variables de entorno; sin configuración, todas son simuladas.
import type { InsurerAdapter } from "./adapter";
import { bolivarAdapter } from "./bolivar";

/** Por ahora solo Seguros Bolívar. Para sumar otra, agregar su adaptador aquí y en ACTIVE_CONFIGS. */
export const INSURERS: InsurerAdapter[] = [bolivarAdapter()];
