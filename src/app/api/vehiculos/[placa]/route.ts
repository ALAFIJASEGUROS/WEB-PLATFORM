import { lookupPlate } from "@/vehicles/lookup";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/vehiculos/[placa]">,
) {
  const { placa } = await ctx.params;
  const vehicle = lookupPlate(placa);
  if (!vehicle) {
    return Response.json(
      { error: "Placa no válida. Usa el formato ABC123 (carro) o ABC12D (moto)." },
      { status: 404 },
    );
  }
  return Response.json(vehicle);
}
