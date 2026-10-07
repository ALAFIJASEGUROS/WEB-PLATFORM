"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { normalizePlate, plateType } from "@/vehicles/lookup";
import { PlateInput } from "@/components/quote/PlateInput";
import { Button } from "@/components/ui";

/** Inicio de la cotización con la placa, directo desde la portada. */
export function HeroPlateStart() {
  const router = useRouter();
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = normalizePlate(plate);
    const type = plateType(p);
    if (!type) {
      setError("Escribe la placa como ABC123 (carro) o ABC12D (moto).");
      return;
    }
    router.push(`/cotizar/${type}?placa=${p}&origen=portada`);
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-md space-y-2" aria-label="Cotizar con la placa">
      <label htmlFor="hero-plate" className="block text-sm font-semibold text-heading">
        Escribe tu placa
      </label>
      <div className="flex gap-2">
        <PlateInput
          id="hero-plate"
          placeholder="ABC123"
          value={plate}
          aria-invalid={!!error}
          aria-describedby={error ? "hero-plate-error" : undefined}
          onChange={(e) => {
            setPlate(e.target.value.toUpperCase());
            setError(null);
          }}
        />
        <Button type="submit" className="shrink-0 px-5" disabled={plate.length < 6}>
          Ver mis precios <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
      {error && <p id="hero-plate-error" role="alert" className="text-sm text-coral-ink">{error}</p>}
      <Link href="/cotizar" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
        ¿No tienes la placa a la mano? Elige carro o moto
      </Link>
    </form>
  );
}
