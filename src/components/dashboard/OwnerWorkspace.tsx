"use client";

import { useEffect, useState } from "react";
import { NAV_RESET_EVENT } from "./DashboardNav";
import CreationWizard from "@/components/dashboard/CreationWizard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type {
  AdjustmentResponse,
  ContractResponse,
  PropertyRequest,
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
  buscarCobranzas,
  filtrar,
  resumenCobranzas,
  type FilaCobranza,
  type FiltroCobranza,
} from "@/lib/cobranzas";
import {
  buildFilasContrato,
  buscarContratos,
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
import { CATEGORIAS, etiquetaCategoria } from "@/lib/propiedad";
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
import { Cargando, Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { correoValido } from "@/lib/correo";
import {
  describirAjuste,
  itemARequest,
  totalPrevisualizado,
  itemValido,
  FORM_ITEM_VACIO,
  type FormularioItem,
} from "@/lib/ajustes";
import { estadoDeContrato } from "@/lib/contratos";
import { describirRecordatorios, resumenRecordatorios, DIAS_MAX, DIAS_MIN } from "@/lib/recordatorios";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";
import { ApiError, AuthExpiredError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import CambioCondicionesForm from "@/components/dashboard/CambioCondicionesForm";
import { useAuth } from "@/context/auth-context";

export type OwnerView = "inicio" | "propiedades" | "contratos" | "cobranzas" | "inquilinos" | "configuracion";
type Detail = "property" | "contract" | "tenant" | null;
type Creation = "property" | "contract" | "tenant" | null;

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
  if (err instanceof ApiError && err.type === ERROR.PAYMENT_ON_UNCONFIRMED_INVOICE) {
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
  if (err instanceof ApiError && err.type === ERROR.DUPLICATE_TAX_ID) return "Ese documento ya figura en otro inquilino suyo.";
  if (err instanceof ApiError && err.type === ERROR.DUPLICATE_PHONE_NUMBER) return "Ese teléfono ya figura en otro inquilino suyo.";
  if (err instanceof ApiError && err.status === 400) return "Verifique los datos ingresados e inténtelo de nuevo.";
  return "No pudimos guardar los datos. Inténtelo de nuevo más tarde.";
}

function mensajeErrorDePropiedad(err: unknown): string {
  if (err instanceof AuthExpiredError) return "Su sesión expiró. Vuelva a iniciar sesión.";
  if (err instanceof ApiError && err.status === 400) return "Verifique los datos ingresados e inténtelo de nuevo.";
  return "No pudimos guardar la propiedad. Inténtelo de nuevo más tarde.";
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

/** Error al cargar una pantalla o bloque: ícono + qué falló, centrado. `card={false}` dentro de un contenedor que ya es una tarjeta. */
function LoadError({ title, card = true }: Readonly<{ title: string; card?: boolean }>) {
  const body = <div role="alert" className="owner-load-error"><span className="owner-load-error__icon"><Icon name="alert" size={26} /></span><b>{title}</b><span>Inténtelo de nuevo más tarde.</span></div>;
  return card ? <div className="owner-card">{body}</div> : body;
}

type ButtonAction = () => void | Promise<unknown>;

/**
 * `busy` lo fija quien tiene el estado (un diálogo que guarda). Si `onClick`
 * devuelve una promesa, el botón además se ocupa solo mientras esté pendiente:
 * así las acciones sin estado propio —copiar el enlace, descargar— no necesitan
 * un flag cada una.
 */
function Button({ children, tone = "primary", onClick, disabled = false, busy = false, small = false }: Readonly<{ children: React.ReactNode; tone?: "primary" | "secondary" | "quiet" | "danger"; onClick?: ButtonAction; disabled?: boolean; busy?: boolean; small?: boolean }>) {
  const [pending, setPending] = useState(false);
  const isBusy = busy || pending;
  function handleClick() {
    const result = onClick?.();
    if (result instanceof Promise) {
      setPending(true);
      void result.finally(() => setPending(false));
    }
  }
  return <button type="button" className={`owner-button owner-button--${tone}${small ? " owner-button--small" : ""}`} onClick={handleClick} disabled={disabled || isBusy} aria-busy={isBusy || undefined}>{isBusy && <Spinner />}{children}</button>;
}

function SwitchRow({ label, checked, onChange }: Readonly<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>) {
  return <button type="button" role="switch" aria-checked={checked} className="owner-switch" onClick={() => onChange(!checked)}><span>{label}</span><i aria-hidden="true" /></button>;
}

function SearchField({ value, onChange, placeholder, label }: Readonly<{ value: string; onChange: (value: string) => void; placeholder: string; label: string }>) {
  return <div className="owner-search">
    <Icon name="search" size={19} />
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} />
    {value && <button type="button" className="owner-search__clear" onClick={() => onChange("")} aria-label="Borrar la búsqueda"><Icon name="x" size={16} /></button>}
  </div>;
}

/**
 * Una lista vacía tiene dos causas distintas y piden salidas distintas: la
 * búsqueda no encontró nada (se borra), o encontró pero el estado elegido lo
 * esconde (se cambia de estado).
 */
function EmptyResults({ noun, query, found, stateLabel, onClearSearch, otherState }: Readonly<{ noun: string; query: string; found: number; stateLabel: string; onClearSearch: () => void; otherState: { label: string; apply: () => void } | null }>) {
  const text = query.trim();
  if (found === 0) {
    return <div className="owner-empty">
      <b>{text ? `No encontramos ${noun} para «${text}»` : `No hay ${noun}`}</b>
      {text && <span>Revise la dirección o el nombre del inquilino.</span>}
      {text && <Button tone="secondary" small onClick={onClearSearch}>Quitar búsqueda</Button>}
    </div>;
  }
  return <div className="owner-empty">
    <b>No hay {noun} {stateLabel}</b>
    <span>{text ? `Para «${text}» hay ${found} en otros estados.` : "Pruebe con otro estado."}</span>
    {otherState && <Button tone="secondary" small onClick={otherState.apply}>Ver {otherState.label}</Button>}
  </div>;
}

type EmptyArtName = "propiedades" | "contratos" | "inquilinos" | "cobranzas" | "alDia";

/**
 * Ilustraciones de los estados vacíos. Hablan el idioma del logo —trazo
 * redondeado, el punto que es una persona y el techito rosa que la cobija— y
 * el rosa queda en un solo detalle por dibujo, porque el manual lo limita al
 * 10 % de una pieza. Son decorativas: el mensaje lo dice el texto de al lado.
 */
function EmptyArt({ name }: Readonly<{ name: EmptyArtName }>) {
  const line = { fill: "none", stroke: "var(--indigo)", strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const sheet = { ...line, fill: "#fff" };
  const roof = { ...line, stroke: "var(--rosa)", strokeWidth: 5 };
  const drawings: Record<EmptyArtName, React.ReactNode> = {
    propiedades: <>
      <path {...line} d="M24 79h72" />
      <rect {...sheet} x="38" y="44" width="44" height="35" rx="3" />
      <rect {...line} fill="var(--indigo-suave)" x="54" y="60" width="12" height="19" rx="2" />
      <rect {...line} x="44" y="51" width="7" height="7" rx="1.5" />
      <rect {...line} x="69" y="51" width="7" height="7" rx="1.5" />
      <path {...roof} d="M32 47 60 23l28 24" />
    </>,
    contratos: <>
      <path {...sheet} d="M40 20h28l12 12v42a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4Z" />
      <path {...line} d="M68 20v12h12M48 38h20M48 46h24M48 54h14M48 66c3-5 5-5 7 0s4 5 7 0" />
      <circle {...sheet} cx="82" cy="70" r="12" />
      <path {...roof} strokeWidth="3.5" d="m76 69 6-5.5 6 5.5" />
      <circle cx="82" cy="74" r="3" fill="var(--indigo)" />
    </>,
    inquilinos: <>
      <path {...sheet} d="M38 80a22 22 0 0 1 44 0" />
      <circle cx="60" cy="50" r="10" fill="var(--indigo)" />
      <path {...roof} d="M43 37 60 22l17 15" />
    </>,
    cobranzas: <>
      <rect {...sheet} x="32" y="26" width="48" height="46" rx="5" />
      <path {...line} d="M32 38h48M43 21v9M69 21v9" />
      <path {...line} strokeWidth="3.5" d="M42 48h.1M51 48h.1M60 48h.1M42 58h.1M51 58h.1" />
      <circle cx="69" cy="48" r="3.5" fill="var(--rosa)" />
      <circle {...sheet} cx="83" cy="68" r="13" />
      <circle {...line} cx="83" cy="68" r="7" />
    </>,
    alDia: <>
      <circle {...sheet} cx="60" cy="50" r="23" />
      <path {...line} strokeWidth="3.5" d="m50 50 7 7 13-14" />
      <path {...line} d="M90 26v8M86 30h8M28 62v6M25 65h6" />
      <circle cx="33" cy="32" r="3" fill="var(--rosa)" />
    </>,
  };
  return <svg className="owner-empty__art" aria-hidden="true" viewBox="0 0 120 96">
    <circle cx="60" cy="52" r="40" fill="var(--indigo-suave)" />
    {drawings[name]}
  </svg>;
}

/**
 * Un listado que todavía no tiene nada. A diferencia de `EmptyResults` —donde
 * hay datos y el filtro los esconde—, acá falta cargar algo: la pantalla
 * explica qué es y ofrece el paso que sigue. `compact` es para un bloque dentro
 * de otra pantalla, donde un vacío grande se comería el resto.
 */
function EmptyState({ art, title, children, action, compact = false }: Readonly<{ art: EmptyArtName; title: string; children: React.ReactNode; action?: React.ReactNode; compact?: boolean }>) {
  return <div className={`owner-empty owner-empty--first${compact ? " owner-empty--compact" : ""}`}>
    <EmptyArt name={art} />
    <div className="owner-empty__text"><b>{title}</b><span>{children}</span></div>
    {action}
  </div>;
}

function FilterMenu({ active, open, onOpenChange, onClear, resultsLabel, children }: Readonly<{ active: number; open: boolean; onOpenChange: (open: boolean) => void; onClear: () => void; resultsLabel: string; children: React.ReactNode }>) {
  return <div className="owner-filter-anchor">
    <button type="button" className="owner-filter-toggle" aria-expanded={open} onClick={() => onOpenChange(!open)}>
      <Icon name="sliders" size={18} />Filtros
      {active > 0 && <span className="owner-filter-toggle__count">{active}</span>}
    </button>
    {open && <>
      <button type="button" className="owner-panel__scrim" aria-label="Cerrar los filtros" onClick={() => onOpenChange(false)} />
      <dialog open className="owner-panel" aria-label="Filtros">
        <div className="owner-panel__head">
          <b>Filtros</b>
          <button type="button" className="owner-panel__close" onClick={() => onOpenChange(false)} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
        <div className="owner-panel__body">{children}</div>
        <div className="owner-panel__foot">
          <Button tone="quiet" small onClick={onClear}>Limpiar</Button>
          <Button small onClick={() => onOpenChange(false)}>{resultsLabel}</Button>
        </div>
      </dialog>
    </>}
  </div>;
}

function FilterChoices({ id, label, options, isOn, onToggle }: Readonly<{ id: string; label: string; options: readonly (readonly [string, string, number?])[]; isOn: (key: string) => boolean; onToggle: (key: string) => void }>) {
  return <>
    <p className="owner-panel__label" id={id}>{label}</p>
    <section className="owner-chips" aria-labelledby={id}>
      {options.map(([key, text, count]) => (
        <button key={key} type="button" className="owner-chip" aria-pressed={isOn(key)} onClick={() => onToggle(key)}>
          {text}{count !== undefined && <b>{count}</b>}
        </button>
      ))}
    </section>
  </>;
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
  onBack: () => void;
  onEdit: (tenant: TenantRow) => void;
  onArchive: (tenant: TenantRow) => void;
  onCreateContract: () => void;
  onOpenContract: (contractId: number) => void;
  onCopyPaymentLink: (contractId: number) => void | Promise<unknown>;
  onResendPaymentLink: (contractId: number) => void | Promise<unknown>;
}>;

function TenantDetail({
  selectedId,
  tenants,
  hasError,
  onBack,
  onEdit,
  onArchive,
  onCreateContract,
  onOpenContract,
  onCopyPaymentLink,
  onResendPaymentLink,
}: TenantDetailProps) {
  const tenant = tenants?.find((item) => String(item.id) === selectedId);
  const breadcrumb = <nav className="owner-crumb"><button type="button" onClick={onBack}>Inquilinos</button><span>/</span><span>{tenant?.nombre ?? "…"}</span></nav>;

  if (!tenant) {
    return <>{breadcrumb}<div className="owner-card">{hasError ? <LoadError title="No pudimos cargar este inquilino" card={false} /> : <Cargando>Cargando el inquilino…</Cargando>}</div></>;
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
          <PaymentLinkBox contractId={tenant.contratoId} onCopyPaymentLink={onCopyPaymentLink} onResendPaymentLink={onResendPaymentLink} />
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
  const isEmpty = !hasError && tenants?.length === 0;
  const createButton = <Button onClick={onCreateTenant}><Icon name="plus" size={18} />Agregar inquilino</Button>;
  // Vacía, la acción baja al centro: dos primarios iguales en la misma pantalla
  // no dicen cuál tocar. Mientras carga tampoco va: todavía no se sabe dónde
  // corresponde, y mostrarlo para sacarlo un instante después es un parpadeo.
  const showHeaderAction = hasError || (tenants?.length ?? 0) > 0;
  return <>
    <header className="owner-page-head"><div><h1>Inquilinos</h1><p>{description}</p></div>{showHeaderAction && <div className="owner-page-head__action">{createButton}</div>}</header>
    {isEmpty ? <EmptyState art="inquilinos" title="Todavía no cargó ningún inquilino" action={createButton}>Cargue sus datos una sola vez y úselos en cada contrato. A su correo le llegan los avisos de vencimiento.</EmptyState> : <div className="owner-list">
      {hasError && <LoadError title="No pudimos cargar sus inquilinos" card={false} />}
      {!hasError && tenants === null && <Cargando>Cargando sus inquilinos…</Cargando>}
      {tenants?.map((tenant) => <TenantListRow key={tenant.id} tenant={tenant} onOpenTenant={onOpenTenant} onCreateContract={onCreateContract} />)}
    </div>}
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState("");
  const found = contracts ? buscarContratos(contracts, query) : [];
  const visibleContracts = filtrarContratos(found, filter);
  const counts = contracts ? contarContratos(found) : { vigentes: 0, porTerminar: 0, programados: 0, finalizados: 0 };
  const filters: [FiltroContrato, string][] = [
    ["vigentes", "Vigentes"],
    ["porTerminar", "Por terminar"],
    ...(counts.programados > 0 ? [["programados", "Programados"] as [FiltroContrato, string]] : []),
    ["finalizados", "Finalizados"],
  ];

  const isEmpty = contracts?.length === 0;
  // Igual que en Inquilinos: ni vacía ni mientras carga.
  const showHeaderAction = hasError || (contracts?.length ?? 0) > 0;
  const createButton = <Button onClick={onCreateContract}><Icon name="plus" size={18} />Nuevo contrato</Button>;

  return <>
    <header className="owner-page-head"><div><h1>Contratos</h1><p>{contracts ? resumenContratos(contracts) : "Sus contratos y sus condiciones."}</p></div>{showHeaderAction && <div className="owner-page-head__action">{createButton}</div>}</header>
    {hasError && <LoadError title="No pudimos cargar sus contratos" />}
    {!hasError && contracts === null && <div className="owner-card"><Cargando>Cargando sus contratos…</Cargando></div>}
    {isEmpty && <EmptyState art="contratos" title="Todavía no tiene contratos" action={createButton}>Un contrato vincula una propiedad con su inquilino y define el alquiler. A partir de él se emiten las cuotas de cada mes.</EmptyState>}
    {contracts && contracts.length > 0 && <>
      <div className="owner-search-bar">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar por dirección o inquilino" label="Buscar contratos" />
        <FilterMenu active={filter === "vigentes" ? 0 : 1} open={panelOpen} onOpenChange={setPanelOpen} onClear={() => onFilterChange("vigentes")}
          resultsLabel={`Ver ${visibleContracts.length} ${visibleContracts.length === 1 ? "contrato" : "contratos"}`}>
          <FilterChoices id="f-contrato" label="Estado" options={filters.map(([key, label]) => [key, label, counts[key]] as const)} isOn={(key) => filter === key} onToggle={(key) => onFilterChange(key as FiltroContrato)} />
        </FilterMenu>
      </div>
      {visibleContracts.length === 0 ? <EmptyResults noun="contratos" query={query} found={found.length} stateLabel={(filters.find(([key]) => key === filter)?.[1] ?? "").toLowerCase()} onClearSearch={() => setQuery("")}
        otherState={(() => { const next = filters.find(([key]) => counts[key] > 0); return next ? { label: next[1].toLowerCase(), apply: () => onFilterChange(next[0]) } : null; })()} /> : <div className="owner-list">
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
  onConfirm: (item: FilaCobranza) => void;
  onAdjust: (item: FilaCobranza) => void;
  onViewReceipt: (paymentId: number) => void | Promise<unknown>;
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
      <Button tone="quiet" small disabled={isBusy || !canAdjust} onClick={() => onAdjust(item)}>Ajustar importe</Button>
      <Button tone="secondary" small disabled={isBusy} onClick={() => onConfirm(item)}>Confirmar importe</Button>
    </>;
  }
  if (item.accion === "comprobante") {
    return <Button tone="secondary" small disabled={!item.pagoConfirmado} onClick={() => {
      return item.pagoConfirmado ? onViewReceipt(item.pagoConfirmado.id) : undefined;
    }}><Icon name="download" size={16} />Comprobante</Button>;
  }
  return <Button tone="secondary" small onClick={() => onRegisterPayment(item)}>Registrar pago</Button>;
}

type CollectionsViewProps = Readonly<{
  collections: FilaCobranza[] | null;
  hasError: boolean;
  filter: FiltroCobranza;
  onFilterChange: (filter: FiltroCobranza) => void;
  isBusy: boolean;
  canAdjust: boolean;
  onReview: (item: FilaCobranza) => void;
  onConfirm: (item: FilaCobranza) => void;
  onAdjust: (item: FilaCobranza) => void;
  onViewReceipt: (paymentId: number) => void | Promise<unknown>;
  onRegisterPayment: (item: FilaCobranza) => void;
  onCreateContract: () => void;
}>;

function CollectionsView({
  collections,
  hasError,
  filter,
  onFilterChange,
  isBusy,
  canAdjust,
  onReview,
  onConfirm,
  onAdjust,
  onViewReceipt,
  onRegisterPayment,
  onCreateContract,
}: CollectionsViewProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState("");
  const found = collections ? buscarCobranzas(collections, query) : [];
  const visibleCollections = filtrar(found, filter);
  const counts = contarPorFiltro(found);
  const filters: [FiltroCobranza, string][] = [["todas", "Todas"], ["vencidas", "Vencidas"], ["aVencer", "A vencer"], ["pagadas", "Pagadas"]];

  return <>
    <header className="owner-page-head"><div><h1>Cobranzas</h1><p>{collections ? resumenCobranzas(collections) : "Cuotas, pagos y vencimientos."}</p></div></header>
    {hasError && <LoadError title="No pudimos cargar sus cobranzas" />}
    {!hasError && collections === null && <div className="owner-card"><Cargando>Cargando sus cobranzas…</Cargando></div>}
    {collections?.length === 0 && <EmptyState art="cobranzas" title="Todavía no hay cuotas" action={<Button onClick={onCreateContract}><Icon name="plus" size={18} />Nuevo contrato</Button>}>Las cuotas se emiten solas a partir de sus contratos activos. Acá va a ver qué se pagó y qué está por vencer.</EmptyState>}
    {collections && collections.length > 0 && <>
      <div className="owner-search-bar">
        <SearchField value={query} onChange={setQuery} placeholder="Buscar por dirección o inquilino" label="Buscar cuotas" />
        <FilterMenu active={filter === "todas" ? 0 : 1} open={panelOpen} onOpenChange={setPanelOpen}
          onClear={() => onFilterChange("todas")}
          resultsLabel={`Ver ${visibleCollections.length} ${visibleCollections.length === 1 ? "cuota" : "cuotas"}`}>
          <FilterChoices id="f-cuota" label="Estado" options={filters.map(([key, label]) => [key, label, counts[key]] as const)} isOn={(key) => filter === key} onToggle={(key) => onFilterChange(key as FiltroCobranza)} />
        </FilterMenu>
      </div>
      {visibleCollections.length === 0 ? <EmptyResults noun="cuotas" query={query} found={found.length} stateLabel={(filters.find(([key]) => key === filter)?.[1] ?? "").toLowerCase()} onClearSearch={() => setQuery("")}
        otherState={{ label: "todas", apply: () => onFilterChange("todas") }} /> : <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th data-cell="propiedad">Propiedad</th><th data-cell="monto" className="owner-number">Monto</th><th data-cell="vencimiento">Vencimiento</th><th data-cell="estado">Estado</th><th data-cell="accion">Acción</th></tr></thead><tbody>
        {visibleCollections.map((item) => <tr key={item.invoiceId}><td data-cell="propiedad"><b>{item.direccion}</b><small>{item.inquilino} · {item.periodo}</small></td><td data-cell="monto" className="owner-number owner-money">{item.monto}</td><td data-cell="vencimiento">{item.vencimiento}</td><td data-cell="estado"><Status>{item.estado}</Status>{!item.confirmada && <small className="owner-substatus"><Icon name="alert" size={15} /><span className="sr-only">Importe </span>Sin confirmar</small>}</td><td data-cell="accion"><CollectionAction item={item} isBusy={isBusy} canAdjust={canAdjust} onReview={onReview} onConfirm={onConfirm} onAdjust={onAdjust} onViewReceipt={onViewReceipt} onRegisterPayment={onRegisterPayment} /></td></tr>)}
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
  onOpenContract: (contractId: number) => void;
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

/**
 * Sin propiedades, «Nuevo contrato» lleva a un asistente sin nada para elegir:
 * el paso que falta es cargar la propiedad. Va en secondary porque el
 * primario de la pantalla ya está en el encabezado.
 */
function NoActiveContracts({ hasProperties, onCreateProperty, onCreateContract }: Readonly<{ hasProperties: boolean; onCreateProperty: () => void; onCreateContract: () => void }>) {
  if (!hasProperties) {
    return <EmptyState art="contratos" title="Todavía no tiene contratos vigentes" action={<Button tone="secondary" onClick={onCreateProperty}><Icon name="plus" size={18} />Agregar propiedad</Button>}>Empiece por cargar su primera propiedad. Después la vincula con su inquilino en un contrato.</EmptyState>;
  }
  return <EmptyState art="contratos" title="Todavía no tiene contratos vigentes" action={<Button tone="secondary" onClick={onCreateContract}><Icon name="plus" size={18} />Nuevo contrato</Button>}>Un contrato vincula una propiedad con un inquilino y define el alquiler.</EmptyState>;
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
  onOpenContract,
}: OverviewProps) {
  const actions = <>
    <Button tone="secondary" onClick={onCreateProperty}><Icon name="plus" size={18} />Agregar propiedad</Button>
    <Button onClick={onCreateContract}><Icon name="file" size={18} />Nuevo contrato</Button>
  </>;
  const header = <header className="owner-page-head"><div><h1>{greeting}</h1><p>{subtitle}</p></div><div className="owner-page-head__action">{actions}</div></header>;

  if (hasError) return <>{header}<LoadError title="No pudimos cargar su panel" /></>;
  if (data === null) return <>{header}<div className="owner-card"><Cargando>Cargando su panel…</Cargando></div></>;

  const { cobranza, cartera, avisos, contratos } = data;
  const percent = proporciones(cobranza);
  const cuotasCobradasLabel = cobranza.cuotas === 1 ? "cuota cobrada" : "cuotas cobradas";
  return <>
    {header}
    <section className="owner-portfolio" aria-label="Resumen de cobranzas">
      <div className="owner-portfolio__money">
        <p className="owner-eyebrow">COBRANZA DE {currentMonth.toUpperCase()}</p>
        {cobranza.cuotas === 0 ? <div className="owner-portfolio__empty"><EmptyArt name="cobranzas" /><div><b>Todavía no hay cuotas emitidas este mes</b><span>Se emiten solas a partir de sus contratos activos.</span></div></div> : <>
          <strong>{formatearMonto(cobranza.cobrado)}</strong>
          <p>de {formatearMonto(cobranza.emitido)} emitidos este mes · {cobranza.cobradas} de {cobranza.cuotas} {cuotasCobradasLabel}</p>
          <div className="owner-meter" aria-label={cobranza.emitido > 0 ? `${percent.cobrado}% cobrado, ${percent.aVencer}% por vencer y ${percent.vencido}% vencido` : "Sin montos emitidos"}>{cobranza.cobrado > 0 && <i className="owner-meter__ok" style={{ flexGrow: cobranza.cobrado }} />}{cobranza.aVencer > 0 && <i className="owner-meter__warn" style={{ flexGrow: cobranza.aVencer }} />}{cobranza.vencido > 0 && <i className="owner-meter__bad" style={{ flexGrow: cobranza.vencido }} />}</div>
          <div className="owner-key"><span><Icon name="check" />Cobrado <b>{formatearMonto(cobranza.cobrado)}</b></span><span><Icon name="clock" />A vencer <b>{formatearMonto(cobranza.aVencer)}</b></span><span><Icon name="x" />Vencido <b>{formatearMonto(cobranza.vencido)}</b></span></div>
        </>}
      </div>
      <div className="owner-portfolio__summary">
        <div><p className="owner-eyebrow">PROPIEDADES</p><b>{cartera.total}</b><small>{cartera.total === 0 ? "Todavía no cargó ninguna" : `${cartera.conContrato} con contrato activo · ${cartera.sinAlquilar} sin alquilar`}</small></div>
        <ProjectedSummary projection={projection} nextMonth={nextMonth} />
      </div>
    </section>
    <section className="owner-section"><div className="owner-section__head"><h2>Requieren su acción</h2>{avisos.length > 0 && <Button tone="secondary" small onClick={onOpenCollections}>Ir a cobranzas</Button>}</div>{avisos.length === 0 ? <EmptyState compact art="alDia" title="Nada pendiente por ahora">{contratos.length > 0 ? "Sus cuotas están al día." : "Cuando tenga contratos, acá le avisamos qué cuotas vencen o esperan su confirmación."}</EmptyState> : <div className="owner-notices">{avisos.map((notice) => <Notice key={notice.id} tone={notice.tono} title={notice.titulo} action={<Button tone="secondary" small onClick={onOpenCollections}>{notice.accion}</Button>}>{notice.cuerpo}</Notice>)}</div>}</section>
    <section className="owner-section"><div className="owner-section__head"><h2>Contratos activos</h2>{contratos.length > 0 && <Button tone="secondary" small onClick={onCreateContract}><Icon name="plus" size={17} />Nuevo contrato</Button>}</div>{contratos.length === 0 ? <NoActiveContracts hasProperties={cartera.total > 0} onCreateProperty={onCreateProperty} onCreateContract={onCreateContract} /> : <div className="owner-list">{contratos.map((contract) => <button type="button" className="owner-row owner-row--button" key={contract.id} onClick={() => onOpenContract(contract.id)}><span className="owner-row__icon"><Icon name="building" /></span><span className="owner-row__body"><b>{formatearDireccion(contract.property)}</b><small>{contract.tenant.firstName} {contract.tenant.lastName} · termina el {formatearFecha(contract.endDate)}</small></span><span className="owner-row__amount"><b>{formatearMonto(contract.currentRent)}</b><small>por mes</small></span><Status>Vigente</Status><span className="owner-row__arrow"><Icon name="arrow" /></span></button>)}</div>}</section>
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
  onEdit: (property: PropertyResponse) => void;
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
  onEdit,
}: PropertyDetailProps) {
  if (demo) {
    return <DemoPropertyDetail demoProperty={demoProperty} onBack={onBack} onCreateContract={onCreateContract} onOpenDemoContract={onOpenDemoContract} />;
  }

  const rawProperty = rawProperties.find((property) => String(property.id) === selectedId);
  const property = properties?.find((item) => String(item.id) === selectedId);
  if (!rawProperty || !property) {
    const body = hasError ? <LoadError title="No pudimos cargar esta propiedad" card={false} /> : <Cargando>Cargando la propiedad…</Cargando>;
    return <><PropertyBreadcrumb name="…" onBack={onBack} /><div className="owner-card">{body}</div></>;
  }

  const { details, preferences } = propertyCharacteristics(rawProperty);
  const address = [property.direccion, rawProperty.city, rawProperty.postalCode, rawProperty.province].filter(Boolean).join(", ");
  const contractTitle = rawProperty.tenant
    ? `Contrato con ${rawProperty.tenant.firstName} ${rawProperty.tenant.lastName}`
    : "Contrato vigente";
  const headerActions = <><Button tone="secondary" onClick={() => onEdit(rawProperty)}><Icon name="edit" size={18} />Editar</Button><Button tone="danger" onClick={() => onArchive(property)}><Icon name="archive" size={18} />Archivar</Button></>;
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
  account: AccountSummary | null;
  canEditAccount: boolean;
  onEditReminders: (settings: ReminderSettingsResponse) => void;
  onEditAccount: () => void;
}>;

function SettingsView({
  reminderSettings,
  hasReminderError,
  account,
  canEditAccount,
  onEditReminders,
  onEditAccount,
}: SettingsViewProps) {
  let reminders: React.ReactNode;
  if (hasReminderError) {
    reminders = <LoadError title="No pudimos cargar los recordatorios" card={false} />;
  } else if (reminderSettings === null) {
    reminders = <Cargando>Cargando los recordatorios…</Cargando>;
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
    const activos = ciudades.length + dorms.length + extras.length + (estado === "todas" ? 0 : 1);
    const etiquetaEstado = { todas: "Todas", conContrato: "Con contrato", sinAlquilar: "Sin alquilar" } as const;
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
      ...(estado === "todas" ? [] : [{ k: "estado", texto: etiquetaEstado[estado], quitar: () => setEstado("todas") }]),
    ];
    const limpiar = () => { setCiudades([]); setDorms([]); setExtras([]); setQuery(""); setEstado("todas"); };

    const accion = <Button onClick={beginCreation}><Icon name="plus" size={18} />Agregar propiedad</Button>;

    if (propiedadesError) {
      return <>
        {pageHeader("Propiedades", "", accion)}
        <LoadError title="No pudimos cargar sus propiedades" />
      </>;
    }

    if (propiedades === null) {
      // Sin el botón: si la lista llega vacía baja al centro, y mostrarlo acá
      // para sacarlo un instante después es un parpadeo.
      return <>{pageHeader("Propiedades", "")}<div className="owner-card"><Cargando>Cargando sus propiedades…</Cargando></div></>;
    }

    // Sin ninguna propiedad no hay nada que filtrar: la pantalla ofrece el paso
    // que falta en vez de un buscador vacío.
    if (propiedades.length === 0) {
      return <>
        {pageHeader("Propiedades", resumenPropiedades(propiedades))}
        <EmptyState art="propiedades" title="Todavía no cargó ninguna propiedad" action={accion}>
          Cargue la primera con su dirección y sus características. Después la vincula con su inquilino en un contrato.
        </EmptyState>
      </>;
    }

    return (
      <>
        {pageHeader("Propiedades", resumenPropiedades(propiedades), accion)}

        <div className="owner-search-bar">
          <SearchField value={query} onChange={setQuery} placeholder="Buscar por dirección, ciudad o inquilino" label="Buscar propiedades" />
          <FilterMenu active={activos} open={panelAbierto} onOpenChange={setPanelAbierto}
            onClear={() => { setCiudades([]); setDorms([]); setExtras([]); setEstado("todas"); }}
            resultsLabel={`Ver ${visibles.length} ${visibles.length === 1 ? "propiedad" : "propiedades"}`}>
            {/* Sin el contrato en la respuesta, «Con contrato» y «Sin alquilar»
                contarían todo como libre. El filtro se omite entero: es el mismo dato faltante. */}
            {!sinDatoDeContrato && <FilterChoices id="f-estado" label="Estado"
              options={([["todas", "Todas"], ["conContrato", "Con contrato"], ["sinAlquilar", "Sin alquilar"]] as const).map(([k, txt]) => [k, txt, cuenta[k]] as const)}
              isOn={(k) => estado === k} onToggle={(k) => setEstado(k as typeof estado)} />}
            <FilterChoices id="f-ciudad" label="Ciudad" options={ciudadesDisponibles.map((c) => [c, c] as const)}
              isOn={(c) => ciudades.includes(c)} onToggle={(c) => alterna(ciudades, setCiudades, c)} />
            <FilterChoices id="f-dorm" label="Dormitorios" options={["1", "2", "3", "4+"].map((d) => [d, d] as const)}
              isOn={(d) => dorms.includes(d)} onToggle={(d) => alterna(dorms, setDorms, d)} />
            <FilterChoices id="f-extra" label="Características" options={Object.entries(etiquetaExtra)}
              isOn={(k) => extras.includes(k)} onToggle={(k) => alterna(extras, setExtras, k)} />
          </FilterMenu>
        </div>

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
    return <div className="owner-card"><h2>Historial de aumentos</h2><Cargando>Cargando el historial…</Cargando></div>;
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
  onBack: () => void;
  onOpenContract: (contractId: number) => void;
  onOpenConditions: () => void;
  onBeginTermination: () => void;
  onCopyDemoLink: () => void;
  onCopyPaymentLink: (contractId: number) => void | Promise<unknown>;
  onResendPaymentLink: (contractId: number) => void | Promise<unknown>;
  onDownloadDocument: (contract: ContractResponse) => void | Promise<unknown>;
  onRemoveDocument: (contractId: number) => void | Promise<unknown>;
  onAttachDocument: (contractId: number, file: File) => void | Promise<unknown>;
}>;

function ContractBreadcrumb({ name, onBack }: Readonly<{ name: string; onBack: () => void }>) {
  return <nav className="owner-crumb"><button type="button" onClick={onBack}>Contratos</button><span>/</span><span>{name}</span></nav>;
}

function DemoContractDetail({ demoContract, onBack, onCopyDemoLink }: Readonly<{
  demoContract: ContractDetailProps["demoContract"];
  onBack: () => void;
  onCopyDemoLink: () => void;
}>) {
  const document = demoContract.document
    ? <div className="owner-document"><span><Icon name="file" /></span><div><b>{demoContract.document}</b><small>PDF · 2,4 MB</small></div><Button tone="quiet" small><Icon name="download" size={16} />Descargar</Button></div>
    : <div className="owner-empty-callout owner-empty-callout--outline"><Icon name="paperclip" /><div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div><Button small>Adjuntar</Button></div>;
  return <><ContractBreadcrumb name={demoContract.property.address} onBack={onBack} /><header className="owner-page-head"><div><h1>{demoContract.property.address}</h1><p>Contrato con {demoContract.property.tenant} · vigente hasta el {demoContract.end}</p></div><div className="owner-page-head__action"><Button tone="danger">Finalizar contrato</Button></div></header><section className="owner-detail-grid owner-detail-grid--even"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ALQUILER ACTUAL</p><strong className="owner-detail-money">{demoContract.property.rent}</strong><small>por mes · vence el día 1</small></div><Status>{demoContract.property.state}</Status></div><div className="owner-timeline"><div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>01/03/2025</small></p></div><div><span><Icon name="trend" /></span><p><b>Próxima actualización</b><small>01/09/2026 · {demoContract.increment}</small></p></div><div><span><Icon name="calendar" /></span><p><b>Fin previsto</b><small>{demoContract.end}</small></p></div></div></div><div className="owner-card"><h2>Inquilino y acceso de pago</h2><div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>{demoContract.property.tenant}</b></div></div><div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace para comprobantes</b></span></div><Button tone="secondary" small onClick={onCopyDemoLink}><Icon name="copy" size={16} />Copiar enlace</Button></div></div><div className="owner-card"><h2>Documento firmado</h2>{document}</div></section></>;
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

function PaymentLinkBox({ contractId, onCopyPaymentLink, onResendPaymentLink }: Readonly<{ contractId: number; onCopyPaymentLink: (contractId: number) => void | Promise<unknown>; onResendPaymentLink: (contractId: number) => void | Promise<unknown> }>) {
  return <div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>El inquilino sube sus comprobantes desde ahí, sin cuenta.</small></span></div><div className="owner-link-actions"><Button tone="secondary" small onClick={() => onCopyPaymentLink(contractId)}><Icon name="copy" size={16} />Copiar enlace</Button><Button tone="secondary" small onClick={() => onResendPaymentLink(contractId)}>Reenviar por correo</Button></div></div>;
}

function ContractAccessCard({ contract, onCopyPaymentLink, onResendPaymentLink }: Readonly<{ contract: ContractResponse; onCopyPaymentLink: (contractId: number) => void | Promise<unknown>; onResendPaymentLink: (contractId: number) => void | Promise<unknown> }>) {
  return <div className="owner-card"><h2>Inquilino y acceso de pago</h2><div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>{contract.tenant.firstName} {contract.tenant.lastName}</b><small>{contract.tenant.email}</small></div></div><PaymentLinkBox contractId={contract.id} onCopyPaymentLink={onCopyPaymentLink} onResendPaymentLink={onResendPaymentLink} /></div>;
}

function ContractDocumentCard({ contract, onDownloadDocument, onRemoveDocument, onAttachDocument }: Readonly<{ contract: ContractResponse; onDownloadDocument: (contract: ContractResponse) => void | Promise<unknown>; onRemoveDocument: (contractId: number) => void | Promise<unknown>; onAttachDocument: (contractId: number, file: File) => void | Promise<unknown> }>) {
  const [attaching, setAttaching] = useState(false);
  function attach(file: File) {
    setAttaching(true);
    void Promise.resolve(onAttachDocument(contract.id, file)).finally(() => setAttaching(false));
  }
  const document = contract.documentFileName ? <div className="owner-document"><span><Icon name="file" /></span><div><b>{contract.documentFileName}</b><small>{descripcionDocumento(contract)}</small></div><Button tone="quiet" small onClick={() => onDownloadDocument(contract)}><Icon name="download" size={16} />Descargar</Button><Button tone="quiet" small onClick={() => onRemoveDocument(contract.id)}>Quitar</Button></div> : <div className="owner-empty-callout owner-empty-callout--outline"><Icon name="paperclip" /><div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div><label className="owner-file-label"><input type="file" className="sr-only" aria-label="Adjuntar el documento firmado" disabled={attaching} onChange={(event) => { const file = event.target.files?.[0]; if (file) attach(file); }} /><span className="owner-button owner-button--primary owner-button--small" aria-busy={attaching || undefined}>{attaching && <Spinner />}{attaching ? "Adjuntando…" : "Adjuntar"}</span></label></div>;
  return <div className="owner-card"><h2>Documento firmado</h2>{document}</div>;
}

function ContractDetail({
  demo,
  demoContract,
  contractLoad,
  increments,
  scheduledContract,
  successorId,
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
    return <DemoContractDetail demoContract={demoContract} onBack={onBack} onCopyDemoLink={onCopyDemoLink} />;
  }

  if (contractLoad !== null && "error" in contractLoad) {
    return <><ContractBreadcrumb name="…" onBack={onBack} /><LoadError title="No pudimos cargar este contrato" /></>;
  }
  if (contractLoad === null) {
    return <><ContractBreadcrumb name="…" onBack={onBack} /><div className="owner-card"><Cargando>Cargando el contrato…</Cargando></div></>;
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
      <ContractAccessCard contract={contract} onCopyPaymentLink={onCopyPaymentLink} onResendPaymentLink={onResendPaymentLink} />
      <ContractDocumentCard contract={contract} onDownloadDocument={onDownloadDocument} onRemoveDocument={onRemoveDocument} onAttachDocument={onAttachDocument} />
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
  form,
  editingId,
  error,
  isBusy,
  onClose,
  onFormChange,
  onStartEdit,
  onRemove,
  onSave,
  onCancelEdit,
}: Readonly<{
  invoice: FilaCobranza;
  form: FormularioItem;
  editingId: number | null;
  error: string | null;
  isBusy: boolean;
  onClose: () => void;
  onFormChange: (form: FormularioItem) => void;
  onStartEdit: (adjustment: AdjustmentResponse) => void;
  onRemove: (adjustmentId: number) => void;
  onSave: () => void;
  onCancelEdit: () => void;
}>) {
  const total = totalPrevisualizado(invoice.importeBase, invoice.ajustes, form, editingId);
  const puedeGuardar = itemValido(form, invoice.importeBase, invoice.ajustes, editingId);
  const esPorcentaje = form.valueType === "PERCENTAGE";
  const esSuma = form.kind === "SURCHARGE";
  const saveLabel = isBusy ? "Guardando…" : editingId === null ? "Agregar ítem" : "Guardar ítem";
  const previewLinea =
    form.value > 0
      ? describirAjuste(
          { id: -1, name: form.nombre, kind: form.kind, valueType: form.valueType, value: form.value },
          invoice.importeBase
        )
      : null;
  const previewTexto = previewLinea
    ? `Este ítem: ${previewLinea.efecto}${previewLinea.detalle ? ` · ${previewLinea.detalle}` : ""}`
    : "Agregá un ítem: nombre, tipo (suma o resta) y valor (monto o porcentaje).";
  return <Dialog title="Ajustar el importe de la cuota" onClose={onClose}><div className="owner-dialog__body"><p>{invoice.direccion} · cuota de {invoice.periodo}.</p><dl className="owner-definition"><div><dt>Importe base</dt><dd>{formatearMonto(invoice.importeBase)}</dd></div>{invoice.ajustes.map((adjustment) => { const line = describirAjuste(adjustment, invoice.importeBase); const detail = line.detalle ? ` · ${line.detalle}` : ""; return <div key={line.id} className="owner-ajuste-item"><dt>{line.nombre}{detail}</dt><dd>{line.efecto}</dd><div className="owner-ajuste-item__acciones"><button type="button" className="owner-ajuste-accion" disabled={isBusy} onClick={() => onStartEdit(adjustment)}><Icon name="edit" size={15} />Editar</button><button type="button" className="owner-ajuste-accion owner-ajuste-accion--quitar" disabled={isBusy} onClick={() => onRemove(line.id)}><Icon name="x" size={15} />Quitar</button></div></div>; })}<div><dt>Total</dt><dd><b>{formatearMonto(total)}</b></dd></div></dl><div className="owner-wizard-stack"><label className="owner-wizard-field"><span className="sr-only">Nombre del ítem</span><input placeholder="Ítem — ej.: Baño roto" value={form.nombre} onChange={(event) => onFormChange({ ...form, nombre: event.target.value })} /></label><div className="owner-wizard-chips" role="group" aria-label="Suma o resta"><button type="button" aria-pressed={esSuma} onClick={() => onFormChange({ ...form, kind: "SURCHARGE" })}>Suma (recargo)</button><button type="button" aria-pressed={!esSuma} onClick={() => onFormChange({ ...form, kind: "DISCOUNT" })}>Resta (descuento)</button></div><div className="owner-wizard-chips" role="group" aria-label="Tipo de valor"><button type="button" aria-pressed={!esPorcentaje} onClick={() => onFormChange({ ...form, valueType: "FIXED_AMOUNT" })}>Monto fijo</button><button type="button" aria-pressed={esPorcentaje} onClick={() => onFormChange({ ...form, valueType: "PERCENTAGE" })}>Porcentaje</button></div><label className="owner-wizard-field owner-wizard-field--amount"><span>{esPorcentaje ? "%" : "$"}</span><input inputMode="numeric" aria-label={esPorcentaje ? "Porcentaje del ítem" : "Monto del ítem"} value={form.value || ""} onChange={(event) => onFormChange({ ...form, value: Number(event.target.value.replace(/\D/g, "")) })} />{esPorcentaje && <span>del importe base</span>}</label><output className="owner-wizard-help">{previewTexto}</output><div className="owner-wizard-actions">{editingId !== null && <Button tone="quiet" onClick={onCancelEdit} disabled={isBusy}>Cancelar edición</Button>}<Button disabled={isBusy || !puedeGuardar} onClick={onSave}>{saveLabel}</Button></div></div><aside className="owner-wizard-note"><Icon name="alert" />Se puede ajustar mientras la cuota no esté confirmada. Al confirmarla, el importe queda cerrado.</aside>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cerrar</Button></div></Dialog>;
}

function RemoveInvoiceAdjustmentDialog({ error, isBusy, onClose, onRemove }: Readonly<{ error: string | null; isBusy: boolean; onClose: () => void; onRemove: () => void }>) {
  const buttonLabel = isBusy ? "Quitando…" : "Quitar";
  return <Dialog title="Quitar este ajuste" onClose={onClose}><div className="owner-dialog__body"><p>El total de la cuota vuelve a calcularse sin él.</p>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" busy={isBusy} onClick={onRemove}>{buttonLabel}</Button></div></Dialog>;
}

function ArchiveTenantDialog({ tenant, error, isBusy, onClose, onArchive }: Readonly<{ tenant: TenantRow; error: string | null; isBusy: boolean; onClose: () => void; onArchive: () => void }>) {
  const buttonLabel = isBusy ? "Archivando…" : "Archivar";
  return <Dialog title="Archivar este inquilino" onClose={onClose}><div className="owner-dialog__body"><p><b>{tenant.nombre}</b> sale de la lista de inquilinos. Su historia —contratos, cuotas y pagos— se conserva, y puede volver a mostrarlo cuando quiera.</p>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" busy={isBusy} onClick={onArchive}>{buttonLabel}</Button></div></Dialog>;
}

function isPropertyValid(property: PropertyRequest | null): boolean {
  if (!property) return false;
  return [property.street, property.number, property.city, property.province].every((value) => value.trim());
}

function numeroOpcional(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

function PropertyEditDialog({ property, error, isBusy, isValid, onClose, onChange, onSave }: Readonly<{ property: PropertyRequest; error: string | null; isBusy: boolean; isValid: boolean; onClose: () => void; onChange: (property: PropertyRequest) => void; onSave: () => void }>) {
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  return <Dialog title="Editar propiedad" onClose={onClose}><div className="owner-dialog__body"><div className="owner-wizard-stack">
    <div className="owner-wizard-duo">
      <label className="owner-wizard-field"><span>Calle</span><input placeholder="Ej: Lavalle" value={property.street} onChange={(event) => onChange({ ...property, street: event.target.value })} /></label>
      <label className="owner-wizard-field"><span>Número</span><input placeholder="Ej: 950" value={property.number} onChange={(event) => onChange({ ...property, number: event.target.value })} /></label>
    </div>
    <label className="owner-wizard-field"><span>Piso y depto.</span><input placeholder="Ej: 2B — si corresponde" value={property.floorUnit ?? ""} onChange={(event) => onChange({ ...property, floorUnit: event.target.value || undefined })} /></label>
    <div className="owner-wizard-duo">
      <label className="owner-wizard-field"><span>Ciudad</span><input placeholder="Ej: Morón" value={property.city} onChange={(event) => onChange({ ...property, city: event.target.value })} /></label>
      <label className="owner-wizard-field"><span>Provincia</span><input placeholder="Ej: Buenos Aires" value={property.province} onChange={(event) => onChange({ ...property, province: event.target.value })} /></label>
    </div>
    <label className="owner-wizard-field"><span>Tipo</span><select value={property.category} onChange={(event) => onChange({ ...property, category: event.target.value as PropertyRequest["category"] })}>{CATEGORIAS.map((categoria) => <option key={categoria.valor} value={categoria.valor}>{categoria.etiqueta}</option>)}</select></label>
    <div className="owner-wizard-duo">
      <label className="owner-wizard-field"><span>Dormitorios</span><input type="number" min={0} inputMode="numeric" value={property.bedrooms ?? ""} onChange={(event) => onChange({ ...property, bedrooms: numeroOpcional(event.target.value) })} /></label>
      <label className="owner-wizard-field"><span>Baños</span><input type="number" min={0} inputMode="numeric" value={property.bathrooms ?? ""} onChange={(event) => onChange({ ...property, bathrooms: numeroOpcional(event.target.value) })} /></label>
    </div>
    <label className="owner-wizard-field"><span>Superficie cubierta (m²)</span><input type="number" min={0} inputMode="decimal" value={property.coveredArea ?? ""} onChange={(event) => onChange({ ...property, coveredArea: numeroOpcional(event.target.value) })} /></label>
    <div className="owner-wizard-chips">
      <button type="button" aria-pressed={Boolean(property.petsAllowed)} onClick={() => onChange({ ...property, petsAllowed: !property.petsAllowed })}>Acepta mascotas</button>
      <button type="button" aria-pressed={Boolean(property.furnished)} onClick={() => onChange({ ...property, furnished: !property.furnished })}>Amoblado</button>
    </div>
  </div>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button busy={isBusy} disabled={!isValid} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function ArchivePropertyDialog({ property, error, isBusy, onClose, onArchive }: Readonly<{ property: FilaPropiedad; error: string | null; isBusy: boolean; onClose: () => void; onArchive: () => void }>) {
  const buttonLabel = isBusy ? "Archivando…" : "Archivar";
  return <Dialog title="Archivar esta propiedad" onClose={onClose}><div className="owner-dialog__body"><p><b>{property.direccion}</b> sale de la lista de propiedades. Su historia —contratos, cuotas y pagos— se conserva, y puede volver a mostrarla cuando quiera.</p>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" busy={isBusy} onClick={onArchive}>{buttonLabel}</Button></div></Dialog>;
}

function TerminateContractDialog({ endDate, error, isBusy, onClose, onEndDateChange, onTerminate }: Readonly<{ endDate: string; error: string | null; isBusy: boolean; onClose: () => void; onEndDateChange: (date: string) => void; onTerminate: () => void }>) {
  const buttonLabel = isBusy ? "Finalizando…" : "Finalizar contrato";
  return <Dialog title="Finalizar este contrato" onClose={onClose}><div className="owner-dialog__body"><p>El contrato queda terminado desde la fecha que indique. <b>Las cuotas posteriores que todavía no estén pagas se eliminan</b>; las ya cobradas y su historial se conservan.</p><label className="owner-wizard-field owner-wizard-field--medium"><span className="owner-wizard-label">FECHA DE TERMINACIÓN</span><input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} /></label>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button tone="danger" busy={isBusy} disabled={!endDate} onClick={onTerminate}>{buttonLabel}</Button></div></Dialog>;
}

function PaymentReviewDialog({ row, error, isBusy, onClose, onViewReceipt, onRejectPayment, onConfirmPayment }: Readonly<{ row: FilaCobranza; error: string | null; isBusy: boolean; onClose: () => void; onViewReceipt: (paymentId: number) => void | Promise<unknown>; onRejectPayment: (paymentId: number) => Promise<void>; onConfirmPayment: (paymentId: number) => Promise<void> }>) {
  const receipt = row.pagoPendiente;
  const confirmLabel = isBusy ? "Guardando…" : "Confirmar pago";
  const viewReceipt = () => receipt ? onViewReceipt(receipt.id) : undefined;
  const reject = () => receipt ? onRejectPayment(receipt.id) : undefined;
  const confirm = () => receipt ? onConfirmPayment(receipt.id) : undefined;
  return <Dialog title={`Revisar pago de ${row.inquilino}`} onClose={onClose}><div className="owner-dialog__body"><p>{row.direccion} · cuota de {row.periodo} por <b>{row.monto}</b>.</p><div className="owner-receipt"><Icon name="receipt" size={34} /><b>{receipt?.receiptFileName ?? "Comprobante"}</b><small>{descripcionArchivo(receipt)}</small><Button tone="secondary" small disabled={!receipt} onClick={viewReceipt}><Icon name="download" size={16} />Ver archivo</Button></div><p className="owner-dialog__hint">Al confirmar, la cuota queda marcada como pagada. Si el comprobante no corresponde, puede rechazarlo; el inquilino podrá cargar uno nuevo.</p>{error && <p className="owner-list-note" role="alert">{error}</p>}<div className="owner-dialog__actions"><Button tone="danger" disabled={isBusy || !receipt} onClick={reject}>Rechazar</Button><Button disabled={isBusy || !receipt} onClick={confirm}>{confirmLabel}</Button></div></div></Dialog>;
}

function InvoiceConfirmationDialog({ row, error, isBusy, onClose, onConfirm }: Readonly<{ row: FilaCobranza; error: string | null; isBusy: boolean; onClose: () => void; onConfirm: (invoiceId: number) => void }>) {
  return <Dialog title={`Confirmar el importe de ${row.periodo}`} onClose={onClose}><div className="owner-dialog__body">
    <p>{row.direccion} · {row.inquilino}</p>
    <p className="owner-dialog__amount">{row.monto}</p>
    <p className="owner-dialog__hint">Al confirmar, el importe queda cerrado y ya no se puede ajustar. Se le avisa al inquilino y recién entonces puede cargar su pago. Si hay algo que corregir, ajústelo antes.</p>
    {error && <p className="owner-list-note" role="alert">{error}</p>}
    <div className="owner-dialog__actions"><Button tone="secondary" onClick={onClose}>Cancelar</Button><Button busy={isBusy} onClick={() => onConfirm(row.invoiceId)}>{isBusy ? "Guardando…" : "Confirmar importe"}</Button></div>
  </div></Dialog>;
}

function PaymentRegistrationDialog({ row, file, error, isBusy, onClose, onFileChange, onRegister }: Readonly<{ row: FilaCobranza; file: File | null; error: string | null; isBusy: boolean; onClose: () => void; onFileChange: (file: File | null) => void; onRegister: (file: File) => void }>) {
  const buttonLabel = isBusy ? "Guardando…" : "Registrar pago";
  const register = () => { if (file) onRegister(file); };
  return <Dialog title="Registrar pago" onClose={onClose}><div className="owner-dialog__body"><p>{row.direccion} · cuota de {row.periodo} por <b>{row.monto}</b>.</p><label className="owner-file"><span>Comprobante del pago</span><input type="file" accept="image/*,application/pdf" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /></label><p className="owner-dialog__hint">Adjunte la transferencia, el recibo firmado o la boleta de depósito. Queda guardada junto a la cuota.</p>{error && <p className="owner-list-note" role="alert">{error}</p>}<div className="owner-dialog__actions"><Button tone="secondary" onClick={onClose}>Cancelar</Button><Button busy={isBusy} disabled={!file} onClick={register}>{buttonLabel}</Button></div></div></Dialog>;
}

function TenantEditDialog({ tenant, error, isBusy, isValid, onClose, onChange, onSave }: Readonly<{ tenant: TenantRequest; error: string | null; isBusy: boolean; isValid: boolean; onClose: () => void; onChange: (tenant: TenantRequest) => void; onSave: () => void }>) {
  const invalidTaxId = tenant.taxId.length > 0 && !cuitValido(tenant.taxId);
  const invalidPhone = tenant.phoneNumber.length > 0 && !telefonoValido(tenant.phoneNumber);
  const taxIdError = soloDigitos(tenant.taxId).length < 11 ? "Faltan dígitos: son 11 en total." : "El número no es válido. Revise que no haya un dígito cambiado.";
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  return <Dialog title="Editar datos del inquilino" onClose={onClose}><div className="owner-dialog__body"><div className="owner-wizard-stack"><div className="owner-wizard-duo"><label className="owner-wizard-field"><span>Nombre</span><input placeholder="Ej: María" value={tenant.firstName} onChange={(event) => onChange({ ...tenant, firstName: event.target.value })} /></label><label className="owner-wizard-field"><span>Apellido</span><input placeholder="Ej: Gómez" value={tenant.lastName} onChange={(event) => onChange({ ...tenant, lastName: event.target.value })} /></label></div><label className="owner-wizard-field"><span>CUIT o CUIL</span><input inputMode="numeric" placeholder="Ej: 20-12345678-9" value={tenant.taxId} aria-invalid={invalidTaxId} onChange={(event) => onChange({ ...tenant, taxId: formatearCuit(event.target.value) })} /></label>{invalidTaxId && <p className="owner-wizard-error" role="alert">{taxIdError}</p>}<label className="owner-wizard-field"><span>Correo electrónico</span><input type="email" placeholder="Ej: maria@correo.com" value={tenant.email} aria-invalid={tenant.email.length > 0 && !correoValido(tenant.email)} onChange={(event) => onChange({ ...tenant, email: event.target.value })} /></label><label className="owner-wizard-field"><span>Teléfono</span><input inputMode="tel" placeholder="Ej: 11 4455 2210" value={tenant.phoneNumber} aria-invalid={invalidPhone} onChange={(event) => onChange({ ...tenant, phoneNumber: event.target.value })} /></label>{invalidPhone && <p className="owner-wizard-error" role="alert">{errorDeTelefono(tenant.phoneNumber)}</p>}</div>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button busy={isBusy} disabled={!isValid} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function AccountEditDialog({ account, email, error, isBusy, isValid, onClose, onChange, onSave }: Readonly<{ account: UserUpdateRequest; email: string | undefined; error: string | null; isBusy: boolean; isValid: boolean; onClose: () => void; onChange: (account: UserUpdateRequest) => void; onSave: () => void }>) {
  const invalidTaxId = account.taxId.length > 0 && !cuitValido(account.taxId);
  const invalidPhone = account.phoneNumber.length > 0 && !telefonoValido(account.phoneNumber);
  const taxIdError = soloDigitos(account.taxId).length < 11 ? "Faltan dígitos: son 11 en total." : "El número no es válido. Revise que no haya un dígito cambiado.";
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  return <Dialog title="Editar datos" onClose={onClose}><div className="owner-dialog__body"><div className="owner-wizard-stack"><div className="owner-wizard-duo"><label className="owner-wizard-field"><span>Nombre</span><input placeholder="Ej: María" value={account.firstName} onChange={(event) => onChange({ ...account, firstName: event.target.value })} /></label><label className="owner-wizard-field"><span>Apellido</span><input placeholder="Ej: Gómez" value={account.lastName} onChange={(event) => onChange({ ...account, lastName: event.target.value })} /></label></div><label className="owner-wizard-field"><span>CUIT o CUIL</span><input inputMode="numeric" placeholder="Ej: 20-12345678-9" value={account.taxId} aria-invalid={invalidTaxId} onChange={(event) => onChange({ ...account, taxId: formatearCuit(event.target.value) })} /></label>{invalidTaxId && <p className="owner-wizard-error" role="alert">{taxIdError}</p>}<label className="owner-wizard-field"><span>Teléfono</span><input inputMode="tel" placeholder="Ej: 11 4455 2210" value={account.phoneNumber} aria-invalid={invalidPhone} onChange={(event) => onChange({ ...account, phoneNumber: event.target.value })} /></label>{invalidPhone && <p className="owner-wizard-error" role="alert">{errorDeTelefono(account.phoneNumber)}</p>}<p className="owner-card__copy">Su correo es <b>{email}</b> y no se puede cambiar desde acá.</p></div>{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button busy={isBusy} disabled={!isValid} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
}

function ReminderSettingsDialog({ settings, error, isBusy, onClose, onChange, onSave }: Readonly<{ settings: ReminderSettingsResponse; error: string | null; isBusy: boolean; onClose: () => void; onChange: (settings: ReminderSettingsResponse) => void; onSave: () => void }>) {
  const saveLabel = isBusy ? "Guardando…" : "Guardar";
  const schedule = settings.enabled ? <div className="owner-reminder-rows"><Counter label="Días antes del vencimiento" value={settings.daysBeforeDue} unit="días" min={DIAS_MIN} max={DIAS_MAX} onChange={(value) => onChange({ ...settings, daysBeforeDue: value })} /><SwitchRow label="Avisar el día del vencimiento" checked={settings.dueDateReminderEnabled} onChange={(value) => onChange({ ...settings, dueDateReminderEnabled: value })} /><Counter label="Días después del vencimiento" value={settings.daysAfterDue} unit="días" min={DIAS_MIN} max={DIAS_MAX} onChange={(value) => onChange({ ...settings, daysAfterDue: value })} /></div> : null;
  return <Dialog title="Editar recordatorios" onClose={onClose}><div className="owner-dialog__body owner-dialog__body--reminders"><p>Estos avisos le llegan al inquilino por correo. El aviso de cuota confirmada se envía siempre, aunque los recordatorios estén apagados.</p><SwitchRow label="Enviar recordatorios" checked={settings.enabled} onChange={(value) => onChange({ ...settings, enabled: value })} />{schedule}{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div><div className="owner-dialog__foot"><Button tone="quiet" onClick={onClose} disabled={isBusy}>Cancelar</Button><Button busy={isBusy} onClick={onSave}>{saveLabel}</Button></div></Dialog>;
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

function WorkspaceContent({ wizard, detail, view, wizardContent, detailContent, viewContent }: Readonly<{
  wizard: Creation;
  detail: Detail;
  view: OwnerView;
  wizardContent: React.ReactNode;
  detailContent: Record<Exclude<Detail, null>, React.ReactNode>;
  viewContent: Record<OwnerView, React.ReactNode>;
}>) {
  if (wizard) return wizardContent;
  if (detail) return detailContent[detail];
  return viewContent[view];
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

function loadedContract(loadState: ContractDetailLoad): ContractResponse | null {
  return loadState !== null && "ok" in loadState ? loadState.ok : null;
}

type WorkspaceDialogState = {
  adjusting: FilaCobranza | null;
  adjustmentId: number | null;
  adjustmentForm: FormularioItem;
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
  editingProperty: PropertyRequest | null;
  editingPropertyId: number | null;
  reviewingPayment: FilaCobranza | null;
  registeringPayment: FilaCobranza | null;
  confirmingInvoice: FilaCobranza | null;
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
  setAdjustmentForm: (form: FormularioItem) => void;
  startEditAdjustment: (adjustment: AdjustmentResponse) => void;
  cancelAdjustmentEdit: () => void;
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
  closePropertyEditor: () => void;
  setProperty: (property: PropertyRequest) => void;
  saveProperty: (id: number, property: PropertyRequest) => void;
  closePaymentReview: () => void;
  closeInvoiceConfirmation: () => void;
  confirmInvoice: (invoiceId: number) => void;
  viewReceipt: (paymentId: number) => void | Promise<unknown>;
  rejectPayment: (paymentId: number) => Promise<void>;
  confirmPayment: (paymentId: number) => Promise<void>;
  closePaymentRegistration: () => void;
  setPaymentFile: (file: File | null) => void;
  registerPayment: (invoiceId: number, file: File) => void;
  closeConditions: () => void;
  conditionsProgrammed: (month: string) => void;
};

function ContractConditionsDialog({ isOpen, contract, onClose, onProgrammed }: Readonly<{
  isOpen: boolean;
  contract: ContractResponse | null;
  onClose: () => void;
  onProgrammed: (month: string) => void;
}>) {
  if (!isOpen || !contract) return null;
  return <Dialog title="Cambiar condiciones" onClose={onClose}>
    <CambioCondicionesForm contrato={contract} hoyISO={new Date().toISOString().slice(0, 10)} onCancelar={onClose} onProgramado={onProgrammed} />
  </Dialog>;
}

function WorkspaceDialogs({ state, actions }: Readonly<{ state: WorkspaceDialogState; actions: WorkspaceDialogActions }>) {
  const accountIsValid = isAccountValid(state.editingAccount);
  const tenantIsValid = isTenantValid(state.editingTenant);
  const propertyIsValid = isPropertyValid(state.editingProperty);
  return <>
    {state.adjusting && <InvoiceAdjustmentDialog invoice={state.adjusting} form={state.adjustmentForm} editingId={state.adjustmentId} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closeAdjustment} onFormChange={actions.setAdjustmentForm} onStartEdit={actions.startEditAdjustment} onRemove={actions.chooseAdjustmentToRemove} onSave={actions.saveAdjustment} onCancelEdit={actions.cancelAdjustmentEdit} />}
    {state.removingAdjustment !== null && state.adjusting && <RemoveInvoiceAdjustmentDialog error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closeRemoval} onRemove={actions.removeAdjustment} />}
    {state.editingTenant && state.editingTenantId !== null && <TenantEditDialog tenant={state.editingTenant} error={state.settingsError} isBusy={state.settingsBusy} isValid={tenantIsValid} onClose={actions.closeTenantEditor} onChange={actions.setTenant} onSave={() => actions.saveTenant(state.editingTenantId!, state.editingTenant!)} />}
    {state.archivingTenant && <ArchiveTenantDialog tenant={state.archivingTenant} error={state.settingsError} isBusy={state.settingsBusy} onClose={actions.closeTenantArchive} onArchive={() => actions.archiveTenant(state.archivingTenant!)} />}
    {state.reminderSettings && <ReminderSettingsDialog settings={state.reminderSettings} error={state.settingsError} isBusy={state.settingsBusy} onClose={actions.closeReminders} onChange={actions.setReminders} onSave={() => actions.saveReminders(state.reminderSettings!)} />}
    {state.editingAccount && <AccountEditDialog account={state.editingAccount} email={state.accountEmail} error={state.settingsError} isBusy={state.settingsBusy} isValid={accountIsValid} onClose={actions.closeAccount} onChange={actions.setAccount} onSave={() => actions.saveAccount(state.editingAccount!)} />}
    {state.finishingContract && state.contract && <TerminateContractDialog endDate={state.endDate} error={state.contractError} isBusy={state.contractBusy} onClose={actions.closeTermination} onEndDateChange={actions.setEndDate} onTerminate={() => actions.terminateContract(state.contract!.id)} />}
    {state.editingProperty && state.editingPropertyId !== null && <PropertyEditDialog property={state.editingProperty} error={state.settingsError} isBusy={state.settingsBusy} isValid={propertyIsValid} onClose={actions.closePropertyEditor} onChange={actions.setProperty} onSave={() => actions.saveProperty(state.editingPropertyId!, state.editingProperty!)} />}
    {state.archivingProperty && <ArchivePropertyDialog property={state.archivingProperty} error={state.archiveError} isBusy={state.archiveBusy} onClose={actions.closePropertyArchive} onArchive={() => actions.archiveProperty(state.archivingProperty!)} />}
    {state.reviewingPayment && <PaymentReviewDialog row={state.reviewingPayment} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closePaymentReview} onViewReceipt={actions.viewReceipt} onRejectPayment={actions.rejectPayment} onConfirmPayment={actions.confirmPayment} />}
    {state.confirmingInvoice && <InvoiceConfirmationDialog row={state.confirmingInvoice} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closeInvoiceConfirmation} onConfirm={actions.confirmInvoice} />}
    {state.registeringPayment && <PaymentRegistrationDialog row={state.registeringPayment} file={state.paymentFile} error={state.adjustmentError} isBusy={state.actionBusy} onClose={actions.closePaymentRegistration} onFileChange={actions.setPaymentFile} onRegister={(file) => actions.registerPayment(state.registeringPayment!.invoiceId, file)} />}
    <ContractConditionsDialog isOpen={state.conditionsOpen} contract={state.contract} onClose={actions.closeConditions} onProgrammed={actions.conditionsProgrammed} />
  </>;
}

export default function OwnerWorkspace({ initialView, activeView, onNavigate, demo = false }: { initialView: OwnerView; activeView?: OwnerView; onNavigate?: (view: OwnerView) => void; demo?: boolean }) {
  const { user, actualizarUsuario } = useAuth();
  const toast = useToast();
  // La demo conserva su titular de ejemplo: sin sesión, Inicio y Configuración
  // quedarían a medio nombrar justo en la ruta que existe para mostrarlas.
  const cuenta = workspaceAccount(user, demo);
  const [localView, setLocalView] = useState<OwnerView>(initialView);
  const [detail, setDetail] = useState<Detail>(null);
  const [wizard, setWizard] = useState<Creation>(null);
  // La propiedad desde la que se abrió «Crear contrato», para no volver a pedirla.
  const [wizardPropertyId, setWizardPropertyId] = useState<number | undefined>(undefined);
  const [selected, setSelected] = useState("rivadavia");
  const [conditionsOpen, setConditionsOpen] = useState(false);
  // El cambio programado del contrato abierto: el sucesor en SCHEDULED, o null.
  const [cargaProgramado, setCargaProgramado] = useState<{ de: number; contrato: ContractResponse } | null>(null);
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
  const [editandoPropiedad, setEditandoPropiedad] = useState<PropertyRequest | null>(null);
  const [propiedadEditadaId, setPropiedadEditadaId] = useState<number | null>(null);
  const [inquilinoEditadoId, setInquilinoEditadoId] = useState<number | null>(null);
  const [archivandoInquilino, setArchivandoInquilino] = useState<TenantRow | null>(null);
  const [ajustandoId, setAjustandoId] = useState<number | null>(null);
  const [formItem, setFormItem] = useState<FormularioItem>(FORM_ITEM_VACIO);
  const [ajusteEditado, setAjusteEditado] = useState<number | null>(null);
  const [quitandoAjuste, setQuitandoAjuste] = useState<number | null>(null);
  const [recargaInquilinos, setRecargaInquilinos] = useState(0);
  const [errorAjustes, setErrorAjustes] = useState<string | null>(null);
  const [guardandoAjustes, setGuardandoAjustes] = useState(false);
  const [cargaContrato, setCargaContrato] = useState<
    { ok: ContractResponse } | { error: true } | null
  >(null);
  // El historial va aparte: es la tarjeta menos crítica y su fallo no debería
  // tapar el alquiler vigente ni el documento.
  const [aumentos, setAumentos] = useState<RentIncrementResponse[] | "error" | null>(null);
  const [recargaContrato, setRecargaContrato] = useState(0);
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
  const [confirmando, setConfirmando] = useState<FilaCobranza | null>(null);
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

  useLoadedResource({ enabled: necesitaContratos, refreshKey: recargaContrato, load: loadContractRows, setResult: setCargaContratos });

  // Contra un build viejo la clave `activeContract` no viene y todas se verían
  // «Sin alquilar». Se omiten los chips en vez de afirmar algo falso.
  const propertyData = propertyWorkspaceData(demo, cargaPropiedades);
  const propiedades = propertyData.properties;
  const propiedadesError = propertyData.hasError;
  const propiedadesCrudas = propertyData.rawProperties;
  const sinDatoDeContrato = propertyData.contractStatusIsUnknown;

  const cobranzas = loadedData(demo, cobranzasDemo, cargaCobranzas);
  const cobranzasError = loadHasError(demo, cargaCobranzas);
  // La cuota en edición se deriva por id desde la lista ya cargada, no se guarda
  // una copia: así el diálogo refleja cada ítem agregado/editado/quitado apenas
  // se recarga, sin re-apuntar un snapshot a mano.
  const ajustando = ajustandoId === null ? null : cobranzas?.find((f) => f.invoiceId === ajustandoId) ?? null;
  const listaContratos = loadedData(demo, contratosDemo, cargaContratos);
  const contratosError = loadHasError(demo, cargaContratos);

  /** Envuelve las acciones de cuota: en demo no se llama al backend. */
  async function accionDeCuota(hacer: () => Promise<unknown>, cerrar: (() => void) | undefined, exito: string) {
    setErrorAccion(null);
    if (demo) {
      cerrar?.();
      toast.exito(exito);
      return;
    }
    setAccionEnCurso(true);
    try {
      await hacer();
      cerrar?.();
      setRefresco((n) => n + 1);
      toast.exito(exito);
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
      toast.error(mensajeDeErrorCobranza(err));
    }
  }

  function revisarPago(fila: FilaCobranza) {
    setErrorAccion(null);
    setEnRevision(fila);
  }
  function pedirConfirmacion(fila: FilaCobranza) {
    setErrorAccion(null);
    setConfirmando(fila);
  }
  function prepararAjuste(fila: FilaCobranza) {
    setErrorAccion(null);
    setAjusteEditado(null);
    setFormItem(FORM_ITEM_VACIO);
    setAjustandoId(fila.invoiceId);
  }
  function editarAjuste(adjustment: AdjustmentResponse) {
    setErrorAccion(null);
    setAjusteEditado(adjustment.id);
    setFormItem({
      nombre: adjustment.name,
      kind: adjustment.kind,
      valueType: adjustment.valueType,
      value: adjustment.value,
    });
  }
  function cancelarEdicionAjuste() {
    setErrorAccion(null);
    setAjusteEditado(null);
    setFormItem(FORM_ITEM_VACIO);
  }
  function cerrarAjuste() {
    setAjustandoId(null);
    setAjusteEditado(null);
    setFormItem(FORM_ITEM_VACIO);
  }
  function registrarPago(fila: FilaCobranza) {
    setErrorAccion(null);
    setArchivo(null);
    setARegistrar(fila);
  }

  useEffect(() => {
    const volverAlListado = () => { setWizard(null); setDetail(null); };
    window.addEventListener(NAV_RESET_EVENT, volverAlListado);
    return () => window.removeEventListener(NAV_RESET_EVENT, volverAlListado);
  }, []);

  function openDetail(kind: Detail, id: string) { setSelected(id); setDetail(kind); }
  function go(next: OwnerView) {
    // Volver a la misma pantalla no cambia `enabled` en el efecto de carga.
    // Cada alta invalida su listado para que el registro recién creado aparezca
    // de inmediato, incluso si el asistente se abrió desde esa lista.
    if (wizard === "tenant") setRecargaInquilinos((n) => n + 1);
    if (wizard === "property") setRecargaPropiedades((n) => n + 1);
    if (wizard === "contract") setRecargaContrato((n) => n + 1);
    onNavigate?.(next);
    if (!onNavigate) {
      setLocalView(next);
    }
    setWizard(null);
    setDetail(null);
  }
  function beginCreation(kind: Creation, propertyId?: number) { setDetail(null); setWizardPropertyId(propertyId); setWizard(kind); }
  function editarInquilino(tenant: TenantRow) {
    setErrorAjustes(null);
    setInquilinoEditadoId(tenant.id);
    setEditandoInquilino({
      firstName: tenant.nombrePila,
      lastName: tenant.apellido,
      taxId: tenant.cuit,
      email: tenant.email,
      phoneNumber: tenant.telefono,
    });
  }
  function editarPropiedad(property: PropertyResponse) {
    setErrorAjustes(null);
    setPropiedadEditadaId(property.id);
    // El PUT reemplaza la propiedad entera: lo que este formulario no edita
    // (código postal, coordenadas) viaja igual para no borrarlo.
    setEditandoPropiedad({
      street: property.street,
      number: property.number,
      floorUnit: property.floorUnit,
      city: property.city,
      province: property.province,
      postalCode: property.postalCode,
      latitude: property.latitude,
      longitude: property.longitude,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      coveredArea: property.coveredArea,
      petsAllowed: property.petsAllowed,
      furnished: property.furnished,
      category: property.category,
    });
  }
  async function guardarPropiedadEditada(id: number, datos: PropertyRequest) {
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      await AlquiaBackendClient.properties.update(id, {
        ...datos,
        street: datos.street.trim(),
        number: datos.number.trim(),
        floorUnit: datos.floorUnit?.trim() || undefined,
        city: datos.city.trim(),
        province: datos.province.trim(),
      });
      setEditandoPropiedad(null);
      setRecargaPropiedades((n) => n + 1);
      toast.exito("Propiedad actualizada.");
    } catch (err) {
      setErrorAjustes(mensajeErrorDePropiedad(err));
    } finally {
      setGuardandoAjustes(false);
    }
  }
  function prepararArchivoDeInquilino(tenant: TenantRow) {
    setErrorAjustes(null);
    setArchivandoInquilino(tenant);
  }
  function editarRecordatorios(settings: ReminderSettingsResponse) {
    setErrorAjustes(null);
    setEditandoAvisos(settings);
  }
  function editarCuenta() {
    if (!user) return;
    setErrorAjustes(null);
    setEditandoCuenta({
      firstName: user.firstName,
      lastName: user.lastName,
      taxId: formatearCuit(user.taxId ?? ""),
      phoneNumber: user.phoneNumber ?? "",
    });
  }

  async function guardarAvisos(ajustes: ReminderSettingsResponse) {
    if (demo) { setEditandoAvisos(null); toast.exito("Recordatorios guardados."); return; }
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      const guardado = await AlquiaBackendClient.users.updateReminderSettings(ajustes);
      setCargaAjustes({ ok: guardado });
      setEditandoAvisos(null);
      toast.exito("Recordatorios guardados.");
    } catch (err) {
      setErrorAjustes(mensajeErrorDeRecordatorios(err));
    } finally {
      setGuardandoAjustes(false);
    }
  }

  async function guardarCuenta(datos: UserUpdateRequest) {
    if (demo) { setEditandoCuenta(null); toast.exito("Sus datos quedaron guardados."); return; }
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
      toast.exito("Sus datos quedaron guardados.");
    } catch (err) {
      setErrorAjustes(mensajeErrorDeCuenta(err));
    } finally {
      setGuardandoAjustes(false);
    }
  }

  async function guardarInquilinoEditado(id: number, datos: TenantRequest) {
    if (demo) { setEditandoInquilino(null); toast.exito("Datos del inquilino guardados."); return; }
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
      toast.exito("Datos del inquilino guardados.");
    } catch (err) {
      // Los dos duplicados son por propietario, no globales: de ahí «suyo».
      setErrorAjustes(mensajeErrorDeInquilino(err));
    } finally {
      setGuardandoAjustes(false);
    }
  }

  async function archivarInquilino(fila: TenantRow) {
    if (demo) { setArchivandoInquilino(null); toast.exito("Inquilino archivado."); return; }
    setErrorAjustes(null);
    setGuardandoAjustes(true);
    try {
      await AlquiaBackendClient.tenants.archive(fila.id);
      setArchivandoInquilino(null);
      setDetail(null);
      setRecargaInquilinos((n) => n + 1);
      toast.exito("Inquilino archivado.");
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
      if (err instanceof ApiError && err.type === ERROR.ADJUSTMENT_ON_CONFIRMED_INVOICE) {
        mensaje = "La cuota quedó confirmada mientras editaba, así que su importe ya está cerrado.";
      }
      if (err instanceof ApiError && err.type === ERROR.INVOICE_TOTAL_NEGATIVE) {
        mensaje = "El total de la cuota no puede quedar negativo.";
      }
      setErrorAccion(mensaje);
    } finally {
      setAccionEnCurso(false);
    }
  }

  async function archivarPropiedad(fila: FilaPropiedad) {
    if (demo) { setArchivando(null); toast.exito("Propiedad archivada."); return; }
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
      toast.exito("Propiedad archivada.");
    } catch (err) {
      setErrorArchivar(mensajeDeErrorArchivar(err));
    } finally {
      setGuardandoArchivado(false);
    }
  }

  async function copiarEnlace(contratoId: number) {
    try {
      const { url } = await AlquiaBackendClient.contracts.getTenantAccess(contratoId);
      await navigator.clipboard.writeText(url);
      toast.exito("Enlace copiado.");
    } catch {
      toast.error("No pudimos obtener el enlace. Inténtelo de nuevo.");
    }
  }

  async function reenviarEnlace(contratoId: number) {
    try {
      await AlquiaBackendClient.contracts.resendTenantAccess(contratoId);
      toast.exito("Le reenviamos el enlace por correo al inquilino.");
    } catch {
      toast.error("No pudimos reenviar el correo. Inténtelo de nuevo más tarde.");
    }
  }

  async function descargarDocumento(contrato: ContractResponse) {
    try {
      const blob = await AlquiaBackendClient.contracts.getDocument(contrato.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = contrato.documentFileName ?? "contrato";
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No pudimos descargar el documento. Inténtelo de nuevo más tarde.");
    }
  }

  async function adjuntarDocumento(contratoId: number, archivo: File) {
    try {
      await AlquiaBackendClient.contracts.attachDocument(contratoId, archivo);
      setRecargaContrato((n) => n + 1);
      toast.exito("Documento adjuntado.");
    } catch (err) {
      toast.error(mensajeErrorAlAdjuntarDocumento(err));
    }
  }

  async function quitarDocumento(contratoId: number) {
    try {
      await AlquiaBackendClient.contracts.removeDocument(contratoId);
      setRecargaContrato((n) => n + 1);
      toast.exito("Documento quitado.");
    } catch {
      toast.error("No pudimos quitar el documento. Inténtelo de nuevo más tarde.");
    }
  }

  async function finalizarContrato(contratoId: number) {
    setErrorContrato(null);
    setGuardandoContrato(true);
    try {
      await AlquiaBackendClient.contracts.terminate(contratoId, { terminationDate: fechaFin });
      setFinalizando(false);
      setRecargaContrato((n) => n + 1);
      toast.exito("Contrato finalizado.");
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

  const WIZARD_SUCCESS: Record<Exclude<Creation, null>, string> = { property: "Propiedad agregada.", tenant: "Inquilino agregado.", contract: "Contrato creado. Le enviamos al inquilino su enlace por correo." };
  const wizardDestinations: Record<Exclude<Creation, null>, OwnerView> = { property: "propiedades", tenant: "inquilinos", contract: "contratos" };
  const wizardKind = wizard ?? "contract";
  const wizardContent = <CreationWizard kind={wizardKind} demo={demo} initialPropertyId={wizardPropertyId} onClose={() => setWizard(null)} onComplete={() => { go(wizardDestinations[wizardKind]); toast.exito(WIZARD_SUCCESS[wizardKind]); }} />;
  const detailContent: Record<Exclude<Detail, null>, React.ReactNode> = {
    property: <PropertyDetail demo={demo} demoProperty={selectedProperty} selectedId={selected} properties={propiedades} rawProperties={propiedadesCrudas} hasError={propiedadesError} contractStatusIsUnknown={sinDatoDeContrato} onBack={() => setDetail(null)} onCreateContract={() => beginCreation("contract", demo ? undefined : Number(selected))} onOpenDemoContract={(contractId) => openDetail("contract", contractId)} onArchive={(property) => { setErrorArchivar(null); setArchivando(property); }} onEdit={editarPropiedad} />,
    contract: <ContractDetail demo={demo} demoContract={selectedContract} contractLoad={cargaContrato} increments={aumentos} scheduledContract={programado} successorId={sucesorId} onBack={() => setDetail(null)} onOpenContract={(contractId) => openDetail("contract", String(contractId))} onOpenConditions={() => setConditionsOpen(true)} onBeginTermination={() => { setErrorContrato(null); setFechaFin(new Date().toISOString().slice(0, 10)); setFinalizando(true); }} onCopyDemoLink={() => toast.exito("Enlace copiado.")} onCopyPaymentLink={(contractId) => copiarEnlace(contractId)} onResendPaymentLink={(contractId) => reenviarEnlace(contractId)} onDownloadDocument={(contract) => descargarDocumento(contract)} onRemoveDocument={(contractId) => quitarDocumento(contractId)} onAttachDocument={(contractId, file) => adjuntarDocumento(contractId, file)} />,
    tenant: <TenantDetail onResendPaymentLink={(contractId) => reenviarEnlace(contractId)} selectedId={selected} tenants={inquilinos} hasError={inquilinosError} onBack={() => setDetail(null)} onEdit={editarInquilino} onArchive={prepararArchivoDeInquilino} onCreateContract={() => beginCreation("contract")} onOpenContract={(contractId) => openDetail("contract", String(contractId))} onCopyPaymentLink={(contractId) => copiarEnlace(contractId)} />,
  };
  const viewContent: Record<OwnerView, React.ReactNode> = {
    propiedades: <PropertiesView propiedades={propiedades} propiedadesError={propiedadesError} sinDatoDeContrato={sinDatoDeContrato} query={query} ciudades={ciudades} dorms={dorms} extras={extras} estado={estado} panelAbierto={panelAbierto} setQuery={setQuery} setCiudades={setCiudades} setDorms={setDorms} setExtras={setExtras} setEstado={setEstado} onPanelOpenChange={setPanelAbierto} onCreateProperty={() => beginCreation("property")} onOpenProperty={(propertyId) => openDetail("property", propertyId)} />,
    contratos: <ContractsView contracts={listaContratos} hasError={contratosError} filter={filtroContrato} onFilterChange={setFiltroContrato} onCreateContract={() => beginCreation("contract")} onOpenContract={(contract) => { const id = demo ? CLAVES_CONTRATO_DEMO[contract.id - 1] : String(contract.id); openDetail("contract", id); }} />,
    cobranzas: <CollectionsView collections={cobranzas} hasError={cobranzasError} filter={filtroCobranza} onFilterChange={setFiltroCobranza} isBusy={accionEnCurso} canAdjust={!demo} onReview={revisarPago} onConfirm={pedirConfirmacion} onAdjust={prepararAjuste} onViewReceipt={(paymentId) => void verComprobante(paymentId)} onRegisterPayment={registrarPago} onCreateContract={() => beginCreation("contract")} />,
    inquilinos: <TenantsView tenants={inquilinos} hasError={inquilinosError} onCreateTenant={() => beginCreation("tenant")} onCreateContract={() => beginCreation("contract")} onOpenTenant={(tenantId) => openDetail("tenant", String(tenantId))} />,
    configuracion: <SettingsView reminderSettings={recordatorios} hasReminderError={recordatoriosConError} account={cuenta} canEditAccount={Boolean(user)} onEditReminders={editarRecordatorios} onEditAccount={editarCuenta} />,
    inicio: <Overview greeting={saludoDeInicio} subtitle={`Así está su cartera hoy, ${calendarioDeInicio.hoy}.`} currentMonth={calendarioDeInicio.mesActual} nextMonth={calendarioDeInicio.mesSiguiente} data={datosDeInicio} hasError={inicioConError} projection={proyeccionDeInicio} onCreateProperty={() => beginCreation("property")} onCreateContract={() => beginCreation("contract")} onOpenCollections={() => go("cobranzas")} onOpenContract={(id) => openDetail("contract", demo ? CLAVES_CONTRATO_DEMO[id - 1] : String(id))} />,
  };
  const content = <WorkspaceContent wizard={wizard} detail={detail} view={view} wizardContent={wizardContent} detailContent={detailContent} viewContent={viewContent} />;
  const guardarAjuste = () => {
    if (!ajustando) return;
    const cuerpo = itemARequest(formItem);
    const guardar = ajusteEditado === null
      ? () => AlquiaBackendClient.invoices.addAdjustment(ajustando.invoiceId, cuerpo)
      : () => AlquiaBackendClient.invoices.editAdjustment(ajustando.invoiceId, ajusteEditado, cuerpo);
    // No se cierra el diálogo: se limpia el formulario para seguir cargando ítems;
    // la lista se actualiza sola al recargar (ajustando se deriva por id).
    void accionDeAjuste(guardar, () => { setAjusteEditado(null); setFormItem(FORM_ITEM_VACIO); });
  };

  const quitarAjuste = () => {
    if (quitandoAjuste === null || !ajustando) return;
    void accionDeAjuste(
      () => AlquiaBackendClient.invoices.removeAdjustment(ajustando.invoiceId, quitandoAjuste),
      () => setQuitandoAjuste(null)
    );
  };
  const dialogState: WorkspaceDialogState = {
    adjusting: ajustando,
    adjustmentId: ajusteEditado,
    adjustmentForm: formItem,
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
    editingProperty: editandoPropiedad,
    editingPropertyId: propiedadEditadaId,
    reviewingPayment: enRevision,
    registeringPayment: aRegistrar,
    confirmingInvoice: confirmando,
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
    closeAdjustment: cerrarAjuste,
    setAdjustmentForm: setFormItem,
    startEditAdjustment: editarAjuste,
    cancelAdjustmentEdit: cancelarEdicionAjuste,
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
    closePropertyEditor: () => setEditandoPropiedad(null),
    setProperty: setEditandoPropiedad,
    saveProperty: (id, property) => void guardarPropiedadEditada(id, property),
    closePropertyArchive: () => setArchivando(null),
    archiveProperty: (property) => void archivarPropiedad(property),
    closePaymentReview: () => setEnRevision(null),
    closeInvoiceConfirmation: () => setConfirmando(null),
    confirmInvoice: (invoiceId) => void accionDeCuota(() => AlquiaBackendClient.invoices.confirm(invoiceId), () => setConfirmando(null), "Importe confirmado. Le avisamos al inquilino que ya puede pagar."),
    viewReceipt: (paymentId) => verComprobante(paymentId),
    rejectPayment: (paymentId) => accionDeCuota(() => AlquiaBackendClient.payments.reject(paymentId), () => setEnRevision(null), "Pago rechazado. El inquilino puede cargar un comprobante nuevo."),
    confirmPayment: (paymentId) => accionDeCuota(() => AlquiaBackendClient.payments.confirm(paymentId), () => setEnRevision(null), `Pago confirmado. La cuota de ${enRevision?.periodo} quedó pagada.`),
    closePaymentRegistration: () => setARegistrar(null),
    setPaymentFile: setArchivo,
    registerPayment: (invoiceId, file) => void accionDeCuota(() => AlquiaBackendClient.payments.create(invoiceId, file), () => { setARegistrar(null); setArchivo(null); }, `Pago registrado. La cuota de ${aRegistrar?.periodo} quedó pagada.`),
    closeConditions: () => setConditionsOpen(false),
    conditionsProgrammed: (month) => { setConditionsOpen(false); setRecargaContrato((n) => n + 1); toast.exito(`Cambio programado desde ${formatearPeriodo(month)}.`); },
  };

  return <div className="owner-workspace"><main className="owner-content">{content}</main><WorkspaceDialogs state={dialogState} actions={dialogActions} /></div>;
}
