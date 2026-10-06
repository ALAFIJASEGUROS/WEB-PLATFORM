"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  Check,
  Info,
  Lock,
  Bike,
  CarFront,
  Briefcase,
  Building2,
  Package,
  Pencil,
  Scale,
  ShieldCheck,
  Sparkles,
  TreePine,
  UserRound,
} from "lucide-react";
import type {
  Answers,
  Priority,
  QuoteRequest,
  ServiceKey,
  Vehicle,
  VehicleType,
} from "@/domain/types";
import { SERVICE_KEYS } from "@/domain/types";
import { CITIES, formatCOP, PRIORITY_LABELS, SERVICE_LABELS, USE_LABELS } from "@/domain/labels";
import {
  CATALOG,
  CURRENT_YEAR,
  estimateValue,
  findModel,
  normalizePlate,
  plateType,
} from "@/vehicles/lookup";
import { quoteStore, useHydrated } from "@/lib/quote-store";
import { lookupVehicle } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { OptionCard, OptionGroup } from "./OptionCard";
import { PlateInput } from "./PlateInput";
import { WeightSliders } from "./WeightSliders";
import { weightsFromPriority } from "@/recommendation/scoring";

const STEPS = [
  { title: "Tu vehículo", subtitle: "Con la placa lo encontramos más rápido." },
  { title: "Sobre ti", subtitle: "Para cotizar no necesitamos tu cédula." },
  { title: "¿Cómo lo usas?", subtitle: "El uso y dónde lo parqueas cambian el riesgo." },
  { title: "¿Qué es más importante para ti?", subtitle: "Ordenamos las opciones según tu respuesta. Igual verás todas." },
  { title: "Últimos detalles", subtitle: "Ajustamos la recomendación a lo que valoras." },
  { title: "Revisa tus respuestas", subtitle: "Corrige lo que necesites antes de ver tus opciones." },
];
const SUMMARY_STEP = STEPS.length - 1;

const DEFAULT_ANSWERS: Answers = {
  priority: "equilibrio",
  use: "particular",
  parking: "cerrado",
  mileage: "medio",
  drivers: "solo",
  financed: false,
  deductibleTolerance: "medio",
  services: [],
  claimsLast3Years: 0,
};

const YEARS = Array.from({ length: 20 }, (_, i) => CURRENT_YEAR - i + 1).filter(
  (y) => y <= CURRENT_YEAR + 1,
);

export function QuoteWizard({ type }: { type: VehicleType }) {
  // El estado inicial se lee de sessionStorage, así que solo renderizamos en cliente.
  const hydrated = useHydrated();
  if (!hydrated) return <div className="min-h-[60vh]" aria-busy />;
  return <Wizard type={type} />;
}

