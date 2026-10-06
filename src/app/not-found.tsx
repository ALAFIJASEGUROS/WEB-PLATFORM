import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-sm font-bold text-brand">404</p>
      <h1 className="mt-2 text-2xl font-extrabold text-heading">No encontramos esta página</h1>
      <p className="mt-2 text-muted">Puede que el enlace haya vencido o no exista.</p>
      <ButtonLink href="/" className="mt-6">Ir al inicio</ButtonLink>
    </div>
  );
}
