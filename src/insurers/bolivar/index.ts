import type { InsurerAdapter } from "../adapter";
import { BOLIVAR_CONFIG } from "../mock/insurers";
import { createMockAdapter } from "../mock/tariff";
import { createBolivarAdapter } from "./adapter";
import { bolivarConfig, type BolivarConfig } from "./config";

/** Adaptador de Bolívar según `INSURER_BOLIVAR_MODE`: simulado o API real. */
export function bolivarAdapter(config: BolivarConfig = bolivarConfig()): InsurerAdapter {
  if (config.mode === "mock") return createMockAdapter(BOLIVAR_CONFIG);
  return createBolivarAdapter(config, {
    // Campos SARLAFT provisionales: se reemplazan con los que exija Bolívar.
    regulatory: { ...BOLIVAR_CONFIG.regulatory, contractModel: config.contractModel },
  });
}

export { bolivarConfig, missingConfig, type BolivarMode } from "./config";
