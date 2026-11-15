import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Bike, Building2, CalendarClock, CarFront, CheckCircle2, Clock, XCircle } from "lucide-react";
import { MEMBERSHIP_STATUS_LABELS, nextTier, PAYMENT_MODEL_LABELS, tierFor, type Company, type Membership } from "@/domain/companies";
import { formatCOP, formatDayMonth } from "@/domain/labels";
import { ACTIVE_CONFIGS } from "@/insurers/mock/insurers";
import { getCurrentUser } from "@/server/auth";
import { emailMatchesCompany, enrolledCount, findCompanyBySlug, membershipFor } from "@/server/companies";
import { LoginForm } from "@/components/account/LoginForm";
import { ActionForm } from "@/components/account/ActionForm";
import { Badge, ButtonLink, Card, Field, inputClass, SimulatedDataNotice } from "@/components/ui";
import { Footer } from "@/components/Footer";
import { joinCompanyAction } from "./actions";

export const metadata: Metadata = { title: "Beneficio de tu empresa", robots: { index: false } };

const PLANS = ACTIVE_CONFIGS.flatMap((c) => c.plans.map((p) => ({ ...p, insurer: c.name })));

function enabledPlans(company: Company) {
  return company.allowedPlanCodes.length === 0 ? PLANS : PLANS.filter((p) => company.allowedPlanCodes.includes(p.code));
}

const roundK = (n: number) => Math.round(n / 1000) * 1000;

