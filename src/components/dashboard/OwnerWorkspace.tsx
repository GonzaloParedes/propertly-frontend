"use client";
/* eslint-disable react-hooks/static-components -- render helpers share the local prototype state. */

import { useEffect, useState } from "react";
import CreationWizard from "@/components/dashboard/CreationWizard";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type {
  ContractResponse,
  PropertyResponse,
  ReminderSettingsResponse,
  RentIncrementResponse,
  TenantRequest,
  UserUpdateRequest,
} from "@/lib/backend-types";
import { buildTenantRows, resumenInquilinos, type TenantRow } from "@/lib/tenant-rows";
import {
  buildFilasCobranza,
  contarPorFiltro,
  filtrar,
  resumenCobranzas,
  type FilaCobranza,
  type FiltroCobranza,
} from "@/lib/cobranzas";
import {
  buildFilasContrato,
  contarContratos,
  describirActualizacion,
  filtrarContratos,
  resumenContratos,
  type FilaContrato,
  type FiltroContrato,
} from "@/lib/contratos";
import {
  backendNoInformaContratos,
  buildFilasPropiedad,
  ciudadesDisponibles as ciudadesDe,
  contarFacetas,
  desdeDeLaVentana,
  filtrarPropiedades,
  resumenPropiedades,
  type FilaPropiedad,
} from "@/lib/propiedades";
import { etiquetaCategoria } from "@/lib/propiedad";
import { formatearDireccion, formatearFecha, formatearMonto, formatearPeriodo } from "@/lib/formato";
import {
  avisosPendientes,
  contratosVigentes,
  periodoCorriente,
  periodoSiguiente,
  proporciones,
  proyeccionDelMes,
  resumenDeCartera,
  resumenDeCobranza,
  type Aviso,
  type Proyeccion,
  type ResumenCartera,
  type ResumenCobranza,
} from "@/lib/inicio";
import {
  comoSeActualiza,
  condicionesComerciales,
  descripcionDocumento,
  formatearImporte,
  historialDeAumentos,
  proximaActualizacion,
  vigenciaEnFechas,
} from "@/lib/contrato-detalle";
import Counter from "@/components/ui/Counter";
import { correoValido } from "@/lib/correo";
import { calcularDelta, describirAjuste, describirDelta } from "@/lib/ajustes";
import { estadoDeContrato } from "@/lib/contratos";
import { describirRecordatorios, resumenRecordatorios, DIAS_MAX, DIAS_MIN } from "@/lib/recordatorios";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";
import { ApiError, AuthExpiredError } from "@/lib/api";
import CambioCondicionesForm from "@/components/dashboard/CambioCondicionesForm";
import { useAuth } from "@/context/auth-context";

export type OwnerView = "inicio" | "propiedades" | "contratos" | "cobranzas" | "inquilinos" | "configuracion";
type View = OwnerView;
type Detail = "property" | "contract" | "tenant" | null;
type Creation = "property" | "contract" | "tenant" | null;
type IconName = "search" | "sliders" | "plus" | "building" | "file" | "card" | "users" | "check" | "clock" | "alert" | "x" | "arrow" | "link" | "download" | "edit" | "archive" | "receipt" | "calendar" | "trend" | "paperclip" | "copy";

function Icon({ name, size = 21 }: Readonly<{ name: IconName; size?: number }>) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, React.ReactNode> = {
    search: <><circle cx="11" cy="11" r="7" /><path d="M20.5 20.5 16 16" /></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2M10 21v-2.5h4V21" /></>,
    file: <><path d="M6 2.5h8l4 4V21.5H6z" /><path d="M14 2.5v4h4M9 12h6M9 16h6" /></>,
    card: <><rect x="2.5" y="5.5" width="19" height="13" rx="2.5" /><path d="M2.5 10h19M6 14.5h4" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.4a6.5 6.5 0 0 1 4 5.6" /></>,
    check: <path strokeWidth="2.6" d="m20 6.5-10.5 10L4 11.5" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.2 2" /></>,
    alert: <><path d="M12 3.5 2.5 20.5h19L12 3.5Z" /><path d="M12 10v4.5M12 17.8v.1" /></>,
    x: <path strokeWidth="2.6" d="m6.5 6.5 11 11m0-11-11 11" />,
    arrow: <><path d="M4 12h15" /><path d="m13.5 6 5.5 6-5.5 6" /></>,
    link: <><path d="M10 13.5a4.5 4.5 0 0 0 6.36.14l2-2a4.5 4.5 0 0 0-6.36-6.36L10.85 6.42" /><path d="M14 10.5a4.5 4.5 0 0 0-6.36-.14l-2 2A4.5 4.5 0 0 0 12 18.72l1.15-1.14" /></>,
    download: <><path d="M12 3v12" /><path d="m7.5 10.5 4.5 4.5 4.5-4.5M5 21h14" /></>,
    edit: <><path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z" /><path d="m14.5 6.5 3 2.5" /></>,
    archive: <path d="M4 7h16v13H4zM3 4h18v3H3zM10 12h4" />,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    trend: <><path d="m3.5 17.5 5-5.5 4 3.5 7.5-8" /><path d="M15.5 7.5h5v5" /></>,
    paperclip: <path d="m20 11-8.6 8.6a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.7 8.7a2 2 0 0 1-2.8-2.8L14.6 6.8" />,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>{paths[name]}</svg>;
}

const properties = [
  { id: "rivadavia", address: "Av. Rivadavia 2340, 5.º A", city: "CABA", type: "Departamento", detail: "68 m² · 2 dormitorios · 1 baño", bedrooms: 2, area: 68, pets: false, furnished: false, tenant: "Jorge Paletta", rent: "$ 478.691", state: "Vencida" as const },
  { id: "lavalle", address: "Lavalle 950, 3.º B", city: "CABA", type: "Departamento", detail: "54 m² · 1 dormitorio · 1 baño", bedrooms: 1, area: 54, pets: false, furnished: true, tenant: "Marta Suárez", rent: "$ 520.000", state: "Pago a confirmar" as const },
  { id: "colon", address: "Colón 2255, 4.º D", city: "Vicente López", type: "Departamento", detail: "58 m² · 2 dormitorios · 1 baño", bedrooms: 2, area: 58, pets: true, furnished: false, tenant: "Diego Ferrari", rent: "$ 505.000", state: "A vencer" as const },
  { id: "belgrano", address: "Belgrano 445, PB", city: "Morón", type: "Casa", detail: "92 m² · 3 dormitorios · 2 baños", bedrooms: 3, area: 92, pets: true, furnished: false, tenant: "Ana Ferreyra", rent: "$ 430.000", state: "Al día" as const },
  { id: "mitre", address: "Mitre 78", city: "San Isidro", type: "Local", detail: "52 m² · Planta baja", bedrooms: 0, area: 52, pets: false, furnished: false, tenant: null, rent: null, state: "Sin alquilar" as const },
];

const contracts = [
  { id: "rivadavia", property: properties[0], end: "31/08/2027", increment: "Sube 8 % cada 3 meses", document: "Contrato-Rivadavia-Paletta.pdf" },
  { id: "lavalle", property: properties[1], end: "28/02/2028", increment: "Ajusta por ICL cada 6 meses", document: "Contrato-Lavalle-Suarez.pdf" },
  { id: "colon", property: properties[2], end: "31/01/2028", increment: "Sube 7 % cada 4 meses", document: null },
  { id: "belgrano", property: properties[3], end: "30/09/2026", increment: "Sube $ 35.000 cada 6 meses", document: "Contrato-Belgrano-Ferreyra.pdf" },
];

const tenants = [
  { name: "Jorge Paletta", tax: "20-22456789-9", email: "jorge.paletta@gmail.com", property: properties[0] },
  { name: "Marta Suárez", tax: "27-24891055-6", email: "marta.suarez@gmail.com", property: properties[1] },
  { name: "Diego Ferrari", tax: "20-30115482-9", email: "diego.ferrari@outlook.com", property: properties[2] },
  { name: "Ana Ferreyra", tax: "27-28904113-9", email: "ana.ferreyra@gmail.com", property: properties[3] },
];

/**
 * Las filas de inquilino del prototipo salen de los mismos arrays de ejemplo que
 * el resto de las vistas, así la demo no se contradice a sí misma. Se suma uno
 * sin contrato: desde que el asistente permite cargar un inquilino suelto, ese
 * estado es parte del diseño y el prototipo tiene que mostrarlo.
 */
const inquilinosDemo: TenantRow[] = [
  ...tenants.map((tenant, indice) => ({
    id: indice + 1,
    nombre: tenant.name,
    nombrePila: tenant.name.split(" ")[0],
    apellido: tenant.name.split(" ").slice(1).join(" "),
    cuit: tenant.tax,
    email: tenant.email,
    telefono: "+5491144552210",
    contratoId: indice + 1,
    direccion: tenant.property.address,
    alquiler: tenant.property.rent,
    estado: tenant.property.state === "Sin alquilar" ? ("Al día" as const) : tenant.property.state,
  })),
  { id: 90, nombre: "Luis Cabrera", nombrePila: "Luis", apellido: "Cabrera",
    cuit: "20-31447290-0", email: "luis.cabrera@gmail.com", telefono: "+5491155667788",
    contratoId: null, direccion: null, alquiler: null, estado: "Sin contrato" },
];

/**
 * Las cuatro cuotas del prototipo, con la forma que tiene el dato real. Cubren
 * las cuatro acciones posibles: revisar, confirmar, registrar y descargar.
 */
const cobranzasDemo: FilaCobranza[] = [
  { invoiceId: 1, importeBase: 478691, totalVigente: 478691, ajustes: [], direccion: "Av. Rivadavia 2340, 5.º A", inquilino: "Jorge Paletta", periodo: "agosto 2026",
    monto: "$ 478.691", vencimiento: "10/08/2026", vencimientoISO: "2026-08-10", estado: "Vencida",
    confirmada: true, accion: "registrar", pagoPendiente: null, pagoConfirmado: null },
  { invoiceId: 2, importeBase: 520000, totalVigente: 520000, ajustes: [], direccion: "Lavalle 950, 3.º B", inquilino: "Marta Suárez", periodo: "agosto 2026",
    monto: "$ 520.000", vencimiento: "10/08/2026", vencimientoISO: "2026-08-10", estado: "Pago a confirmar",
    confirmada: true, accion: "revisar",
    pagoPendiente: { id: 90, invoiceId: 2, status: "AWAITING_CONFIRMATION", submittedByTenant: true,
      receiptFileName: "comprobante-transferencia.jpg", receiptContentType: "image/jpeg", receiptSizeBytes: 1887436 },
    pagoConfirmado: null },
  { invoiceId: 3, importeBase: 505000, totalVigente: 505000, ajustes: [], direccion: "Colón 2255, 4.º D", inquilino: "Diego Ferrari", periodo: "agosto 2026",
    monto: "$ 505.000", vencimiento: "25/08/2026", vencimientoISO: "2026-08-25", estado: "A vencer",
    confirmada: false, accion: "confirmar", pagoPendiente: null, pagoConfirmado: null },
  { invoiceId: 4, importeBase: 430000, totalVigente: 430000, ajustes: [], direccion: "Belgrano 445, PB", inquilino: "Ana Ferreyra", periodo: "agosto 2026",
    monto: "$ 430.000", vencimiento: "05/08/2026", vencimientoISO: "2026-08-05", estado: "Pagada",
    confirmada: true, accion: "comprobante",
    pagoPendiente: null,
    pagoConfirmado: { id: 91, invoiceId: 4, status: "CONFIRMED", submittedByTenant: false,
      receiptFileName: "recibo-agosto.pdf", receiptContentType: "application/pdf", receiptSizeBytes: 240000 } },
];

/**
 * Las cinco propiedades del prototipo, ya con la forma que tiene la fila real.
 * Salen de los mismos arrays que el resto de la demo para que no se contradiga.
 */
