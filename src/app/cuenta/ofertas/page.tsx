import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { campaignsFor } from "@/server/queries";
import { Badge, Button, Card } from "@/components/ui";
import { setMarketingConsentAction } from "../actions";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/cuenta");

  if (!user.marketingConsent) {
    return (
      <Card className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <Megaphone className="mx-auto size-10 text-brand" aria-hidden />
        <h1 className="text-xl font-extrabold text-heading">Ofertas de aseguradoras y aliados</h1>
        <p className="text-sm text-muted">
          Con tu autorización, aseguradoras y empresas aliadas pueden mostrarte beneficios según los
          vehículos que tienes. No compartimos tu correo ni tu celular con ellas. Puedes retirar el
          permiso cuando quieras.
        </p>
        <form action={setMarketingConsentAction.bind(null, true)}>
          <Button type="submit">Sí, quiero ver ofertas</Button>
        </form>
      </Card>
    );
  }

  const campaigns = campaignsFor(user);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-heading">Ofertas para ti</h1>
        <form action={setMarketingConsentAction.bind(null, false)}>
          <button className="min-h-10 text-sm font-semibold text-muted underline">No quiero recibir ofertas</button>
        </form>
      </div>
      {campaigns.length === 0 && <p className="text-muted">No hay ofertas disponibles por ahora.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="space-y-2 p-5">
            <Badge tone="sun">Publicidad · {c.sponsor}</Badge>
            <h2 className="font-bold text-heading">{c.title}</h2>
            <p className="text-sm text-muted">{c.body}</p>
            <Link href={c.ctaUrl} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">
              {c.ctaLabel}
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
