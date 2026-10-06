// Guía de siniestros por aseguradora. Los canales de contacto deben venir de
// la aseguradora y verificarse con fecha antes de publicarse: mientras
// `verifiedAt` sea null la página remite al número impreso en la póliza.

export interface ClaimsChannel {
  kind: "telefono" | "whatsapp" | "app" | "web";
  label: string;
  value?: string;
}

export interface ClaimsGuide {
  insurerId: string;
  insurerName: string;
  channels: ClaimsChannel[];
  /** Pasos propios de la aseguradora, además de los generales. */
  notes: string[];
  /** Fecha en que se confirmaron los canales con la aseguradora. */
  verifiedAt: string | null;
}

/** Pasos que aplican a cualquier aseguradora (seguro voluntario de autos y motos). */
export const GENERAL_STEPS = {
  accidente: [
    "Si hay personas heridas, llama al 123 y no las muevas. Los gastos médicos los cubre primero el SOAT.",
    "Enciende las luces de parqueo y señaliza la vía si es seguro hacerlo.",
    "Toma fotos de los vehículos, las placas, los daños y el lugar.",
    "Anota los datos del otro conductor: nombre, cédula, celular, placa, aseguradora y SOAT.",
    "Si solo hay daños materiales y es seguro, retira los vehículos de la vía después de tomar las fotos.",
    "Llama a la línea de asistencia de tu aseguradora antes de llevar el vehículo a un taller.",
    "Da aviso del siniestro a la aseguradora a más tardar dentro de los 3 días siguientes (art. 1075 del Código de Comercio).",
  ],
  hurto: [
    "Denuncia el hurto ante la Policía o la Fiscalía lo antes posible y guarda el número de la denuncia.",
    "Avisa a tu aseguradora el mismo día con el número de póliza y la denuncia.",
    "Ten a mano la tarjeta de propiedad, las llaves del vehículo y tu cédula.",
  ],
  documentos: [
    "Cédula y licencia de conducción de quien manejaba",
    "Tarjeta de propiedad del vehículo",
    "Número de póliza (está en tu cuenta y en el correo de confirmación)",
    "Fotos del accidente y datos de los terceros",
    "Denuncia, si fue hurto",
  ],
};

export const CLAIMS_GUIDES: ClaimsGuide[] = [
  {
    insurerId: "sura",
    insurerName: "SURA",
    channels: [
      { kind: "telefono", label: "Línea de asistencia" },
      { kind: "app", label: "App de la aseguradora" },
    ],
    notes: ["Con el plan Global o Clásico puedes pedir vehículo de reemplazo mientras reparan el tuyo (según los días del plan)."],
    verifiedAt: null,
  },
  {
    insurerId: "bolivar",
    insurerName: "Seguros Bolívar",
    channels: [
      { kind: "telefono", label: "Línea de asistencia" },
      { kind: "web", label: "Portal de clientes" },
    ],
    notes: ["En el plan Esencial solo hay cobertura de pérdida total: los daños parciales no se reclaman."],
    verifiedAt: null,
  },
];

export const claimsGuideFor = (insurerId: string) => CLAIMS_GUIDES.find((g) => g.insurerId === insurerId);