const propiedadesDemo: FilaPropiedad[] = properties.map((p, indice) => ({
  id: indice + 1,
  direccion: p.address,
  ciudad: p.city,
  detalle: `${p.type} · ${p.city} · ${p.detail}`,
  alquiler: p.rent,
  contratoId: p.tenant ? indice + 1 : null,
  estado: p.state === "Al día" || p.state === "Vencida" || p.state === "Pago a confirmar"
    ? p.state
    : "Sin alquilar",
  dormitorios: p.bedrooms,
  mascotas: p.pets,
  amoblada: p.furnished,
  busqueda: `${p.address} ${p.city} ${p.tenant ?? ""}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(),
}));

/**
 * Los cuatro contratos del prototipo, con la forma del dato real. `FilaContrato`
 * identifica por número, pero el detalle de la demo se busca por su id de texto
 * («rivadavia»): la traducción vive acá y en ningún otro lado.
 */
const CLAVES_CONTRATO_DEMO = ["rivadavia", "lavalle", "colon", "belgrano"];

const contratosDemo: FilaContrato[] = [
  { id: 1, direccion: "Av. Rivadavia 2340, 5.º A", inquilino: "Jorge Paletta",
    actualizacion: "Sube 8 % cada 3 meses", fin: "31/08/2027", finISO: "2027-08-31",
    alquiler: "$ 478.691", estado: "Vigente", sucesorId: null },
  { id: 2, direccion: "Lavalle 950, 3.º B", inquilino: "Marta Suárez",
    actualizacion: "Ajusta por ICL cada 6 meses", fin: "28/02/2028", finISO: "2028-02-28",
    alquiler: "$ 520.000", estado: "Vigente", sucesorId: null },
  { id: 3, direccion: "Colón 2255, 4.º D", inquilino: "Diego Ferrari",
    actualizacion: "Sube 7 % cada 4 meses", fin: "31/01/2028", finISO: "2028-01-31",
    alquiler: "$ 505.000", estado: "Vigente", sucesorId: null },
  { id: 4, direccion: "Belgrano 445, PB", inquilino: "Ana Ferreyra",
    actualizacion: "Sube $ 35.000 cada 6 meses", fin: "30/09/2026", finISO: "2026-09-30",
    alquiler: "$ 430.000", estado: "Por terminar", sucesorId: null },
];

/**
 * «miércoles 16 de septiembre de 2026». La demo queda clavada en agosto de 2026
 * porque sus cuotas y sus vencimientos son de ese mes: poner la fecha de hoy
 * contradiría la pantalla que está debajo. Sin la coma que mete es-AR, que en
 * una bajada corrida sobra.
 */
function hoyEnLetras(demo: boolean): string {
  if (demo) return "martes 19 de agosto de 2026";
  return new Date()
    .toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .replace(",", "");
}

const MESES_EN_LETRAS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function enLetras(fechaISO: string): string {
  const [anio, mes] = fechaISO.split("-").map(Number);
  return `${MESES_EN_LETRAS[mes - 1]} ${anio}`;
}

/** El mes del que habla Inicio. La demo queda en agosto de 2026, como sus datos. */
function periodoEnLetras(demo: boolean): string {
  return demo ? "agosto 2026" : enLetras(new Date().toISOString().slice(0, 10));
}

function periodoSiguienteEnLetras(demo: boolean): string {
  if (demo) return "septiembre 2026";
  const hoy = new Date();
  return enLetras(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() + 1, 1)).toISOString().slice(0, 10));
}

/**
 * Separa el número de calle del resto, para los contratos de la demo. Sin
 * regex a propósito: un patrón como /\s+\d+$/ es del tipo que un analizador
 * estático marca por su costo en el peor caso, y acá alcanza con recorrer las
 * palabras a mano.
 */
function separarCalleYNumero(direccion: string): { calle: string; numero: string } {
  const [calleYNumero] = direccion.split(",");
  const palabras = calleYNumero.trim().split(" ");
  const ultima = palabras[palabras.length - 1] ?? "";
  const esNumero = ultima.length > 0 && [...ultima].every((ch) => ch >= "0" && ch <= "9");
  return esNumero
    ? { calle: palabras.slice(0, -1).join(" "), numero: ultima }
    : { calle: calleYNumero.trim(), numero: "" };
}

/**
 * El panel del prototipo, con la forma del dato real. Los montos son los mismos
 * que mostraba el panel escrito a mano, así que la demo no se contradice con el
 * resto de sus pantallas.
 */
const inicioDemo = {
  cobranza: { cobrado: 430000, aVencer: 505000, vencido: 998691, emitido: 1933691, cuotas: 4, cobradas: 1 },
  cartera: { total: 5, conContrato: 4, sinAlquilar: 1 },
  avisos: [
    { id: "d1", tono: "info" as const, accion: "Revisar",
      titulo: "Marta Suárez cargó un pago y espera su confirmación",
      cuerpo: "Lavalle 950, 3.º B · $ 520.000. Subió el comprobante hace 9 días." },
    { id: "d2", tono: "warn" as const, accion: "Confirmar",
      titulo: "La cuota de Colón 2255, 4.º D está sin confirmar",
      cuerpo: "Hasta que la confirme no se puede registrar un pago. Vence el 25/08/2026." },
    { id: "d3", tono: "bad" as const, accion: "Ver",
      titulo: "2 cuotas vencidas sin pago",
      cuerpo: "$ 998.691 en total. La más antigua venció hace 9 días." },
  ],
  // Los mismos cuatro contratos del resto de la demo, con la forma del dato
  // real: si no, el panel diría que no hay contratos y las otras vistas los
  // mostrarían igual.
  contratos: contracts.map((c, indice) => ({
    id: indice + 1,
    property: {
      id: indice + 1,
      street: separarCalleYNumero(c.property.address).calle,
      number: separarCalleYNumero(c.property.address).numero,
      floorUnit: c.property.address.split(",")[1]?.trim(),
      city: c.property.city,
      province: "Buenos Aires",
      category: "APARTMENT" as const,
    },
    tenant: {
      id: indice + 1,
      firstName: (c.property.tenant ?? "").split(" ")[0],
      lastName: (c.property.tenant ?? "").split(" ").slice(1).join(" "),
      taxId: "",
      email: "",
      phoneNumber: "",
    },
    initialRentAmount: 0,
    startDate: "2025-03-01",
    termMonths: 36,
    dueDay: 1,
    endDate: c.end.split("/").reverse().join("-"),
    status: "ACTIVE" as const,
    incrementMethod: "FIXED_PERCENTAGE" as const,
    incrementFrequencyMonths: 3,
    currentRent: Number((c.property.rent ?? "0").replace(/[^\d]/g, "")),
  })) as ContractResponse[],
};

const proyeccionDemo: Proyeccion = { total: 1451986, aDefinir: 1 };

const AVISOS_DEMO: ReminderSettingsResponse = {
  daysBeforeDue: 7,
  dueDateReminderEnabled: true,
  daysAfterDue: 3,
  enabled: true,
};

/** El titular del prototipo. En /prototipo no hay sesión de la que sacarlo. */
const CUENTA_DEMO = {
  firstName: "Ricardo",
  lastName: "Rosas",
  email: "ricardo@alquia.com",
  taxId: "20224567899",
  phoneNumber: "+5491144552210",
};

/**
 * `PropertyService` no chequea nada propio al archivar, así que el único error
 * con significado es el 409 por integridad referencial. El backend lo devuelve
 * con un mensaje genérico —sirve igual para un CUIT repetido— así que no se
 * puede afirmar cuántos contratos lo bloquean: se dice lo que sí se sabe.
 */
function mensajeDeErrorArchivar(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.status === 409) {
    return "No se puede archivar: la propiedad tiene datos asociados, como un contrato.";
  }
  return "No pudimos archivar la propiedad. Inténtelo de nuevo más tarde.";
}

/** Los pocos 400 de cobranzas que el propietario puede resolver solo. */
function mensajeDeErrorCobranza(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.message === "Cannot submit a payment for an unconfirmed invoice") {
    return "Primero hay que confirmar la cuota. Después se le puede registrar el pago.";
  }
  if (err instanceof ApiError && err.status === 400) return "No se pudo completar la acción. Revise los datos.";
  return "No pudimos completar la acción. Inténtelo de nuevo más tarde.";
}

/** «Imagen · 1,8 MB». Sin fecha: el backend no la expone (P0-4). */
function descripcionArchivo(pago: { receiptContentType?: string; receiptSizeBytes?: number } | null): string {
  if (!pago) return "";
  const tipo = pago.receiptContentType?.startsWith("image/") ? "Imagen"
    : pago.receiptContentType === "application/pdf" ? "PDF" : "Archivo";
  const mb = pago.receiptSizeBytes ? `${(pago.receiptSizeBytes / 1_048_576).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB` : null;
  return [tipo, mb].filter(Boolean).join(" · ");
}

function Status({ children }: { children: string }) {
  const config = children === "Al día" || children === "Pagada" || children === "Vigente" ? ["ok", "check"]
    : children === "Por terminar" ? ["warn", "clock"]
    : children === "Finalizado" || children === "Vencido" || children === "Reemplazado" ? ["none", "archive"] : children === "Programado" ? ["none", "calendar"] : children === "Vencida" ? ["bad", "x"] : children === "Sin alquilar" ? ["none", "building"] : children === "Sin contrato" ? ["none", "file"] : children === "Pago a confirmar" ? ["info", "clock"] : ["warn", "clock"];
  return <span className={`owner-status owner-status--${config[0]}`}><Icon name={config[1] as IconName} size={15} />{children}</span>;
}

function Button({ children, tone = "primary", onClick, disabled = false, small = false }: { children: React.ReactNode; tone?: "primary" | "secondary" | "quiet" | "danger"; onClick?: () => void; disabled?: boolean; small?: boolean }) {
  return <button type="button" className={`owner-button owner-button--${tone}${small ? " owner-button--small" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Notice({ tone, title, children, action }: Readonly<{ tone: "info" | "warn" | "bad"; title: string; children: React.ReactNode; action: React.ReactNode }>) {
  const icon = tone === "info" ? "card" : tone === "warn" ? "alert" : "x";
  return <article className={`owner-notice owner-notice--${tone}`}><span className="owner-notice__icon"><Icon name={icon} /></span><div><strong>{title}</strong><p>{children}</p></div><div className="owner-notice__action">{action}</div></article>;
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="owner-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button type="button" aria-label="Cerrar" className="owner-dialog__backdrop" onClick={onClose} /><section className="owner-dialog__panel"><div className="owner-dialog__head"><h2 id="dialog-title">{title}</h2><button type="button" className="owner-icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="x" /></button></div>{children}</section></div>;
}

export default function OwnerWorkspace({ initialView, activeView, onNavigate, demo = false }: { initialView: View; activeView?: View; onNavigate?: (view: View) => void; demo?: boolean }) {
  const { user, actualizarUsuario } = useAuth();
  // La demo conserva su titular de ejemplo: sin sesión, Inicio y Configuración
  // quedarían a medio nombrar justo en la ruta que existe para mostrarlas.
  const cuenta = user ?? (demo ? CUENTA_DEMO : null);
  const [localView, setLocalView] = useState<View>(initialView);
  const [detail, setDetail] = useState<Detail>(null);
  const [creation, setCreation] = useState<Creation>(null);
  const [wizard, setWizard] = useState<Creation>(null);
  const [creationComplete, setCreationComplete] = useState<Creation>(null);
  const [selected, setSelected] = useState("rivadavia");
  const [conditionsOpen, setConditionsOpen] = useState(false);
  // El cambio programado del contrato abierto: el sucesor en SCHEDULED, o null.
  const [cargaProgramado, setCargaProgramado] = useState<{ de: number; contrato: ContractResponse } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<"todas" | "conContrato" | "sinAlquilar">("todas");
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [dorms, setDorms] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [panelAbierto, setPanelAbierto] = useState(false);
  // Un solo estado en vez de una lista y un error por separado: así no puede
  // quedar un error viejo en pantalla mientras se está recargando.
  const [carga, setCarga] = useState<{ ok: TenantRow[] } | { error: true } | null>(null);
  // Se guardan también las respuestas crudas: el detalle necesita campos que la
  // fila no lleva —código postal, baños, preferencias— y pedir
  // `GET /properties/{id}` sería una vuelta más por un dato que ya está en mano.
  const [cargaPropiedades, setCargaPropiedades] = useState<
    { ok: FilaPropiedad[]; crudas: PropertyResponse[]; sinContratos: boolean }
    | { error: true }
    | null
  >(null);
  // Se incrementa al archivar, para volver a pedir la lista sin la archivada.
  const [recargaPropiedades, setRecargaPropiedades] = useState(0);
  const [archivando, setArchivando] = useState<FilaPropiedad | null>(null);
  const [cargaAjustes, setCargaAjustes] = useState<
    { ok: ReminderSettingsResponse } | { error: true } | null
  >(null);
  const [editandoAvisos, setEditandoAvisos] = useState<ReminderSettingsResponse | null>(null);
  const [editandoCuenta, setEditandoCuenta] = useState<UserUpdateRequest | null>(null);
  const [editandoInquilino, setEditandoInquilino] = useState<TenantRequest | null>(null);
  const [inquilinoEditadoId, setInquilinoEditadoId] = useState<number | null>(null);
  const [archivandoInquilino, setArchivandoInquilino] = useState<TenantRow | null>(null);
  const [ajustando, setAjustando] = useState<FilaCobranza | null>(null);
  const [importeFinal, setImporteFinal] = useState("");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [ajusteEditado, setAjusteEditado] = useState<number | null>(null);
  const [quitandoAjuste, setQuitandoAjuste] = useState<number | null>(null);
  const [recargaInquilinos, setRecargaInquilinos] = useState(0);
  const [errorAjustes, setErrorAjustes] = useState<string | null>(null);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);
  const [avisoGuardado, setAvisoGuardado] = useState<string | null>(null);
  const [cargaContrato, setCargaContrato] = useState<
    { ok: ContractResponse } | { error: true } | null
  >(null);
  // El historial va aparte: es la tarjeta menos crítica y su fallo no debería
  // tapar el alquiler vigente ni el documento.
  const [aumentos, setAumentos] = useState<RentIncrementResponse[] | "error" | null>(null);
  const [recargaContrato, setRecargaContrato] = useState(0);
  const [enlace, setEnlace] = useState<"copiado" | "error" | "pidiendo" | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [fechaFin, setFechaFin] = useState("");
  const [errorContrato, setErrorContrato] = useState<string | null>(null);
  const [guardandoContrato, setGuardandoContrato] = useState(false);
  const [cargaInicio, setCargaInicio] = useState<
    | {
        cobranza: ResumenCobranza;
        cartera: ResumenCartera;
        avisos: Aviso[];
        contratos: ContractResponse[];
      }
    | { error: true }
    | null
  >(null);
  // La proyección va en su propio estado: si `/pre-invoices` falla —o no existe,
  // contra un build viejo— se cae esa tarjeta sola y el resto de Inicio sirve.
  const [proyeccion, setProyeccion] = useState<Proyeccion | "error" | null>(null);
  const [errorArchivar, setErrorArchivar] = useState<string | null>(null);
  const [guardandoArchivado, setGuardandoArchivado] = useState(false);
  const [cargaCobranzas, setCargaCobranzas] = useState<
    { ok: FilaCobranza[] } | { error: true } | null
  >(null);
  // Se incrementa después de cada acción que cambia una cuota, para volver a
  // pedir la lista: confirmar o pagar cambia el estado y la acción de la fila.
  const [refresco, setRefresco] = useState(0);
  const [filtroCobranza, setFiltroCobranza] = useState<FiltroCobranza>("todas");
  const [cargaContratos, setCargaContratos] = useState<
    { ok: FilaContrato[] } | { error: true } | null
  >(null);
  const [filtroContrato, setFiltroContrato] = useState<FiltroContrato>("vigentes");
  const [enRevision, setEnRevision] = useState<FilaCobranza | null>(null);
  const [aRegistrar, setARegistrar] = useState<FilaCobranza | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const view = activeView ?? localView;

  // Sólo se cargan cuando la pantalla los necesita: el workspace también rinde
  // inicio, propiedades y cobranzas, y ahí estas tres llamadas serían al pedo.
  // En /prototipo no se llama al backend: esa ruta es una demo navegable sin
  // sesión, y las tres llamadas darían 401.
  const necesitaInquilinos = !demo && (view === "inquilinos" || detail === "tenant");

  useEffect(() => {
    if (!necesitaInquilinos) return;
    let cancelado = false;
    // En paralelo: la demora es la de la más lenta y no la suma de las tres.
    // /invoices sin parámetros trae las cuotas de todos los contratos de una,
    // así que no hay una llamada por inquilino.
    Promise.all([
      AlquiaBackendClient.tenants.list(),
      AlquiaBackendClient.contracts.list(),
      AlquiaBackendClient.invoices.list(),
    ])
      .then(([tenants, contracts, invoices]) => {
        if (!cancelado) setCarga({ ok: buildTenantRows(tenants, contracts, invoices) });
      })
      .catch(() => {
        if (!cancelado) setCarga({ error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [necesitaInquilinos, recargaInquilinos]);

  const necesitaCobranzas = !demo && view === "cobranzas";

  useEffect(() => {
    if (!necesitaCobranzas) return;
    let cancelado = false;
    // Los contratos hacen falta para nombrar cada fila: InvoiceResponse sólo
    // trae contractId, no la propiedad ni el inquilino.
    Promise.all([AlquiaBackendClient.invoices.list(), AlquiaBackendClient.contracts.list()])
      .then(([invoices, contracts]) => {
        if (!cancelado) setCargaCobranzas({ ok: buildFilasCobranza(invoices, contracts) });
      })
      .catch(() => {
        if (!cancelado) setCargaCobranzas({ error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [necesitaCobranzas, refresco]);

  const inquilinos = demo ? inquilinosDemo : carga && "ok" in carga ? carga.ok : null;
  const inquilinosError = !demo && carga !== null && "error" in carga;
  const selectedProperty = properties.find((property) => property.id === selected) ?? properties[0];
  const selectedContract = contracts.find((contract) => contract.id === selected) ?? contracts[0];

  // Propiedades necesita las cuotas para el chip de estado, acotadas a la
  // ventana que define `propiedades.ts`: traer la historia entera para pintar un
  // chip es justamente lo que el pedido al backend marcaba que no escala.
  const necesitaAjustes = !demo && view === "configuracion";

  useEffect(() => {
    if (!necesitaAjustes) return;
    let cancelado = false;
    AlquiaBackendClient.users
      .getReminderSettings()
      .then((ajustes) => {
        if (!cancelado) setCargaAjustes({ ok: ajustes });
      })
      .catch(() => {
        if (!cancelado) setCargaAjustes({ error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [necesitaAjustes]);

  const necesitaContrato = !demo && detail === "contract";

  useEffect(() => {
    if (!necesitaContrato) return;
    const id = Number(selected);
    if (!Number.isFinite(id)) return;
    let cancelado = false;

    AlquiaBackendClient.contracts
      .get(id)
      .then((contrato) => {
        if (!cancelado) setCargaContrato({ ok: contrato });
      })
      .catch(() => {
        if (!cancelado) setCargaContrato({ error: true });
      });

    AlquiaBackendClient.contracts
      .rentIncrements(id)
      .then((lista) => {
        if (!cancelado) setAumentos(lista);
      })
      .catch(() => {
        if (!cancelado) setAumentos("error");
      });

    return () => {
      cancelado = true;
    };
  }, [necesitaContrato, selected, recargaContrato]);

  // Un contrato vigente apunta a su sucesor apenas hay un cambio programado; el
  // detalle lo pide para mostrar desde cuándo rige y con qué condiciones.
  const sucesorId =
    cargaContrato !== null && "ok" in cargaContrato && cargaContrato.ok.status === "ACTIVE"
      ? cargaContrato.ok.successorContractId ?? null
      : null;

  useEffect(() => {
    if (sucesorId === null) return;
    let cancelado = false;
    AlquiaBackendClient.contracts
      .get(sucesorId)
      .then((sucesor) => {
        if (!cancelado && sucesor.status === "SCHEDULED") setCargaProgramado({ de: sucesorId, contrato: sucesor });
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [sucesorId, recargaContrato]);
  // Derivado y no reseteado en el efecto: si se abre otro contrato, el sucesor
  // guardado deja de corresponder y no se muestra.
  const programado = sucesorId !== null && cargaProgramado?.de === sucesorId ? cargaProgramado.contrato : null;

  const necesitaInicio = !demo && view === "inicio";

  useEffect(() => {
    if (!necesitaInicio) return;
    let cancelado = false;
    const hoyISO = new Date().toISOString().slice(0, 10);

    // Una sola vez, compartida por los dos bloques de abajo.
    const contratos = AlquiaBackendClient.contracts.list();

    // Las tres que sostienen la pantalla. El resumen y los avisos salen de las
    // cuotas del mes: acotadas al período, porque Inicio habla de este mes.
    Promise.all([
      AlquiaBackendClient.invoices.list({ period: periodoCorriente(hoyISO) }),
      AlquiaBackendClient.properties.list(),
      contratos,
    ])
      .then(([invoices, properties, contracts]) => {
        if (cancelado) return;
        setCargaInicio({
          cobranza: resumenDeCobranza(invoices),
          cartera: resumenDeCartera(properties),
          avisos: avisosPendientes(invoices, contracts, hoyISO),
          contratos: contratosVigentes(contracts),
        });
      })
      .catch(() => {
        if (!cancelado) setCargaInicio({ error: true });
      });

    // Aparte a propósito: su fallo no vuelca la pantalla.
    Promise.all([
      AlquiaBackendClient.preInvoices.list({ period: periodoSiguiente(hoyISO) }),
      contratos,
    ])
      .then(([pre, contracts]) => {
        if (!cancelado) setProyeccion(proyeccionDelMes(pre, contracts));
      })
      .catch(() => {
        if (!cancelado) setProyeccion("error");
      });

    return () => {
      cancelado = true;
    };
  }, [necesitaInicio]);

  const necesitaPropiedades = !demo && (view === "propiedades" || detail === "property");

  useEffect(() => {
    if (!necesitaPropiedades) return;
    let cancelado = false;
    const hoyISO = new Date().toISOString().slice(0, 10);
    Promise.all([
      AlquiaBackendClient.properties.list(),
      AlquiaBackendClient.invoices.list({ periodFrom: desdeDeLaVentana(hoyISO) }),
    ])
      .then(([properties, invoices]) => {
        if (cancelado) return;
        setCargaPropiedades({
          ok: buildFilasPropiedad(properties, invoices),
          crudas: properties,
          sinContratos: backendNoInformaContratos(properties),
        });
      })
      .catch(() => {
        if (!cancelado) setCargaPropiedades({ error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [necesitaPropiedades, recargaPropiedades]);

  const necesitaContratos = !demo && view === "contratos";

  useEffect(() => {
    if (!necesitaContratos) return;
    let cancelado = false;
    // `hoy` se calcula acá y no dentro del módulo para que la lógica sea pura y
    // testeable sin congelar el reloj.
    const hoy = new Date().toISOString().slice(0, 10);
    AlquiaBackendClient.contracts
      .list()
      .then((contratos) => {
        if (!cancelado) setCargaContratos({ ok: buildFilasContrato(contratos, hoy) });
      })
      .catch(() => {
        if (!cancelado) setCargaContratos({ error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [necesitaContratos]);

  const propiedades = demo
    ? propiedadesDemo
    : cargaPropiedades && "ok" in cargaPropiedades
      ? cargaPropiedades.ok
      : null;
  const propiedadesError = !demo && cargaPropiedades !== null && "error" in cargaPropiedades;
  const propiedadesCrudas =
    cargaPropiedades && "ok" in cargaPropiedades ? cargaPropiedades.crudas : [];
  // Contra un build viejo la clave `activeContract` no viene y todas se verían
  // «Sin alquilar». Se omiten los chips en vez de afirmar algo falso.
  const sinDatoDeContrato =
    !demo && cargaPropiedades !== null && "ok" in cargaPropiedades && cargaPropiedades.sinContratos;

  const cobranzas = demo ? cobranzasDemo : cargaCobranzas && "ok" in cargaCobranzas ? cargaCobranzas.ok : null;
  const cobranzasError = !demo && cargaCobranzas !== null && "error" in cargaCobranzas;
  const listaContratos = demo ? contratosDemo : cargaContratos && "ok" in cargaContratos ? cargaContratos.ok : null;
  const contratosError = !demo && cargaContratos !== null && "error" in cargaContratos;

  /** Envuelve las acciones de cuota: en demo no se llama al backend. */
  async function accionDeCuota(hacer: () => Promise<unknown>, cerrar?: () => void) {
    setErrorAccion(null);
    if (demo) {
      cerrar?.();
      return;
    }
    setAccionEnCurso(true);
    try {
      await hacer();
      cerrar?.();
      setRefresco((n) => n + 1);
    } catch (err) {
      setErrorAccion(mensajeDeErrorCobranza(err));
    } finally {
      setAccionEnCurso(false);
    }
  }

  // El comprobante se sirve como archivo, no como URL: se pide, se abre en una
  // pestaña y se suelta el objeto para no dejar el blob colgado en memoria.
  async function verComprobante(pagoId: number) {
    if (demo) return;
    try {
      const blob = await AlquiaBackendClient.payments.getReceipt(pagoId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setErrorAccion(mensajeDeErrorCobranza(err));
    }
  }

  function openDetail(kind: Detail, id: string) { setSelected(id); setCreation(null); setDetail(kind); }
  function go(next: View) { onNavigate?.(next); if (!onNavigate) setLocalView(next); setCreation(null); setWizard(null); setDetail(null); }
  function beginCreation(kind: Creation) { setCreationComplete(null); setDetail(null); setWizard(kind); }

  const pageHeader = (title: string, description: string, action?: React.ReactNode) => <header className="owner-page-head"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="owner-page-head__action">{action}</div>}</header>;

  function overview() {
    const accion = <>
      <Button tone="secondary" onClick={() => beginCreation("property")}><Icon name="plus" size={18} />Agregar propiedad</Button>
      <Button onClick={() => beginCreation("contract")}><Icon name="file" size={18} />Nuevo contrato</Button>
    </>;
    const saludo = cuenta ? `Buen día, ${cuenta.firstName}` : "Buen día";
    const bajada = `Así está su cartera hoy, ${hoyEnLetras(demo)}.`;

    const datos = demo ? inicioDemo : cargaInicio && !("error" in cargaInicio) ? cargaInicio : null;
    const proy = demo ? proyeccionDemo : proyeccion;

    if (!demo && cargaInicio !== null && "error" in cargaInicio) {
      return <>
        {pageHeader(saludo, bajada, accion)}
        <p className="owner-list-note" role="alert">
          <b>No pudimos cargar su panel</b>Inténtelo de nuevo más tarde.
        </p>
      </>;
    }

    if (datos === null) {
      return <>{pageHeader(saludo, bajada, accion)}<p className="owner-list-note">Cargando…</p></>;
    }

    const { cobranza, cartera, avisos, contratos } = datos;
    const pct = proporciones(cobranza);
    const mesEnLetras = periodoEnLetras(demo);

    return <>
      {pageHeader(saludo, bajada, accion)}

      <section className="owner-portfolio" aria-label="Resumen de cobranzas">
        <div className="owner-portfolio__money">
          <p className="owner-eyebrow">COBRANZA DE {mesEnLetras.toUpperCase()}</p>
          {cobranza.cuotas === 0 ? (
            <p className="owner-portfolio__empty">Todavía no hay cuotas emitidas este mes.</p>
          ) : (
            <>
              <strong>{formatearMonto(cobranza.cobrado)}</strong>
              <p>
                de {formatearMonto(cobranza.emitido)} emitidos este mes ·{" "}
                {cobranza.cobradas} de {cobranza.cuotas} {cobranza.cuotas === 1 ? "cuota cobrada" : "cuotas cobradas"}
              </p>
              <div className="owner-meter"
                aria-label={`${pct.cobrado}% cobrado, ${pct.aVencer}% por vencer y ${pct.vencido}% vencido`}>
                <i className="owner-meter__ok" style={{ flexGrow: cobranza.cobrado }} />
                <i className="owner-meter__warn" style={{ flexGrow: cobranza.aVencer }} />
                <i className="owner-meter__bad" style={{ flexGrow: cobranza.vencido }} />
              </div>
              <div className="owner-key">
                <span><Icon name="check" />Cobrado <b>{formatearMonto(cobranza.cobrado)}</b></span>
                <span><Icon name="clock" />A vencer <b>{formatearMonto(cobranza.aVencer)}</b></span>
                <span><Icon name="x" />Vencido <b>{formatearMonto(cobranza.vencido)}</b></span>
              </div>
            </>
          )}
        </div>
        <div className="owner-portfolio__summary">
          <div>
            <p className="owner-eyebrow">PROPIEDADES</p>
            <b>{cartera.total}</b>
            <small>
              {cartera.total === 0
                ? "Todavía no cargó ninguna"
                : `${cartera.conContrato} con contrato activo · ${cartera.sinAlquilar} sin alquilar`}
            </small>
          </div>
          {/* Si `/pre-invoices` no responde, la tarjeta no se muestra: el resto
              del panel es correcto y vale más que la pantalla entera caída. */}
          {proy !== "error" && (
            <div>
              <p className="owner-eyebrow">PROYECTADO · {periodoSiguienteEnLetras(demo).toUpperCase()}</p>
              {proy === null ? (
                <small>Calculando…</small>
              ) : proy.total === null ? (
                <small>
                  Todavía no se puede proyectar: {proy.aDefinir === 1 ? "el contrato depende" : "los contratos dependen"} de un índice sin publicar.
                </small>
              ) : (
                <>
                  <b>{formatearMonto(proy.total)}</b>
                  <small>
                    {proy.aDefinir === 0
                      ? "Todos los contratos ya están definidos"
                      : `más ${proy.aDefinir} ${proy.aDefinir === 1 ? "contrato" : "contratos"} a definir según el índice`}
                  </small>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="owner-section">
        <div className="owner-section__head">
          <h2>Requieren su acción</h2>
          {avisos.length > 0 && <Button tone="secondary" small onClick={() => go("cobranzas")}>Ir a cobranzas</Button>}
        </div>
        {avisos.length === 0 ? (
          <p className="owner-list-note">Nada pendiente por ahora. Sus cuotas están al día.</p>
        ) : (
          <div className="owner-notices">
            {avisos.map((aviso) => (
              <Notice key={aviso.id} tone={aviso.tono} title={aviso.titulo}
                action={<Button tone="secondary" small onClick={() => go("cobranzas")}>{aviso.accion}</Button>}>
                {aviso.cuerpo}
              </Notice>
            ))}
          </div>
        )}
      </section>

      <section className="owner-section">
        <div className="owner-section__head">
          <h2>Contratos activos</h2>
          <Button tone="secondary" small onClick={() => beginCreation("contract")}><Icon name="plus" size={17} />Nuevo contrato</Button>
        </div>
        {contratos.length === 0 ? (
          <p className="owner-list-note">
            <b>Todavía no tiene contratos vigentes</b>Un contrato vincula una propiedad con un inquilino y define el alquiler.
          </p>
        ) : (
          <div className="owner-list">
            {contratos.map((contrato) => (
              <div className="owner-row" key={contrato.id}>
                <span className="owner-row__icon"><Icon name="building" /></span>
                <span className="owner-row__body">
                  <b>{formatearDireccion(contrato.property)}</b>
                  <small>
                    {contrato.tenant.firstName} {contrato.tenant.lastName} · termina el {formatearFecha(contrato.endDate)}
                  </small>
                </span>
                <span className="owner-row__amount"><b>{formatearMonto(contrato.currentRent)}</b><small>por mes</small></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>;
  }

  function propertiesView() {
    const alterna = (lista: string[], set: (v: string[]) => void, v: string) =>
      set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

    const filtro = { texto: query, ciudades, dormitorios: dorms, extras, estado };
    const filas = propiedades ?? [];
    const visibles = filtrarPropiedades(filas, filtro);
    // Cada faceta se cuenta sobre el resto de los filtros ya aplicados, así el
    // número del chip es el que vas a obtener si lo tocás.
    const cuenta = contarFacetas(filas, filtro);
    const ciudadesDisponibles = ciudadesDe(filas);
    const activos = ciudades.length + dorms.length + extras.length;
    const etiquetaExtra: Record<string, string> = { mascotas: "Acepta mascotas", amoblada: "Amueblada" };
    const etiquetaDorm = (d: string) => (d === "4+" ? "4+ dormitorios" : d === "1" ? "1 dormitorio" : `${d} dormitorios`);

    const chipsAplicados = [
      ...ciudades.map((c) => ({ k: `c-${c}`, texto: c, quitar: () => alterna(ciudades, setCiudades, c) })),
      ...dorms.map((d) => ({ k: `d-${d}`, texto: etiquetaDorm(d), quitar: () => alterna(dorms, setDorms, d) })),
      ...extras.map((e) => ({ k: `e-${e}`, texto: etiquetaExtra[e], quitar: () => alterna(extras, setExtras, e) })),
    ];
    const limpiar = () => { setCiudades([]); setDorms([]); setExtras([]); setQuery(""); setEstado("todas"); };

    const accion = <Button onClick={() => beginCreation("property")}><Icon name="plus" size={18} />Agregar propiedad</Button>;

    if (propiedadesError) {
      return <>
        {pageHeader("Propiedades", "", accion)}
        <p className="owner-list-note" role="alert">
          <b>No pudimos cargar sus propiedades</b>Inténtelo de nuevo más tarde.
        </p>
      </>;
    }

    if (propiedades === null) {
      return <>{pageHeader("Propiedades", "", accion)}<p className="owner-list-note">Cargando…</p></>;
    }

    // Sin ninguna propiedad no hay nada que filtrar: la pantalla ofrece el paso
    // que falta en vez de un buscador vacío.
    if (propiedades.length === 0) {
      return <>
        {pageHeader("Propiedades", resumenPropiedades(propiedades), accion)}
        <p className="owner-list-note">
          <b>Todavía no cargó ninguna propiedad</b>Use «Agregar propiedad» para cargar la primera.
        </p>
      </>;
    }

    return (
      <>
        {pageHeader("Propiedades", resumenPropiedades(propiedades), accion)}

        <div className="owner-search-bar">
          <div className="owner-search">
            <Icon name="search" size={19} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por dirección, ciudad o inquilino" aria-label="Buscar propiedades" />
            {query && (
              <button type="button" className="owner-search__clear" onClick={() => setQuery("")} aria-label="Borrar la búsqueda">
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
          <div className="owner-filter-anchor">
            <button type="button" className="owner-filter-toggle" aria-expanded={panelAbierto}
              onClick={() => setPanelAbierto((v) => !v)}>
              <Icon name="sliders" size={18} />Filtros
              {activos > 0 && <span className="owner-filter-toggle__count">{activos}</span>}
            </button>
            {panelAbierto && (
              <>
                <button type="button" className="owner-panel__scrim" aria-label="Cerrar los filtros" onClick={() => setPanelAbierto(false)} />
                <div className="owner-panel" role="dialog" aria-label="Filtros">
                  <div className="owner-panel__head">
                    <b>Filtros</b>
                    <button type="button" className="owner-panel__close" onClick={() => setPanelAbierto(false)} aria-label="Cerrar">
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                  <div className="owner-panel__body">
                    <p className="owner-panel__label" id="f-ciudad">Ciudad</p>
                    <div className="owner-chips" role="group" aria-labelledby="f-ciudad">
                      {ciudadesDisponibles.map((c) => (
                        <button key={c} type="button" className="owner-chip" aria-pressed={ciudades.includes(c)}
                          onClick={() => alterna(ciudades, setCiudades, c)}>{c}</button>
                      ))}
                    </div>
                    <p className="owner-panel__label" id="f-dorm">Dormitorios</p>
                    <div className="owner-chips" role="group" aria-labelledby="f-dorm">
                      {["1", "2", "3", "4+"].map((d) => (
                        <button key={d} type="button" className="owner-chip" aria-pressed={dorms.includes(d)}
                          onClick={() => alterna(dorms, setDorms, d)}>{d}</button>
                      ))}
                    </div>
                    <p className="owner-panel__label" id="f-extra">Características</p>
                    <div className="owner-chips" role="group" aria-labelledby="f-extra">
                      {Object.entries(etiquetaExtra).map(([k, v]) => (
                        <button key={k} type="button" className="owner-chip" aria-pressed={extras.includes(k)}
                          onClick={() => alterna(extras, setExtras, k)}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <div className="owner-panel__foot">
                    <Button tone="quiet" small onClick={() => { setCiudades([]); setDorms([]); setExtras([]); }}>Limpiar</Button>
                    <Button small onClick={() => setPanelAbierto(false)}>Ver {visibles.length} propiedades</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sin el contrato en la respuesta, «Con contrato» y «Sin alquilar»
            contarían todo como libre. El filtro se omite entero, igual que los
            chips: es el mismo dato faltante. */}
        {!sinDatoDeContrato && (
          <div className="owner-filter" role="group" aria-label="Estado de la propiedad">
            {([["todas", "Todas"], ["conContrato", "Con contrato"], ["sinAlquilar", "Sin alquilar"]] as const).map(([k, txt]) => (
              <button key={k} type="button" aria-pressed={estado === k} onClick={() => setEstado(k)}>
                {txt} <b>{cuenta[k]}</b>
              </button>
            ))}
          </div>
        )}

        {chipsAplicados.length > 0 && (
          <div className="owner-applied">
            <span className="owner-applied__label">Filtros aplicados</span>
            {chipsAplicados.map((c) => (
              <button key={c.k} type="button" className="owner-applied__chip" onClick={c.quitar}>
                {c.texto}<Icon name="x" size={14} />
              </button>
            ))}
            <button type="button" className="owner-applied__clear" onClick={limpiar}>Limpiar todo</button>
          </div>
        )}

        <p className="owner-result-count" role="status">
          {visibles.length === filas.length
            ? `${visibles.length} ${visibles.length === 1 ? "propiedad" : "propiedades"}`
            : `${visibles.length} de ${filas.length} propiedades`}
        </p>

        {visibles.length === 0 ? (
          <div className="owner-empty">
            <b>No hay propiedades que coincidan</b>
            <span>Probá con otra búsqueda o quitá algún filtro.</span>
            <Button tone="secondary" small onClick={limpiar}>Limpiar todo</Button>
          </div>
        ) : (
          <div className="owner-list">
            {visibles.map((fila) => (
              <button type="button" className="owner-row owner-row--button owner-property" key={fila.id}
                onClick={() => openDetail("property", String(fila.id))}>
                <span className="owner-row__icon"><Icon name="building" /></span>
                <span className="owner-row__body">
                  <b>{fila.direccion}</b>
                  <small>{fila.detalle}</small>
                </span>
                {fila.alquiler && <span className="owner-row__amount"><b>{fila.alquiler}</b><small>por mes</small></span>}
                {/* Sin el contrato en la respuesta no se puede decir el estado, y
                    decir «Sin alquilar» sería inventarlo. */}
                {!sinDatoDeContrato && <Status>{fila.estado}</Status>}
                <span className="owner-row__arrow"><Icon name="arrow" /></span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  function contractsView() {
    const visibles = listaContratos ? filtrarContratos(listaContratos, filtroContrato) : [];
    const cuenta = listaContratos ? contarContratos(listaContratos) : { vigentes: 0, porTerminar: 0, programados: 0, finalizados: 0 };
    const etiquetas: [FiltroContrato, string][] = [
      ["vigentes", "Vigentes"], ["porTerminar", "Por terminar"],
      // Sólo cuando hay alguno: la mayoría de los propietarios no tiene cambios programados.
      ...(cuenta.programados > 0 ? [["programados", "Programados"] as [FiltroContrato, string]] : []),
      ["finalizados", "Finalizados"],
    ];

    const cuerpo = (fila: FilaContrato) => <>
      <span className="owner-row__icon"><Icon name="file" /></span>
      <span className="owner-row__body">
        <b>{fila.direccion}</b>
        <small>{fila.inquilino} · {fila.actualizacion} · termina {fila.fin}</small>
      </span>
      <span className="owner-row__amount"><b>{fila.alquiler}</b><small>por mes</small></span>
      <Status>{fila.estado}</Status>
    </>;

    return <>
      {pageHeader("Contratos", listaContratos ? resumenContratos(listaContratos) : "Sus contratos y sus condiciones.",
        <Button onClick={() => beginCreation("contract")}><Icon name="plus" size={18} />Nuevo contrato</Button>)}

      {contratosError && <p className="owner-list-note" role="alert"><b>No pudimos cargar sus contratos</b>Inténtelo de nuevo más tarde.</p>}
      {!contratosError && listaContratos === null && <p className="owner-list-note">Cargando…</p>}

      {listaContratos && listaContratos.length === 0 && (
        <p className="owner-list-note">
          <b>Todavía no tiene contratos</b>Use «Nuevo contrato» para vincular una propiedad con su inquilino.
        </p>
      )}

      {listaContratos && listaContratos.length > 0 && <>
        <div className="owner-filter" role="group" aria-label="Estado del contrato">
          {etiquetas.map(([clave, texto]) => (
            <button key={clave} type="button" aria-pressed={filtroContrato === clave}
              onClick={() => setFiltroContrato(clave)}>{texto} <b>{cuenta[clave]}</b></button>
          ))}
        </div>

        {visibles.length === 0
          ? <div className="owner-empty"><b>No hay contratos en este estado</b><span>Pruebe con otro filtro.</span></div>
          : <div className="owner-list">
              {/* La fila lleva al detalle en los dos modos: hasta ahora se
                  rendía sin link porque el detalle salía de datos de ejemplo,
                  y esa razón desapareció al conectarlo. */}
              {visibles.map((fila) => (
                <button type="button" className="owner-row owner-row--button" key={fila.id}
                  onClick={() => openDetail("contract", demo ? CLAVES_CONTRATO_DEMO[fila.id - 1] : String(fila.id))}>
                  {cuerpo(fila)}
                  <span className="owner-row__arrow"><Icon name="arrow" /></span>
                </button>
              ))}
            </div>}
      </>}
    </>;
  }

  function collectionsView() {
    const visibles = cobranzas ? filtrar(cobranzas, filtroCobranza) : [];
    const cuenta = cobranzas ? contarPorFiltro(cobranzas) : { todas: 0, vencidas: 0, aVencer: 0, pagadas: 0 };
    const etiquetas: [FiltroCobranza, string][] = [
      ["todas", "Todas"], ["vencidas", "Vencidas"], ["aVencer", "A vencer"], ["pagadas", "Pagadas"],
    ];

    // «Descargar resumen» no está: no hay endpoint que lo produzca, y un botón
    // que no hace nada es peor que no tenerlo.
    const accionDeFila = (fila: FilaCobranza) => {
      if (fila.accion === "revisar") {
        return <Button tone="secondary" small onClick={() => { setErrorAccion(null); setEnRevision(fila); }}>Revisar pago</Button>;
      }
      if (fila.accion === "confirmar") {
        // Ajustar va con confirmar, no en vez de: primero se cierra el importe,
        // después se confirma. Confirmar es lo que destraba el cobro, así que va
        // primero en el orden visual.
        return <>
          <Button tone="secondary" small disabled={accionEnCurso}
            onClick={() => void accionDeCuota(() => AlquiaBackendClient.invoices.confirm(fila.invoiceId))}>Confirmar cuota</Button>
          <Button tone="quiet" small disabled={accionEnCurso || demo}
            onClick={() => { setErrorAccion(null); setAjusteEditado(null); setMotivoAjuste(""); setImporteFinal(String(fila.totalVigente)); setAjustando(fila); }}>
            Ajustar importe
          </Button>
        </>;
      }
      if (fila.accion === "comprobante") {
        return <Button tone="secondary" small disabled={!fila.pagoConfirmado}
          onClick={() => { if (fila.pagoConfirmado) void verComprobante(fila.pagoConfirmado.id); }}>
          <Icon name="download" size={16} />Comprobante</Button>;
      }
      return <Button tone="secondary" small onClick={() => { setErrorAccion(null); setArchivo(null); setARegistrar(fila); }}>Registrar pago</Button>;
    };

    return <>
      {pageHeader("Cobranzas", cobranzas ? resumenCobranzas(cobranzas) : "Cuotas, pagos y vencimientos.")}

      {cobranzasError && <p className="owner-list-note" role="alert"><b>No pudimos cargar sus cobranzas</b>Inténtelo de nuevo más tarde.</p>}
      {!cobranzasError && cobranzas === null && <p className="owner-list-note">Cargando…</p>}
      {/* Con un diálogo abierto, el error va adentro: repetirlo en la página
          lo muestra dos veces y el de abajo queda tapado. */}
      {errorAccion && !enRevision && !aRegistrar && !ajustando && <p className="owner-list-note" role="alert">{errorAccion}</p>}

      {cobranzas && cobranzas.length === 0 && (
        <p className="owner-list-note">
          <b>Todavía no hay cuotas</b>Se generan solas a partir de sus contratos activos.
        </p>
      )}

      {cobranzas && cobranzas.length > 0 && <>
        <div className="owner-filter" role="group" aria-label="Estado de la cuota">
          {etiquetas.map(([clave, texto]) => (
            <button key={clave} type="button" aria-pressed={filtroCobranza === clave}
              onClick={() => setFiltroCobranza(clave)}>{texto} <b>{cuenta[clave]}</b></button>
          ))}
        </div>

        {visibles.length === 0
          ? <div className="owner-empty"><b>No hay cuotas en este estado</b><span>Pruebe con otro filtro.</span></div>
          : <div className="owner-table-wrap">
              <table className="owner-table">
                <thead><tr>
                  <th data-cell="propiedad">Propiedad</th>
                  <th data-cell="monto" className="owner-number">Monto</th>
                  <th data-cell="vencimiento">Vencimiento</th>
                  <th data-cell="estado">Estado</th>
                  <th data-cell="accion">Acción</th>
                </tr></thead>
                <tbody>
                  {visibles.map((fila) => (
                    <tr key={fila.invoiceId}>
                      <td data-cell="propiedad"><b>{fila.direccion}</b><small>{fila.inquilino} · {fila.periodo}</small></td>
                      <td data-cell="monto" className="owner-number owner-money">{fila.monto}</td>
                      <td data-cell="vencimiento">{fila.vencimiento}</td>
                      <td data-cell="estado">
                        <Status>{fila.estado}</Status>
                        {/* Una cuota sin confirmar no puede recibir pagos: la
                            aclaración explica por qué la acción es otra. */}
                        {!fila.confirmada && <small className="owner-substatus">Sin confirmar</small>}
                      </td>
                      <td data-cell="accion">{accionDeFila(fila)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </>}
    </>;
  }

  function tenantsView() {
    const bajada = inquilinos ? resumenInquilinos(inquilinos) : "";
    const accion = <Button onClick={() => beginCreation("tenant")}><Icon name="plus" size={18} />Agregar inquilino</Button>;

    return <>
      {pageHeader("Inquilinos", bajada, accion)}
      <div className="owner-list">
        {inquilinosError && <p className="owner-list-note" role="alert"><b>No pudimos cargar sus inquilinos</b>Inténtelo de nuevo más tarde.</p>}
        {!inquilinosError && inquilinos === null && <p className="owner-list-note">Cargando…</p>}
        {!inquilinosError && inquilinos?.length === 0 && (
          <p className="owner-list-note"><b>Todavía no cargó ningún inquilino</b>Use «Agregar inquilino» para cargar el primero.</p>
        )}
        {inquilinos?.map((inquilino) => inquilino.contratoId === null
          // Sin contrato no hay dirección, ni monto, ni cuotas de las que hablar:
          // la fila ofrece el paso que falta en vez de mostrar huecos.
          ? <div className="owner-row owner-row--linked" key={inquilino.id}>
              <span className="owner-row__icon"><Icon name="users" /></span>
              <span className="owner-row__body">
                <b><button type="button" className="owner-row__link" onClick={() => openDetail("tenant", String(inquilino.id))}>{inquilino.nombre}</button></b>
                <small>{inquilino.cuit} · {inquilino.email}</small>
              </span>
              <span className="owner-row__amount"><Button tone="secondary" small onClick={() => beginCreation("contract")}>Crear contrato</Button></span>
              <Status>{inquilino.estado}</Status>
              <span className="owner-row__arrow"><Icon name="arrow" /></span>
            </div>
          : <button type="button" className="owner-row owner-row--button" key={inquilino.id} onClick={() => openDetail("tenant", String(inquilino.id))}>
              <span className="owner-row__icon"><Icon name="users" /></span>
              <span className="owner-row__body">
                <b>{inquilino.nombre}</b>
                <small>{inquilino.cuit} · {inquilino.email} · {inquilino.direccion}</small>
              </span>
              <span className="owner-row__amount"><b>{inquilino.alquiler}</b><small>por mes</small></span>
              <Status>{inquilino.estado}</Status>
              <span className="owner-row__arrow"><Icon name="arrow" /></span>
            </button>
        )}
      </div>
    </>;
  }

  async function guardarAvisos(ajustes: ReminderSettingsResponse) {
    if (demo) return setEditandoAvisos(null);
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      const guardado = await AlquiaBackendClient.users.updateReminderSettings(ajustes);
      setCargaAjustes({ ok: guardado });
      setEditandoAvisos(null);
      setAvisoGuardado("Recordatorios guardados.");
    } catch (err) {
      setErrorAjustes(
        err instanceof AuthExpiredError
          ? "Su sesión expiró. Vuelva a iniciar sesión."
          : "No pudimos guardar los recordatorios. Inténtelo de nuevo más tarde."
      );
    } finally {
      setGuardandoAjustes(false);
    }
  }

  async function guardarCuenta(datos: UserUpdateRequest) {
    if (demo) return setEditandoCuenta(null);
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      // Reemplazo total: los cuatro campos son @NotBlank, así que va el objeto
      // entero aunque se haya tocado uno solo.
      const actualizado = await AlquiaBackendClient.users.updateMe({
        firstName: datos.firstName.trim(),
        lastName: datos.lastName.trim(),
        taxId: soloDigitos(datos.taxId),
        phoneNumber: soloDigitosTelefono(datos.phoneNumber),
      });
      actualizarUsuario(actualizado);
      setEditandoCuenta(null);
      setAvisoGuardado("Datos guardados.");
    } catch (err) {
      setErrorAjustes(
        err instanceof AuthExpiredError
          ? "Su sesión expiró. Vuelva a iniciar sesión."
          : err instanceof ApiError && err.status === 400
            ? "Verifique los datos ingresados e inténtelo de nuevo."
            : "No pudimos guardar sus datos. Inténtelo de nuevo más tarde."
      );
    } finally {
      setGuardandoAjustes(false);
    }
  }

  async function guardarInquilinoEditado(id: number, datos: TenantRequest) {
    if (demo) return setEditandoInquilino(null);
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      await AlquiaBackendClient.tenants.update(id, {
        firstName: datos.firstName.trim(),
        lastName: datos.lastName.trim(),
        taxId: soloDigitos(datos.taxId),
        email: datos.email.trim(),
        phoneNumber: soloDigitosTelefono(datos.phoneNumber),
      });
      setEditandoInquilino(null);
      setRecargaInquilinos((n) => n + 1);
      setAvisoGuardado("Datos del inquilino guardados.");
    } catch (err) {
      // Los dos duplicados son por propietario, no globales: de ahí «suyo».
      setErrorAjustes(
        err instanceof AuthExpiredError
          ? "Su sesión expiró. Vuelva a iniciar sesión."
          : err instanceof ApiError && err.message === "Tax ID already registered"
            ? "Ese documento ya figura en otro inquilino suyo."
            : err instanceof ApiError && err.message === "Phone number already registered"
              ? "Ese teléfono ya figura en otro inquilino suyo."
              : err instanceof ApiError && err.status === 400
                ? "Verifique los datos ingresados e inténtelo de nuevo."
                : "No pudimos guardar los datos. Inténtelo de nuevo más tarde."
      );
    } finally {
      setGuardandoAjustes(false);
    }
  }

  async function archivarInquilino(fila: TenantRow) {
    if (demo) return setArchivandoInquilino(null);
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      await AlquiaBackendClient.tenants.archive(fila.id);
      setArchivandoInquilino(null);
      setDetail(null);
      setRecargaInquilinos((n) => n + 1);
    } catch (err) {
      setErrorAjustes(
        err instanceof AuthExpiredError
          ? "Su sesión expiró. Vuelva a iniciar sesión."
          : err instanceof ApiError && err.status === 409
            ? "No se puede archivar: el inquilino tiene datos asociados, como un contrato."
            : "No pudimos archivar el inquilino. Inténtelo de nuevo más tarde."
      );
    } finally {
      setGuardandoAjustes(false);
    }
  }

  /** Envuelve las acciones sobre ajustes: recargan la lista al terminar. */
  async function accionDeAjuste(hacer: () => Promise<unknown>, alTerminar?: () => void) {
    if (demo) return;
    setErrorAccion(null);
    setAccionEnCurso(true);
    try {
      await hacer();
      alTerminar?.();
      setRefresco((n) => n + 1);
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError && err.message === "Cannot modify adjustments on a confirmed invoice"
          ? "La cuota quedó confirmada mientras editaba, así que su importe ya está cerrado."
          : mensajeDeErrorCobranza(err)
      );
    } finally {
      setAccionEnCurso(false);
    }
  }

  function settingsView() {
    const ajustes = demo
      ? AVISOS_DEMO
      : cargaAjustes && "ok" in cargaAjustes
        ? cargaAjustes.ok
        : null;
    const ajustesError = !demo && cargaAjustes !== null && "error" in cargaAjustes;

    return <>
      {pageHeader("Configuración", "Preferencias de su cuenta y recordatorios.")}
      {avisoGuardado && <p className="owner-list-note" role="status">{avisoGuardado}</p>}
      <section className="owner-detail-grid owner-detail-grid--even">
        <div className="owner-card">
          <h2>Recordatorios de pago</h2>
          {ajustesError ? (
            <p className="owner-list-note" role="alert">
              <b>No pudimos cargar los recordatorios</b>Inténtelo de nuevo más tarde.
            </p>
          ) : ajustes === null ? (
            <p className="owner-list-note">Cargando…</p>
          ) : (
            <>
              <p className="owner-card__copy">{resumenRecordatorios(ajustes)}</p>
              <dl className="owner-definition">
                {describirRecordatorios(ajustes).map((linea) => (
                  <div key={linea.etiqueta}><dt>{linea.etiqueta}</dt><dd>{linea.valor}</dd></div>
                ))}
              </dl>
              {/* Aparte de los tres de arriba: este aviso no depende del
                  interruptor, sale igual. Meterlo en la lista daría a entender
                  que apagando los recordatorios se apaga también. */}
              <p className="owner-card__copy">
                Además, al inquilino se le avisa cuando usted confirma una cuota y ya la puede pagar.
              </p>
              <Button tone="secondary" small onClick={() => { setErrorAjustes(null); setAvisoGuardado(null); setEditandoAvisos(ajustes); }}>
                Editar recordatorios
              </Button>
            </>
          )}
        </div>
        <div className="owner-card">
          <h2>Cuenta</h2>
          <dl className="owner-definition">
            <div><dt>Nombre</dt><dd>{cuenta ? `${cuenta.firstName} ${cuenta.lastName}` : "—"}</dd></div>
            <div><dt>Correo</dt><dd>{cuenta?.email ?? "—"}</dd></div>
            {cuenta?.taxId && <div><dt>CUIT</dt><dd>{formatearCuit(cuenta.taxId)}</dd></div>}
            {cuenta?.phoneNumber && <div><dt>Teléfono</dt><dd>{cuenta.phoneNumber}</dd></div>}
          </dl>
          <Button tone="secondary" small disabled={!user}
            onClick={() => { setErrorAjustes(null); setAvisoGuardado(null); setEditandoCuenta({
              firstName: user!.firstName,
              lastName: user!.lastName,
              taxId: formatearCuit(user!.taxId ?? ""),
              phoneNumber: user!.phoneNumber ?? "",
            }); }}>
            Editar datos
          </Button>
        </div>
      </section>
    </>;
  }

  async function archivarPropiedad(fila: FilaPropiedad) {
    if (demo) return setArchivando(null);
    setErrorArchivar(null);
    setGuardandoArchivado(true);
    try {
      await AlquiaBackendClient.properties.archive(fila.id);
      setArchivando(null);
      setDetail(null);
      // Se vuelve a pedir en vez de sacarla del estado: el contrato de la
      // pantalla es «lo que el backend tiene», y filtrarla acá la escondería
      // aunque el archivado no hubiera quedado firme.
      setRecargaPropiedades((n) => n + 1);
    } catch (err) {
      setErrorArchivar(mensajeDeErrorArchivar(err));
    } finally {
      setGuardandoArchivado(false);
    }
  }

  function propertyDetail() {
    const volver = (nombre: string) => (
      <nav className="owner-crumb">
        <button type="button" onClick={() => setDetail(null)}>Propiedades</button>
        <span>/</span><span>{nombre}</span>
      </nav>
    );

    if (demo) {
      return <>{volver(selectedProperty.address)}{pageHeader(selectedProperty.address, `${selectedProperty.type} · ${selectedProperty.city}`, <><Button tone="secondary"><Icon name="edit" size={18} />Editar</Button><Button tone="danger"><Icon name="archive" size={18} />Archivar</Button></>)}<section className="owner-detail-grid"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ESTADO ACTUAL</p><Status>{selectedProperty.state}</Status></div>{selectedProperty.tenant && <div className="owner-current-rent"><p className="owner-eyebrow">ALQUILER ACTUAL</p><b>{selectedProperty.rent}</b><small>por mes</small></div>}</div>{selectedProperty.tenant ? <button type="button" className="owner-contract-callout" onClick={() => openDetail("contract", selectedProperty.id)}><span><Icon name="file" /></span><div><b>Contrato con {selectedProperty.tenant}</b><small>Ver condiciones, documento y próximas cuotas</small></div><Icon name="arrow" /></button> : <div className="owner-empty-callout"><Icon name="building" /><div><b>Esta propiedad está disponible</b><small>Cuando tenga un inquilino, cree un contrato para empezar a cobrarla.</small></div><Button small onClick={() => beginCreation("contract")}>Crear contrato</Button></div>}</div><div className="owner-card"><h2>Características</h2><dl className="owner-definition"><div><dt>Dirección</dt><dd>{selectedProperty.address}, {selectedProperty.city}</dd></div><div><dt>Tipo</dt><dd>{selectedProperty.type}</dd></div><div><dt>Detalles</dt><dd>{selectedProperty.detail}</dd></div></dl></div></section></>;
    }

    const cruda = propiedadesCrudas.find((p) => String(p.id) === selected);
    const fila = propiedades?.find((f) => String(f.id) === selected);

    if (!cruda || !fila) {
      return <>{volver("…")}<div className="owner-card"><p className="owner-list-note">
        {propiedadesError ? "No pudimos cargar esta propiedad." : "Cargando…"}
      </p></div></>;
    }

    // Sólo lo que la propiedad tiene: el paso de características es opcional y
    // un cero no dicho no es un cero.
    const caracteristicas = [
      cruda.bedrooms !== undefined && cruda.bedrooms !== null && `${cruda.bedrooms} dormitorio${cruda.bedrooms === 1 ? "" : "s"}`,
      cruda.bathrooms !== undefined && cruda.bathrooms !== null && `${cruda.bathrooms} baño${cruda.bathrooms === 1 ? "" : "s"}`,
      cruda.coveredArea && `${cruda.coveredArea} m²`,
    ].filter(Boolean).join(" · ");

    const preferencias = [
      cruda.petsAllowed === true && "Acepta mascotas",
      cruda.furnished === true && "Amoblada",
    ].filter(Boolean).join(" · ");

    const domicilio = [fila.direccion, cruda.city, cruda.postalCode, cruda.province]
      .filter(Boolean)
      .join(", ");

    return <>
      {volver(fila.direccion)}
      {pageHeader(fila.direccion, `${etiquetaCategoria(cruda.category)} · ${cruda.city}`, <>
        <Button tone="secondary"><Icon name="edit" size={18} />Editar</Button>
        <Button tone="danger" onClick={() => { setErrorArchivar(null); setArchivando(fila); }}>
          <Icon name="archive" size={18} />Archivar
        </Button>
      </>)}
      <section className="owner-detail-grid">
        <div className="owner-card">
          <div className="owner-card__top">
            <div>
              <p className="owner-eyebrow">ESTADO ACTUAL</p>
              {!sinDatoDeContrato && <Status>{fila.estado}</Status>}
            </div>
            {fila.alquiler && (
              <div className="owner-current-rent">
                <p className="owner-eyebrow">ALQUILER ACTUAL</p>
                <b>{fila.alquiler}</b><small>por mes</small>
              </div>
            )}
          </div>
          {fila.contratoId !== null
            ? <div className="owner-contract-callout">
                <span><Icon name="file" /></span>
                <div>
                  <b>{cruda.tenant ? `Contrato con ${cruda.tenant.firstName} ${cruda.tenant.lastName}` : "Contrato vigente"}</b>
                  <small>Ver condiciones, documento y próximas cuotas</small>
                </div>
              </div>
            : <div className="owner-empty-callout">
                <Icon name="building" />
                <div><b>Esta propiedad está disponible</b><small>Cuando tenga un inquilino, cree un contrato para empezar a cobrarla.</small></div>
                <Button small onClick={() => beginCreation("contract")}>Crear contrato</Button>
              </div>}
        </div>
        <div className="owner-card">
          <h2>Características</h2>
          <dl className="owner-definition">
            <div><dt>Dirección</dt><dd>{domicilio}</dd></div>
            <div><dt>Tipo</dt><dd>{etiquetaCategoria(cruda.category)}</dd></div>
            {caracteristicas && <div><dt>Detalles</dt><dd>{caracteristicas}</dd></div>}
            {preferencias && <div><dt>Preferencias</dt><dd>{preferencias}</dd></div>}
          </dl>
        </div>
      </section>
    </>;
  }

  /** Pide el enlace y lo deja en el portapapeles. No reenvía el mail. */
  async function copiarEnlace(contratoId: number) {
    setEnlace("pidiendo");
    try {
      const { url } = await AlquiaBackendClient.contracts.getTenantAccess(contratoId);
      await navigator.clipboard.writeText(url);
      setEnlace("copiado");
    } catch {
      setEnlace("error");
    }
  }

  async function reenviarEnlace(contratoId: number) {
    setErrorContrato(null);
    try {
      await AlquiaBackendClient.contracts.resendTenantAccess(contratoId);
      setErrorContrato("Le reenviamos el enlace por correo al inquilino.");
    } catch {
      setErrorContrato("No pudimos reenviar el correo. Inténtelo de nuevo más tarde.");
    }
  }

  async function descargarDocumento(contrato: ContractResponse) {
    setErrorContrato(null);
    try {
      const blob = await AlquiaBackendClient.contracts.getDocument(contrato.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = contrato.documentFileName ?? "contrato";
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorContrato("No pudimos descargar el documento. Inténtelo de nuevo más tarde.");
    }
  }

  async function adjuntarDocumento(contratoId: number, archivo: File) {
    setErrorContrato(null);
    try {
      await AlquiaBackendClient.contracts.attachDocument(contratoId, archivo);
      setRecargaContrato((n) => n + 1);
    } catch (err) {
      setErrorContrato(
        err instanceof AuthExpiredError
          ? "Su sesión expiró. Vuelva a iniciar sesión."
          : "No pudimos adjuntar el documento. Inténtelo de nuevo más tarde."
      );
    }
  }

  async function quitarDocumento(contratoId: number) {
    setErrorContrato(null);
    try {
      await AlquiaBackendClient.contracts.removeDocument(contratoId);
      setRecargaContrato((n) => n + 1);
    } catch {
      setErrorContrato("No pudimos quitar el documento. Inténtelo de nuevo más tarde.");
    }
  }

  async function finalizarContrato(contratoId: number) {
    setErrorContrato(null);
    setGuardandoContrato(true);
    try {
      await AlquiaBackendClient.contracts.terminate(contratoId, { terminationDate: fechaFin });
      setFinalizando(false);
      setRecargaContrato((n) => n + 1);
    } catch (err) {
      setErrorContrato(
        err instanceof AuthExpiredError
          ? "Su sesión expiró. Vuelva a iniciar sesión."
          : err instanceof ApiError && err.status === 400
            ? "No se pudo finalizar con esa fecha. Revísela e inténtelo de nuevo."
            : "No pudimos finalizar el contrato. Inténtelo de nuevo más tarde."
      );
    } finally {
      setGuardandoContrato(false);
    }
  }

  function ContractDetail() {
    const volver = (nombre: string) => (
      <nav className="owner-crumb">
        <button type="button" onClick={() => setDetail(null)}>Contratos</button>
        <span>/</span><span>{nombre}</span>
      </nav>
    );

    if (demo) {
      return <>{volver(selectedContract.property.address)}{pageHeader(selectedContract.property.address, `Contrato con ${selectedContract.property.tenant} · vigente hasta el ${selectedContract.end}`, <Button tone="danger">Finalizar contrato</Button>)}<section className="owner-detail-grid"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ALQUILER ACTUAL</p><strong className="owner-detail-money">{selectedContract.property.rent}</strong><small>por mes · vence el día 1</small></div><Status>{selectedContract.property.state}</Status></div><div className="owner-timeline"><div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>01/03/2025</small></p></div><div><span><Icon name="trend" /></span><p><b>Próxima actualización</b><small>01/09/2026 · {selectedContract.increment}</small></p></div><div><span><Icon name="calendar" /></span><p><b>Fin previsto</b><small>{selectedContract.end}</small></p></div></div></div><div className="owner-card"><h2>Inquilino y acceso de pago</h2><div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>{selectedContract.property.tenant}</b></div></div><div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace para comprobantes</b></span></div><Button tone="secondary" small onClick={() => setLinkCopied(true)}><Icon name="copy" size={16} />{linkCopied ? "Copiado" : "Copiar enlace"}</Button></div></div><div className="owner-card"><h2>Documento firmado</h2>{selectedContract.document ? <div className="owner-document"><span><Icon name="file" /></span><div><b>{selectedContract.document}</b><small>PDF · 2,4 MB</small></div><Button tone="quiet" small><Icon name="download" size={16} />Descargar</Button></div> : <div className="owner-empty-callout"><Icon name="paperclip" /><div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div><Button small>Adjuntar</Button></div>}</div></section></>;
    }

    if (cargaContrato !== null && "error" in cargaContrato) {
      return <>{volver("…")}<div className="owner-card">
        <p className="owner-list-note" role="alert"><b>No pudimos cargar este contrato</b>Inténtelo de nuevo más tarde.</p>
      </div></>;
    }

    if (cargaContrato === null) {
      return <>{volver("…")}<div className="owner-card"><p className="owner-list-note">Cargando…</p></div></>;
    }

    const contrato = cargaContrato.ok;
    const direccion = formatearDireccion(contrato.property);
    const inquilino = `${contrato.tenant.firstName} ${contrato.tenant.lastName}`;
    const vigente = contrato.status === "ACTIVE";
    const proxima = proximaActualizacion(contrato);
    const condiciones = condicionesComerciales(contrato);
    const lineas = aumentos === "error" || aumentos === null ? [] : historialDeAumentos(aumentos, contrato.currency);

    return <>
      {volver(direccion)}
      {pageHeader(direccion, `Contrato con ${inquilino} · ${vigenciaEnFechas(contrato)}`,
        // Finalizar sólo tiene sentido sobre un contrato que sigue corriendo.
        vigente ? <>
          {!programado && sucesorId === null && <Button tone="secondary" onClick={() => setConditionsOpen(true)}>Cambiar condiciones</Button>}
          <Button tone="danger" onClick={() => { setErrorContrato(null); setFechaFin(new Date().toISOString().slice(0, 10)); setFinalizando(true); }}>Finalizar contrato</Button>
        </> : undefined)}

      <section className="owner-detail-grid">
        <div className="owner-card">
          <div className="owner-card__top">
            <div>
              <p className="owner-eyebrow">ALQUILER ACTUAL</p>
              <strong className="owner-detail-money">{formatearImporte(contrato.currentRent, contrato.currency)}</strong>
              <small>por mes · vence el día {contrato.dueDay}</small>
            </div>
            <Status>{estadoDeContrato(contrato, new Date().toISOString().slice(0, 10))}</Status>
          </div>
          <div className="owner-timeline">
            <div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>{formatearFecha(contrato.startDate)}</small></p></div>
            {/* Sin fecha de próxima actualización no hay hito: el backend no la
                informa y calcularla acá daría una distinta de la que va a usar. */}
            {proxima && (
              <div><span><Icon name="trend" /></span><p><b>Próxima actualización</b>
                <small>{proxima.fecha} · {proxima.importe ?? comoSeActualiza(contrato)}</small>
              </p></div>
            )}
            <div><span><Icon name="calendar" /></span><p>
              <b>{contrato.actualEndDate ? "Terminó el" : "Fin previsto"}</b>
              <small>{formatearFecha(contrato.actualEndDate ?? contrato.endDate)}</small>
            </p></div>
          </div>
          {programado && (
            <div className="owner-empty-callout">
              <Icon name="calendar" />
              <div>
                <b>Cambio programado desde {formatearPeriodo(programado.startDate)}</b>
                <small>{[
                  `Alquiler de ${formatearImporte(programado.initialRentAmount, programado.currency)}`,
                  `vence el día ${programado.dueDay}`,
                  describirActualizacion(programado).toLowerCase(),
                ].join(" · ")}. Hasta entonces rigen las condiciones actuales.</small>
              </div>
            </div>
          )}
          {contrato.status === "SUPERSEDED" && contrato.successorContractId && (
            <button type="button" className="owner-contract-callout"
              onClick={() => openDetail("contract", String(contrato.successorContractId))}>
              <span><Icon name="file" /></span>
              <div><b>Este contrato fue reemplazado</b><small>Un cambio de condiciones lo sucedió. Ver el contrato vigente.</small></div>
              <Icon name="arrow" />
            </button>
          )}
        </div>

        <div className="owner-card">
          <h2>Inquilino y acceso de pago</h2>
          <div className="owner-tenant-card">
            <span className="owner-row__icon"><Icon name="users" /></span>
            <div><b>{inquilino}</b><small>{contrato.tenant.email}</small></div>
          </div>
          {/* Sin afirmar vigencia: hoy el token vence a fin de mes (S-1) y el
              endpoint devuelve sólo la URL, sin fecha. */}
          <div className="owner-link-box">
            <div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>El inquilino sube sus comprobantes desde ahí, sin cuenta.</small></span></div>
            <Button tone="secondary" small disabled={enlace === "pidiendo"} onClick={() => void copiarEnlace(contrato.id)}>
              <Icon name="copy" size={16} />{enlace === "copiado" ? "Copiado" : "Copiar enlace"}
            </Button>
          </div>
          {enlace === "error" && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />No pudimos obtener el enlace. Inténtelo de nuevo.</p>}
          <Button tone="quiet" small onClick={() => void reenviarEnlace(contrato.id)}>Reenviar por correo al inquilino</Button>
        </div>

        <div className="owner-card">
          <h2>Documento firmado</h2>
          {contrato.documentFileName ? (
            <div className="owner-document">
              <span><Icon name="file" /></span>
              <div><b>{contrato.documentFileName}</b><small>{descripcionDocumento(contrato)}</small></div>
              <Button tone="quiet" small onClick={() => void descargarDocumento(contrato)}><Icon name="download" size={16} />Descargar</Button>
              <Button tone="quiet" small onClick={() => void quitarDocumento(contrato.id)}>Quitar</Button>
            </div>
          ) : (
            <div className="owner-empty-callout">
              <Icon name="paperclip" />
              <div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div>
              <label className="owner-file-label">
                <input type="file" className="sr-only" aria-label="Adjuntar el documento firmado"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void adjuntarDocumento(contrato.id, f); }} />
                <span className="owner-button owner-button--primary owner-button--small">Adjuntar</span>
              </label>
            </div>
          )}
          {errorContrato && !finalizando && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorContrato}</p>}
        </div>

        {condiciones.length > 0 && (
          <div className="owner-card">
            <h2>Condiciones pactadas</h2>
            <dl className="owner-definition">
              {condiciones.map((c) => (
                <div key={c.etiqueta}><dt>{c.etiqueta}</dt><dd>{c.valor}</dd></div>
              ))}
            </dl>
          </div>
        )}

        {aumentos !== "error" && (
          <div className="owner-card">
            <h2>Historial de aumentos</h2>
            {aumentos === null ? <p className="owner-list-note">Cargando…</p>
              : lineas.length === 0 ? <p className="owner-list-note">Todavía no se aplicó ningún aumento. {comoSeActualiza(contrato)}.</p>
              : <dl className="owner-definition">
                  {lineas.map((linea) => (
                    <div key={linea.id}>
                      <dt>{linea.fecha}</dt>
                      <dd>{linea.resultado}{linea.ventana ? ` · ${linea.ventana}` : ""}</dd>
                    </div>
                  ))}
                </dl>}
          </div>
        )}
      </section>
    </>;
  }

  function TenantDetail() {
    const inquilino = inquilinos?.find((item) => String(item.id) === selected);
    const volver = <nav className="owner-crumb"><button type="button" onClick={() => setDetail(null)}>Inquilinos</button><span>/</span><span>{inquilino?.nombre ?? "…"}</span></nav>;

    if (!inquilino) {
      return <>{volver}<div className="owner-card"><p className="owner-list-note">{inquilinosError ? "No pudimos cargar este inquilino." : "Cargando…"}</p></div></>;
    }

    return <>
      {volver}
      {pageHeader(inquilino.nombre, [inquilino.cuit, inquilino.email, inquilino.telefono].filter(Boolean).join(" · "), <>
        <Button tone="secondary" onClick={() => {
          setErrorAjustes(null); setAvisoGuardado(null); setInquilinoEditadoId(inquilino.id);
          setEditandoInquilino({
            firstName: inquilino.nombrePila,
            lastName: inquilino.apellido,
            taxId: inquilino.cuit,
            email: inquilino.email,
            phoneNumber: inquilino.telefono,
          });
        }}><Icon name="edit" size={18} />Editar datos</Button>
        <Button tone="danger" onClick={() => { setErrorAjustes(null); setArchivandoInquilino(inquilino); }}>
          <Icon name="archive" size={18} />Archivar
        </Button>
      </>)}
      <section className="owner-detail-grid">
        <div className="owner-card">
          <h2>Contrato vigente</h2>
          {inquilino.contratoId === null
            ? <div className="owner-empty-callout">
                <Icon name="file" />
                <div><b>Todavía no tiene un contrato</b><small>Cuando le alquile una propiedad, cree el contrato para empezar a cobrarle.</small></div>
                <Button small onClick={() => beginCreation("contract")}>Crear contrato</Button>
              </div>
            // Ya lleva al detalle: se rendía sin link porque el detalle de
            // contrato salía de datos de ejemplo, y esa razón desapareció.
            : <button type="button" className="owner-contract-callout"
                onClick={() => openDetail("contract", String(inquilino.contratoId))}>
                <span><Icon name="file" /></span>
                <div><b>{inquilino.direccion}</b><small>{inquilino.alquiler} por mes · {inquilino.estado}</small></div>
                <Icon name="arrow" />
              </button>}
        </div>
        {/* El enlace de comprobantes se emite por contrato: sin contrato no hay
            acceso del que hablar, y decir «Enlace activo» sería falso. */}
        {inquilino.contratoId !== null && (
          <div className="owner-card">
            <h2>Acceso de pago</h2>
            <p className="owner-card__copy">El inquilino no necesita una cuenta. Comparte un enlace seguro para ver cuotas habilitadas y subir su comprobante.</p>
            {/* Sin «revocar y regenerar»: no hay endpoint detrás y el spec del
                portal lo dejó fuera de alcance. */}
            <div className="owner-link-box">
              <div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>Se lo puede compartir por donde quiera.</small></span></div>
              <Button tone="secondary" small disabled={enlace === "pidiendo"}
                onClick={() => void copiarEnlace(inquilino.contratoId!)}>
                <Icon name="copy" size={16} />{enlace === "copiado" ? "Copiado" : "Copiar enlace"}
              </Button>
            </div>
            {enlace === "error" && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />No pudimos obtener el enlace. Inténtelo de nuevo.</p>}
          </div>
        )}
      </section>
    </>;
  }

  const content = wizard ? <CreationWizard kind={wizard} demo={demo} onClose={() => setWizard(null)} onNewTenant={() => beginCreation("tenant")} onComplete={() => go(wizard === "property" ? "propiedades" : wizard === "tenant" ? "inquilinos" : "contratos")} /> : detail === "property" ? propertyDetail() : detail === "contract" ? <ContractDetail /> : detail === "tenant" ? <TenantDetail /> : view === "propiedades" ? propertiesView() : view === "contratos" ? contractsView() : view === "cobranzas" ? collectionsView() : view === "inquilinos" ? tenantsView() : view === "configuracion" ? settingsView() : overview();
  const cuentaValida = editandoCuenta
    ? Boolean(editandoCuenta.firstName.trim()) &&
      Boolean(editandoCuenta.lastName.trim()) &&
      cuitValido(editandoCuenta.taxId) &&
      telefonoValido(editandoCuenta.phoneNumber)
    : false;

  const inquilinoValido = editandoInquilino
    ? Boolean(editandoInquilino.firstName.trim()) &&
      Boolean(editandoInquilino.lastName.trim()) &&
      cuitValido(editandoInquilino.taxId) &&
      correoValido(editandoInquilino.email) &&
      telefonoValido(editandoInquilino.phoneNumber)
    : false;

  const deltaAjuste = ajustando ? calcularDelta(Number(importeFinal) || 0, ajustando.totalVigente) : null;
  const ajusteListo = Boolean(ajustando) && Number(importeFinal) > 0 && Boolean(motivoAjuste.trim()) && deltaAjuste !== null;

  return <div className="owner-workspace"><main className="owner-content">{content}</main>{ajustando && <Dialog
    title={ajusteEditado === null ? "Ajustar el importe de la cuota" : "Cambiar un ajuste"}
    onClose={() => setAjustando(null)}>
    <div className="owner-dialog__body">
      <p>{ajustando.direccion} · cuota de {ajustando.periodo}.</p>
      {/* Base y total por separado: si ya hay ajustes, el importe final se
          calcula contra el total y hay que ver de dónde sale. */}
      <dl className="owner-definition">
        <div><dt>Importe base</dt><dd>{formatearMonto(ajustando.importeBase)}</dd></div>
        {ajustando.ajustes.map((a) => {
          const linea = describirAjuste(a, ajustando.importeBase);
          return <div key={linea.id}>
            <dt>{linea.nombre}{linea.detalle ? ` · ${linea.detalle}` : ""}</dt>
            <dd>
              {linea.efecto}
              <button type="button" className="owner-row__link" disabled={accionEnCurso}
                onClick={() => setQuitandoAjuste(linea.id)}>Quitar</button>
            </dd>
          </div>;
        })}
        <div><dt>Total actual</dt><dd><b>{formatearMonto(ajustando.totalVigente)}</b></dd></div>
      </dl>

      <div className="owner-wizard-stack">
        <label className="owner-wizard-field owner-wizard-field--amount">
          <span>$</span>
          <input inputMode="numeric" autoFocus aria-label="Importe final de la cuota"
            value={importeFinal} onChange={(e) => setImporteFinal(e.target.value.replace(/\D/g, ""))} />
          <span>final</span>
        </label>
        <label className="owner-wizard-field">
          <span className="sr-only">Motivo del ajuste</span>
          <input placeholder="Motivo — ej.: reparación acordada" value={motivoAjuste}
            onChange={(e) => setMotivoAjuste(e.target.value)} />
        </label>
        {/* Lo que se guarda no es lo que se escribe: se anuncia antes. */}
        <p className="owner-wizard-help" role="status">{describirDelta(deltaAjuste)}</p>
      </div>

      <aside className="owner-wizard-note"><Icon name="alert" />
        Se puede ajustar mientras la cuota no esté confirmada. Al confirmarla, el importe queda cerrado.
      </aside>
      {errorAccion && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorAccion}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setAjustando(null)} disabled={accionEnCurso}>Cancelar</Button>
      <Button disabled={accionEnCurso || !ajusteListo} onClick={() => {
        if (!deltaAjuste) return;
        const cuerpo = { name: motivoAjuste.trim(), ...deltaAjuste };
        void accionDeAjuste(
          () => ajusteEditado === null
            ? AlquiaBackendClient.invoices.addAdjustment(ajustando.invoiceId, cuerpo)
            : AlquiaBackendClient.invoices.editAdjustment(ajustando.invoiceId, ajusteEditado, cuerpo),
          () => setAjustando(null)
        );
      }}>
        {accionEnCurso ? "Guardando…" : "Guardar ajuste"}
      </Button>
    </div>
  </Dialog>}{quitandoAjuste !== null && ajustando && <Dialog title="Quitar este ajuste" onClose={() => setQuitandoAjuste(null)}>
    <div className="owner-dialog__body">
      <p>El total de la cuota vuelve a calcularse sin él.</p>
      {errorAccion && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorAccion}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setQuitandoAjuste(null)} disabled={accionEnCurso}>Cancelar</Button>
      <Button tone="danger" disabled={accionEnCurso} onClick={() => void accionDeAjuste(
        () => AlquiaBackendClient.invoices.removeAdjustment(ajustando.invoiceId, quitandoAjuste),
        () => { setQuitandoAjuste(null); setAjustando(null); }
      )}>
        {accionEnCurso ? "Quitando…" : "Quitar"}
      </Button>
    </div>
  </Dialog>}{editandoInquilino && inquilinoEditadoId !== null && <Dialog title="Editar datos del inquilino" onClose={() => setEditandoInquilino(null)}>
    <div className="owner-dialog__body">
      <div className="owner-wizard-stack">
        <div className="owner-wizard-duo">
          <label className="owner-wizard-field">
            <span className="sr-only">Nombre</span>
            <input placeholder="Nombre" value={editandoInquilino.firstName}
              onChange={(e) => setEditandoInquilino({ ...editandoInquilino, firstName: e.target.value })} />
          </label>
          <label className="owner-wizard-field">
            <span className="sr-only">Apellido</span>
            <input placeholder="Apellido" value={editandoInquilino.lastName}
              onChange={(e) => setEditandoInquilino({ ...editandoInquilino, lastName: e.target.value })} />
          </label>
        </div>
        <label className="owner-wizard-field">
          <span className="sr-only">CUIT o CUIL</span>
          <input inputMode="numeric" placeholder="CUIT o CUIL — 20-12345678-9"
            value={editandoInquilino.taxId}
            aria-invalid={editandoInquilino.taxId.length > 0 && !cuitValido(editandoInquilino.taxId)}
            onChange={(e) => setEditandoInquilino({ ...editandoInquilino, taxId: formatearCuit(e.target.value) })} />
        </label>
        {editandoInquilino.taxId.length > 0 && !cuitValido(editandoInquilino.taxId) && (
          <p className="owner-wizard-error" role="alert">
            {soloDigitos(editandoInquilino.taxId).length < 11
              ? "Faltan dígitos: son 11 en total."
              : "El número no es válido. Revise que no haya un dígito cambiado."}
          </p>
        )}
        <label className="owner-wizard-field">
          <span className="sr-only">Correo electrónico</span>
          <input type="email" placeholder="Correo electrónico" value={editandoInquilino.email}
            aria-invalid={editandoInquilino.email.length > 0 && !correoValido(editandoInquilino.email)}
            onChange={(e) => setEditandoInquilino({ ...editandoInquilino, email: e.target.value })} />
        </label>
        <label className="owner-wizard-field">
          <span className="sr-only">Teléfono</span>
          <input inputMode="tel" placeholder="Teléfono — 11 4455 2210"
            value={editandoInquilino.phoneNumber}
            aria-invalid={editandoInquilino.phoneNumber.length > 0 && !telefonoValido(editandoInquilino.phoneNumber)}
            onChange={(e) => setEditandoInquilino({ ...editandoInquilino, phoneNumber: e.target.value })} />
        </label>
        {editandoInquilino.phoneNumber.length > 0 && !telefonoValido(editandoInquilino.phoneNumber) && (
          <p className="owner-wizard-error" role="alert">{errorDeTelefono(editandoInquilino.phoneNumber)}</p>
        )}
      </div>
      {errorAjustes && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorAjustes}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setEditandoInquilino(null)} disabled={guardandoAjustes}>Cancelar</Button>
      <Button disabled={guardandoAjustes || !inquilinoValido}
        onClick={() => void guardarInquilinoEditado(inquilinoEditadoId, editandoInquilino)}>
        {guardandoAjustes ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  </Dialog>}{archivandoInquilino && <Dialog title="Archivar este inquilino" onClose={() => setArchivandoInquilino(null)}>
    <div className="owner-dialog__body">
      <p><b>{archivandoInquilino.nombre}</b> sale de la lista de inquilinos. Su historia
        —contratos, cuotas y pagos— se conserva, y puede volver a mostrarlo cuando quiera.</p>
      {errorAjustes && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorAjustes}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setArchivandoInquilino(null)} disabled={guardandoAjustes}>Cancelar</Button>
      <Button tone="danger" disabled={guardandoAjustes}
        onClick={() => void archivarInquilino(archivandoInquilino)}>
        {guardandoAjustes ? "Archivando…" : "Archivar"}
      </Button>
    </div>
  </Dialog>}{editandoAvisos && <Dialog title="Editar recordatorios" onClose={() => setEditandoAvisos(null)}>
    <div className="owner-dialog__body">
      <p>Estos avisos le llegan al inquilino por correo. El aviso de cuota confirmada se envía
        siempre, aunque los recordatorios estén apagados.</p>
      <div className="owner-wizard-chips">
        <button type="button" aria-pressed={editandoAvisos.enabled}
          onClick={() => setEditandoAvisos({ ...editandoAvisos, enabled: !editandoAvisos.enabled })}>
          {editandoAvisos.enabled ? "Recordatorios activos" : "Recordatorios apagados"}
        </button>
      </div>
      {editandoAvisos.enabled && <>
        <Counter label="Días antes del vencimiento" value={editandoAvisos.daysBeforeDue}
          unit="días" min={DIAS_MIN} max={DIAS_MAX}
          onChange={(v) => setEditandoAvisos({ ...editandoAvisos, daysBeforeDue: v })} />
        <div className="owner-wizard-chips">
          <button type="button" aria-pressed={editandoAvisos.dueDateReminderEnabled}
            onClick={() => setEditandoAvisos({ ...editandoAvisos, dueDateReminderEnabled: !editandoAvisos.dueDateReminderEnabled })}>
            Avisar el día del vencimiento
          </button>
        </div>
        <Counter label="Días después del vencimiento" value={editandoAvisos.daysAfterDue}
          unit="días" min={DIAS_MIN} max={DIAS_MAX}
          onChange={(v) => setEditandoAvisos({ ...editandoAvisos, daysAfterDue: v })} />
      </>}
      {errorAjustes && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorAjustes}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setEditandoAvisos(null)} disabled={guardandoAjustes}>Cancelar</Button>
      <Button disabled={guardandoAjustes} onClick={() => void guardarAvisos(editandoAvisos)}>
        {guardandoAjustes ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  </Dialog>}{editandoCuenta && <Dialog title="Editar datos" onClose={() => setEditandoCuenta(null)}>
    <div className="owner-dialog__body">
      <div className="owner-wizard-stack">
        <div className="owner-wizard-duo">
          <label className="owner-wizard-field">
            <span className="sr-only">Nombre</span>
            <input placeholder="Nombre" value={editandoCuenta.firstName}
              onChange={(e) => setEditandoCuenta({ ...editandoCuenta, firstName: e.target.value })} />
          </label>
          <label className="owner-wizard-field">
            <span className="sr-only">Apellido</span>
            <input placeholder="Apellido" value={editandoCuenta.lastName}
              onChange={(e) => setEditandoCuenta({ ...editandoCuenta, lastName: e.target.value })} />
          </label>
        </div>
        <label className="owner-wizard-field">
          <span className="sr-only">CUIT o CUIL</span>
          <input inputMode="numeric" placeholder="CUIT o CUIL — 20-12345678-9"
            value={editandoCuenta.taxId} aria-invalid={editandoCuenta.taxId.length > 0 && !cuitValido(editandoCuenta.taxId)}
            onChange={(e) => setEditandoCuenta({ ...editandoCuenta, taxId: formatearCuit(e.target.value) })} />
        </label>
        {editandoCuenta.taxId.length > 0 && !cuitValido(editandoCuenta.taxId) && (
          <p className="owner-wizard-error" role="alert">
            {soloDigitos(editandoCuenta.taxId).length < 11
              ? "Faltan dígitos: son 11 en total."
              : "El número no es válido. Revise que no haya un dígito cambiado."}
          </p>
        )}
        <label className="owner-wizard-field">
          <span className="sr-only">Teléfono</span>
          <input inputMode="tel" placeholder="Teléfono — 11 4455 2210"
            value={editandoCuenta.phoneNumber}
            aria-invalid={editandoCuenta.phoneNumber.length > 0 && !telefonoValido(editandoCuenta.phoneNumber)}
            onChange={(e) => setEditandoCuenta({ ...editandoCuenta, phoneNumber: e.target.value })} />
        </label>
        {editandoCuenta.phoneNumber.length > 0 && !telefonoValido(editandoCuenta.phoneNumber) && (
          <p className="owner-wizard-error" role="alert">{errorDeTelefono(editandoCuenta.phoneNumber)}</p>
        )}
        {/* El correo no se puede cambiar desde acá: `UserUpdateRequest` no lo
            incluye. Se muestra para que el propietario sepa cuál es su cuenta. */}
        <p className="owner-card__copy">Su correo es <b>{cuenta?.email}</b> y no se puede cambiar desde acá.</p>
      </div>
      {errorAjustes && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorAjustes}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setEditandoCuenta(null)} disabled={guardandoAjustes}>Cancelar</Button>
      <Button disabled={guardandoAjustes || !cuentaValida} onClick={() => void guardarCuenta(editandoCuenta)}>
        {guardandoAjustes ? "Guardando…" : "Guardar"}
      </Button>
    </div>
  </Dialog>}{finalizando && cargaContrato !== null && "ok" in cargaContrato && <Dialog title="Finalizar este contrato" onClose={() => setFinalizando(false)}>
    <div className="owner-dialog__body">
      <p>El contrato queda terminado desde la fecha que indique. <b>Las cuotas posteriores
        que todavía no estén pagas se eliminan</b>; las ya cobradas y su historial se conservan.</p>
      <label className="owner-wizard-field owner-wizard-field--medium">
        <span className="owner-wizard-label">FECHA DE TERMINACIÓN</span>
        <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
      </label>
      {errorContrato && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorContrato}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setFinalizando(false)} disabled={guardandoContrato}>Cancelar</Button>
      <Button tone="danger" disabled={guardandoContrato || !fechaFin}
        onClick={() => void finalizarContrato(cargaContrato.ok.id)}>
        {guardandoContrato ? "Finalizando…" : "Finalizar contrato"}
      </Button>
    </div>
  </Dialog>}{archivando && <Dialog title="Archivar esta propiedad" onClose={() => setArchivando(null)}>
    <div className="owner-dialog__body">
      <p><b>{archivando.direccion}</b> sale de la lista de propiedades. Su historia
        —contratos, cuotas y pagos— se conserva, y puede volver a mostrarla cuando quiera.</p>
      {errorArchivar && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorArchivar}</p>}
    </div>
    <div className="owner-dialog__foot">
      <Button tone="quiet" onClick={() => setArchivando(null)} disabled={guardandoArchivado}>Cancelar</Button>
      <Button tone="danger" disabled={guardandoArchivado}
        onClick={() => void archivarPropiedad(archivando)}>
        {guardandoArchivado ? "Archivando…" : "Archivar"}
      </Button>
    </div>
  </Dialog>}{enRevision && <Dialog title={`Revisar pago de ${enRevision.inquilino}`} onClose={() => setEnRevision(null)}>
    <div className="owner-dialog__body">
      <p>{enRevision.direccion} · cuota de {enRevision.periodo} por <b>{enRevision.monto}</b>.</p>
      <div className="owner-receipt">
        <Icon name="receipt" size={34} />
        <b>{enRevision.pagoPendiente?.receiptFileName ?? "Comprobante"}</b>
        {/* El backend no expone la fecha de carga (P0-4), así que la línea sólo
            dice lo que sabe: tipo y tamaño. */}
        <small>{descripcionArchivo(enRevision.pagoPendiente)}</small>
        <Button tone="secondary" small disabled={!enRevision.pagoPendiente}
          onClick={() => { if (enRevision.pagoPendiente) void verComprobante(enRevision.pagoPendiente.id); }}>
          <Icon name="download" size={16} />Ver archivo
        </Button>
      </div>
      <p className="owner-dialog__hint">Al confirmar, la cuota queda marcada como pagada. Si el comprobante no corresponde, puede rechazarlo; el inquilino podrá cargar uno nuevo.</p>
      {errorAccion && <p className="owner-list-note" role="alert">{errorAccion}</p>}
      <div className="owner-dialog__actions">
        <Button tone="danger" disabled={accionEnCurso}
          onClick={() => { if (enRevision.pagoPendiente) void accionDeCuota(
            () => AlquiaBackendClient.payments.reject(enRevision.pagoPendiente!.id),
            () => setEnRevision(null)); }}>Rechazar</Button>
        <Button disabled={accionEnCurso}
          onClick={() => { if (enRevision.pagoPendiente) void accionDeCuota(
            () => AlquiaBackendClient.payments.confirm(enRevision.pagoPendiente!.id),
            () => setEnRevision(null)); }}>
          {accionEnCurso ? "Guardando…" : "Confirmar pago"}
        </Button>
      </div>
    </div>
  </Dialog>}
  {aRegistrar && <Dialog title="Registrar pago" onClose={() => setARegistrar(null)}>
    <div className="owner-dialog__body">
      <p>{aRegistrar.direccion} · cuota de {aRegistrar.periodo} por <b>{aRegistrar.monto}</b>.</p>
      {/* El comprobante es obligatorio: Payment.receipt* es non-nullable en el
          backend, así que acá nunca dice «(opcional)». */}
      <label className="owner-file">
        <span>Comprobante del pago</span>
        <input type="file" accept="image/*,application/pdf"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>
      <p className="owner-dialog__hint">Adjunte la transferencia, el recibo firmado o la boleta de depósito. Queda guardada junto a la cuota.</p>
      {errorAccion && <p className="owner-list-note" role="alert">{errorAccion}</p>}
      <div className="owner-dialog__actions">
        <Button tone="secondary" onClick={() => setARegistrar(null)}>Cancelar</Button>
        <Button disabled={!archivo || accionEnCurso}
          onClick={() => { if (archivo) void accionDeCuota(
            () => AlquiaBackendClient.payments.create(aRegistrar.invoiceId, archivo),
            () => { setARegistrar(null); setArchivo(null); }); }}>
          {accionEnCurso ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>
    </div>
  </Dialog>}
  {conditionsOpen && cargaContrato !== null && "ok" in cargaContrato && <Dialog title="Cambiar condiciones desde el próximo período" onClose={() => setConditionsOpen(false)}>
    <CambioCondicionesForm contrato={cargaContrato.ok} hoyISO={new Date().toISOString().slice(0, 10)}
      onCancelar={() => setConditionsOpen(false)}
      onProgramado={() => { setConditionsOpen(false); setRecargaContrato((n) => n + 1); }} />
  </Dialog>}{creation && <Dialog title={creation === "property" ? "Agregar propiedad" : "Nuevo contrato"} onClose={() => setCreation(null)}><div className="owner-dialog__body">{creationComplete === creation ? <div className="owner-creation-success"><span><Icon name="check" size={28} /></span><h3>{creation === "property" ? "Propiedad guardada" : "Contrato creado"}</h3><p>{creation === "property" ? "Ya puede asignarle un inquilino o crear su contrato." : "La propiedad queda asociada al inquilino y se generarán las próximas cuotas."}</p><Button onClick={() => go(creation === "property" ? "propiedades" : "contratos")}>Ver {creation === "property" ? "propiedades" : "contratos"}</Button></div> : creation === "property" ? <><p>Empiece por registrar la ubicación. Los demás datos se pueden completar después.</p><div className="owner-form-preview owner-creation-form"><label>Dirección<input placeholder="Ej.: Av. Santa Fe 1420" autoFocus /></label><label>Tipo de propiedad<span className="owner-input-static">Departamento</span></label><label>Ciudad<input placeholder="Ej.: CABA" /></label></div><div className="owner-dialog__actions"><Button tone="secondary" onClick={() => setCreation(null)}>Cancelar</Button><Button onClick={() => setCreationComplete("property")}>Guardar propiedad</Button></div></> : <><p>Asocie una propiedad disponible con su inquilino y defina las condiciones iniciales.</p><div className="owner-creation-choice"><span><Icon name="building" /></span><div><b>Mitre 78</b><small>Local · San Isidro · propiedad disponible</small></div></div><div className="owner-creation-choice"><span><Icon name="users" /></span><div><b>Nuevo inquilino</b><small>Complete sus datos y recibirá su enlace de comprobantes.</small></div></div><div className="owner-form-preview owner-creation-form"><label>Alquiler mensual<input defaultValue="450.000" inputMode="numeric" /></label><label>Actualización<span className="owner-input-static">Porcentaje fijo · cada 3 meses</span></label></div><div className="owner-dialog__actions"><Button tone="secondary" onClick={() => setCreation(null)}>Cancelar</Button><Button onClick={() => setCreationComplete("contract")}>Crear contrato</Button></div></>}</div></Dialog>}</div>;
}
