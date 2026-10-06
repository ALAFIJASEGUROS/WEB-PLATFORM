"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgePercent,
  Bike,
  CarFront,
  Briefcase,
  Building2,
  Package,
  Scale,
  ShieldCheck,
  Sparkles,
  TreePine,
  UserRound,
} from "lucide-react";
import type {
  Answers,
  QuoteRequest,
  ServiceKey,
  Vehicle,
  VehicleType,
} from "@/domain/types";
import { SERVICE_KEYS } from "@/domain/types";
import { CITIES, formatCOP, SERVICE_LABELS } from "@/domain/labels";
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

const STEPS = [
  { title: "Tu vehículo", subtitle: "Con la placa lo encontramos más rápido." },
  { title: "Sobre ti", subtitle: "Para cotizar no necesitamos tu cédula." },
  { title: "¿Cómo lo usas?", subtitle: "El uso y dónde lo parqueas cambian el riesgo." },
  { title: "¿Qué es más importante para ti?", subtitle: "Ordenamos las opciones según tu respuesta. Igual verás todas." },
  { title: "Últimos detalles", subtitle: "Ajustamos la recomendación a lo que valoras." },
];

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
  ][step];

  function next() {
    if (step === 0) track("vehiculo_identificado", { tipo: type, metodo: manual ? "manual" : "placa" });
    if (step === 0 && manual && manualVehicle) setVehicle(manualVehicle);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
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
    <div className="mx-auto max-w-xl px-4 py-6">
      <button
        type="button"
        onClick={() => (step > 0 ? setStep(step - 1) : router.push("/cotizar"))}
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
      {step > 0 && vehicle && (
        <button
          type="button"
          onClick={() => setStep(0)}
          className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-surface px-3 text-sm font-semibold text-heading shadow-sm"
        >
          {type === "auto" ? <CarFront className="size-4 text-brand" aria-hidden /> : <Bike className="size-4 text-brand" aria-hidden />}
          {vehicle.brand} {vehicle.model} {vehicle.year}
          {vehicle.plate && <span className="text-muted">· {vehicle.plate}</span>}
        </button>
      )}

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
                  <input
                    id="plate"
                    className={`${inputClass} text-lg font-bold uppercase tracking-[0.2em]`}
                    placeholder={type === "auto" ? "ABC123" : "ABC12D"}
                    autoComplete="off"
                    autoCapitalize="characters"
                    maxLength={7}
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
              <OptionCard name="priority" checked={answers.priority === "precio"} onChange={() => set("priority", "precio")} icon={<BadgePercent />} title="Pagar lo menos posible" description="Cumplir con lo esencial al mejor precio." />
              <OptionCard name="priority" checked={answers.priority === "cobertura"} onChange={() => set("priority", "cobertura")} icon={<ShieldCheck />} title="Estar bien protegido" description="La mayor cobertura y el menor deducible, aunque cueste más." />
              <OptionCard name="priority" checked={answers.priority === "servicios"} onChange={() => set("priority", "servicios")} icon={<Sparkles />} title="Servicios y asistencias" description="Grúa, vehículo de reemplazo, conductor elegido, asistencia jurídica." />
              <OptionCard name="priority" checked={answers.priority === "equilibrio"} onChange={() => set("priority", "equilibrio")} icon={<Scale />} title="Un buen equilibrio" description="Buena protección a un precio razonable." />
            </OptionGroup>
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
        </Card>

        <div className="pb-safe sticky bottom-16 mt-6 bg-gradient-to-t from-canvas via-canvas pt-3 md:static md:bg-none">
          <Button type="submit" className="w-full" disabled={!canContinue}>
            {step < STEPS.length - 1 ? "Continuar" : "Ver mis opciones"}
          </Button>
        </div>
      </form>
    </div>
  );
}
