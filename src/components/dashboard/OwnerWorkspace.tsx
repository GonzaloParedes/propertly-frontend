"use client";

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
function hoyEnLetras(): string {
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

function mesActualEnLetras(): string {
  return enLetras(new Date().toISOString().slice(0, 10));
}

function mesSiguienteEnLetras(): string {
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
  const ultima = palabras.at(-1) ?? "";
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
  const tipo = tipoDeArchivo(pago.receiptContentType);
  const mb = pago.receiptSizeBytes ? `${(pago.receiptSizeBytes / 1_048_576).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB` : null;
  return [tipo, mb].filter(Boolean).join(" · ");
}

function tipoDeArchivo(contentType: string | undefined): string {
  if (contentType?.startsWith("image/")) return "Imagen";
  if (contentType === "application/pdf") return "PDF";
  return "Archivo";
}

function mensajeErrorDeRecordatorios(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  return "No pudimos guardar los recordatorios. Inténtelo de nuevo más tarde.";
}

function mensajeErrorDeCuenta(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.status === 400) return "Verifique los datos ingresados e inténtelo de nuevo.";
  return "No pudimos guardar sus datos. Inténtelo de nuevo más tarde.";
}

function mensajeErrorDeInquilino(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.message === "Tax ID already registered") return "Ese documento ya figura en otro inquilino suyo.";
  if (err instanceof ApiError && err.message === "Phone number already registered") return "Ese teléfono ya figura en otro inquilino suyo.";
  if (err instanceof ApiError && err.status === 400) return "Verifique los datos ingresados e inténtelo de nuevo.";
  return "No pudimos guardar los datos. Inténtelo de nuevo más tarde.";
}

function mensajeErrorAlArchivarInquilino(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.status === 409) return "No se puede archivar: el inquilino tiene datos asociados, como un contrato.";
  return "No pudimos archivar el inquilino. Inténtelo de nuevo más tarde.";
}

function mensajeErrorAlAdjuntarDocumento(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  return "No pudimos adjuntar el documento. Inténtelo de nuevo más tarde.";
}

function mensajeErrorAlFinalizarContrato(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.status === 400) return "No se pudo finalizar con esa fecha. Revísela e inténtelo de nuevo.";
  return "No pudimos finalizar el contrato. Inténtelo de nuevo más tarde.";
}

function descripcionResultadosDePropiedades(visible: number, total: number): string {
  if (visible !== total) return `${visible} de ${total} propiedades`;
  if (visible === 1) return "1 propiedad";
  return `${visible} propiedades`;
}

const ESTADOS: Record<string, readonly [string, IconName]> = {
  "Al día": ["ok", "check"],
  Pagada: ["ok", "check"],
  Vigente: ["ok", "check"],
  "Por terminar": ["warn", "clock"],
  Finalizado: ["none", "archive"],
  Vencido: ["none", "archive"],
  Reemplazado: ["none", "archive"],
  Programado: ["none", "calendar"],
  Vencida: ["bad", "x"],
  "Sin alquilar": ["none", "building"],
  "Sin contrato": ["none", "file"],
  "Pago a confirmar": ["info", "clock"],
};

function Status({ children }: Readonly<{ children: string }>) {
  const [tono, icono] = ESTADOS[children] ?? ["warn", "clock"];
  return <span className={`owner-status owner-status--${tono}`}><Icon name={icono} size={15} />{children}</span>;
}

