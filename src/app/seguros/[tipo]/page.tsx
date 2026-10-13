import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { formatCOP } from "@/domain/labels";
import { estimatePrice } from "@/insurers/estimate";
import { CURRENT_YEAR } from "@/vehicles/lookup";
import { modelPages, modelPath, SLUG_TYPE, vehicleName } from "@/vehicles/pages";

export const dynamicParams = false;
export const generateStaticParams = () => [{ tipo: "carro" }, { tipo: "moto" }];

export async function generateMetadata({ params }: PageProps<"/seguros/[tipo]">): Promise<Metadata> {
  const { tipo } = await params;
  return {
    title: `Seguro de ${tipo} por marca y línea`,
    description: `Precios de referencia del seguro de ${tipo} en Colombia por marca y línea. Compara aseguradoras y compra en línea.`,
  };
}

export default async function Page({ params }: PageProps<"/seguros/[tipo]">) {
  const { tipo } = await params;
  const type = SLUG_TYPE[tipo];
  if (!type) notFound();
  const pages = modelPages().filter((p) => p.type === type);
  const brands = [...new Set(pages.map((p) => p.brand))];
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-heading">Seguro de {tipo} por marca y línea</h1>
        <p className="mt-2 text-lg text-muted">Precio de referencia para un perfil típico en Bogotá. Elige tu {tipo} para ver el detalle.</p>
        <div className="mt-6 space-y-6">
          {brands.map((brand) => (
            <section key={brand} aria-labelledby={`b-${brand}`}>
              <h2 id={`b-${brand}`} className="mb-2 text-lg font-bold text-heading">{brand}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {pages.filter((p) => p.brand === brand).map((p) => {
                  const e = estimatePrice({ type, brand: p.brand, model: p.model, year: CURRENT_YEAR - 3, city: "Bogotá", age: 35 });
                  return (
                    <li key={p.model}>
                      <Link href={modelPath(p)} className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 shadow-[var(--shadow-card)] hover:ring-2 hover:ring-brand">
                        <span className="font-semibold text-heading">{vehicleName(p.brand, p.model)}</span>
                        {e && <span className="text-sm text-muted">desde {formatCOP(e.min)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}
