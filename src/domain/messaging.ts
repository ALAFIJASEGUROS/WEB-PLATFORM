// Centro de preferencias: qué tipo de mensaje llega por qué canal.
// Los transaccionales (compras, pagos, mora) no se pueden apagar: siempre
// llegan al menos por correo. La publicidad se rige por su propia autorización.

export const CHANNELS = ["email", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = { email: "Correo", whatsapp: "WhatsApp" };

export const MESSAGE_TYPES = {
  transaccional: {
    label: "Compras, pagos y pólizas",
    description: "Confirmaciones, comprobantes, cuotas vencidas y cambios en tu póliza. No se pueden desactivar.",
    mandatory: true,
  },
  vencimientos: {
    label: "Vencimientos",
    description: "Renovación de tu póliza, SOAT, tecnomecánica y cuotas por pagar.",
    mandatory: false,
  },
  renovacion: {
    label: "Sugerencias de ahorro",
    description: "Opciones con la misma cobertura y menor precio cuando se acerca tu renovación.",
    mandatory: false,
  },
} as const;
export type MessageType = keyof typeof MESSAGE_TYPES;
export const MESSAGE_TYPE_KEYS = Object.keys(MESSAGE_TYPES) as MessageType[];

export type Preferences = Record<MessageType, Record<Channel, boolean>>;

export const DEFAULT_PREFERENCES: Preferences = {
  transaccional: { email: true, whatsapp: false },
  vencimientos: { email: true, whatsapp: false },
  renovacion: { email: true, whatsapp: false },
};

/** Normaliza lo que llega del formulario: los obligatorios conservan el correo. */
export function normalizePreferences(p: Preferences, hasPhone: boolean): Preferences {
  const out = structuredClone(p);
  for (const t of MESSAGE_TYPE_KEYS) {
    if (!hasPhone) out[t].whatsapp = false;
    if (MESSAGE_TYPES[t].mandatory) out[t].email = true;
  }
  return out;
}

/**
 * Canal por el que se envía un tipo de mensaje: WhatsApp si la persona lo
 * eligió y tiene celular; si no, correo. null si desactivó ese tipo.
 */
export function channelFor(p: Preferences, type: MessageType, hasPhone: boolean): Channel | null {
  if (p[type].whatsapp && hasPhone) return "whatsapp";
  if (p[type].email || MESSAGE_TYPES[type].mandatory) return "email";
  return null;
}