function Wizard({ type }: { type: VehicleType }) {
  const router = useRouter();
  // Reanudar una cotización previa del mismo tipo.
  useEffect(() => track("cotizacion_iniciada", { tipo: type }), [type]);
  const [prev] = useState(() => {
    const p = quoteStore.getRequest();
    return p && p.vehicle.type === type ? p : null;
  });
  const noun = type === "auto" ? "carro" : "moto";
  const [step, setStep] = useState(0);
  /** Si se llegó a un paso desde el resumen, "Continuar" vuelve al resumen. */
  const [fromSummary, setFromSummary] = useState(false);

  // Paso 1
  const [plate, setPlate] = useState(prev?.vehicle.plate ?? "");
  const [manual, setManual] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(prev?.vehicle ?? null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  // Paso 2
  const [birthdate, setBirthdate] = useState(prev?.driver.birthdate ?? "");
  const [city, setCity] = useState(prev?.driver.city ?? "");

  const [answers, setAnswers] = useState<Answers>({ ...DEFAULT_ANSWERS, ...prev?.answers });
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  const manualVehicle = useMemo<Vehicle | null>(() => {
    const m = findModel(type, brand, model);
    if (!m || !year) return null;
    return {
      type,
      brand,
      model,
      year: Number(year),
      commercialValue: estimateValue(m.newValue, Number(year)),
    };
  }, [type, brand, model, year]);

  async function lookup() {
    const p = normalizePlate(plate);
    setLookupError(null);
    const t = plateType(p);
    if (!t) {
      setLookupError(
        type === "auto"
          ? "Escribe la placa como ABC123."
          : "Escribe la placa como ABC12D.",
      );
      return;
    }
    if (t !== type) {
      setLookupError(`Esa placa parece de ${t === "auto" ? "carro" : "moto"}.`);
      return;
    }
    setLookingUp(true);
    try {
      setVehicle(await lookupVehicle(p));
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : "No pudimos consultar la placa.");
    } finally {
      setLookingUp(false);
    }
  }

  const age = birthdate
    ? CURRENT_YEAR - Number(birthdate.slice(0, 4))
    : null;
  const ageError =
    age !== null && (age < 18 || age > 90) ? "Debes ser mayor de edad." : undefined;

  const canContinue = [
    !!(manual ? manualVehicle : vehicle),
    !!birthdate && !!city && !ageError,
    true,
    true,
    true,
    true,
  ][step];

  function next() {
    if (step === 0) track("vehiculo_identificado", { tipo: type, metodo: manual ? "manual" : "placa" });
    if (step === 0 && manual && manualVehicle) setVehicle(manualVehicle);
    if (step < STEPS.length - 1) {
      setStep(fromSummary ? SUMMARY_STEP : step + 1);
      setFromSummary(false);
      window.scrollTo({ top: 0 });
      return;
    }
    const v = manual ? manualVehicle : vehicle;
    if (!v) return;
    const req: QuoteRequest = { vehicle: v, driver: { birthdate, city }, answers };
    quoteStore.setRequest(req);
    track("cuestionario_completado", { tipo: type, prioridad: answers.priority });
    router.push("/resultados");
  }

  // Elegir una prioridad reinicia los pesos personalizados a los de esa prioridad.
  const choosePriority = (p: Priority) =>
    setAnswers((a) => ({ ...a, priority: p, weights: a.weights ? weightsFromPriority(p) : undefined }));

  const toggleService = (s: ServiceKey) =>
    set(
      "services",
      answers.services.includes(s)
        ? answers.services.filter((x) => x !== s)
        : [...answers.services, s],
    );

  const services = SERVICE_KEYS.filter(
    (s) => type === "auto" || !["autoSustituto", "conductorElegido"].includes(s),
  );

  return (
    <div className="mx-auto max-w-xl lg:max-w-5xl px-4 py-6">
      <button
        type="button"
        onClick={() => {
          setFromSummary(false);
          if (step > 0) setStep(step - 1);
          else router.push("/cotizar");
        }}
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted hover:text-heading"
      >
        <ArrowLeft className="size-4" aria-hidden /> Volver
      </button>

      <div
        className="mb-2 flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={step + 1}
        aria-label={`Paso ${step + 1} de ${STEPS.length}`}
      >
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Seguro de {noun} · Paso {step + 1} de {STEPS.length}
      </p>
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-heading">
        {STEPS[step].title}
      </h1>
      <p className="mb-4 mt-1 text-muted">{STEPS[step].subtitle}</p>
      {step > 0 && step < SUMMARY_STEP && vehicle && (
        <button
          type="button"
          onClick={() => {
            setFromSummary(false);
            setStep(0);
          }}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-surface px-3 text-sm font-semibold text-heading shadow-sm"
        >
          {type === "auto" ? <CarFront className="size-4 text-brand" aria-hidden /> : <Bike className="size-4 text-brand" aria-hidden />}
          {vehicle.brand} {vehicle.model} {vehicle.year}
          {vehicle.plate && <span className="text-muted">· {vehicle.plate}</span>}
        </button>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,36rem)_1fr] lg:gap-10">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canContinue) next();
        }}
      >
        <Card key={step} className="animate-[fade-up_.25s_ease-out] space-y-6 p-5 sm:p-6">
          {step === 0 && !manual && (
            <>
              <Field
                label={`Placa de tu ${noun}`}
                htmlFor="plate"
                error={lookupError ?? undefined}
                hint="Prueba con cualquier placa válida: los datos del vehículo son simulados."
              >
                <div className="flex gap-2">
                  <PlateInput
                    id="plate"
                    placeholder={type === "auto" ? "ABC123" : "ABC12D"}
                    value={plate}
                    aria-invalid={!!lookupError}
                    onChange={(e) => {
                      setPlate(e.target.value.toUpperCase());
                      setVehicle(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={lookup}
                    disabled={plate.length < 6 || lookingUp}
                  >
                    {lookingUp ? "Buscando…" : "Buscar"}
                  </Button>
                </div>
              </Field>
              {vehicle && (
                <div className="rounded-2xl bg-mint-soft p-4" aria-live="polite">
                  <p className="text-sm font-semibold text-mint">Encontramos tu {noun}</p>
                  <p className="mt-1 text-lg font-bold text-heading">
                    {vehicle.brand} {vehicle.model} {vehicle.year}
                  </p>
                  <p className="text-sm text-muted">
                    Valor comercial estimado: {formatCOP(vehicle.commercialValue)}
                  </p>
                </div>
              )}
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                onClick={() => {
                  setManual(true);
                  setVehicle(null);
                }}
              >
                No tengo la placa a la mano
              </button>
            </>
          )}

          {step === 0 && manual && (
            <>
              <Field label="Marca" htmlFor="brand">
                <select
                  id="brand"
                  className={inputClass}
                  value={brand}
                  onChange={(e) => {
                    setBrand(e.target.value);
                    setModel("");
                  }}
                >
                  <option value="">Selecciona</option>
                  {CATALOG[type].map((b) => (
                    <option key={b.brand}>{b.brand}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Línea" htmlFor="model">
                  <select
                    id="model"
                    className={inputClass}
                    value={model}
                    disabled={!brand}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {CATALOG[type]
                      .find((b) => b.brand === brand)
                      ?.models.map((m) => <option key={m.name}>{m.name}</option>)}
                  </select>
                </Field>
                <Field label="Modelo (año)" htmlFor="year">
                  <select
                    id="year"
                    className={inputClass}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="">Año</option>
                    {YEARS.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </Field>
              </div>
              {manualVehicle && (
                <p className="rounded-2xl bg-brand-soft p-4 text-sm text-heading">
                  Valor comercial estimado:{" "}
                  <strong>{formatCOP(manualVehicle.commercialValue)}</strong>
                </p>
              )}
              <button
                type="button"
                className="min-h-11 text-sm font-semibold text-brand hover:underline"
                onClick={() => setManual(false)}
              >
                Buscar por placa
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Fecha de nacimiento" htmlFor="birthdate" error={ageError}>
                <input
                  id="birthdate"
                  type="date"
                  className={inputClass}
                  autoComplete="bday"
                  max={`${CURRENT_YEAR - 18}-12-31`}
                  value={birthdate}
                  aria-invalid={!!ageError}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </Field>
              <Field label="Ciudad donde circula" htmlFor="city">
                <select
                  id="city"
                  className={inputClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">Selecciona tu ciudad</option>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <OptionGroup legend={`¿Para qué usas tu ${noun}?`}>
                <OptionCard name="use" checked={answers.use === "particular"} onChange={() => set("use", "particular")} icon={<UserRound />} title="Uso personal o familiar" />
                <OptionCard name="use" checked={answers.use === "trabajo"} onChange={() => set("use", "trabajo")} icon={<Briefcase />} title="Para ir a trabajar o visitar clientes" />
                <OptionCard name="use" checked={answers.use === "domicilios"} onChange={() => set("use", "domicilios")} icon={<Package />} title={type === "moto" ? "Domicilios o plataformas" : "Plataformas de transporte"} />
              </OptionGroup>
              <OptionGroup legend="¿Dónde lo parqueas en la noche?">
                <OptionCard name="parking" checked={answers.parking === "cerrado"} onChange={() => set("parking", "cerrado")} icon={<Building2 />} title="Parqueadero cerrado o garaje" />
                <OptionCard name="parking" checked={answers.parking === "calle"} onChange={() => set("parking", "calle")} icon={<TreePine />} title="En la calle" />
              </OptionGroup>
              <OptionGroup legend="¿Cuánto lo usas al mes?">
                <OptionCard name="mileage" checked={answers.mileage === "bajo"} onChange={() => set("mileage", "bajo")} title="Poco" description="Menos de 500 km, unos días a la semana" />
                <OptionCard name="mileage" checked={answers.mileage === "medio"} onChange={() => set("mileage", "medio")} title="Normal" description="Entre 500 y 1.500 km" />
                <OptionCard name="mileage" checked={answers.mileage === "alto"} onChange={() => set("mileage", "alto")} title="Mucho" description="Más de 1.500 km o viajes frecuentes" />
              </OptionGroup>
              <OptionGroup legend={`¿Quién maneja tu ${noun}?`}>
                <div className="grid grid-cols-2 gap-2.5">
                  <OptionCard name="drivers" checked={answers.drivers === "solo"} onChange={() => set("drivers", "solo")} title="Solo yo" />
                  <OptionCard name="drivers" checked={answers.drivers === "varios"} onChange={() => set("drivers", "varios")} title="Varias personas" />
                </div>
              </OptionGroup>
              <OptionGroup legend={`¿Tu ${noun} está financiado?`} description="Si tiene prenda, el banco suele exigir cobertura de daños y hurto.">
                <div className="grid grid-cols-2 gap-2.5">
                  <OptionCard name="financed" checked={answers.financed} onChange={() => set("financed", true)} title="Sí" />
                  <OptionCard name="financed" checked={!answers.financed} onChange={() => set("financed", false)} title="No" />
                </div>
              </OptionGroup>
            </>
          )}

          {step === 3 && (
            <OptionGroup legend="Elige una opción">
              <OptionCard name="priority" checked={answers.priority === "precio"} onChange={() => choosePriority("precio")} icon={<BadgePercent />} title="Pagar lo menos posible" description="Cumplir con lo esencial al mejor precio." />
              <OptionCard name="priority" checked={answers.priority === "cobertura"} onChange={() => choosePriority("cobertura")} icon={<ShieldCheck />} title="Estar bien protegido" description="La mayor cobertura y el menor deducible, aunque cueste más." />
              <OptionCard name="priority" checked={answers.priority === "servicios"} onChange={() => choosePriority("servicios")} icon={<Sparkles />} title="Servicios y asistencias" description="Grúa, vehículo de reemplazo, conductor elegido, asistencia jurídica." />
              <OptionCard name="priority" checked={answers.priority === "equilibrio"} onChange={() => choosePriority("equilibrio")} icon={<Scale />} title="Un buen equilibrio" description="Buena protección a un precio razonable." />
            </OptionGroup>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-heading">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-brand)]"
                  checked={!!answers.weights}
                  onChange={(e) => set("weights", e.target.checked ? weightsFromPriority(answers.priority) : undefined)}
                />
                Ajustar los pesos a mi medida
              </label>
              {answers.weights && <WeightSliders value={answers.weights} onChange={(w) => set("weights", w)} />}
            </div>
          )}

          {step === 4 && (
            <>
              <OptionGroup legend="Si tienes un choque, ¿cuánto estarías dispuesto a pagar de tu bolsillo?" description="Eso es el deducible. Uno más alto baja el precio del seguro.">
                <OptionCard name="ded" checked={answers.deductibleTolerance === "bajo"} onChange={() => set("deductibleTolerance", "bajo")} title="Lo mínimo posible" description="Deducible de 0% a 5%" />
                <OptionCard name="ded" checked={answers.deductibleTolerance === "medio"} onChange={() => set("deductibleTolerance", "medio")} title="Algo razonable" description="Hasta 10%" />
                <OptionCard name="ded" checked={answers.deductibleTolerance === "alto"} onChange={() => set("deductibleTolerance", "alto")} title="Prefiero pagar menos al mes" description="Acepto un deducible alto" />
              </OptionGroup>
              <OptionGroup legend="¿Qué servicios te gustaría tener?" description="Opcional. Elige los que quieras.">
                {services.map((s) => (
                  <OptionCard key={s} type="checkbox" name="services" checked={answers.services.includes(s)} onChange={() => toggleService(s)} title={SERVICE_LABELS[s]} />
                ))}
              </OptionGroup>
              <OptionGroup legend="¿Cuántos accidentes o reclamaciones has tenido en los últimos 3 años?">
                <div className="grid grid-cols-3 gap-2.5">
                  {[0, 1, 2].map((n) => (
                    <OptionCard key={n} name="claims" checked={answers.claimsLast3Years === n} onChange={() => set("claimsLast3Years", n)} title={n === 2 ? "2 o más" : String(n)} />
                  ))}
                </div>
              </OptionGroup>
            </>
          )}
          {step === SUMMARY_STEP && (manual ? manualVehicle : vehicle) && (
            <Summary
              vehicle={(manual ? manualVehicle : vehicle)!}
              birthdate={birthdate}
              city={city}
              answers={answers}
              onEdit={(s) => {
                setFromSummary(true);
                setStep(s);
                window.scrollTo({ top: 0 });
              }}
            />
          )}
        </Card>

        <div className="pb-safe sticky bottom-16 mt-6 bg-gradient-to-t from-canvas via-canvas pt-3 md:static md:bg-none">
          <Button type="submit" className="w-full" disabled={!canContinue}>
            {step === SUMMARY_STEP ? "Ver mis opciones" : fromSummary ? "Guardar y volver al resumen" : "Continuar"}
          </Button>
        </div>
      </form>
        <WhyWeAsk step={step} vehicle={vehicle} answers={answers} city={city} />
      </div>
    </div>
  );
}

const WHY = [
  { title: "¿Por qué la placa?", text: "Con la placa identificamos marca, línea, modelo y el valor comercial que usan las aseguradoras. No consultamos multas ni datos personales." },
  { title: "¿Por qué tu edad y ciudad?", text: "La edad del conductor y la ciudad donde circula el vehículo son los factores que más cambian el precio. Tu cédula solo la pedimos si decides comprar." },
  { title: "¿Por qué el uso?", text: "Un vehículo que se parquea en la calle o recorre muchos kilómetros tiene más riesgo de hurto o choque. Así priorizamos las coberturas que de verdad necesitas." },
  { title: "¿Para qué tu prioridad?", text: "Define el peso del precio, la cobertura y los servicios en tu puntaje de afinidad. Igual verás todas las opciones." },
  { title: "¿Y los servicios?", text: "Si eliges servicios, premiamos las opciones que los incluyen. El deducible que prefieres ajusta la recomendación." },
  { title: "¿Por qué revisar?", text: "El uso y la financiación descartan planes que no te sirven: un error aquí puede dejarte con una póliza que no cubre lo que necesitas." },
];

const DEDUCTIBLE_TEXT = { bajo: "Lo mínimo posible (0% a 5%)", medio: "Algo razonable (hasta 10%)", alto: "Acepto un deducible alto" } as const;
const MILEAGE_TEXT = { bajo: "Menos de 500 km al mes", medio: "Entre 500 y 1.500 km al mes", alto: "Más de 1.500 km al mes" } as const;

function Summary({
  vehicle: v,
  birthdate,
  city,
  answers: a,
  onEdit,
}: {
  vehicle: Vehicle;
  birthdate: string;
  city: string;
  answers: Answers;
  onEdit: (step: number) => void;
}) {
  const sections: { title: string; step: number; rows: [string, string][] }[] = [
    {
      title: "Vehículo",
      step: 0,
      rows: [
        ["Modelo", `${v.brand} ${v.model} ${v.year}`],
        ...(v.plate ? [["Placa", v.plate] as [string, string]] : []),
        ["Valor comercial", formatCOP(v.commercialValue)],
      ],
    },
    { title: "Sobre ti", step: 1, rows: [["Nacimiento", birthdate], ["Ciudad", city]] },
    {
      title: "Uso",
      step: 2,
      rows: [
        ["Uso", USE_LABELS[a.use].replace(/^./, (c) => c.toUpperCase())],
        ["Parqueo", a.parking === "calle" ? "En la calle" : "Parqueadero cerrado"],
        ["Recorrido", MILEAGE_TEXT[a.mileage]],
        ["Conductores", a.drivers === "solo" ? "Solo yo" : "Varias personas"],
        ["Financiado", a.financed ? "Sí" : "No"],
      ],
    },
    {
      title: "Prioridad",
      step: 3,
      rows: [
        a.weights
          ? ["Pesos", `Precio ${a.weights.price}% · Cobertura ${a.weights.coverage}% · Servicios ${a.weights.services}%`]
          : ["Prioridad", PRIORITY_LABELS[a.priority]],
      ],
    },
    {
      title: "Detalles",
      step: 4,
      rows: [
        ["Deducible", DEDUCTIBLE_TEXT[a.deductibleTolerance]],
        ["Servicios", a.services.length ? a.services.map((s) => SERVICE_LABELS[s]).join(", ") : "Sin preferencia"],
        ["Reclamaciones (3 años)", a.claimsLast3Years >= 2 ? "2 o más" : String(a.claimsLast3Years)],
      ],
    },
  ];
  return (
    <div className="divide-y divide-line">
      {sections.map((sec) => (
        <section key={sec.title} aria-labelledby={`sum-${sec.step}`} className="py-4 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <h2 id={`sum-${sec.step}`} className="font-bold text-heading">{sec.title}</h2>
            <button
              type="button"
              onClick={() => onEdit(sec.step)}
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
              aria-label={`Editar ${sec.title.toLowerCase()}`}
            >
              <Pencil className="size-4" aria-hidden /> Editar
            </button>
          </div>
          <dl className="mt-2 space-y-1.5 text-sm">
            {sec.rows.map(([k, val]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-semibold text-ink">{val}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function WhyWeAsk({
  step,
  vehicle,
  answers,
  city,
}: {
  step: number;
  vehicle: Vehicle | null;
  answers: Answers;
  city: string;
}) {
  const why = WHY[step];
  const summary = [
    vehicle && `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    step > 1 && city,
    step > 2 && `Uso ${USE_LABELS[answers.use]}, ${answers.parking === "calle" ? "parquea en la calle" : "parqueadero cerrado"}`,
    step > 3 && `Prioridad: ${PRIORITY_LABELS[answers.priority].toLowerCase()}`,
  ].filter(Boolean) as string[];
  return (
    <aside className="hidden lg:block" aria-label="Información">
      <div className="sticky top-24 space-y-4">
        <div className="rounded-[var(--radius-card)] border border-line p-5">
          <p className="flex items-center gap-2 font-bold text-heading">
            <Info className="size-4 text-brand" aria-hidden /> {why.title}
          </p>
          <p className="mt-2 text-sm text-muted">{why.text}</p>
        </div>
        {summary.length > 0 && (
          <div className="rounded-[var(--radius-card)] bg-brand-soft p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-strong">Tu perfil hasta ahora</p>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {summary.map((s) => (
                <li key={s} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />{s}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-muted">
          <Lock className="size-3.5" aria-hidden /> Tus datos solo se usan para cotizar.
        </p>
      </div>
    </aside>
  );
}
