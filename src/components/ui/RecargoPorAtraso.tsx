import { Icon } from "@/components/ui/Icon";
import type { RecargoVista } from "@/lib/recargo";

/**
 * El recargo por atraso de una cuota, con icono y palabra (no sólo color) y los
 * importes tal como los calculó el backend. Lo usan el propietario y el
 * inquilino; la vista ya decidió qué línea corresponde a cada estado.
 */
export function RecargoPorAtraso({ vista, importeHoy }: Readonly<{
  vista: RecargoVista;
  /** Lo que se adeuda hoy. Sólo se muestra cuando hay un «Desde mañana» con qué compararlo. */
  importeHoy?: string;
}>) {
  return (
    <div className="recargo">
      {importeHoy && vista.desdeManana && <span className="recargo__linea">Hoy: <b>{importeHoy}</b></span>}
      {vista.monto && (
        <span className="recargo__linea recargo__linea--etiqueta">
          <Icon name="clock" size={15} />{vista.etiqueta} <b>{vista.monto}</b>
        </span>
      )}
      {vista.desdeManana && <span className="recargo__linea">Desde mañana: <b>{vista.desdeManana}</b></span>}
      {vista.detalle && <span className="recargo__linea">{vista.detalle}</span>}
      {vista.modificado && <span className="recargo__linea recargo__linea--modificado">{vista.modificado}</span>}
    </div>
  );
}
