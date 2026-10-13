// Términos de seguros explicados en lenguaje simple. Se usan en las ayudas
// emergentes (<Term>) y en la página /glosario.

export const GLOSSARY = {
  deducible: {
    term: "Deducible",
    text: "La parte de una pérdida que pagas tú cuando reclamas. Suele ser un porcentaje del daño con un mínimo en SMMLV. Si el daño cuesta $4.000.000 y el deducible es 10% (mínimo 1 SMMLV), pagas el mayor de los dos.",
  },
  rc: {
    term: "Responsabilidad civil (RC)",
    text: "Cubre los daños que le causes a otras personas o a sus bienes con tu vehículo, hasta el límite del plan. Es la cobertura más importante: un accidente con heridos puede costar cientos de millones.",
  },
  smmlv: {
    term: "SMMLV",
    text: "Salario mínimo mensual legal vigente. Muchas pólizas expresan el deducible mínimo en SMMLV, así se actualiza cada año.",
  },
  perdidaTotal: {
    term: "Pérdida total",
    text: "Cuando reparar el vehículo cuesta más del 75% de su valor comercial, o cuando lo roban y no aparece. La aseguradora paga el valor asegurado menos el deducible.",
  },
  perdidaParcial: {
    term: "Pérdida parcial",
    text: "Daños o hurto de partes que cuestan menos del 75% del valor del vehículo. Se repara y pagas el deducible.",
  },
  valorAsegurado: {
    term: "Valor asegurado",
    text: "El valor por el que aseguras el vehículo y el que te pagan en una pérdida total. Se basa en la guía de valores del mercado; asegurar por menos baja el precio pero también lo que recibes.",
  },
  prima: {
    term: "Prima",
    text: "Lo que pagas por el seguro. Incluye el IVA del 19%; en pago mensual tiene un recargo por financiación.",
  },
  asistencias: {
    term: "Asistencias",
    text: "Servicios incluidos en el plan, como grúa, conductor elegido o vehículo de reemplazo. No dependen de un siniestro grande y se piden a la línea de la aseguradora.",
  },
  condicionado: {
    term: "Condicionado",
    text: "El documento con las reglas completas del seguro: coberturas, exclusiones, deducibles y cómo reclamar. Es lo que vale ante cualquier duda.",
  },
  exclusiones: {
    term: "Exclusiones",
    text: "Situaciones que el seguro no cubre, por ejemplo manejar bajo efectos del alcohol o sin licencia vigente.",
  },
  retracto: {
    term: "Derecho de retracto",
    text: "En compras a distancia puedes arrepentirte dentro de los 5 días hábiles siguientes y te devuelven lo pagado.",
  },
  sarlaft: {
    term: "SARLAFT",
    text: "Sistema con el que las aseguradoras previenen el lavado de activos. Por eso preguntan tu ocupación, ingresos o si eres persona expuesta políticamente (PEP).",
  },
  pep: {
    term: "PEP",
    text: "Persona expuesta políticamente: quien ocupa o ocupó en los últimos 2 años un cargo público de alto nivel, o maneja recursos públicos. No impide comprar; la aseguradora solo hace una revisión adicional.",
  },
  soat: {
    term: "SOAT",
    text: "Seguro obligatorio que cubre los gastos médicos de las personas heridas en un accidente de tránsito. No cubre daños al vehículo: para eso es el seguro voluntario.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
