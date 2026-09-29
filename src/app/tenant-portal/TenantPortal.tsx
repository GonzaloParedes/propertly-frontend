"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlquiaBackendClient } from "@/lib/backend-client";
import { ApiError } from "@/lib/api";
import {
  buildFilasInquilino,
  ordenarCuotas,
  type FilaCuotaInquilino,
} from "@/lib/portal-inquilino";
import type { InvoiceResponse } from "@/lib/backend-types";
import "./tenant-portal.css";

/**
 * La sesión no tiene un estado «expirada» distinto de «inválida»: el backend
 * responde el mismo 401 genérico para token roto, token de otro tipo, o sin
 * sesión y sin token — a propósito, para no revelar cuál de las tres cosas
 * pasó. Replicar esa ambigüedad acá es correcto, no una limitación.
 */
type Estado =
  | { fase: "cargando" }
  | { fase: "invalido" }
  | { fase: "error" }
  | { fase: "listo"; invoices: InvoiceResponse[] };

function Icon({ name, size = 20 }: { name: "check" | "clock" | "alert" | "file" | "download" | "x"; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    check: <path d="M20 6 9 17l-5-5" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    alert: <><path d="M12 9v4M12 16.5h.01" /><path d="M10.3 3.9 1.8 18a1.7 1.7 0 0 0 1.5 2.6h17.4a1.7 1.7 0 0 0 1.5-2.6L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z" /></>,
    file: <><path d="M6 2.5h8l4 4V21.5H6z" /><path d="M14 2.5v4h4" /></>,
    download: <><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M4 19.5h16" /></>,
    x: <path d="M18 6 6 18M6 6l12 12" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{paths[name]}</svg>;
}

function EstadoBadge({ children }: { children: FilaCuotaInquilino["estado"] }) {
  const config: Record<FilaCuotaInquilino["estado"], ["ok" | "warn" | "bad" | "info", Parameters<typeof Icon>[0]["name"]]> = {
    Pagada: ["ok", "check"],
    "A vencer": ["warn", "clock"],
    Vencida: ["bad", "alert"],
    "Pago a confirmar": ["info", "clock"],
  };
  const [tono, icono] = config[children];
  return (
    <span className={`tenant-badge tenant-badge--${tono}`}>
      <Icon name={icono} size={15} />
      {children}
    </span>
  );
}

export default function TenantPortal() {
  const searchParams = useSearchParams();
  const tokenDeLaUrl = searchParams.get("token");
  const [estado, setEstado] = useState<Estado>({ fase: "cargando" });
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [viendoComprobante, setViendoComprobante] = useState<number | null>(null);
  const inputsRef = useRef<Record<number, HTMLInputElement | null>>({});

  async function cargarCuotas() {
    try {
      const invoices = await AlquiaBackendClient.tenantPortal.invoices();
      setEstado({ fase: "listo", invoices });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setEstado({ fase: "invalido" });
      } else {
        setEstado({ fase: "error" });
      }
    }
  }

  useEffect(() => {
    let cancelado = false;
    async function iniciar() {
      // Con token en la URL, se canjea primero: es lo que deja la cookie
      // puesta. Sin token —una visita posterior—, se salta directo a pedir las
      // cuotas y la cookie ya presente decide si hay sesión.
      if (tokenDeLaUrl) {
        try {
          await AlquiaBackendClient.tenantAuth.session({ token: tokenDeLaUrl });
        } catch {
          if (!cancelado) setEstado({ fase: "invalido" });
          return;
        }
      }
      if (!cancelado) await cargarCuotas();
    }
    void iniciar();
    return () => {
      cancelado = true;
    };
    // Sólo al montar: el token de la URL no cambia durante la sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subirComprobante(invoiceId: number, archivo: File) {
    setErrorSubida(null);
    setSubiendo(invoiceId);
    try {
      await AlquiaBackendClient.tenantPortal.createPayment(invoiceId, archivo);
      await cargarCuotas();
    } catch (err) {
      setErrorSubida(
        err instanceof ApiError && err.status === 400
          ? "No pudimos registrar el comprobante. Verifique el archivo e intente de nuevo."
          : "No pudimos subir el comprobante. Inténtelo de nuevo más tarde."
      );
    } finally {
      setSubiendo(null);
    }
  }

  async function verComprobante(pagoId: number) {
    setErrorSubida(null);
    setViendoComprobante(pagoId);
    try {
      const blob = await AlquiaBackendClient.tenantPortal.getReceipt(pagoId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setErrorSubida("No pudimos abrir el comprobante. Inténtelo de nuevo más tarde.");
    } finally {
      setViendoComprobante(null);
    }
  }

  if (estado.fase === "cargando") {
    return (
      <main className="tenant-portal tenant-portal--centrado">
        <p className="tenant-nota">Cargando…</p>
      </main>
    );
  }

  if (estado.fase === "invalido") {
    return (
      <main className="tenant-portal tenant-portal--centrado">
        <div className="tenant-mensaje">
          <Icon name="alert" size={28} />
          <h1>Este enlace no funciona</h1>
          <p>
            Puede haber vencido o no ser válido. Pídale a su propietario que se lo
            reenvíe.
          </p>
        </div>
      </main>
    );
  }

  if (estado.fase === "error") {
    return (
      <main className="tenant-portal tenant-portal--centrado">
        <div className="tenant-mensaje" role="alert">
          <Icon name="alert" size={28} />
          <h1>No pudimos cargar sus cuotas</h1>
          <p>Inténtelo de nuevo más tarde.</p>
        </div>
      </main>
    );
  }

  const filas = ordenarCuotas(buildFilasInquilino(estado.invoices));

  return (
    <main className="tenant-portal">
      <header className="tenant-header">
        <h1>Sus cuotas</h1>
        <p>Acá puede ver el estado de cada una y subir su comprobante de pago.</p>
      </header>

      {errorSubida && (
        <p className="tenant-alerta" role="alert">
          <Icon name="alert" size={18} />
          {errorSubida}
        </p>
      )}

      {filas.length === 0 ? (
        <p className="tenant-nota">Todavía no tiene cuotas generadas.</p>
      ) : (
        <ul className="tenant-lista">
          {filas.map((fila) => (
            <li className="tenant-cuota" key={fila.invoiceId}>
              <div className="tenant-cuota__cabecera">
                <div>
                  <b>{fila.periodo}</b>
                  <small>Vence el {fila.vencimiento}</small>
                </div>
                <EstadoBadge>{fila.estado}</EstadoBadge>
              </div>

              <div className="tenant-cuota__monto">
                <span>{fila.monto}</span>
                {!fila.confirmada && (
                  <small className="tenant-cuota__aviso">
                    El propietario todavía no cerró este importe: puede cambiar.
                  </small>
                )}
              </div>

              {fila.pago && (
                <div className="tenant-cuota__pago">
                  {fila.pago.status === "AWAITING_CONFIRMATION" && (
                    <span className="tenant-pago-estado tenant-pago-estado--info">
                      Comprobante esperando confirmación del propietario
                    </span>
                  )}
                  {fila.pago.status === "CONFIRMED" && (
                    <span className="tenant-pago-estado tenant-pago-estado--ok">
                      Pago confirmado
                    </span>
                  )}
                  {fila.pago.status === "REJECTED" && (
                    <span className="tenant-pago-estado tenant-pago-estado--bad">
                      El propietario rechazó este comprobante
                      {fila.pago.rejectionReason && `: ${fila.pago.rejectionReason}`}
                    </span>
                  )}
                  <button
                    type="button"
                    className="tenant-link-boton"
                    disabled={viendoComprobante === fila.pago.id}
                    onClick={() => fila.pago && void verComprobante(fila.pago.id)}
                  >
                    <Icon name="download" size={16} />
                    {viendoComprobante === fila.pago.id ? "Abriendo…" : "Ver comprobante"}
                  </button>
                </div>
              )}

              {fila.puedeSubirComprobante && (
                <div className="tenant-cuota__subir">
                  <input
                    ref={(el) => {
                      inputsRef.current[fila.invoiceId] = el;
                    }}
                    type="file"
                    className="sr-only"
                    aria-label={`Subir comprobante de ${fila.periodo}`}
                    onChange={(e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) void subirComprobante(fila.invoiceId, archivo);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    className="tenant-boton"
                    disabled={subiendo === fila.invoiceId}
                    onClick={() => inputsRef.current[fila.invoiceId]?.click()}
                  >
                    <Icon name="file" size={16} />
                    {subiendo === fila.invoiceId ? "Subiendo…" : "Subir comprobante"}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