function Button({ children, tone = "primary", onClick, disabled = false, small = false }: Readonly<{ children: React.ReactNode; tone?: "primary" | "secondary" | "quiet" | "danger"; onClick?: () => void; disabled?: boolean; small?: boolean }>) {
  return <button type="button" className={`owner-button owner-button--${tone}${small ? " owner-button--small" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Notice({ tone, title, children, action }: Readonly<{ tone: "info" | "warn" | "bad"; title: string; children: React.ReactNode; action: React.ReactNode }>) {
  const iconos = { info: "card", warn: "alert", bad: "x" } as const;
  const icon = iconos[tone];
  return <article className={`owner-notice owner-notice--${tone}`}><span className="owner-notice__icon"><Icon name={icon} /></span><div><strong>{title}</strong><p>{children}</p></div><div className="owner-notice__action">{action}</div></article>;
}

function Dialog({ title, children, onClose }: Readonly<{ title: string; children: React.ReactNode; onClose: () => void }>) {
  return <dialog open className="owner-dialog" aria-modal="true" aria-labelledby="dialog-title"><button type="button" aria-label="Cerrar" className="owner-dialog__backdrop" onClick={onClose} /><section className="owner-dialog__panel"><div className="owner-dialog__head"><h2 id="dialog-title">{title}</h2><button type="button" className="owner-icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="x" /></button></div>{children}</section></dialog>;
}

type TenantDetailProps = Readonly<{
  selectedId: string;
  tenants: readonly TenantRow[] | null;
  hasError: boolean;
  paymentLink: "copiado" | "error" | "pidiendo" | null;
  onBack: () => void;
  onEdit: (tenant: TenantRow) => void;
  onArchive: (tenant: TenantRow) => void;
  onCreateContract: () => void;
  onOpenContract: (contractId: number) => void;
  onCopyPaymentLink: (contractId: number) => void;
}>;

function TenantDetail({
  selectedId,
  tenants,
  hasError,
  paymentLink,
  onBack,
  onEdit,
  onArchive,
  onCreateContract,
  onOpenContract,
  onCopyPaymentLink,
}: TenantDetailProps) {
  const tenant = tenants?.find((item) => String(item.id) === selectedId);
  const breadcrumb = <nav className="owner-crumb"><button type="button" onClick={onBack}>Inquilinos</button><span>/</span><span>{tenant?.nombre ?? "…"}</span></nav>;

  if (!tenant) {
    return <>{breadcrumb}<div className="owner-card"><p className="owner-list-note">{hasError ? "No pudimos cargar este inquilino." : "Cargando…"}</p></div></>;
  }

  const description = [tenant.cuit, tenant.email, tenant.telefono].filter(Boolean).join(" · ");
  const headerAction = <>
    <Button tone="secondary" onClick={() => onEdit(tenant)}><Icon name="edit" size={18} />Editar datos</Button>
    <Button tone="danger" onClick={() => onArchive(tenant)}><Icon name="archive" size={18} />Archivar</Button>
  </>;

  return <>
    {breadcrumb}
    <header className="owner-page-head"><div><h1>{tenant.nombre}</h1><p>{description}</p></div><div className="owner-page-head__action">{headerAction}</div></header>
    <section className="owner-detail-grid">
      <div className="owner-card">
        <h2>Contrato vigente</h2>
        {tenant.contratoId === null ? (
          <div className="owner-empty-callout">
            <Icon name="file" />
            <div><b>Todavía no tiene un contrato</b><small>Cuando le alquile una propiedad, cree el contrato para empezar a cobrarle.</small></div>
            <Button small onClick={onCreateContract}>Crear contrato</Button>
          </div>
        ) : (
          <button type="button" className="owner-contract-callout" onClick={() => onOpenContract(tenant.contratoId!)}>
            <span><Icon name="file" /></span>
            <div><b>{tenant.direccion}</b><small>{tenant.alquiler} por mes · {tenant.estado}</small></div>
            <Icon name="arrow" />
          </button>
        )}
      </div>
      {tenant.contratoId !== null && (
        <div className="owner-card">
          <h2>Acceso de pago</h2>
          <p className="owner-card__copy">El inquilino no necesita una cuenta. Comparte un enlace seguro para ver cuotas habilitadas y subir su comprobante.</p>
          <div className="owner-link-box">
            <div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>Se lo puede compartir por donde quiera.</small></span></div>
            <Button tone="secondary" small disabled={paymentLink === "pidiendo"} onClick={() => onCopyPaymentLink(tenant.contratoId!)}>
              <Icon name="copy" size={16} />{paymentLink === "copiado" ? "Copiado" : "Copiar enlace"}
            </Button>
          </div>
          {paymentLink === "error" && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />No pudimos obtener el enlace. Inténtelo de nuevo.</p>}
        </div>
      )}
    </section>
  </>;
}

type TenantListRowProps = Readonly<{
  tenant: TenantRow;
  onOpenTenant: (tenantId: number) => void;
  onCreateContract: () => void;
}>;

function TenantListRow({ tenant, onOpenTenant, onCreateContract }: TenantListRowProps) {
  if (tenant.contratoId === null) {
    return <div className="owner-row owner-row--linked">
      <span className="owner-row__icon"><Icon name="users" /></span>
      <span className="owner-row__body">
        <b><button type="button" className="owner-row__link" onClick={() => onOpenTenant(tenant.id)}>{tenant.nombre}</button></b>
        <small>{tenant.cuit} · {tenant.email}</small>
      </span>
      <span className="owner-row__amount"><Button tone="secondary" small onClick={onCreateContract}>Crear contrato</Button></span>
      <Status>{tenant.estado}</Status>
      <span className="owner-row__arrow"><Icon name="arrow" /></span>
    </div>;
  }

  return <button type="button" className="owner-row owner-row--button" onClick={() => onOpenTenant(tenant.id)}>
    <span className="owner-row__icon"><Icon name="users" /></span>
    <span className="owner-row__body">
      <b>{tenant.nombre}</b>
      <small>{tenant.cuit} · {tenant.email} · {tenant.direccion}</small>
    </span>
    <span className="owner-row__amount"><b>{tenant.alquiler}</b><small>por mes</small></span>
    <Status>{tenant.estado}</Status>
    <span className="owner-row__arrow"><Icon name="arrow" /></span>
  </button>;
}

type TenantsViewProps = Readonly<{
  tenants: TenantRow[] | null;
  hasError: boolean;
  onCreateTenant: () => void;
  onCreateContract: () => void;
  onOpenTenant: (tenantId: number) => void;
}>;

function TenantsView({ tenants, hasError, onCreateTenant, onCreateContract, onOpenTenant }: TenantsViewProps) {
  const description = tenants ? resumenInquilinos(tenants) : "";
  return <>
    <header className="owner-page-head"><div><h1>Inquilinos</h1><p>{description}</p></div><div className="owner-page-head__action"><Button onClick={onCreateTenant}><Icon name="plus" size={18} />Agregar inquilino</Button></div></header>
    <div className="owner-list">
      {hasError && <p className="owner-list-note" role="alert"><b>No pudimos cargar sus inquilinos</b>Inténtelo de nuevo más tarde.</p>}
      {!hasError && tenants === null && <p className="owner-list-note">Cargando…</p>}
      {!hasError && tenants?.length === 0 && <p className="owner-list-note"><b>Todavía no cargó ningún inquilino</b>Use «Agregar inquilino» para cargar el primero.</p>}
      {tenants?.map((tenant) => <TenantListRow key={tenant.id} tenant={tenant} onOpenTenant={onOpenTenant} onCreateContract={onCreateContract} />)}
    </div>
  </>;
}

type ContractsViewProps = Readonly<{
  contracts: FilaContrato[] | null;
  hasError: boolean;
  filter: FiltroContrato;
  onFilterChange: (filter: FiltroContrato) => void;
  onCreateContract: () => void;
  onOpenContract: (contract: FilaContrato) => void;
}>;

function ContractsView({
  contracts,
  hasError,
  filter,
  onFilterChange,
  onCreateContract,
  onOpenContract,
}: ContractsViewProps) {
  const visibleContracts = contracts ? filtrarContratos(contracts, filter) : [];
  const counts = contracts ? contarContratos(contracts) : { vigentes: 0, porTerminar: 0, programados: 0, finalizados: 0 };
  const filters: [FiltroContrato, string][] = [
    ["vigentes", "Vigentes"],
    ["porTerminar", "Por terminar"],
    ...(counts.programados > 0 ? [["programados", "Programados"] as [FiltroContrato, string]] : []),
    ["finalizados", "Finalizados"],
  ];

  return <>
    <header className="owner-page-head"><div><h1>Contratos</h1><p>{contracts ? resumenContratos(contracts) : "Sus contratos y sus condiciones."}</p></div><div className="owner-page-head__action"><Button onClick={onCreateContract}><Icon name="plus" size={18} />Nuevo contrato</Button></div></header>
    {hasError && <p className="owner-list-note" role="alert"><b>No pudimos cargar sus contratos</b>Inténtelo de nuevo más tarde.</p>}
    {!hasError && contracts === null && <p className="owner-list-note">Cargando…</p>}
    {contracts?.length === 0 && <p className="owner-list-note"><b>Todavía no tiene contratos</b>Use «Nuevo contrato» para vincular una propiedad con su inquilino.</p>}
    {contracts && contracts.length > 0 && <>
      <section className="owner-filter" aria-label="Estado del contrato">
        {filters.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => onFilterChange(key)}>{label} <b>{counts[key]}</b></button>)}
      </section>
      {visibleContracts.length === 0 ? <div className="owner-empty"><b>No hay contratos en este estado</b><span>Pruebe con otro filtro.</span></div> : <div className="owner-list">
        {visibleContracts.map((contract) => <button type="button" className="owner-row owner-row--button" key={contract.id} onClick={() => onOpenContract(contract)}>
          <span className="owner-row__icon"><Icon name="file" /></span>
          <span className="owner-row__body"><b>{contract.direccion}</b><small>{contract.inquilino} · {contract.actualizacion} · termina {contract.fin}</small></span>
          <span className="owner-row__amount"><b>{contract.alquiler}</b><small>por mes</small></span>
          <Status>{contract.estado}</Status>
          <span className="owner-row__arrow"><Icon name="arrow" /></span>
        </button>)}
      </div>}
    </>}
  </>;
}

type CollectionActionProps = Readonly<{
  item: FilaCobranza;
  isBusy: boolean;
  canAdjust: boolean;
  onReview: (item: FilaCobranza) => void;
  onConfirm: (invoiceId: number) => void;
  onAdjust: (item: FilaCobranza) => void;
  onViewReceipt: (paymentId: number) => void;
  onRegisterPayment: (item: FilaCobranza) => void;
}>;

function CollectionAction({
  item,
  isBusy,
  canAdjust,
  onReview,
  onConfirm,
  onAdjust,
  onViewReceipt,
  onRegisterPayment,
}: CollectionActionProps) {
  if (item.accion === "revisar") return <Button tone="secondary" small onClick={() => onReview(item)}>Revisar pago</Button>;
  if (item.accion === "confirmar") {
    return <>
      <Button tone="secondary" small disabled={isBusy} onClick={() => onConfirm(item.invoiceId)}>Confirmar cuota</Button>
      <Button tone="quiet" small disabled={isBusy || !canAdjust} onClick={() => onAdjust(item)}>Ajustar importe</Button>
    </>;
  }
  if (item.accion === "comprobante") {
    return <Button tone="secondary" small disabled={!item.pagoConfirmado} onClick={() => {
      if (item.pagoConfirmado) onViewReceipt(item.pagoConfirmado.id);
    }}><Icon name="download" size={16} />Comprobante</Button>;
  }
  return <Button tone="secondary" small onClick={() => onRegisterPayment(item)}>Registrar pago</Button>;
}

type CollectionsViewProps = Readonly<{
  collections: FilaCobranza[] | null;
  hasError: boolean;
  filter: FiltroCobranza;
  onFilterChange: (filter: FiltroCobranza) => void;
  actionError: string | null;
  hasOpenAction: boolean;
  isBusy: boolean;
  canAdjust: boolean;
  onReview: (item: FilaCobranza) => void;
  onConfirm: (invoiceId: number) => void;
  onAdjust: (item: FilaCobranza) => void;
  onViewReceipt: (paymentId: number) => void;
  onRegisterPayment: (item: FilaCobranza) => void;
}>;

function CollectionsView({
  collections,
  hasError,
  filter,
  onFilterChange,
  actionError,
  hasOpenAction,
  isBusy,
  canAdjust,
  onReview,
  onConfirm,
  onAdjust,
  onViewReceipt,
  onRegisterPayment,
}: CollectionsViewProps) {
  const visibleCollections = collections ? filtrar(collections, filter) : [];
  const counts = collections ? contarPorFiltro(collections) : { todas: 0, vencidas: 0, aVencer: 0, pagadas: 0 };
  const filters: [FiltroCobranza, string][] = [["todas", "Todas"], ["vencidas", "Vencidas"], ["aVencer", "A vencer"], ["pagadas", "Pagadas"]];

  return <>
    <header className="owner-page-head"><div><h1>Cobranzas</h1><p>{collections ? resumenCobranzas(collections) : "Cuotas, pagos y vencimientos."}</p></div></header>
    {hasError && <p className="owner-list-note" role="alert"><b>No pudimos cargar sus cobranzas</b>Inténtelo de nuevo más tarde.</p>}
    {!hasError && collections === null && <p className="owner-list-note">Cargando…</p>}
    {actionError && !hasOpenAction && <p className="owner-list-note" role="alert">{actionError}</p>}
    {collections?.length === 0 && <p className="owner-list-note"><b>Todavía no hay cuotas</b>Se generan solas a partir de sus contratos activos.</p>}
    {collections && collections.length > 0 && <>
      <section className="owner-filter" aria-label="Estado de la cuota">
        {filters.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => onFilterChange(key)}>{label} <b>{counts[key]}</b></button>)}
      </section>
      {visibleCollections.length === 0 ? <div className="owner-empty"><b>No hay cuotas en este estado</b><span>Pruebe con otro filtro.</span></div> : <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th data-cell="propiedad">Propiedad</th><th data-cell="monto" className="owner-number">Monto</th><th data-cell="vencimiento">Vencimiento</th><th data-cell="estado">Estado</th><th data-cell="accion">Acción</th></tr></thead><tbody>
        {visibleCollections.map((item) => <tr key={item.invoiceId}><td data-cell="propiedad"><b>{item.direccion}</b><small>{item.inquilino} · {item.periodo}</small></td><td data-cell="monto" className="owner-number owner-money">{item.monto}</td><td data-cell="vencimiento">{item.vencimiento}</td><td data-cell="estado"><Status>{item.estado}</Status>{!item.confirmada && <small className="owner-substatus">Sin confirmar</small>}</td><td data-cell="accion"><CollectionAction item={item} isBusy={isBusy} canAdjust={canAdjust} onReview={onReview} onConfirm={onConfirm} onAdjust={onAdjust} onViewReceipt={onViewReceipt} onRegisterPayment={onRegisterPayment} /></td></tr>)}
      </tbody></table></div>}
    </>}
  </>;
}

type OverviewData = Readonly<{
  cobranza: ResumenCobranza;
  cartera: ResumenCartera;
  avisos: Aviso[];
  contratos: ContractResponse[];
}>;

type OverviewProps = Readonly<{
  greeting: string;
  subtitle: string;
  currentMonth: string;
  nextMonth: string;
  data: OverviewData | null;
  hasError: boolean;
  projection: Proyeccion | "error" | null;
  onCreateProperty: () => void;
  onCreateContract: () => void;
  onOpenCollections: () => void;
}>;

function ProjectedSummary({ projection, nextMonth }: Readonly<{ projection: Proyeccion | "error" | null; nextMonth: string }>) {
  if (projection === "error") return null;

  if (projection === null) {
    return <div><p className="owner-eyebrow">PROYECTADO · {nextMonth.toUpperCase()}</p><small>Calculando…</small></div>;
  }

  if (projection.total === null) {
    const subject = projection.aDefinir === 1 ? "el contrato depende" : "los contratos dependen";
    return <div><p className="owner-eyebrow">PROYECTADO · {nextMonth.toUpperCase()}</p><small>Todavía no se puede proyectar: {subject} de un índice sin publicar.</small></div>;
  }

  if (projection.aDefinir === 0) {
    return <div><p className="owner-eyebrow">PROYECTADO · {nextMonth.toUpperCase()}</p><b>{formatearMonto(projection.total)}</b><small>Todos los contratos ya están definidos</small></div>;
  }

  const contractLabel = projection.aDefinir === 1 ? "contrato" : "contratos";
  return <div><p className="owner-eyebrow">PROYECTADO · {nextMonth.toUpperCase()}</p><b>{formatearMonto(projection.total)}</b><small>más {projection.aDefinir} {contractLabel} a definir según el índice</small></div>;
}

function Overview({
  greeting,
  subtitle,
  currentMonth,
  nextMonth,
  data,
  hasError,
  projection,
  onCreateProperty,
  onCreateContract,
  onOpenCollections,
}: OverviewProps) {
  const actions = <>
    <Button tone="secondary" onClick={onCreateProperty}><Icon name="plus" size={18} />Agregar propiedad</Button>
    <Button onClick={onCreateContract}><Icon name="file" size={18} />Nuevo contrato</Button>
  </>;
  const header = <header className="owner-page-head"><div><h1>{greeting}</h1><p>{subtitle}</p></div><div className="owner-page-head__action">{actions}</div></header>;

  if (hasError) return <>{header}<p className="owner-list-note" role="alert"><b>No pudimos cargar su panel</b>Inténtelo de nuevo más tarde.</p></>;
  if (data === null) return <>{header}<p className="owner-list-note">Cargando…</p></>;

  const { cobranza, cartera, avisos, contratos } = data;
  const percent = proporciones(cobranza);
  const cuotasCobradasLabel = cobranza.cuotas === 1 ? "cuota cobrada" : "cuotas cobradas";
  return <>
    {header}
    <section className="owner-portfolio" aria-label="Resumen de cobranzas">
      <div className="owner-portfolio__money">
        <p className="owner-eyebrow">COBRANZA DE {currentMonth.toUpperCase()}</p>
        {cobranza.cuotas === 0 ? <p className="owner-portfolio__empty">Todavía no hay cuotas emitidas este mes.</p> : <>
          <strong>{formatearMonto(cobranza.cobrado)}</strong>
          <p>de {formatearMonto(cobranza.emitido)} emitidos este mes · {cobranza.cobradas} de {cobranza.cuotas} {cuotasCobradasLabel}</p>
          <div className="owner-meter" aria-label={`${percent.cobrado}% cobrado, ${percent.aVencer}% por vencer y ${percent.vencido}% vencido`}><i className="owner-meter__ok" style={{ flexGrow: cobranza.cobrado }} /><i className="owner-meter__warn" style={{ flexGrow: cobranza.aVencer }} /><i className="owner-meter__bad" style={{ flexGrow: cobranza.vencido }} /></div>
          <div className="owner-key"><span><Icon name="check" />Cobrado <b>{formatearMonto(cobranza.cobrado)}</b></span><span><Icon name="clock" />A vencer <b>{formatearMonto(cobranza.aVencer)}</b></span><span><Icon name="x" />Vencido <b>{formatearMonto(cobranza.vencido)}</b></span></div>
        </>}
      </div>
      <div className="owner-portfolio__summary">
        <div><p className="owner-eyebrow">PROPIEDADES</p><b>{cartera.total}</b><small>{cartera.total === 0 ? "Todavía no cargó ninguna" : `${cartera.conContrato} con contrato activo · ${cartera.sinAlquilar} sin alquilar`}</small></div>
        <ProjectedSummary projection={projection} nextMonth={nextMonth} />
      </div>
    </section>
    <section className="owner-section"><div className="owner-section__head"><h2>Requieren su acción</h2>{avisos.length > 0 && <Button tone="secondary" small onClick={onOpenCollections}>Ir a cobranzas</Button>}</div>{avisos.length === 0 ? <p className="owner-list-note">Nada pendiente por ahora. Sus cuotas están al día.</p> : <div className="owner-notices">{avisos.map((notice) => <Notice key={notice.id} tone={notice.tono} title={notice.titulo} action={<Button tone="secondary" small onClick={onOpenCollections}>{notice.accion}</Button>}>{notice.cuerpo}</Notice>)}</div>}</section>
    <section className="owner-section"><div className="owner-section__head"><h2>Contratos activos</h2><Button tone="secondary" small onClick={onCreateContract}><Icon name="plus" size={17} />Nuevo contrato</Button></div>{contratos.length === 0 ? <p className="owner-list-note"><b>Todavía no tiene contratos vigentes</b>Un contrato vincula una propiedad con un inquilino y define el alquiler.</p> : <div className="owner-list">{contratos.map((contract) => <div className="owner-row" key={contract.id}><span className="owner-row__icon"><Icon name="building" /></span><span className="owner-row__body"><b>{formatearDireccion(contract.property)}</b><small>{contract.tenant.firstName} {contract.tenant.lastName} · termina el {formatearFecha(contract.endDate)}</small></span><span className="owner-row__amount"><b>{formatearMonto(contract.currentRent)}</b><small>por mes</small></span></div>)}</div>}</section>
  </>;
}

type PropertyDetailProps = Readonly<{
  demo: boolean;
  demoProperty: (typeof properties)[number];
  selectedId: string;
  properties: FilaPropiedad[] | null;
  rawProperties: PropertyResponse[];
  hasError: boolean;
  contractStatusIsUnknown: boolean;
  onBack: () => void;
  onCreateContract: () => void;
  onOpenDemoContract: (contractId: string) => void;
  onArchive: (property: FilaPropiedad) => void;
}>;

function PropertyBreadcrumb({ name, onBack }: Readonly<{ name: string; onBack: () => void }>) {
  return <nav className="owner-crumb"><button type="button" onClick={onBack}>Propiedades</button><span>/</span><span>{name}</span></nav>;
}

function DemoPropertyDetail({ demoProperty, onBack, onCreateContract, onOpenDemoContract }: Readonly<{
  demoProperty: (typeof properties)[number];
  onBack: () => void;
  onCreateContract: () => void;
  onOpenDemoContract: (contractId: string) => void;
}>) {
  const headerActions = <><Button tone="secondary"><Icon name="edit" size={18} />Editar</Button><Button tone="danger"><Icon name="archive" size={18} />Archivar</Button></>;
  const rent = demoProperty.tenant ? <div className="owner-current-rent"><p className="owner-eyebrow">ALQUILER ACTUAL</p><b>{demoProperty.rent}</b><small>por mes</small></div> : null;
  const contractCard = demoProperty.tenant
    ? <button type="button" className="owner-contract-callout" onClick={() => onOpenDemoContract(demoProperty.id)}><span><Icon name="file" /></span><div><b>Contrato con {demoProperty.tenant}</b><small>Ver condiciones, documento y próximas cuotas</small></div><Icon name="arrow" /></button>
    : <div className="owner-empty-callout"><Icon name="building" /><div><b>Esta propiedad está disponible</b><small>Cuando tenga un inquilino, cree un contrato para empezar a cobrarla.</small></div><Button small onClick={onCreateContract}>Crear contrato</Button></div>;
  return <><PropertyBreadcrumb name={demoProperty.address} onBack={onBack} /><header className="owner-page-head"><div><h1>{demoProperty.address}</h1><p>{demoProperty.type} · {demoProperty.city}</p></div><div className="owner-page-head__action">{headerActions}</div></header><section className="owner-detail-grid"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ESTADO ACTUAL</p><Status>{demoProperty.state}</Status></div>{rent}</div>{contractCard}</div><div className="owner-card"><h2>Características</h2><dl className="owner-definition"><div><dt>Dirección</dt><dd>{demoProperty.address}, {demoProperty.city}</dd></div><div><dt>Tipo</dt><dd>{demoProperty.type}</dd></div><div><dt>Detalles</dt><dd>{demoProperty.detail}</dd></div></dl></div></section></>;
}

function PropertyStatusCard({ property, contractStatusIsUnknown, contractTitle, onCreateContract }: Readonly<{ property: FilaPropiedad; contractStatusIsUnknown: boolean; contractTitle: string; onCreateContract: () => void }>) {
  const status = contractStatusIsUnknown ? null : <Status>{property.estado}</Status>;
  const rent = property.alquiler ? <div className="owner-current-rent"><p className="owner-eyebrow">ALQUILER ACTUAL</p><b>{property.alquiler}</b><small>por mes</small></div> : null;
  const contractCard = property.contratoId !== null
    ? <div className="owner-contract-callout"><span><Icon name="file" /></span><div><b>{contractTitle}</b><small>Ver condiciones, documento y próximas cuotas</small></div></div>
    : <div className="owner-empty-callout"><Icon name="building" /><div><b>Esta propiedad está disponible</b><small>Cuando tenga un inquilino, cree un contrato para empezar a cobrarla.</small></div><Button small onClick={onCreateContract}>Crear contrato</Button></div>;
  return <div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ESTADO ACTUAL</p>{status}</div>{rent}</div>{contractCard}</div>;
}

function PropertyCharacteristicsCard({ address, category, details, preferences }: Readonly<{ address: string; category: string; details: string; preferences: string }>) {
  const detailRow = details ? <div><dt>Detalles</dt><dd>{details}</dd></div> : null;
  const preferencesRow = preferences ? <div><dt>Preferencias</dt><dd>{preferences}</dd></div> : null;
  return <div className="owner-card"><h2>Características</h2><dl className="owner-definition"><div><dt>Dirección</dt><dd>{address}</dd></div><div><dt>Tipo</dt><dd>{category}</dd></div>{detailRow}{preferencesRow}</dl></div>;
}

function propertyCharacteristics(rawProperty: PropertyResponse) {
  const details = [
    rawProperty.bedrooms !== undefined && rawProperty.bedrooms !== null && `${rawProperty.bedrooms} dormitorio${rawProperty.bedrooms === 1 ? "" : "s"}`,
    rawProperty.bathrooms !== undefined && rawProperty.bathrooms !== null && `${rawProperty.bathrooms} baño${rawProperty.bathrooms === 1 ? "" : "s"}`,
    rawProperty.coveredArea && `${rawProperty.coveredArea} m²`,
  ].filter(Boolean).join(" · ");
  const preferences = [rawProperty.petsAllowed === true && "Acepta mascotas", rawProperty.furnished === true && "Amoblada"].filter(Boolean).join(" · ");
  return { details, preferences };
}

function PropertyDetail({
  demo,
  demoProperty,
  selectedId,
  properties,
  rawProperties,
  hasError,
  contractStatusIsUnknown,
  onBack,
  onCreateContract,
  onOpenDemoContract,
  onArchive,
}: PropertyDetailProps) {
  if (demo) {
    return <DemoPropertyDetail demoProperty={demoProperty} onBack={onBack} onCreateContract={onCreateContract} onOpenDemoContract={onOpenDemoContract} />;
  }

  const rawProperty = rawProperties.find((property) => String(property.id) === selectedId);
  const property = properties?.find((item) => String(item.id) === selectedId);
  if (!rawProperty || !property) {
    const message = hasError ? "No pudimos cargar esta propiedad." : "Cargando…";
    return <><PropertyBreadcrumb name="…" onBack={onBack} /><div className="owner-card"><p className="owner-list-note">{message}</p></div></>;
  }

  const { details, preferences } = propertyCharacteristics(rawProperty);
  const address = [property.direccion, rawProperty.city, rawProperty.postalCode, rawProperty.province].filter(Boolean).join(", ");
  const contractTitle = rawProperty.tenant
    ? `Contrato con ${rawProperty.tenant.firstName} ${rawProperty.tenant.lastName}`
    : "Contrato vigente";
  const headerActions = <><Button tone="secondary"><Icon name="edit" size={18} />Editar</Button><Button tone="danger" onClick={() => onArchive(property)}><Icon name="archive" size={18} />Archivar</Button></>;
  const category = etiquetaCategoria(rawProperty.category);

  return <>
    <PropertyBreadcrumb name={property.direccion} onBack={onBack} />
    <header className="owner-page-head"><div><h1>{property.direccion}</h1><p>{category} · {rawProperty.city}</p></div><div className="owner-page-head__action">{headerActions}</div></header>
    <section className="owner-detail-grid">
      <PropertyStatusCard property={property} contractStatusIsUnknown={contractStatusIsUnknown} contractTitle={contractTitle} onCreateContract={onCreateContract} />
      <PropertyCharacteristicsCard address={address} category={category} details={details} preferences={preferences} />
    </section>
  </>;
}

type AccountSummary = Readonly<{
  firstName: string;
  lastName: string;
  email: string;
  taxId?: string;
  phoneNumber?: string;
}>;

type SettingsViewProps = Readonly<{
  reminderSettings: ReminderSettingsResponse | null;
  hasReminderError: boolean;
  savedNotice: string | null;
  account: AccountSummary | null;
  canEditAccount: boolean;
  onEditReminders: (settings: ReminderSettingsResponse) => void;
  onEditAccount: () => void;
}>;

function SettingsView({
  reminderSettings,
  hasReminderError,
  savedNotice,
  account,
  canEditAccount,
  onEditReminders,
  onEditAccount,
}: SettingsViewProps) {
  let reminders: React.ReactNode;
  if (hasReminderError) {
    reminders = <p className="owner-list-note" role="alert"><b>No pudimos cargar los recordatorios</b>Inténtelo de nuevo más tarde.</p>;
  } else if (reminderSettings === null) {
    reminders = <p className="owner-list-note">Cargando…</p>;
  } else {
    reminders = <>
      <p className="owner-card__copy">{resumenRecordatorios(reminderSettings)}</p>
      <dl className="owner-definition">{describirRecordatorios(reminderSettings).map((line) => <div key={line.etiqueta}><dt>{line.etiqueta}</dt><dd>{line.valor}</dd></div>)}</dl>
      <p className="owner-card__copy">Además, al inquilino se le avisa cuando usted confirma una cuota y ya la puede pagar.</p>
      <Button tone="secondary" small onClick={() => onEditReminders(reminderSettings)}>Editar recordatorios</Button>
    </>;
  }

  return <>
    <header className="owner-page-head"><div><h1>Configuración</h1><p>Preferencias de su cuenta y recordatorios.</p></div></header>
    {savedNotice && <output className="owner-list-note">{savedNotice}</output>}
    <section className="owner-detail-grid owner-detail-grid--even">
      <div className="owner-card"><h2>Recordatorios de pago</h2>{reminders}</div>
      <div className="owner-card"><h2>Cuenta</h2><dl className="owner-definition"><div><dt>Nombre</dt><dd>{account ? `${account.firstName} ${account.lastName}` : "—"}</dd></div><div><dt>Correo</dt><dd>{account?.email ?? "—"}</dd></div>{account?.taxId && <div><dt>CUIT</dt><dd>{formatearCuit(account.taxId)}</dd></div>}{account?.phoneNumber && <div><dt>Teléfono</dt><dd>{account.phoneNumber}</dd></div>}</dl><Button tone="secondary" small disabled={!canEditAccount} onClick={onEditAccount}>Editar datos</Button></div>
    </section>
  </>;
}

type PropertiesViewProps = Readonly<{
  propiedades: FilaPropiedad[] | null;
  propiedadesError: boolean;
  sinDatoDeContrato: boolean;
  query: string;
  ciudades: string[];
  dorms: string[];
  extras: string[];
  estado: "todas" | "conContrato" | "sinAlquilar";
  panelAbierto: boolean;
  setQuery: (value: string) => void;
  setCiudades: (value: string[]) => void;
  setDorms: (value: string[]) => void;
  setExtras: (value: string[]) => void;
  setEstado: (value: "todas" | "conContrato" | "sinAlquilar") => void;
  onPanelOpenChange: (isOpen: boolean) => void;
  onCreateProperty: () => void;
  onOpenProperty: (propertyId: string) => void;
}>;

function PropertiesView({
  propiedades,
  propiedadesError,
  sinDatoDeContrato,
  query,
  ciudades,
  dorms,
  extras,
  estado,
  panelAbierto,
  setQuery,
  setCiudades,
  setDorms,
  setExtras,
  setEstado,
  onPanelOpenChange,
  onCreateProperty,
  onOpenProperty,
}: PropertiesViewProps) {
  const pageHeader = (title: string, description: string, action?: React.ReactNode) => <header className="owner-page-head"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="owner-page-head__action">{action}</div>}</header>;
  const beginCreation = () => onCreateProperty();
  const openDetail = (_kind: Detail, propertyId: string) => onOpenProperty(propertyId);
  const setPanelAbierto = (next: boolean | ((isOpen: boolean) => boolean)) => {
    onPanelOpenChange(typeof next === "function" ? next(panelAbierto) : next);
  };
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
    const etiquetaDorm = (d: string) => {
      if (d === "4+") return "4+ dormitorios";
      if (d === "1") return "1 dormitorio";
      return `${d} dormitorios`;
    };

    const chipsAplicados = [
      ...ciudades.map((c) => ({ k: `c-${c}`, texto: c, quitar: () => alterna(ciudades, setCiudades, c) })),
      ...dorms.map((d) => ({ k: `d-${d}`, texto: etiquetaDorm(d), quitar: () => alterna(dorms, setDorms, d) })),
      ...extras.map((e) => ({ k: `e-${e}`, texto: etiquetaExtra[e], quitar: () => alterna(extras, setExtras, e) })),
    ];
    const limpiar = () => { setCiudades([]); setDorms([]); setExtras([]); setQuery(""); setEstado("todas"); };

    const accion = <Button onClick={beginCreation}><Icon name="plus" size={18} />Agregar propiedad</Button>;

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
                <dialog open className="owner-panel" aria-label="Filtros">
                  <div className="owner-panel__head">
                    <b>Filtros</b>
                    <button type="button" className="owner-panel__close" onClick={() => setPanelAbierto(false)} aria-label="Cerrar">
                      <Icon name="x" size={18} />
                    </button>
                  </div>
                  <div className="owner-panel__body">
                    <p className="owner-panel__label" id="f-ciudad">Ciudad</p>
                    <section className="owner-chips" aria-labelledby="f-ciudad">
                      {ciudadesDisponibles.map((c) => (
                        <button key={c} type="button" className="owner-chip" aria-pressed={ciudades.includes(c)}
                          onClick={() => alterna(ciudades, setCiudades, c)}>{c}</button>
                      ))}
                    </section>
                    <p className="owner-panel__label" id="f-dorm">Dormitorios</p>
                    <section className="owner-chips" aria-labelledby="f-dorm">
                      {["1", "2", "3", "4+"].map((d) => (
                        <button key={d} type="button" className="owner-chip" aria-pressed={dorms.includes(d)}
                          onClick={() => alterna(dorms, setDorms, d)}>{d}</button>
                      ))}
                    </section>
                    <p className="owner-panel__label" id="f-extra">Características</p>
                    <section className="owner-chips" aria-labelledby="f-extra">
                      {Object.entries(etiquetaExtra).map(([k, v]) => (
                        <button key={k} type="button" className="owner-chip" aria-pressed={extras.includes(k)}
                          onClick={() => alterna(extras, setExtras, k)}>{v}</button>
                      ))}
                    </section>
                  </div>
                  <div className="owner-panel__foot">
                    <Button tone="quiet" small onClick={() => { setCiudades([]); setDorms([]); setExtras([]); }}>Limpiar</Button>
                    <Button small onClick={() => setPanelAbierto(false)}>Ver {visibles.length} propiedades</Button>
                  </div>
                </dialog>
              </>
            )}
          </div>
        </div>

        {/* Sin el contrato en la respuesta, «Con contrato» y «Sin alquilar»
            contarían todo como libre. El filtro se omite entero, igual que los
            chips: es el mismo dato faltante. */}
        {!sinDatoDeContrato && (
          <section className="owner-filter" aria-label="Estado de la propiedad">
            {([["todas", "Todas"], ["conContrato", "Con contrato"], ["sinAlquilar", "Sin alquilar"]] as const).map(([k, txt]) => (
              <button key={k} type="button" aria-pressed={estado === k} onClick={() => setEstado(k)}>
                {txt} <b>{cuenta[k]}</b>
              </button>
            ))}
          </section>
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

        <output className="owner-result-count">{descripcionResultadosDePropiedades(visibles.length, filas.length)}</output>

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

type ContractLoad = { ok: ContractResponse } | { error: true } | null;

function ContractAdjustmentHistory({
  increments,
  lines,
  contract,
}: Readonly<{
  increments: RentIncrementResponse[] | "error" | null;
  lines: ReturnType<typeof historialDeAumentos>;
  contract: ContractResponse;
}>) {
  if (increments === "error") return null;
  if (increments === null) {
    return <div className="owner-card"><h2>Historial de aumentos</h2><p className="owner-list-note">Cargando…</p></div>;
  }
  if (lines.length === 0) {
    return <div className="owner-card"><h2>Historial de aumentos</h2><p className="owner-list-note">Todavía no se aplicó ningún aumento. {comoSeActualiza(contract)}.</p></div>;
  }
  return <div className="owner-card"><h2>Historial de aumentos</h2><dl className="owner-definition">{lines.map((line) => <div key={line.id}><dt>{line.fecha}</dt><dd>{line.resultado}{line.ventana ? ` · ${line.ventana}` : ""}</dd></div>)}</dl></div>;
}

type ContractDetailProps = Readonly<{
  demo: boolean;
  demoContract: (typeof contracts)[number];
  contractLoad: ContractLoad;
  increments: RentIncrementResponse[] | "error" | null;
  scheduledContract: ContractResponse | null;
  successorId: number | null;
  paymentLink: "copiado" | "error" | "pidiendo" | null;
  demoLinkCopied: boolean;
  errorMessage: string | null;
  isFinishing: boolean;
  onBack: () => void;
  onOpenContract: (contractId: number) => void;
  onOpenConditions: () => void;
  onBeginTermination: () => void;
  onCopyDemoLink: () => void;
  onCopyPaymentLink: (contractId: number) => void;
  onResendPaymentLink: (contractId: number) => void;
  onDownloadDocument: (contract: ContractResponse) => void;
  onRemoveDocument: (contractId: number) => void;
  onAttachDocument: (contractId: number, file: File) => void;
}>;

function ContractBreadcrumb({ name, onBack }: Readonly<{ name: string; onBack: () => void }>) {
  return <nav className="owner-crumb"><button type="button" onClick={onBack}>Contratos</button><span>/</span><span>{name}</span></nav>;
}

function DemoContractDetail({ demoContract, demoLinkCopied, onBack, onCopyDemoLink }: Readonly<{
  demoContract: ContractDetailProps["demoContract"];
  demoLinkCopied: boolean;
  onBack: () => void;
  onCopyDemoLink: () => void;
}>) {
  const document = demoContract.document
    ? <div className="owner-document"><span><Icon name="file" /></span><div><b>{demoContract.document}</b><small>PDF · 2,4 MB</small></div><Button tone="quiet" small><Icon name="download" size={16} />Descargar</Button></div>
    : <div className="owner-empty-callout"><Icon name="paperclip" /><div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div><Button small>Adjuntar</Button></div>;
  const linkLabel = demoLinkCopied ? "Copiado" : "Copiar enlace";
  return <><ContractBreadcrumb name={demoContract.property.address} onBack={onBack} /><header className="owner-page-head"><div><h1>{demoContract.property.address}</h1><p>Contrato con {demoContract.property.tenant} · vigente hasta el {demoContract.end}</p></div><div className="owner-page-head__action"><Button tone="danger">Finalizar contrato</Button></div></header><section className="owner-detail-grid"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ALQUILER ACTUAL</p><strong className="owner-detail-money">{demoContract.property.rent}</strong><small>por mes · vence el día 1</small></div><Status>{demoContract.property.state}</Status></div><div className="owner-timeline"><div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>01/03/2025</small></p></div><div><span><Icon name="trend" /></span><p><b>Próxima actualización</b><small>01/09/2026 · {demoContract.increment}</small></p></div><div><span><Icon name="calendar" /></span><p><b>Fin previsto</b><small>{demoContract.end}</small></p></div></div></div><div className="owner-card"><h2>Inquilino y acceso de pago</h2><div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>{demoContract.property.tenant}</b></div></div><div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace para comprobantes</b></span></div><Button tone="secondary" small onClick={onCopyDemoLink}><Icon name="copy" size={16} />{linkLabel}</Button></div></div><div className="owner-card"><h2>Documento firmado</h2>{document}</div></section></>;
}

function ContractHeaderActions({ isActive, scheduledContract, successorId, onOpenConditions, onBeginTermination }: Readonly<{ isActive: boolean; scheduledContract: ContractResponse | null; successorId: number | null; onOpenConditions: () => void; onBeginTermination: () => void }>) {
  if (!isActive) return null;
  const conditionsAction = !scheduledContract && successorId === null ? <Button tone="secondary" onClick={onOpenConditions}>Cambiar condiciones</Button> : null;
  return <div className="owner-page-head__action">{conditionsAction}<Button tone="danger" onClick={onBeginTermination}>Finalizar contrato</Button></div>;
}

function ContractSummaryCard({ contract, nextUpdate, scheduledContract, onOpenContract }: Readonly<{ contract: ContractResponse; nextUpdate: ReturnType<typeof proximaActualizacion>; scheduledContract: ContractResponse | null; onOpenContract: (contractId: number) => void }>) {
  const nextUpdateRow = nextUpdate ? <div><span><Icon name="trend" /></span><p><b>Próxima actualización</b><small>{nextUpdate.fecha} · {nextUpdate.importe ?? comoSeActualiza(contract)}</small></p></div> : null;
  const scheduledCallout = scheduledContract ? <div className="owner-empty-callout"><Icon name="calendar" /><div><b>Cambio programado desde {formatearPeriodo(scheduledContract.startDate)}</b><small>{[`Alquiler de ${formatearImporte(scheduledContract.initialRentAmount, scheduledContract.currency)}`, `vence el día ${scheduledContract.dueDay}`, describirActualizacion(scheduledContract).toLowerCase()].join(" · ")}. Hasta entonces rigen las condiciones actuales.</small></div></div> : null;
  const successorCallout = contract.status === "SUPERSEDED" && contract.successorContractId ? <button type="button" className="owner-contract-callout" onClick={() => onOpenContract(contract.successorContractId!)}><span><Icon name="file" /></span><div><b>Este contrato fue reemplazado</b><small>Un cambio de condiciones lo sucedió. Ver el contrato vigente.</small></div><Icon name="arrow" /></button> : null;
  const endLabel = contract.actualEndDate ? "Terminó el" : "Fin previsto";
  return <div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ALQUILER ACTUAL</p><strong className="owner-detail-money">{formatearImporte(contract.currentRent, contract.currency)}</strong><small>por mes · vence el día {contract.dueDay}</small></div><Status>{estadoDeContrato(contract, new Date().toISOString().slice(0, 10))}</Status></div><div className="owner-timeline"><div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>{formatearFecha(contract.startDate)}</small></p></div>{nextUpdateRow}<div><span><Icon name="calendar" /></span><p><b>{endLabel}</b><small>{formatearFecha(contract.actualEndDate ?? contract.endDate)}</small></p></div></div>{scheduledCallout}{successorCallout}</div>;
}

function ContractAccessCard({ contract, paymentLink, onCopyPaymentLink, onResendPaymentLink }: Readonly<{ contract: ContractResponse; paymentLink: "copiado" | "error" | "pidiendo" | null; onCopyPaymentLink: (contractId: number) => void; onResendPaymentLink: (contractId: number) => void }>) {
  const copyLabel = paymentLink === "copiado" ? "Copiado" : "Copiar enlace";
  const error = paymentLink === "error" ? <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />No pudimos obtener el enlace. Inténtelo de nuevo.</p> : null;
  return <div className="owner-card"><h2>Inquilino y acceso de pago</h2><div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>{contract.tenant.firstName} {contract.tenant.lastName}</b><small>{contract.tenant.email}</small></div></div><div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>El inquilino sube sus comprobantes desde ahí, sin cuenta.</small></span></div><Button tone="secondary" small disabled={paymentLink === "pidiendo"} onClick={() => onCopyPaymentLink(contract.id)}><Icon name="copy" size={16} />{copyLabel}</Button></div>{error}<Button tone="quiet" small onClick={() => onResendPaymentLink(contract.id)}>Reenviar por correo al inquilino</Button></div>;
}

function ContractDocumentCard({ contract, errorMessage, isFinishing, onDownloadDocument, onRemoveDocument, onAttachDocument }: Readonly<{ contract: ContractResponse; errorMessage: string | null; isFinishing: boolean; onDownloadDocument: (contract: ContractResponse) => void; onRemoveDocument: (contractId: number) => void; onAttachDocument: (contractId: number, file: File) => void }>) {
  const document = contract.documentFileName ? <div className="owner-document"><span><Icon name="file" /></span><div><b>{contract.documentFileName}</b><small>{descripcionDocumento(contract)}</small></div><Button tone="quiet" small onClick={() => onDownloadDocument(contract)}><Icon name="download" size={16} />Descargar</Button><Button tone="quiet" small onClick={() => onRemoveDocument(contract.id)}>Quitar</Button></div> : <div className="owner-empty-callout"><Icon name="paperclip" /><div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div><label className="owner-file-label"><input type="file" className="sr-only" aria-label="Adjuntar el documento firmado" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAttachDocument(contract.id, file); }} /><span className="owner-button owner-button--primary owner-button--small">Adjuntar</span></label></div>;
  const error = errorMessage && !isFinishing ? <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorMessage}</p> : null;
  return <div className="owner-card"><h2>Documento firmado</h2>{document}{error}</div>;
}

function ContractDetail({
  demo,
  demoContract,
  contractLoad,
  increments,
  scheduledContract,
  successorId,
  paymentLink,
  demoLinkCopied,
  errorMessage,
  isFinishing,
  onBack,
  onOpenContract,
  onOpenConditions,
  onBeginTermination,
  onCopyDemoLink,
  onCopyPaymentLink,
  onResendPaymentLink,
  onDownloadDocument,
  onRemoveDocument,
  onAttachDocument,
}: ContractDetailProps) {
  if (demo) {
    return <DemoContractDetail demoContract={demoContract} demoLinkCopied={demoLinkCopied} onBack={onBack} onCopyDemoLink={onCopyDemoLink} />;
  }

  if (contractLoad !== null && "error" in contractLoad) {
    return <><ContractBreadcrumb name="…" onBack={onBack} /><div className="owner-card"><p className="owner-list-note" role="alert"><b>No pudimos cargar este contrato</b>Inténtelo de nuevo más tarde.</p></div></>;
  }
  if (contractLoad === null) {
    return <><ContractBreadcrumb name="…" onBack={onBack} /><div className="owner-card"><p className="owner-list-note">Cargando…</p></div></>;
  }

  const contract = contractLoad.ok;
  const address = formatearDireccion(contract.property);
  const tenantName = `${contract.tenant.firstName} ${contract.tenant.lastName}`;
  const isActive = contract.status === "ACTIVE";
  const nextUpdate = proximaActualizacion(contract);
  const conditions = condicionesComerciales(contract);
  const adjustmentLines = increments === "error" || increments === null ? [] : historialDeAumentos(increments, contract.currency);

  return <>
    <ContractBreadcrumb name={address} onBack={onBack} />
    <header className="owner-page-head"><div><h1>{address}</h1><p>Contrato con {tenantName} · {vigenciaEnFechas(contract)}</p></div><ContractHeaderActions isActive={isActive} scheduledContract={scheduledContract} successorId={successorId} onOpenConditions={onOpenConditions} onBeginTermination={onBeginTermination} /></header>
    <section className="owner-detail-grid">
      <ContractSummaryCard contract={contract} nextUpdate={nextUpdate} scheduledContract={scheduledContract} onOpenContract={onOpenContract} />
      <ContractAccessCard contract={contract} paymentLink={paymentLink} onCopyPaymentLink={onCopyPaymentLink} onResendPaymentLink={onResendPaymentLink} />
      <ContractDocumentCard contract={contract} errorMessage={errorMessage} isFinishing={isFinishing} onDownloadDocument={onDownloadDocument} onRemoveDocument={onRemoveDocument} onAttachDocument={onAttachDocument} />
      {conditions.length > 0 && <div className="owner-card"><h2>Condiciones pactadas</h2><dl className="owner-definition">{conditions.map((condition) => <div key={condition.etiqueta}><dt>{condition.etiqueta}</dt><dd>{condition.valor}</dd></div>)}</dl></div>}
      <ContractAdjustmentHistory increments={increments} lines={adjustmentLines} contract={contract} />
    </section>
  </>;
}

type LoadFailure = { error: true };

function useLoadedResource<T>({
  enabled,
  refreshKey,
  load,
  setResult,
}: Readonly<{
  enabled: boolean;
  refreshKey: number;
  load: () => Promise<T>;
  setResult: React.Dispatch<React.SetStateAction<T | LoadFailure | null>>;
}>) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load().then((data) => {
      if (!cancelled) setResult(data);
    }).catch(() => {
      if (!cancelled) setResult({ error: true });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey, load, setResult]);
}

type ContractDetailLoad = { ok: ContractResponse } | LoadFailure | null;
type ScheduledContractLoad = { de: number; contrato: ContractResponse } | null;

function useContractDetailLoad({ enabled, selectedId, refreshKey, setContract, setIncrements }: Readonly<{
  enabled: boolean;
  selectedId: string;
  refreshKey: number;
  setContract: React.Dispatch<React.SetStateAction<ContractDetailLoad>>;
  setIncrements: React.Dispatch<React.SetStateAction<RentIncrementResponse[] | "error" | null>>;
}>) {
  useEffect(() => {
    if (!enabled) return;
    const contractId = Number(selectedId);
    if (!Number.isFinite(contractId)) return;
    let cancelled = false;
    AlquiaBackendClient.contracts.get(contractId).then((contract) => {
      if (!cancelled) setContract({ ok: contract });
    }).catch(() => {
      if (!cancelled) setContract({ error: true });
    });
    AlquiaBackendClient.contracts.rentIncrements(contractId).then((increments) => {
      if (!cancelled) setIncrements(increments);
    }).catch(() => {
      if (!cancelled) setIncrements("error");
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, selectedId, refreshKey, setContract, setIncrements]);
}

function useScheduledContractLoad({ successorId, refreshKey, setScheduled }: Readonly<{
  successorId: number | null;
  refreshKey: number;
  setScheduled: React.Dispatch<React.SetStateAction<ScheduledContractLoad>>;
}>) {
  useEffect(() => {
    if (successorId === null) return;
    let cancelled = false;
    AlquiaBackendClient.contracts.get(successorId).then((successor) => {
      if (!cancelled && successor.status === "SCHEDULED") setScheduled({ de: successorId, contrato: successor });
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [successorId, refreshKey, setScheduled]);
}

function useOverviewLoad({ enabled, setOverview, setProjection }: Readonly<{
  enabled: boolean;
  setOverview: React.Dispatch<React.SetStateAction<OverviewData | LoadFailure | null>>;
  setProjection: React.Dispatch<React.SetStateAction<Proyeccion | "error" | null>>;
}>) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);
    const contracts = AlquiaBackendClient.contracts.list();
    Promise.all([AlquiaBackendClient.invoices.list({ period: periodoCorriente(today) }), AlquiaBackendClient.properties.list(), contracts]).then(([invoices, properties, loadedContracts]) => {
      if (cancelled) return;
      setOverview({ cobranza: resumenDeCobranza(invoices), cartera: resumenDeCartera(properties), avisos: avisosPendientes(invoices, loadedContracts, today), contratos: contratosVigentes(loadedContracts) });
    }).catch(() => {
      if (!cancelled) setOverview({ error: true });
    });
    Promise.all([AlquiaBackendClient.preInvoices.list({ period: periodoSiguiente(today) }), contracts]).then(([preInvoices, loadedContracts]) => {
      if (!cancelled) setProjection(proyeccionDelMes(preInvoices, loadedContracts));
    }).catch(() => {
      if (!cancelled) setProjection("error");
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, setOverview, setProjection]);
}

async function loadTenantRows() {
  const [tenants, contracts, invoices] = await Promise.all([
    AlquiaBackendClient.tenants.list(),
    AlquiaBackendClient.contracts.list(),
    AlquiaBackendClient.invoices.list(),
  ]);
  return { ok: buildTenantRows(tenants, contracts, invoices) };
}

async function loadCollectionRows() {
  const [invoices, contracts] = await Promise.all([AlquiaBackendClient.invoices.list(), AlquiaBackendClient.contracts.list()]);
  return { ok: buildFilasCobranza(invoices, contracts) };
}

async function loadPropertiesWithInvoices() {
  const today = new Date().toISOString().slice(0, 10);
  const [properties, invoices] = await Promise.all([
    AlquiaBackendClient.properties.list(),
    AlquiaBackendClient.invoices.list({ periodFrom: desdeDeLaVentana(today) }),
  ]);
  return {
    ok: buildFilasPropiedad(properties, invoices),
    crudas: properties,
    sinContratos: backendNoInformaContratos(properties),
  };
}

async function loadContractRows() {
  const today = new Date().toISOString().slice(0, 10);
  const contracts = await AlquiaBackendClient.contracts.list();
  return { ok: buildFilasContrato(contracts, today) };
}

async function loadReminderSettings() {
  return { ok: await AlquiaBackendClient.users.getReminderSettings() };
}

function InvoiceAdjustmentDialog({
  invoice,
  adjustmentId,
  amount,
  reason,
  delta,
  error,
  isBusy,
  onClose,
  onAmountChange,
  onReasonChange,
  onRemove,
  onSave,
}: Readonly<{
  invoice: FilaCobranza;
  adjustmentId: number | null;
  amount: string;
  reason: string;
  delta: ReturnType<typeof calcularDelta>;
  error: string | null;
  isBusy: boolean;
  onClose: () => void;
  onAmountChange: (amount: string) => void;
  onReasonChange: (reason: string) => void;
  onRemove: (adjustmentId: number) => void;
  onSave: () => void;
}>) {
  const isReady = Number(amount) > 0 && Boolean(reason.trim()) && delta !== null;
  const title = adjustmentId === null ? "Ajustar el importe de la cuota" : "Cambiar un ajuste";
  const saveLabel = isBusy ? "Guardando…" : "Guardar ajuste";
  return <Dialog title={title} onClose={onClose}><div className="owner-dialog__body"><p>{invoice.direccion} · cuota de {invoice.periodo}.</p><dl className="owner-definition"><div><dt>Importe base</dt><dd>{formatearMonto(invoice.importeBase)}</dd></div>{invoice.ajustes.map((adjustment) => { const line = describirAjuste(adjustment, invoice.importeBase); const detail = line.detalle ? ` · ${line.detalle}` : ""; return <div key={line.id}><dt>{line.nombre}{detail}</dt><dd>{line.efecto}<button type="button" className="owner-row__link" disabled={isBusy} onClick={() => onRemove(line.id)}>Quitar</button></dd></div>; })}<div><dt>Total actual</dt><dd><b>{formatearMonto(invoice.totalVigente)}</b></dd></div></dl><div className="owner-wizard-stack"><label className="owner-wizard-field owner-wizard-field--amount"><span>$</span><input inputMode="numeric" aria-label="Importe final de la cuota" value={amount} onChange={(event) => onAmountChange(event.target.value.replace(/\D/g, ""))} /><span>final</span></label><label className="owner-wizard-field"><span className="sr-only">Motivo del ajuste</span><input placeholder="Motivo — ej.: reparación acordada" value={reason} onChange={(event) => onReasonChange(event.target.value)} /></label><output className="owner-wizard-help">{describirDelta(delta)}</output></div><aside className="owner-wizard-note"><Icon name="alert" />Se puede ajustar mientras la cuota no esté confirmada. Al confirmarla, el importe queda cerrado.</aside>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button disabled={isBusy || !isReady} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function RemoveInvoiceAdjustmentDialog({ error, isBusy, onClose, onRemove }: Readonly<{ error: string | null; isBusy: boolean; onClose: () => void; onRemove: () => void }>) {
  const buttonLabel = isBusy ? "Quitando…" : "Quitar";
  return <Dialog title="Quitar este ajuste" onClose={onClose}><div className="owner-dialog__body"><p>El total de la cuota vuelve a calcularse sin él.</p>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" disabled={isBusy} onClick={onRemove}>{buttonLabel}</Button></div></Dialog>;
}

function ArchiveTenantDialog({ tenant, error, isBusy, onClose, onArchive }: Readonly<{ tenant: TenantRow; error: string | null; isBusy: boolean; onClose: () => void; onArchive: () => void }>) {
  const buttonLabel = isBusy ? "Archivando…" : "Archivar";
  return <Dialog title="Archivar este inquilino" onClose={onClose}><div className="owner-dialog__body"><p><b>{tenant.nombre}</b> sale de la lista de inquilinos. Su historia —contratos, cuotas y pagos— se conserva, y puede volver a mostrarlo cuando quiera.</p>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" disabled={isBusy} onClick={onArchive}>{buttonLabel}</Button></div></Dialog>;
}

function ArchivePropertyDialog({ property, error, isBusy, onClose, onArchive }: Readonly<{ property: FilaPropiedad; error: string | null; isBusy: boolean; onClose: () => void; onArchive: () => void }>) {
  const buttonLabel = isBusy ? "Archivando…" : "Archivar";
  return <Dialog title="Archivar esta propiedad" onClose={onClose}><div className="owner-dialog__body"><p><b>{property.direccion}</b> sale de la lista de propiedades. Su historia —contratos, cuotas y pagos— se conserva, y puede volver a mostrarla cuando quiera.</p>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" disabled={isBusy} onClick={onArchive}>{buttonLabel}</Button></div></Dialog>;
}

function TerminateContractDialog({ endDate, error, isBusy, onClose, onEndDateChange, onTerminate }: Readonly<{ endDate: string; error: string | null; isBusy: boolean; onClose: () => void; onEndDateChange: (date: string) => void; onTerminate: () => void }>) {
  const buttonLabel = isBusy ? "Finalizando…" : "Finalizar contrato";
  return <Dialog title="Finalizar este contrato" onClose={onClose}><div className="owner-dialog__body"><p>El contrato queda terminado desde la fecha que indique. <b>Las cuotas posteriores que todavía no estén pagas se eliminan</b>; las ya cobradas y su historial se conservan.</p><label className="owner-wizard-field owner-wizard-field--medium"><span className="owner-wizard-label">FECHA DE TERMINACIÓN</span><input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} /></label>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" disabled={isBusy || !endDate} onClick={onTerminate}>{buttonLabel}</Button></div></Dialog>;
}

function PaymentReviewDialog({ row, error, isBusy, onClose, onViewReceipt, onRejectPayment, onConfirmPayment }: Readonly<{ row: FilaCobranza; error: string | null; isBusy: boolean; onClose: () => void; onViewReceipt: (paymentId: number) => void; onRejectPayment: (paymentId: number) => void; onConfirmPayment: (paymentId: number) => void }>) {
  const receipt = row.pagoPendiente;
  const confirmLabel = isBusy ? "Guardando…" : "Confirmar pago";
  const viewReceipt = () => { if (receipt) onViewReceipt(receipt.id); };
  const reject = () => { if (receipt) onRejectPayment(receipt.id); };
  const confirm = () => { if (receipt) onConfirmPayment(receipt.id); };
  return <Dialog title={`Revisar pago de ${row.inquilino}`} onClose={onClose}><div className="owner-dialog__body"><p>{row.direccion} · cuota de {row.periodo} por <b>{row.monto}</b>.</p><div className="owner-receipt"><Icon name="receipt" size={34} /><b>{receipt?.receiptFileName ?? "Comprobante"}</b><small>{descripcionArchivo(receipt)}</small><Button tone="secondary" small disabled={!receipt} onClick={viewReceipt}><Icon name="download" size={16} />Ver archivo</Button></div><p className="owner-dialog__hint">Al confirmar, la cuota queda marcada como pagada. Si el comprobante no corresponde, puede rechazarlo; el inquilino podrá cargar uno nuevo.</p>{error && <p className="owner-list-note" role="alert">{error}</p>}<div className="owner-dialog__actions"><Button tone="danger" disabled={isBusy || !receipt} onClick={reject}>Rechazar</Button><Button disabled={isBusy || !receipt} onClick={confirm}>{confirmLabel}</Button></div></div></Dialog>;
}

function PaymentRegistrationDialog({ row, file, error, isBusy, onClose, onFileChange, onRegister }: Readonly<{ row: FilaCobranza; file: File | null; error: string | null; isBusy: boolean; onClose: () => void; onFileChange: (file: File | null) => void; onRegister: (file: File) => void }>) {
  const buttonLabel = isBusy ? "Guardando…" : "Registrar pago";
  const register = () => { if (file) onRegister(file); };
  return <Dialog title="Registrar pago" onClose={onClose}><div className="owner-dialog__body"><p>{row.direccion} · cuota de {row.periodo} por <b>{row.monto}</b>.</p><label className="owner-file"><span>Comprobante del pago</span><input type="file" accept="image/*,application/pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /></label><p className="owner-dialog__hint">Adjunte la transferencia, el recibo firmado o la boleta de depósito. Queda guardada junto a la cuota.</p>{error && <p className="owner-list-note" role="alert">{error}</p>}<div className="owner-dialog__actions"><Button tone="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!file || isBusy} onClick={register}>{buttonLabel}</Button></div></div></Dialog>;
}

function TenantEditDialog({ tenant, error, isBusy, isValid, onClose, onChange, onSave }: Readonly<{ tenant: TenantRequest; error: string | null; isBusy: boolean; isValid: boolean; onClose: () => void; onChange: (tenant: TenantRequest) => void; onSave: () => void }>) {
  const invalidTaxId = tenant.taxId.length > 0 && !cuitValido(tenant.taxId);
  const invalidPhone = tenant.phoneNumber.length > 0 && !telefonoValido(tenant.phoneNumber);
  const taxIdError = soloDigitos(tenant.taxId).length < 11 ? "Faltan dígitos: son 11 en total." : "El número no es válido. Revise que no haya un dígito cambiado.";
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  return <Dialog title="Editar datos del inquilino" onClose={onClose}><div className="owner-dialog__body"><div className="owner-wizard-stack"><div className="owner-wizard-duo"><label className="owner-wizard-field"><span className="sr-only">Nombre</span><input placeholder="Nombre" value={tenant.firstName} onChange={(event) => onChange({ ...tenant, firstName: event.target.value })} /></label><label className="owner-wizard-field"><span className="sr-only">Apellido</span><input placeholder="Apellido" value={tenant.lastName} onChange={(event) => onChange({ ...tenant, lastName: event.target.value })} /></label></div><label className="owner-wizard-field"><span className="sr-only">CUIT o CUIL</span><input inputMode="numeric" placeholder="CUIT o CUIL — 20-12345678-9" value={tenant.taxId} aria-invalid={invalidTaxId} onChange={(event) => onChange({ ...tenant, taxId: formatearCuit(event.target.value) })} /></label>{invalidTaxId && <p className="owner-wizard-error" role="alert">{taxIdError}</p>}<label className="owner-wizard-field"><span className="sr-only">Correo electrónico</span><input type="email" placeholder="Correo electrónico" value={tenant.email} aria-invalid={tenant.email.length > 0 && !correoValido(tenant.email)} onChange={(event) => onChange({ ...tenant, email: event.target.value })} /></label><label className="owner-wizard-field"><span className="sr-only">Teléfono</span><input inputMode="tel" placeholder="Teléfono — 11 4455 2210" value={tenant.phoneNumber} aria-invalid={invalidPhone} onChange={(event) => onChange({ ...tenant, phoneNumber: event.target.value })} /></label>{invalidPhone && <p className="owner-wizard-error" role="alert">{errorDeTelefono(tenant.phoneNumber)}</p>}</div>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button disabled={isBusy || !isValid} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function AccountEditDialog({ account, email, error, isBusy, isValid, onClose, onChange, onSave }: Readonly<{ account: UserUpdateRequest; email: string | undefined; error: string | null; isBusy: boolean; isValid: boolean; onClose: () => void; onChange: (account: UserUpdateRequest) => void; onSave: () => void }>) {
  const invalidTaxId = account.taxId.length > 0 && !cuitValido(account.taxId);
  const invalidPhone = account.phoneNumber.length > 0 && !telefonoValido(account.phoneNumber);
  const taxIdError = soloDigitos(account.taxId).length < 11 ? "Faltan dígitos: son 11 en total." : "El número no es válido. Revise que no haya un dígito cambiado.";
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  return <Dialog title="Editar datos" onClose={onClose}><div className="owner-dialog__body"><div className="owner-wizard-stack"><div className="owner-wizard-duo"><label className="owner-wizard-field"><span className="sr-only">Nombre</span><input placeholder="Nombre" value={account.firstName} onChange={(event) => onChange({ ...account, firstName: event.target.value })} /></label><label className="owner-wizard-field"><span className="sr-only">Apellido</span><input placeholder="Apellido" value={account.lastName} onChange={(event) => onChange({ ...account, lastName: event.target.value })} /></label></div><label className="owner-wizard-field"><span className="sr-only">CUIT o CUIL</span><input inputMode="numeric" placeholder="CUIT o CUIL — 20-12345678-9" value={account.taxId} aria-invalid={invalidTaxId} onChange={(event) => onChange({ ...account, taxId: formatearCuit(event.target.value) })} /></label>{invalidTaxId && <p className="owner-wizard-error" role="alert">{taxIdError}</p>}<label className="owner-wizard-field"><span className="sr-only">Teléfono</span><input inputMode="tel" placeholder="Teléfono — 11 4455 2210" value={account.phoneNumber} aria-invalid={invalidPhone} onChange={(event) => onChange({ ...account, phoneNumber: event.target.value })} /></label>{invalidPhone && <p className="owner-wizard-error" role="alert">{errorDeTelefono(account.phoneNumber)}</p>}<p className="owner-card__copy">Su correo es <b>{email}</b> y no se puede cambiar desde acá.</p></div>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button disabled={isBusy || !isValid} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function ReminderSettingsDialog({ settings, error, isBusy, onClose, onChange, onSave }: Readonly<{ settings: ReminderSettingsResponse; error: string | null; isBusy: boolean; onClose: () => void; onChange: (settings: ReminderSettingsResponse) => void; onSave: () => void }>) {
  const label = settings.enabled ? "Recordatorios activos" : "Recordatorios apagados";
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  const schedule = settings.enabled ? <><Counter label="Días antes del vencimiento" value={settings.daysBeforeDue} unit="días" min={DIAS_MIN} max={DIAS_MAX} onChange={(value) => onChange({ ...settings, daysBeforeDue: value })} /><div className="owner-wizard-chips"><button type="button" aria-pressed={settings.dueDateReminderEnabled} onClick={() => onChange({ ...settings, dueDateReminderEnabled: !settings.dueDateReminderEnabled })}>Avisar el día del vencimiento</button></div><Counter label="Días después del vencimiento" value={settings.daysAfterDue} unit="días" min={DIAS_MIN} max={DIAS_MAX} onChange={(value) => onChange({ ...settings, daysAfterDue: value })} /></> : null;
  return <Dialog title="Editar recordatorios" onClose={onClose}><div className="owner-dialog__body"><p>Estos avisos le llegan al inquilino por correo. El aviso de cuota confirmada se envía siempre, aunque los recordatorios estén apagados.</p><div className="owner-wizard-chips"><button type="button" aria-pressed={settings.enabled} onClick={() => onChange({ ...settings, enabled: !settings.enabled })}>{label}</button></div>{schedule}{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button disabled={isBusy} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function isAccountValid(account: UserUpdateRequest | null): boolean {
  if (!account) return false;
  return Boolean(account.firstName.trim()) && Boolean(account.lastName.trim()) && cuitValido(account.taxId) && telefonoValido(account.phoneNumber);
}

function isTenantValid(tenant: TenantRequest | null): boolean {
  if (!tenant) return false;
  return Boolean(tenant.firstName.trim()) && Boolean(tenant.lastName.trim()) && cuitValido(tenant.taxId) && correoValido(tenant.email) && telefonoValido(tenant.phoneNumber);
}

function loadedData<T>(demo: boolean, demoData: T, loadState: { ok: T } | LoadFailure | null): T | null {
  if (demo) return demoData;
  if (loadState && "ok" in loadState) return loadState.ok;
  return null;
}

function loadHasError(demo: boolean, loadState: LoadFailure | { ok: unknown } | null): boolean {
  return !demo && loadState !== null && "error" in loadState;
}

function propertyWorkspaceData(demo: boolean, loadState: { ok: FilaPropiedad[]; crudas: PropertyResponse[]; sinContratos: boolean } | LoadFailure | null) {
  if (demo) {
    return { properties: propiedadesDemo as FilaPropiedad[], hasError: false, rawProperties: [] as PropertyResponse[], contractStatusIsUnknown: false };
  }
  if (loadState && "ok" in loadState) {
    return { properties: loadState.ok, hasError: false, rawProperties: loadState.crudas, contractStatusIsUnknown: loadState.sinContratos };
  }
  return { properties: null, hasError: loadState !== null, rawProperties: [] as PropertyResponse[], contractStatusIsUnknown: false };
}

function overviewCalendar(demo: boolean) {
  if (demo) return { hoy: "martes 19 de agosto de 2026", mesActual: "agosto 2026", mesSiguiente: "septiembre 2026" };
  return { hoy: hoyEnLetras(), mesActual: mesActualEnLetras(), mesSiguiente: mesSiguienteEnLetras() };
}

function overviewWorkspaceData(demo: boolean, loadState: OverviewData | LoadFailure | null) {
  if (demo) return { data: inicioDemo, hasError: false };
  if (loadState && "error" in loadState) return { data: null, hasError: true };
  return { data: loadState, hasError: false };
}

function WorkspaceContent({ wizard, detail, view, renderWizard, detailContent, viewContent }: Readonly<{
  wizard: Creation;
  detail: Detail;
  view: OwnerView;
  renderWizard: () => React.ReactNode;
  detailContent: Record<Exclude<Detail, null>, () => React.ReactNode>;
  viewContent: Record<OwnerView, () => React.ReactNode>;
}>) {
  if (wizard) return renderWizard();
  if (detail) return detailContent[detail]();
  return viewContent[view]();
}

function greetingFor(account: { firstName: string } | null): string {
  return account ? `Buen día, ${account.firstName}` : "Buen día";
}

function workspaceAccount(user: ReturnType<typeof useAuth>["user"], demo: boolean) {
  return user ?? (demo ? CUENTA_DEMO : null);
}

function workspaceLoads(demo: boolean, view: OwnerView, detail: Detail) {
  const live = !demo;
  return {
    tenants: live && (view === "inquilinos" || detail === "tenant"),
    collections: live && view === "cobranzas",
    reminders: live && view === "configuracion",
    contract: live && detail === "contract",
    overview: live && view === "inicio",
    properties: live && (view === "propiedades" || detail === "property"),
    contracts: live && view === "contratos",
  };
}

function activeSuccessorId(contractLoad: ContractDetailLoad) {
  if (contractLoad === null || "error" in contractLoad || contractLoad.ok.status !== "ACTIVE") return null;
  return contractLoad.ok.successorContractId ?? null;
}

function scheduledContract(successorId: number | null, scheduledLoad: ScheduledContractLoad) {
  if (successorId === null || scheduledLoad?.de !== successorId) return null;
  return scheduledLoad.contrato;
}

function demoSelection<T extends { id: string }>(items: T[], selectedId: string) {
  return items.find((item) => item.id === selectedId) ?? items[0];
}

function overviewProjection(demo: boolean, projection: Proyeccion | "error" | null) {
  return demo ? proyeccionDemo : projection;
}

function adjustmentDelta(row: FilaCobranza | null, amount: string) {
  return row ? calcularDelta(Number(amount) || 0, row.totalVigente) : null;
}

function loadedContract(loadState: ContractDetailLoad): ContractResponse | null {
  return loadState !== null && "ok" in loadState ? loadState.ok : null;
}

type WorkspaceDialogState = {
  adjusting: FilaCobranza | null;
  adjustmentId: number | null;
  amount: string;
  reason: string;
  removingAdjustment: number | null;
  editingTenant: TenantRequest | null;
  editingTenantId: number | null;
  archivingTenant: TenantRow | null;
  reminderSettings: ReminderSettingsResponse | null;
  editingAccount: UserUpdateRequest | null;
  finishingContract: boolean;
  contract: ContractResponse | null;
  endDate: string;
  archivingProperty: FilaPropiedad | null;
  reviewingPayment: FilaCobranza | null;
  registeringPayment: FilaCobranza | null;
  paymentFile: File | null;
  conditionsOpen: boolean;
  adjustmentError: string | null;
  settingsError: string | null;
  contractError: string | null;
  archiveError: string | null;
  actionBusy: boolean;
  settingsBusy: boolean;
  contractBusy: boolean;
  archiveBusy: boolean;
  accountEmail?: string;
};

type WorkspaceDialogActions = {
  closeAdjustment: () => void;
  setAmount: (value: string) => void;
  setReason: (value: string) => void;
  chooseAdjustmentToRemove: (id: number) => void;
  saveAdjustment: () => void;
  closeRemoval: () => void;
  removeAdjustment: () => void;
  closeTenantEditor: () => void;
  setTenant: (tenant: TenantRequest) => void;
  saveTenant: (id: number, tenant: TenantRequest) => void;
  closeTenantArchive: () => void;
  archiveTenant: (tenant: TenantRow) => void;
  closeReminders: () => void;
  setReminders: (settings: ReminderSettingsResponse) => void;
  saveReminders: (settings: ReminderSettingsResponse) => void;
  closeAccount: () => void;
  setAccount: (account: UserUpdateRequest) => void;
  saveAccount: (account: UserUpdateRequest) => void;
  closeTermination: () => void;
  setEndDate: (date: string) => void;
  terminateContract: (id: number) => void;
  closePropertyArchive: () => void;
  archiveProperty: (property: FilaPropiedad) => void;
  closePaymentReview: () => void;
  viewReceipt: (paymentId: number) => void;
  rejectPayment: (paymentId: number) => void;
  confirmPayment: (paymentId: number) => void;
  closePaymentRegistration: () => void;
  setPaymentFile: (file: File | null) => void;
  registerPayment: (invoiceId: number, file: File) => void;
  closeConditions: () => void;
  conditionsProgrammed: () => void;
};

function ContractConditionsDialog({ isOpen, contract, onClose, onProgrammed }: Readonly<{
  isOpen: boolean;
  contract: ContractResponse | null;
  onClose: () => void;
  onProgrammed: () => void;
}>) {
  if (!isOpen || !contract) return null;
  return <Dialog title="Cambiar condiciones desde el próximo período" onClose={onClose}>
    <CambioCondicionesForm contrato={contract} hoyISO={new Date().toISOString().slice(0, 10)} onCancelar={onClose} onProgramado={onProgrammed} />
  </Dialog>;
}

function WorkspaceDialogs({ state, actions }: Readonly<{ state: WorkspaceDialogState; actions: WorkspaceDialogActions }>) {
  const delta = adjustmentDelta(state.adjusting, state.amount);
  const accountIsValid = isAccountValid(state.editingAccount);
  const tenantIsValid = isTenantValid(state.editingTenant);
  return <>
    {state.adjusting && <InvoiceAdjustmentDialog invoice={state.adjusting} adjustmentId={state.adjustmentId} amount={state.amount} reason={state.reason} delta={delta} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closeAdjustment} onAmountChange={actions.setAmount} onReasonChange={actions.setReason} onRemove={actions.chooseAdjustmentToRemove} onSave={actions.saveAdjustment} />}
    {state.removingAdjustment !== null && state.adjusting && <RemoveInvoiceAdjustmentDialog error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closeRemoval} onRemove={actions.removeAdjustment} />}
    {state.editingTenant && state.editingTenantId !== null && <TenantEditDialog tenant={state.editingTenant} error={state.settingsError} isBusy={state.settingsBusy} isValid={tenantIsValid} onClose={actions.closeTenantEditor} onChange={actions.setTenant} onSave={() => actions.saveTenant(state.editingTenantId!, state.editingTenant!)} />}
    {state.archivingTenant && <ArchiveTenantDialog tenant={state.archivingTenant} error={state.settingsError} isBusy={state.settingsBusy} onClose={actions.closeTenantArchive} onArchive={() => actions.archiveTenant(state.archivingTenant!)} />}
    {state.reminderSettings && <ReminderSettingsDialog settings={state.reminderSettings} error={state.settingsError} isBusy={state.settingsBusy} onClose={actions.closeReminders} onChange={actions.setReminders} onSave={() => actions.saveReminders(state.reminderSettings!)} />}
    {state.editingAccount && <AccountEditDialog account={state.editingAccount} email={state.accountEmail} error={state.settingsError} isBusy={state.settingsBusy} isValid={accountIsValid} onClose={actions.closeAccount} onChange={actions.setAccount} onSave={() => actions.saveAccount(state.editingAccount!)} />}
    {state.finishingContract && state.contract && <TerminateContractDialog endDate={state.endDate} error={state.contractError} isBusy={state.contractBusy} onClose={actions.closeTermination} onEndDateChange={actions.setEndDate} onTerminate={() => actions.terminateContract(state.contract!.id)} />}
    {state.archivingProperty && <ArchivePropertyDialog property={state.archivingProperty} error={state.archiveError} isBusy={state.archiveBusy} onClose={actions.closePropertyArchive} onArchive={() => actions.archiveProperty(state.archivingProperty!)} />}
    {state.reviewingPayment && <PaymentReviewDialog row={state.reviewingPayment} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closePaymentReview} onViewReceipt={actions.viewReceipt} onRejectPayment={actions.rejectPayment} onConfirmPayment={actions.confirmPayment} />}
    {state.registeringPayment && <PaymentRegistrationDialog row={state.registeringPayment} file={state.paymentFile} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closePaymentRegistration} onFileChange={actions.setPaymentFile} onRegister={(file) => actions.registerPayment(state.registeringPayment!.invoiceId, file)} />}
    <ContractConditionsDialog isOpen={state.conditionsOpen} contract={state.contract} onClose={actions.closeConditions} onProgrammed={actions.conditionsProgrammed} />
  </>;
}

export default function OwnerWorkspace({ initialView, activeView, onNavigate, demo = false }: { initialView: OwnerView; activeView?: OwnerView; onNavigate?: (view: OwnerView) => void; demo?: boolean }) {
  const { user, actualizarUsuario } = useAuth();
  // La demo conserva su titular de ejemplo: sin sesión, Inicio y Configuración
  // quedarían a medio nombrar justo en la ruta que existe para mostrarlas.
  const cuenta = workspaceAccount(user, demo);
  const [localView, setLocalView] = useState<OwnerView>(initialView);
  const [detail, setDetail] = useState<Detail>(null);
  const [wizard, setWizard] = useState<Creation>(null);
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
  const cargas = workspaceLoads(demo, view, detail);
  const necesitaInquilinos = cargas.tenants;

  useLoadedResource({ enabled: necesitaInquilinos, refreshKey: recargaInquilinos, load: loadTenantRows, setResult: setCarga });

  const necesitaCobranzas = cargas.collections;

  useLoadedResource({ enabled: necesitaCobranzas, refreshKey: refresco, load: loadCollectionRows, setResult: setCargaCobranzas });

  const inquilinos = loadedData(demo, inquilinosDemo, carga);
  const inquilinosError = loadHasError(demo, carga);
  const selectedProperty = demoSelection(properties, selected);
  const selectedContract = demoSelection(contracts, selected);

  // Propiedades necesita las cuotas para el chip de estado, acotadas a la
  // ventana que define `propiedades.ts`: traer la historia entera para pintar un
  // chip es justamente lo que el pedido al backend marcaba que no escala.
  const necesitaAjustes = cargas.reminders;

  useLoadedResource({
    enabled: necesitaAjustes,
    refreshKey: 0,
    load: loadReminderSettings,
    setResult: setCargaAjustes,
  });

  const necesitaContrato = cargas.contract;

  useContractDetailLoad({ enabled: necesitaContrato, selectedId: selected, refreshKey: recargaContrato, setContract: setCargaContrato, setIncrements: setAumentos });

  // Un contrato vigente apunta a su sucesor apenas hay un cambio programado; el
  // detalle lo pide para mostrar desde cuándo rige y con qué condiciones.
  const sucesorId = activeSuccessorId(cargaContrato);

  useScheduledContractLoad({ successorId: sucesorId, refreshKey: recargaContrato, setScheduled: setCargaProgramado });
  // Derivado y no reseteado en el efecto: si se abre otro contrato, el sucesor
  // guardado deja de corresponder y no se muestra.
  const programado = scheduledContract(sucesorId, cargaProgramado);

  const necesitaInicio = cargas.overview;

  useOverviewLoad({ enabled: necesitaInicio, setOverview: setCargaInicio, setProjection: setProyeccion });

  const necesitaPropiedades = cargas.properties;

  useLoadedResource({ enabled: necesitaPropiedades, refreshKey: recargaPropiedades, load: loadPropertiesWithInvoices, setResult: setCargaPropiedades });

  const necesitaContratos = cargas.contracts;

  useLoadedResource({ enabled: necesitaContratos, refreshKey: 0, load: loadContractRows, setResult: setCargaContratos });

  // Contra un build viejo la clave `activeContract` no viene y todas se verían
  // «Sin alquilar». Se omiten los chips en vez de afirmar algo falso.
  const propertyData = propertyWorkspaceData(demo, cargaPropiedades);
  const propiedades = propertyData.properties;
  const propiedadesError = propertyData.hasError;
  const propiedadesCrudas = propertyData.rawProperties;
  const sinDatoDeContrato = propertyData.contractStatusIsUnknown;

  const cobranzas = loadedData(demo, cobranzasDemo, cargaCobranzas);
  const cobranzasError = loadHasError(demo, cargaCobranzas);
  const listaContratos = loadedData(demo, contratosDemo, cargaContratos);
  const contratosError = loadHasError(demo, cargaContratos);

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

  function revisarPago(fila: FilaCobranza) {
    setErrorAccion(null);
    setEnRevision(fila);
  }
  function confirmarCuota(invoiceId: number) {
    void accionDeCuota(() => AlquiaBackendClient.invoices.confirm(invoiceId));
  }
  function prepararAjuste(fila: FilaCobranza) {
    setErrorAccion(null);
    setAjusteEditado(null);
    setMotivoAjuste("");
    setImporteFinal(String(fila.totalVigente));
    setAjustando(fila);
  }
  function registrarPago(fila: FilaCobranza) {
    setErrorAccion(null);
    setArchivo(null);
    setARegistrar(fila);
  }

  function openDetail(kind: Detail, id: string) { setSelected(id); setDetail(kind); }
  function go(next: OwnerView) {
    onNavigate?.(next);
    if (!onNavigate) {
      setLocalView(next);
    }
    setWizard(null);
    setDetail(null);
  }
  function beginCreation(kind: Creation) { setDetail(null); setWizard(kind); }
  function editarInquilino(tenant: TenantRow) {
    setErrorAjustes(null);
    setAvisoGuardado(null);
    setInquilinoEditadoId(tenant.id);
    setEditandoInquilino({
      firstName: tenant.nombrePila,
      lastName: tenant.apellido,
      taxId: tenant.cuit,
      email: tenant.email,
      phoneNumber: tenant.telefono,
    });
  }
  function prepararArchivoDeInquilino(tenant: TenantRow) {
    setErrorAjustes(null);
    setArchivandoInquilino(tenant);
  }
  function editarRecordatorios(settings: ReminderSettingsResponse) {
    setErrorAjustes(null);
    setAvisoGuardado(null);
    setEditandoAvisos(settings);
  }
  function editarCuenta() {
    if (!user) return;
    setErrorAjustes(null);
    setAvisoGuardado(null);
    setEditandoCuenta({
      firstName: user.firstName,
      lastName: user.lastName,
      taxId: formatearCuit(user.taxId ?? ""),
      phoneNumber: user.phoneNumber ?? "",
    });
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
      setErrorAjustes(mensajeErrorDeRecordatorios(err));
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
      setErrorAjustes(mensajeErrorDeCuenta(err));
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
      setErrorAjustes(mensajeErrorDeInquilino(err));
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
      setErrorAjustes(mensajeErrorAlArchivarInquilino(err));
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
      let mensaje = mensajeDeErrorCobranza(err);
      if (err instanceof ApiError && err.message === "Cannot modify adjustments on a confirmed invoice") {
        mensaje = "La cuota quedó confirmada mientras editaba, así que su importe ya está cerrado.";
      }
      setErrorAccion(mensaje);
    } finally {
      setAccionEnCurso(false);
    }
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
      setErrorContrato(mensajeErrorAlAdjuntarDocumento(err));
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
      setErrorContrato(mensajeErrorAlFinalizarContrato(err));
    } finally {
      setGuardandoContrato(false);
    }
  }

  const calendarioDeInicio = overviewCalendar(demo);
  const overviewData = overviewWorkspaceData(demo, cargaInicio);
  const datosDeInicio = overviewData.data;
  const inicioConError = overviewData.hasError;
  const proyeccionDeInicio = overviewProjection(demo, proyeccion);
  const saludoDeInicio = greetingFor(cuenta);
  const recordatorios = loadedData(demo, AVISOS_DEMO, cargaAjustes);
  const recordatoriosConError = loadHasError(demo, cargaAjustes);

  const wizardDestinations: Record<Exclude<Creation, null>, OwnerView> = { property: "propiedades", tenant: "inquilinos", contract: "contratos" };
  const wizardKind = wizard ?? "contract";
  const renderWizard = () => <CreationWizard kind={wizardKind} demo={demo} onClose={() => setWizard(null)} onNewTenant={() => beginCreation("tenant")} onComplete={() => go(wizardDestinations[wizardKind])} />;
  const detailContent: Record<Exclude<Detail, null>, () => React.ReactNode> = {
    property: () => <PropertyDetail demo={demo} demoProperty={selectedProperty} selectedId={selected} properties={propiedades} rawProperties={propiedadesCrudas} hasError={propiedadesError} contractStatusIsUnknown={sinDatoDeContrato} onBack={() => setDetail(null)} onCreateContract={() => beginCreation("contract")} onOpenDemoContract={(contractId) => openDetail("contract", contractId)} onArchive={(property) => { setErrorArchivar(null); setArchivando(property); }} />,
    contract: () => <ContractDetail demo={demo} demoContract={selectedContract} contractLoad={cargaContrato} increments={aumentos} scheduledContract={programado} successorId={sucesorId} paymentLink={enlace} demoLinkCopied={linkCopied} errorMessage={errorContrato} isFinishing={finalizando} onBack={() => setDetail(null)} onOpenContract={(contractId) => openDetail("contract", String(contractId))} onOpenConditions={() => setConditionsOpen(true)} onBeginTermination={() => { setErrorContrato(null); setFechaFin(new Date().toISOString().slice(0, 10)); setFinalizando(true); }} onCopyDemoLink={() => setLinkCopied(true)} onCopyPaymentLink={(contractId) => void copiarEnlace(contractId)} onResendPaymentLink={(contractId) => void reenviarEnlace(contractId)} onDownloadDocument={(contract) => void descargarDocumento(contract)} onRemoveDocument={(contractId) => void quitarDocumento(contractId)} onAttachDocument={(contractId, file) => void adjuntarDocumento(contractId, file)} />,
    tenant: () => <TenantDetail selectedId={selected} tenants={inquilinos} hasError={inquilinosError} paymentLink={enlace} onBack={() => setDetail(null)} onEdit={editarInquilino} onArchive={prepararArchivoDeInquilino} onCreateContract={() => beginCreation("contract")} onOpenContract={(contractId) => openDetail("contract", String(contractId))} onCopyPaymentLink={(contractId) => void copiarEnlace(contractId)} />,
  };
  const viewContent: Record<OwnerView, () => React.ReactNode> = {
    propiedades: () => <PropertiesView propiedades={propiedades} propiedadesError={propiedadesError} sinDatoDeContrato={sinDatoDeContrato} query={query} ciudades={ciudades} dorms={dorms} extras={extras} estado={estado} panelAbierto={panelAbierto} setQuery={setQuery} setCiudades={setCiudades} setDorms={setDorms} setExtras={setExtras} setEstado={setEstado} onPanelOpenChange={setPanelAbierto} onCreateProperty={() => beginCreation("property")} onOpenProperty={(propertyId) => openDetail("property", propertyId)} />,
    contratos: () => <ContractsView contracts={listaContratos} hasError={contratosError} filter={filtroContrato} onFilterChange={setFiltroContrato} onCreateContract={() => beginCreation("contract")} onOpenContract={(contract) => { const id = demo ? CLAVES_CONTRATO_DEMO[contract.id - 1] : String(contract.id); openDetail("contract", id); }} />,
    cobranzas: () => <CollectionsView collections={cobranzas} hasError={cobranzasError} filter={filtroCobranza} onFilterChange={setFiltroCobranza} actionError={errorAccion} hasOpenAction={Boolean(enRevision || aRegistrar || ajustando)} isBusy={accionEnCurso} canAdjust={!demo} onReview={revisarPago} onConfirm={confirmarCuota} onAdjust={prepararAjuste} onViewReceipt={(paymentId) => void verComprobante(paymentId)} onRegisterPayment={registrarPago} />,
    inquilinos: () => <TenantsView tenants={inquilinos} hasError={inquilinosError} onCreateTenant={() => beginCreation("tenant")} onCreateContract={() => beginCreation("contract")} onOpenTenant={(tenantId) => openDetail("tenant", String(tenantId))} />,
    configuracion: () => <SettingsView reminderSettings={recordatorios} hasReminderError={recordatoriosConError} savedNotice={avisoGuardado} account={cuenta} canEditAccount={Boolean(user)} onEditReminders={editarRecordatorios} onEditAccount={editarCuenta} />,
    inicio: () => <Overview greeting={saludoDeInicio} subtitle={`Así está su cartera hoy, ${calendarioDeInicio.hoy}.`} currentMonth={calendarioDeInicio.mesActual} nextMonth={calendarioDeInicio.mesSiguiente} data={datosDeInicio} hasError={inicioConError} projection={proyeccionDeInicio} onCreateProperty={() => beginCreation("property")} onCreateContract={() => beginCreation("contract")} onOpenCollections={() => go("cobranzas")} />,
  };
  const content = <WorkspaceContent wizard={wizard} detail={detail} view={view} renderWizard={renderWizard} detailContent={detailContent} viewContent={viewContent} />;
  const deltaAjuste = adjustmentDelta(ajustando, importeFinal);
  const guardarAjuste = () => {
    if (!ajustando || !deltaAjuste) return;
    const cuerpo = { name: motivoAjuste.trim(), ...deltaAjuste };
    const guardar = ajusteEditado === null
      ? () => AlquiaBackendClient.invoices.addAdjustment(ajustando.invoiceId, cuerpo)
      : () => AlquiaBackendClient.invoices.editAdjustment(ajustando.invoiceId, ajusteEditado, cuerpo);
    void accionDeAjuste(guardar, () => setAjustando(null));
  };

  const quitarAjuste = () => {
    if (quitandoAjuste === null || !ajustando) return;
    void accionDeAjuste(
      () => AlquiaBackendClient.invoices.removeAdjustment(ajustando.invoiceId, quitandoAjuste),
      () => { setQuitandoAjuste(null); setAjustando(null); }
    );
  };
  const dialogState: WorkspaceDialogState = {
    adjusting: ajustando,
    adjustmentId: ajusteEditado,
    amount: importeFinal,
    reason: motivoAjuste,
    removingAdjustment: quitandoAjuste,
    editingTenant: editandoInquilino,
    editingTenantId: inquilinoEditadoId,
    archivingTenant: archivandoInquilino,
    reminderSettings: editandoAvisos,
    editingAccount: editandoCuenta,
    finishingContract: finalizando,
    contract: loadedContract(cargaContrato),
    endDate: fechaFin,
    archivingProperty: archivando,
    reviewingPayment: enRevision,
    registeringPayment: aRegistrar,
    paymentFile: archivo,
    conditionsOpen,
    adjustmentError: errorAccion,
    settingsError: errorAjustes,
    contractError: errorContrato,
    archiveError: errorArchivar,
    actionBusy: accionEnCurso,
    settingsBusy: guardandoAjustes,
    contractBusy: guardandoContrato,
    archiveBusy: guardandoArchivado,
    accountEmail: cuenta?.email,
  };
  const dialogActions: WorkspaceDialogActions = {
    closeAdjustment: () => setAjustando(null),
    setAmount: setImporteFinal,
    setReason: setMotivoAjuste,
    chooseAdjustmentToRemove: setQuitandoAjuste,
    saveAdjustment: guardarAjuste,
    closeRemoval: () => setQuitandoAjuste(null),
    removeAdjustment: quitarAjuste,
    closeTenantEditor: () => setEditandoInquilino(null),
    setTenant: setEditandoInquilino,
    saveTenant: (id, tenant) => void guardarInquilinoEditado(id, tenant),
    closeTenantArchive: () => setArchivandoInquilino(null),
    archiveTenant: (tenant) => void archivarInquilino(tenant),
    closeReminders: () => setEditandoAvisos(null),
    setReminders: setEditandoAvisos,
    saveReminders: (settings) => void guardarAvisos(settings),
    closeAccount: () => setEditandoCuenta(null),
    setAccount: setEditandoCuenta,
    saveAccount: (account) => void guardarCuenta(account),
    closeTermination: () => setFinalizando(false),
    setEndDate: setFechaFin,
    terminateContract: (id) => void finalizarContrato(id),
    closePropertyArchive: () => setArchivando(null),
    archiveProperty: (property) => void archivarPropiedad(property),
    closePaymentReview: () => setEnRevision(null),
    viewReceipt: (paymentId) => void verComprobante(paymentId),
    rejectPayment: (paymentId) => void accionDeCuota(() => AlquiaBackendClient.payments.reject(paymentId), () => setEnRevision(null)),
    confirmPayment: (paymentId) => void accionDeCuota(() => AlquiaBackendClient.payments.confirm(paymentId), () => setEnRevision(null)),
    closePaymentRegistration: () => setARegistrar(null),
    setPaymentFile: setArchivo,
    registerPayment: (invoiceId, file) => void accionDeCuota(() => AlquiaBackendClient.payments.create(invoiceId, file), () => { setARegistrar(null); setArchivo(null); }),
    closeConditions: () => setConditionsOpen(false),
    conditionsProgrammed: () => { setConditionsOpen(false); setRecargaContrato((n) => n + 1); },
  };

  return <div className="owner-workspace"><main className="owner-content">{content}</main><WorkspaceDialogs state={dialogState} actions={dialogActions} /></div>;
}