export default async function Page({ params, searchParams }: PageProps<"/empresas/[slug]">) {
  const { slug } = await params;
  const { codigo, eleccion } = await searchParams;
  const company = findCompanyBySlug(slug);
  if (!company) notFound();
  const user = await getCurrentUser();
  const membership = user ? membershipFor(company.id, user) : null;
  const enrolled = enrolledCount(company.id);
  const tier = tierFor(enrolled, company.tiers);
  const next = nextTier(enrolled, company.tiers);
  const plans = enabledPlans(company);
  const types = [...new Set(plans.map((p) => p.vehicleType))];
  const first = company.tiers[0];
  const goal = next?.tier.minEmployees ?? enrolled;

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <header className="flex items-center gap-4">
          {company.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo en data URL
            <img src={company.logo} alt={`Logo de ${company.name}`} className="size-16 shrink-0 rounded-2xl border border-line bg-white object-contain p-2" />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand" aria-hidden>
              <Building2 className="size-7" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted">Beneficio para empleados</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-heading">{company.name}</h1>
          </div>
        </header>
        <SimulatedDataNotice />

        {company.status !== "activa" && (
          <p role="status" className="rounded-xl bg-sun-soft p-4 text-sm text-sun-ink">
            El programa de esta empresa está pausado. Mientras tanto no se aplica la tarifa corporativa.
          </p>
        )}

        <Card className="space-y-4 p-5">
          <h2 className="font-bold text-heading">El beneficio</h2>
          <p className="text-sm text-ink">
            Asegura tu carro o moto personal con Seguros Bolívar a la tarifa corporativa de {company.name}.{" "}
            {PAYMENT_MODEL_LABELS[company.paymentModel]}
            {company.paymentModel === "copago" && company.copayAmount ? `: ${formatCOP(company.copayAmount)} al año por persona` : ""}.
          </p>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <p className="font-semibold text-heading">
                {tier ? `Hoy: ${tier.discountPct} % de descuento` : `El descuento empieza con ${first.minEmployees} inscritos`}
              </p>
              <p className="text-muted">{enrolled} {enrolled === 1 ? "inscrito" : "inscritos"}</p>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-canvas"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={enrolled}
              aria-label="Inscritos frente al siguiente tramo"
            >
              <span className="block h-full rounded-full bg-mint" style={{ width: `${goal ? Math.min(100, (enrolled / goal) * 100) : 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">
              {next ? `Si se inscriben ${next.missing} más, el descuento sube al ${next.tier.discountPct} % para todos.` : "Llegaron al descuento máximo."}
            </p>
          </div>
          {company.enrollmentClosesAt && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <CalendarClock className="size-4 text-brand" aria-hidden /> La inscripción cierra el {formatDayMonth(company.enrollmentClosesAt)}. Ese día se fija el precio final.
            </p>
          )}
          <div>
            <p className="mb-1 text-sm font-semibold text-heading">Planes disponibles</p>
            <ul className="flex flex-wrap gap-2">
              {plans.map((p) => (
                <li key={p.code}><Badge tone="neutral">{p.name} · {p.vehicleType === "auto" ? "carro" : "moto"}</Badge></li>
              ))}
            </ul>
          </div>
        </Card>

        {!user ? (
          <section aria-labelledby="entrar" className="space-y-3">
            <h2 id="entrar" className="font-bold text-heading">Entra para unirte</h2>
            <p className="text-sm text-muted">Usa tu correo de la empresa. Si no tienes uno, entra con tu correo personal y escribe el código que te compartieron.</p>
            <LoginForm next={`/empresas/${company.slug}${typeof codigo === "string" && codigo ? `?codigo=${encodeURIComponent(codigo)}` : ""}`} />
          </section>
        ) : !membership ? (
          <JoinCard company={company} email={user.email} code={typeof codigo === "string" ? codigo : ""} />
        ) : (
          <MembershipCard
            company={company}
            membership={membership}
            types={types}
            justChose={eleccion === "ok"}
            nextPct={next?.tier.discountPct ?? null}
          />
        )}
      </div>
      <Footer />
    </>
  );
}

function JoinCard({ company, email, code }: { company: Company; email: string; code: string }) {
  const byDomain = emailMatchesCompany(company, email);
  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-bold text-heading">Únete al beneficio</h2>
      <p className="text-sm text-muted">
        {byDomain
          ? `Tu correo ${email} es de ${company.name}. Al unirte, el área encargada confirma tu vinculación.`
          : `Entraste como ${email}. Escribe el código que te compartió ${company.name}.`}
      </p>
      <ActionForm action={joinCompanyAction.bind(null, company.slug)} submitLabel="Unirme" resetOnSuccess={false} className="space-y-3">
        {!byDomain && (
          <Field label="Código de tu empresa" htmlFor="join-code">
            <input id="join-code" name="code" required defaultValue={code} autoCapitalize="characters" autoComplete="off" className={`${inputClass} font-mono uppercase`} />
          </Field>
        )}
      </ActionForm>
    </Card>
  );
}

function MembershipCard({
  company,
  membership: m,
  types,
  justChose,
  nextPct,
}: {
  company: Company;
  membership: Membership;
  types: ("auto" | "moto")[];
  justChose: boolean;
  nextPct: number | null;
}) {
  const active = m.status === "pendiente" || m.status === "aprobado";
  const Icon = m.status === "aprobado" ? CheckCircle2 : m.status === "pendiente" ? Clock : XCircle;
  const s = m.selection;
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Icon className={`size-6 ${m.status === "aprobado" ? "text-mint" : m.status === "pendiente" ? "text-brand" : "text-coral"}`} aria-hidden />
        <h2 className="mr-auto font-bold text-heading">Tu vinculación</h2>
        <Badge tone={m.status === "aprobado" ? "mint" : m.status === "pendiente" ? "sun" : "neutral"}>{MEMBERSHIP_STATUS_LABELS[m.status]}</Badge>
      </div>
      {m.status === "pendiente" && <p className="text-sm text-muted">{company.name} debe confirmar que trabajas allí. Mientras tanto ya puedes cotizar y elegir tu plan.</p>}
      {m.status === "rechazado" && <p className="text-sm text-ink">{company.name} no aprobó la vinculación{m.reason ? `: ${m.reason}` : "."} Si crees que es un error, habla con el área encargada.</p>}
      {m.status === "retirado" && <p className="text-sm text-ink">Ya no haces parte del programa. Si tienes una póliza, sigue vigente hasta su vencimiento.</p>}

      {justChose && s && (
        <p role="status" className="rounded-xl bg-mint-soft p-3 text-sm text-ink">Guardamos tu elección. Te avisaremos al cierre de la inscripción para confirmar el precio final y pagar.</p>
      )}

      {s && (
        <div className="space-y-1 rounded-xl bg-canvas p-4 text-sm">
          <p className="font-semibold text-heading">Tu plan elegido: {s.planName}</p>
          <p className="text-muted">{s.vehicleLabel} · {s.insurerName}</p>
          <p>
            Precio estimado hoy: <strong className="text-heading">{formatCOP(s.estimatedPremium)}</strong> al año
            {s.listPremium > s.estimatedPremium && <span className="text-muted"> (antes {formatCOP(s.listPremium)})</span>}
          </p>
          {company.paymentModel === "empresa" && <p className="font-semibold text-mint">{company.name} paga el total: tú no pagas nada.</p>}
          {company.paymentModel === "copago" && company.copayAmount ? (
            <p>
              {company.name} aporta {formatCOP(company.copayAmount)}. Tu parte:{" "}
              <strong className="text-heading">{formatCOP(Math.max(0, s.estimatedPremium - company.copayAmount))}</strong> al año.
            </p>
          ) : null}
          {nextPct !== null && (
            <p className="text-muted">Si la empresa llega al siguiente tramo, quedaría cerca de {formatCOP(roundK(s.listPremium * (1 - nextPct / 100)))}.</p>
          )}
        </div>
      )}

      {active && (
        <div className="flex flex-wrap gap-3">
          {types.includes("auto") && (
            <ButtonLink href={`/cotizar/auto?empresa=${company.slug}`} variant={s ? "secondary" : "primary"}>
              <CarFront className="size-4" aria-hidden /> {s?.vehicleType === "auto" ? "Cambiar mi plan" : "Cotizar mi carro"}
            </ButtonLink>
          )}
          {types.includes("moto") && (
            <ButtonLink href={`/cotizar/moto?empresa=${company.slug}`} variant="secondary">
              <Bike className="size-4" aria-hidden /> {s?.vehicleType === "moto" ? "Cambiar mi plan" : "Cotizar mi moto"}
            </ButtonLink>
          )}
        </div>
      )}
    </Card>
  );
}
