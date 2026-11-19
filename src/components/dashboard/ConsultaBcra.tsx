"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import ResultadoBcra from "@/components/dashboard/ResultadoBcra";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { CreditCheckResponse, TenantResponse } from "@/lib/backend-types";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { copyDeError } from "@/lib/error-codes";

const FALLBACK = "No pudimos obtener la información del BCRA en este momento.";

/** Los inquilinos que se pueden consultar: los que tienen un CUIT/CUIL completo. */
export function inquilinosConCuit(tenants: TenantResponse[]): Array<{ id: number; nombre: string; cuit: string }> {
  return tenants
    .filter((t) => t.taxId && cuitValido(t.taxId))
    .map((t) => ({ id: t.id, nombre: `${t.firstName} ${t.lastName}`.trim(), cuit: soloDigitos(t.taxId!) }));
}

/**
 * Consulta de la Central de Deudores del BCRA para cualquier CUIT/CUIL (ALQ-145), por
 * ejemplo de un candidato antes de firmar. Ofrece además los inquilinos cargados que tienen
 * CUIT, para no tener que tipearlo. El resultado no se guarda.
 */
export default function ConsultaBcra({ demo = false }: Readonly<{ demo?: boolean }>) {
  const [cuit, setCuit] = useState("");
  const [intento, setIntento] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CreditCheckResponse | null>(null);
  const [inquilinos, setInquilinos] = useState<ReturnType<typeof inquilinosConCuit>>([]);

  useEffect(() => {
    if (demo) return;
    let vigente = true;
    AlquiaBackendClient.tenants.list()
      .then((tenants) => vigente && setInquilinos(inquilinosConCuit(tenants)))
      // Sin la lista se puede consultar igual, tipeando el CUIT.
      .catch(() => vigente && setInquilinos([]));
    return () => { vigente = false; };
  }, [demo]);

  const errorDeCuit = intento && !cuitValido(cuit) ? "Ingrese un CUIT o CUIL válido (11 dígitos)." : null;

  function cambiarCuit(valor: string) {
    setCuit(soloDigitos(valor));
    setResultado(null);
    setError(null);
  }

  async function consultar(event: React.FormEvent) {
    event.preventDefault();
    setIntento(true);
    if (!cuitValido(cuit)) return;
    setConsultando(true);
    setError(null);
    try {
      setResultado(await AlquiaBackendClient.tools.creditCheck(cuit));
    } catch (e) {
      setResultado(null);
      setError(copyDeError(e, { fallback: FALLBACK }));
    } finally {
      setConsultando(false);
    }
  }

  return (
    <div className="owner-card owner-calc">
      <div className="owner-tool__head">
        <h2>Central de Deudores <small>BCRA</small></h2>
        <Image src="/logos/bcra.svg" alt="BCRA" width={48} height={28} />
      </div>
      <p className="owner-card__copy">Consulte si una persona tiene deudas informadas en la base pública del BCRA. Sirve para un inquilino nuevo antes de firmar. El resultado no se guarda.</p>

      {resultado ? (
        <ResultadoBcra data={resultado} mostrarDenominacion onReset={() => setResultado(null)} />
      ) : (
        <form onSubmit={consultar} noValidate>
          <p className="owner-wizard-label">CUIT o CUIL</p>
          <label className="owner-wizard-field">
            <input inputMode="numeric" aria-label="CUIT o CUIL" placeholder="20-12345678-9"
              aria-invalid={errorDeCuit ? true : undefined}
              aria-describedby={errorDeCuit ? "bcra-cuit-error" : undefined}
              value={formatearCuit(cuit)} onChange={(e) => cambiarCuit(e.target.value)} />
          </label>
          {errorDeCuit && <p id="bcra-cuit-error" className="owner-wizard-error" role="alert">{errorDeCuit}</p>}

          {inquilinos.length > 0 && <>
            <p className="owner-wizard-label">O elija un inquilino suyo</p>
            <div className="owner-wizard-chips" role="group" aria-label="Inquilinos con CUIT">
              {inquilinos.map((inquilino) => (
                <button key={inquilino.id} type="button" aria-pressed={cuit === inquilino.cuit}
                  onClick={() => cambiarCuit(inquilino.cuit)}>
                  {inquilino.nombre}
                </button>
              ))}
            </div>
          </>}

          <button type="submit" className="owner-button owner-calc__submit" disabled={consultando} aria-busy={consultando || undefined}>
            {consultando ? <><Spinner size="sm" />Consultando…</> : <><Icon name="search" size={18} />Consultar</>}
          </button>
          {error && (
            <p className="owner-wizard-alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{error} También puede consultar en <a href="https://www.bcra.gob.ar/situacion-crediticia/" target="_blank" rel="noopener noreferrer">el sitio del BCRA</a>.</span>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
