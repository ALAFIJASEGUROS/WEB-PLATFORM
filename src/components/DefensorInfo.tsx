import { BOLIVAR_CONFIG, SURA_CONFIG } from "@/insurers/mock/insurers";

/**
 * Información del Defensor del Consumidor Financiero. Cada aseguradora tiene el
 * suyo; los datos de contacto deben confirmarse con la aseguradora antes de operar.
 */
export function DefensorInfo() {
  return (
    <section aria-labelledby="defensor" className="mt-10">
      <h2 id="defensor">Defensor del Consumidor Financiero</h2>
      <p>
        Si no estás de acuerdo con la respuesta, puedes acudir gratuitamente al Defensor del Consumidor Financiero
        de tu aseguradora o presentar una queja ante la Superintendencia Financiera de Colombia.
      </p>
      <ul>
        {[SURA_CONFIG, BOLIVAR_CONFIG].map((c) => (
          <li key={c.id}>
            <strong>{c.name}:</strong> consulta los datos de su Defensor en el sitio web oficial de la aseguradora.
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Datos de contacto pendientes de confirmar con cada aseguradora.</p>
    </section>
  );
}
