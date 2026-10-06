import Link from "next/link";
import { Bell, CarFront, Megaphone, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { campaignsFor, daysUntil, userPolicies, userReminders, userVehicles } from "@/server/queries";
import { LoginForm } from "@/components/account/LoginForm";
import { ButtonLink, Card } from "@/components/ui";

export default async function Page({ searchParams }: PageProps<"/cuenta">) {
  const user = await getCurrentUser();
  if (!user) {
    const { email } = await searchParams;
    return <LoginForm defaultEmail={typeof email === "string" ? email : ""} />;
  }

  const policies = userPolicies(user.id);
  const vehicles = userVehicles(user.id);
  const upcoming = userReminders(user.id).filter((r) => daysUntil(r.dueDate) >= 0).slice(0, 3);
  const offers = campaignsFor(user);

  const tiles = [
    { href: "/cuenta/seguros", icon: ShieldCheck, label: "Pólizas", value: policies.length },
    { href: "/cuenta/seguros#vehiculos", icon: CarFront, label: "Vehículos", value: vehicles.length },
    { href: "/cuenta/recordatorios", icon: Bell, label: "Recordatorios", value: userReminders(user.id).length },
    { href: "/cuenta/ofertas", icon: Megaphone, label: "Ofertas", value: offers.length },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-heading">
        Hola{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="p-4 transition hover:ring-2 hover:ring-brand">
              <t.icon className="size-5 text-brand" aria-hidden />
              <p className="mt-3 text-2xl font-extrabold text-heading">{t.value}</p>
              <p className="text-sm text-muted">{t.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="font-bold text-heading">Próximos vencimientos</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No tienes vencimientos próximos. Agrega la fecha del SOAT y la tecnomecánica de tus vehículos
            y te avisamos a tiempo.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {upcoming.map((r) => {
              const d = daysUntil(r.dueDate);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>{r.title}</span>
                  <span className={`shrink-0 font-bold ${d <= 15 ? "text-coral" : "text-heading"}`}>
                    {d === 0 ? "Hoy" : `en ${d} días`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {policies.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-5">
          <h2 className="font-bold text-heading">Aún no tienes pólizas aquí</h2>
          <p className="text-sm text-muted">Cotiza en 2 minutos o registra una póliza que ya tengas con otra aseguradora.</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/cotizar">Cotizar</ButtonLink>
            <ButtonLink href="/cuenta/seguros" variant="secondary">Registrar una póliza</ButtonLink>
          </div>
        </Card>
      )}
    </div>
  );
}
