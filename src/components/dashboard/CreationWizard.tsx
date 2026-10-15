"use client";

import { useEffect, useState } from "react";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";
import { ApiError, AuthExpiredError } from "@/lib/api";
import { ERROR, copyDeError, idDelContratoActivo, idDelInquilinoExistente } from "@/lib/error-codes";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { AddressSuggestionResponse, PropertyCategory, PropertyRequest, PropertyResponse, TenantRequest, TenantResponse } from "@/lib/backend-types";
import { CATEGORIAS, detallePropiedad } from "@/lib/propiedad";
import Counter from "@/components/ui/Counter";
import { Cargando, Spinner } from "@/components/ui/Spinner";
import { Icon as AppIcon, type IconName } from "@/components/ui/Icon";
import { correoValido } from "@/lib/correo";
import { hoyEnArgentina } from "@/lib/formato";
import { faltaResponder, mesesTranscurridos, paidThroughDe, periodosDelBackend, respuestaVigenteDe, type RespuestaPagadoHasta } from "@/lib/transcurridos";
import PagosTranscurridos from "@/components/dashboard/PagosTranscurridos";
import { formatearDireccion } from "@/lib/tenant-rows";
import ContractFromPdf from "@/components/dashboard/ContractFromPdf";
import OtrasCondiciones from "@/components/dashboard/OtrasCondiciones";
import Dialog from "@/components/ui/Dialog";
import { armarOtrasCondiciones, hayOtrasCondiciones, otrasCondicionesValidas, punitoriosCargados, resumenDeOtrasCondiciones, SIN_OTRAS_CONDICIONES, type OtrasCondiciones as Condiciones } from "@/lib/otras-condiciones";
import { avisoDeCampo, ubicacionDeErrores, type Ubicacion } from "@/lib/errores-de-alta";

/**
 * El backend distingue cada condición con un `type` estable (RFC 9457): los dos
 * duplicados de TenantService.create llegan como DUPLICATE_TAX_ID / DUPLICATE_PHONE_NUMBER,
 * y el resto de validaciones sin `type` propio cae al genérico. Los dos duplicados
 * son por propietario, no globales — de ahí el «en otro inquilino suyo».
 */
function mensajeDeError(err: unknown): string {
  if (err instanceof AuthExpiredError) {
    return "Su sesión expiró. Vuelva a iniciar sesión para guardar el inquilino.";
  }
  if (err instanceof ApiError && err.type === ERROR.DUPLICATE_TAX_ID) {
    return "Ese CUIT ya figura en otro inquilino suyo.";
  }
  if (err instanceof ApiError && err.type === ERROR.DUPLICATE_PHONE_NUMBER) {
    return "Ese teléfono ya figura en otro inquilino suyo.";
  }
  if (err instanceof ApiError && err.status === 400) {
    return "Verifique los datos ingresados e inténtelo de nuevo.";
  }
  return "No pudimos guardar el inquilino. Inténtelo de nuevo más tarde.";
}

/**
 * `PropertyService.create` no chequea unicidades ni nada propio: los únicos 400
 * que puede devolver son de bean validation, y para el propietario todos
 * significan lo mismo.
 */
function mensajeDeErrorPropiedad(err: unknown): string {
  if (err instanceof AuthExpiredError) {
    return "Su sesión expiró. Vuelva a iniciar sesión para guardar la propiedad.";
  }
  if (err instanceof ApiError && err.status === 400) {
    return "Verifique los datos ingresados e inténtelo de nuevo.";
  }
  return "No pudimos guardar la propiedad. Inténtelo de nuevo más tarde.";
}

type WizardKind = "property" | "contract" | "tenant";


/** Los campos salen con los mismos nombres que `PropertyRequest`. */
// El código postal es opcional y se puede cargar a mano; las coordenadas sólo
// vienen del buscador y viajan juntas o no viajan.
type Direccion = {
  street: string; number: string; city: string; province: string;
  postalCode: string; latitude: number | null; longitude: number | null;
};

const etiquetaDireccion = (d: Direccion) => `${d.street} ${d.number}`;

/** Sólo para /prototipo: sin sesión `/address-lookup` daría 401. */
const DIRECCIONES_DEMO: (Direccion & AddressSuggestionResponse)[] = [
  { reference: "demo-1", label: "Lavalle 950", street: "Lavalle", number: "950", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "", latitude: null, longitude: null },
  { reference: "demo-2", label: "Av. Rivadavia 2340", street: "Av. Rivadavia", number: "2340", city: "CABA", province: "Ciudad Autónoma de Buenos Aires", postalCode: "", latitude: null, longitude: null },
  { reference: "demo-3", label: "Mitre 78", street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires", postalCode: "", latitude: null, longitude: null },
];

/** El backend no busca por debajo de 3 caracteres (app.address-lookup.min-query-length). */
const MIN_BUSQUEDA = 3;

/** Sugerencias de `/address-lookup/autocomplete`, con espera al tipeo y descarte de respuestas viejas. */
function useSugerencias(query: string, demo: boolean) {
  const q = query.trim();
  const [resultado, setResultado] = useState<{ q: string; lista: AddressSuggestionResponse[] }>({ q: "", lista: [] });

  useEffect(() => {
    if (demo || q.length < MIN_BUSQUEDA) return;
    let vigente = true;
    const t = setTimeout(() => {
      AlquiaBackendClient.addressLookup.autocomplete(q)
        .then((lista) => vigente && setResultado({ q, lista }))
        .catch(() => vigente && setResultado({ q, lista: [] }));
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [q, demo]);

  if (demo) {
    const n = q.toLowerCase();
    return { sugerencias: q.length < MIN_BUSQUEDA ? [] : DIRECCIONES_DEMO.filter((d) => d.label.toLowerCase().includes(n)), buscando: false };
  }
  return { sugerencias: q.length < MIN_BUSQUEDA ? [] : resultado.lista, buscando: q.length >= MIN_BUSQUEDA && resultado.q !== q };
}

/** Combobox accesible: flechas para moverse, Enter para elegir, Escape para cerrar. */
function AddressField({ value, demo, onSelect, onClear }: Readonly<{
  demo: boolean;
  value: Direccion | null;
  onSelect: (d: Direccion) => void;
  onClear: () => void;
}>) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [falloResolver, setFalloResolver] = useState(false);

  const q = query.trim();
  const { sugerencias, buscando } = useSugerencias(query, demo);

  if (value) {
    return (
      <div className="owner-ac-chosen">
        <span className="owner-ac-chosen__body">
          <b>{etiquetaDireccion(value)}</b>
          <small>{[value.city, value.province].filter(Boolean).join(" · ") || "Falta la ciudad"}</small>
        </span>
        <button type="button" className="owner-ac-chosen__change" onClick={() => { onClear(); setQuery(""); }}>
          Cambiar
        </button>
      </div>
    );
  }

  const elegir = (d: Direccion) => { onSelect(d); setAbierto(false); setQuery(""); };
  const elegirSugerencia = async (sugerencia: AddressSuggestionResponse) => {
    setFalloResolver(false);
    try {
      const r = demo
        ? DIRECCIONES_DEMO.find((d) => d.reference === sugerencia.reference)!
        : await AlquiaBackendClient.addressLookup.resolve(sugerencia.reference);
      const conCoordenadas = r.latitude != null && r.longitude != null;
      elegir({
        street: r.street ?? "", number: r.number ?? "", city: r.city ?? "", province: r.province ?? "",
        postalCode: r.postalCode ?? "",
        latitude: conCoordenadas ? r.latitude : null, longitude: conCoordenadas ? r.longitude : null,
      });
    } catch {
      setFalloResolver(true);
    }
  };

  return (
    <div className="owner-ac">
      <div className="owner-ac__box">
        <Icon name="search" />
        <input
          role="combobox"
          aria-expanded={abierto && sugerencias.length > 0}
          aria-controls="ac-lista"
          aria-autocomplete="list"
          aria-activedescendant={abierto && sugerencias.length ? `ac-opt-${activo}` : undefined}
          aria-label="Buscar la dirección"
          placeholder="Empezá a escribir la calle…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setAbierto(true); setActivo(0); }}
          onKeyDown={(e) => {
            if (!sugerencias.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((i) => (i + 1) % sugerencias.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => (i - 1 + sugerencias.length) % sugerencias.length); }
            else if (e.key === "Enter") { e.preventDefault(); void elegirSugerencia(sugerencias[activo]); }
            else if (e.key === "Escape") { setAbierto(false); }
          }}
        />
      </div>
      {abierto && sugerencias.length > 0 && (
        <ul className="owner-ac__list" id="ac-lista" role="listbox" aria-label="Direcciones sugeridas">
          {sugerencias.map((d, i) => (
            <li key={d.reference} id={`ac-opt-${i}`} role="option" aria-selected={i === activo}>
              <button type="button" className={i === activo ? "is-active" : ""}
                onMouseEnter={() => setActivo(i)} onClick={() => void elegirSugerencia(d)}>
                <b>{d.label}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
      {falloResolver && <p className="owner-ac__empty" role="alert">No pudimos obtener esa dirección. Elija otra o inténtelo de nuevo.</p>}
      {q.length >= MIN_BUSQUEDA && !buscando && sugerencias.length === 0 && (
        <p className="owner-ac__empty">
          No encontramos esa dirección.{" "}
          <button type="button" onClick={() => elegir({ street: query.trim(), number: "", city: "", province: "", postalCode: "", latitude: null, longitude: null })}>
            Usarla igual
          </button>
        </p>
      )}
    </div>
  );
}

/** En el wizard los íconos van un pelín más grandes (22) que el resto de la app (21). */
function Icon({ name, size = 22 }: Readonly<{ name: IconName; size?: number }>) {
  return <AppIcon name={name} size={size} />;
}

/**
 * `nota` es una línea aparte bajo la descripción. Con `nota: null` la línea queda reservada pero vacía:
 * sirve para un dato que todavía se está trayendo, así la tarjeta no crece cuando llega.
 */
function Option({ selected, icon, title, description, nota, onClick, disabled = false }: Readonly<{ selected: boolean; icon: IconName; title: string; description: string; nota?: string | null; onClick: () => void; disabled?: boolean }>) {
  const lineaDeNota = nota === null ? <small className="owner-wizard-option__nota" aria-hidden="true">{"\u00a0"}</small> : nota && <small className="owner-wizard-option__nota">{nota}</small>;
  return <button type="button" className="owner-wizard-option" role="radio" aria-checked={selected} aria-disabled={disabled || undefined} disabled={disabled} onClick={onClick}><span className="owner-wizard-option__icon"><Icon name={icon} /></span><span><b>{title}</b><small>{description}</small>{lineaDeNota}</span><span className="owner-wizard-option__check"><Icon name="check" /></span></button>;
}

/** El aviso de un dato que el backend rechazó, junto a su campo. El texto de él está en inglés: sólo se usa para saber dónde. */
function Aviso({ texto }: Readonly<{ texto?: string }>) {
  return texto ? <p className="owner-wizard-error" role="alert">{texto}</p> : null;
}

/**
 * Los 400 del alta de contrato también se distinguen sólo por el texto. El de
 * la propiedad ocupada es el único que el propietario puede resolver solo, así
 * que es el único que vale la pena traducir aparte.
 */
function mensajeDeErrorContrato(err: unknown): string {
  if (err instanceof AuthExpiredError) {
    return "Su sesión expiró. Vuelva a iniciar sesión para crear el contrato.";
  }
  if (err instanceof ApiError && err.type === ERROR.PROPERTY_HAS_ACTIVE_CONTRACT) {
    return "Esa propiedad ya tiene un contrato vigente. Finalícelo antes de crear otro.";
  }
  if (err instanceof ApiError && (err.type === ERROR.ELAPSED_INVOICES_DECISION_REQUIRED || err.type === ERROR.ELAPSED_PAID_THROUGH_OUT_OF_RANGE)) {
    return copyDeError(err);
  }
  if (err instanceof ApiError && err.status === 400) {
    return "Verifique los datos del contrato e inténtelo de nuevo.";
  }
  return "No pudimos crear el contrato. Inténtelo de nuevo más tarde.";
}

/** El backend no acepta contratos que empiecen antes de diciembre de 2022. */
const PISO_INICIO = "2022-12-01";

/** Fecha de hoy (hora local) como yyyy-mm-dd: el inicio arranca ahí y se edita. */
function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * La fecha de fin que el backend va a guardar es startDate + termMonths, sin
 * restarle un día (ContractService.applyTerms). El prototipo mostraba la
 * convención opuesta —«termina el 31/08» para un contrato que arranca un 01/09—,
 * que da un día menos. Se muestra la del backend: es la que va a quedar
 * guardada, y prometer otra sería mentirle al propietario por un día.
 */
function fechaDeFin(inicioISO: string, meses: number): string | null {
  if (!inicioISO) return null;
  const [anio, mes, dia] = inicioISO.split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  const fin = new Date(Date.UTC(anio, mes - 1 + meses, dia));
  return fin.toLocaleDateString("es-AR", { timeZone: "UTC" });
}

const soloNumeros = (s: string) => s.replace(/\D/g, "");

function montoConSeparadores(digitos: string): string {
  return digitos ? Number(digitos).toLocaleString("es-AR") : "";
}

type Opcion = { id: number; titulo: string; detalle: string };

// En /prototipo no hay sesión, así que no se llama al backend: estas son las
// mismas dos propiedades y dos inquilinos que mostraba el asistente cuando sus
// tarjetas estaban escritas a mano, ahora con la forma que tiene el dato real.
const PROPIEDADES_DEMO: Opcion[] = [
  { id: -1, titulo: "Mitre 78", detalle: "Local comercial · San Isidro · 52 m²" },
  { id: -2, titulo: "Colón 2255, 4.º D", detalle: "Departamento · Vicente López · 58 m²" },
];
const INQUILINOS_DEMO: Opcion[] = [
  { id: -1, titulo: "Diego Ferrari", detalle: "20-30115482-9 · diego.ferrari@outlook.com" },
  { id: -2, titulo: "Marta Suárez", detalle: "27-24891055-6 · marta.suarez@gmail.com" },
];

function cantidadPasos(kind: WizardKind): number {
  if (kind === "contract") return 7;
  if (kind === "tenant") return 1;
  return 4;
}

function datosDeActualizacion(
  method: ContractMethod,
  porcentaje: string
) {
  if (method === "FIXED_PERCENTAGE") {
    return { incrementMethod: "FIXED_PERCENTAGE" as const, incrementValue: Number(porcentaje) };
  }
  return { incrementMethod: "INDEX" as const, incrementIndexName: method };
}

// `sinPropiedades`: no tiene ninguna cargada (distinto de tenerlas todas alquiladas).
type ContractLists = { propiedades: Opcion[]; inquilinos: Opcion[]; sinPropiedades?: boolean };
type ContractMethod = "FIXED_PERCENTAGE" | "ICL" | "IPC";

function listasDisponibles(demo: boolean, loadState: ContractLists | "error" | null): ContractLists | null {
  if (demo) return { propiedades: PROPIEDADES_DEMO, inquilinos: INQUILINOS_DEMO };
  if (loadState === null || loadState === "error") return null;
  return loadState;
}

function descripcionCaracteristicas({
  bedrooms,
  bathrooms,
  coveredArea,
  petsAllowed,
  furnished,
}: Readonly<{ bedrooms: number | null; bathrooms: number | null; coveredArea: string; petsAllowed: boolean; furnished: boolean }>) {
  return [
    bedrooms !== null && `${bedrooms} dormitorio${bedrooms === 1 ? "" : "s"}`,
    bathrooms !== null && `${bathrooms} baño${bathrooms === 1 ? "" : "s"}`,
    coveredArea && `${coveredArea} m²`,
    petsAllowed && "acepta mascotas",
    furnished && "amoblada",
  ].filter(Boolean).join(" · ") || "Sin cargar";
}

function TenantWizardStep({
  firstName,
  lastName,
  taxId,
  email,
  phone,
  isTaxIdValid,
  isEmailValid,
  isPhoneValid,
  error,
  erroresBackend,
  onFirstNameChange,
  onLastNameChange,
  onTaxIdChange,
  onEmailChange,
  onPhoneChange,
}: Readonly<{
  firstName: string; lastName: string; taxId: string; email: string; phone: string;
  isTaxIdValid: boolean; isEmailValid: boolean; isPhoneValid: boolean; error: string | null; erroresBackend: Record<string, string>;
  onFirstNameChange: (value: string) => void; onLastNameChange: (value: string) => void;
  onTaxIdChange: (value: string) => void; onEmailChange: (value: string) => void; onPhoneChange: (value: string) => void;
}>) {
  const taxIdError = soloDigitos(taxId).length < 11
    ? "Faltan dígitos: son 11 en total."
    : "El número no es válido. Revise que no haya un dígito cambiado.";
  const aviso = (...campos: string[]) => <Aviso texto={avisoDeCampo(erroresBackend, "tenant", ...campos)} />;
  return <><h1>¿Quién es el inquilino?</h1><p>Estos son los datos que van a figurar en el contrato. Al correo le llegan los avisos de vencimiento y el enlace para subir comprobantes.</p><div className="owner-wizard-stack"><div className="owner-wizard-duo"><label className="owner-wizard-field"><span>Nombre</span><input placeholder="Ej: María" value={firstName} onChange={(event) => onFirstNameChange(event.target.value)} /></label><label className="owner-wizard-field"><span>Apellido</span><input placeholder="Ej: Gómez" value={lastName} onChange={(event) => onLastNameChange(event.target.value)} /></label></div>{aviso("firstName", "lastName")}<label className="owner-wizard-field"><span>CUIT o CUIL</span><input inputMode="numeric" placeholder="Ej: 20-12345678-9" value={taxId} aria-invalid={taxId.length > 0 && !isTaxIdValid} onChange={(event) => onTaxIdChange(formatearCuit(event.target.value))} /></label>{taxId.length > 0 && !isTaxIdValid && <p className="owner-wizard-error" role="alert">{taxIdError}</p>}{aviso("taxId")}<label className="owner-wizard-field"><span>Correo electrónico</span><input type="email" placeholder="Ej: maria@correo.com" value={email} aria-invalid={email.length > 0 && !isEmailValid} onChange={(event) => onEmailChange(event.target.value)} /></label>{email.length > 0 && !isEmailValid && <p className="owner-wizard-error" role="alert">Ese correo no parece completo.</p>}{aviso("email")}<label className="owner-wizard-field"><span>Teléfono</span><input type="tel" inputMode="tel" placeholder="Ej: 11 4455 2210" value={phone} aria-invalid={phone.length > 0 && !isPhoneValid} onChange={(event) => onPhoneChange(event.target.value)} /></label>{phone.length > 0 && !isPhoneValid && <p className="owner-wizard-error" role="alert">{errorDeTelefono(phone)}</p>}{aviso("phoneNumber")}{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div></>;
}

/**
 * Lo elegido en el paso de propiedad o de inquilino: un registro que ya existe, o uno nuevo que
 * sólo es un borrador hasta «Crear contrato». Nada se guarda antes: abandonar no deja huérfanos.
 */
type SeleccionDeContrato = {
  id: number | null;
  /** Cómo se nombra el borrador («Mitre 78», «Diego Ferrari»), si ya se cargó uno. */
  borrador: string | null;
  borradorElegido: boolean;
  onElegir: (id: number) => void;
  onElegirBorrador: () => void;
  /** Abre la carga de datos: vacía la primera vez, con lo ya cargado si se está cambiando. */
  onNueva: () => void;
};

function ContractOptions({
  loadState,
  options,
  seleccion,
  icon,
  empty,
  nueva,
}: Readonly<{
  loadState: ContractLists | "error" | null;
  options: Opcion[];
  seleccion: SeleccionDeContrato;
  icon: "building" | "users";
  empty: React.ReactNode;
  nueva: { titulo: string; detalle: string; tituloBorrador: string };
}>) {
  if (loadState === "error") {
    return <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />No pudimos cargar sus datos. Inténtelo de nuevo más tarde.</p>;
  }
  if (loadState === null) return <Cargando>Cargando…</Cargando>;

  return <>
    {options.length === 0 && empty}
    <div className="owner-wizard-options" role="radiogroup">
      {options.map((option) => <Option key={option.id} selected={!seleccion.borradorElegido && seleccion.id === option.id} icon={icon} title={option.titulo} description={option.detalle} onClick={() => seleccion.onElegir(option.id)} />)}
      {seleccion.borrador === null
        ? <Option selected={false} icon="plus" title={nueva.titulo} description={nueva.detalle} onClick={seleccion.onNueva} />
        : <Option selected={seleccion.borradorElegido} icon={icon} title={`${nueva.tituloBorrador}: ${seleccion.borrador}`} description="Se guarda cuando cree el contrato." onClick={seleccion.onElegirBorrador} />}
    </div>
    {seleccion.borrador !== null && <button type="button" className="owner-wizard-quiet" onClick={seleccion.onNueva}><Icon name="edit" />Cambiar sus datos</button>}
  </>;
}

function ContractPropertyStep({ lists, seleccion }: Readonly<{ lists: ContractLists | "error" | null; seleccion: SeleccionDeContrato }>) {
  const options = typeof lists === "object" && lists !== null ? lists.propiedades : [];
  return <><h1>¿Qué propiedad va a alquilar?</h1><p>Elija una de sus propiedades sin contrato vigente, o cargue una nueva acá mismo. Después le pedimos el inquilino.</p><ContractOptions loadState={lists} options={options} seleccion={seleccion} icon="building" nueva={{ titulo: "Una propiedad nueva", detalle: "La carga acá y se guarda junto con el contrato.", tituloBorrador: "Propiedad nueva" }} empty={<p className="owner-wizard-help">{typeof lists === "object" && lists?.sinPropiedades ? "Todavía no cargó ninguna propiedad." : "Todas sus propiedades ya tienen un contrato vigente."}</p>} /></>;
}

function ContractTenantStep({ lists, seleccion }: Readonly<{ lists: ContractLists | "error" | null; seleccion: SeleccionDeContrato }>) {
  const options = typeof lists === "object" && lists !== null ? lists.inquilinos : [];
  return <><h1>¿A quién se la alquila?</h1><p>El inquilino va a figurar en el contrato y recibir los avisos de vencimiento. Elija uno cargado o cargue uno nuevo acá mismo.</p><ContractOptions loadState={lists} options={options} seleccion={seleccion} icon="users" nueva={{ titulo: "Un inquilino nuevo", detalle: "Lo carga acá y se guarda junto con el contrato.", tituloBorrador: "Inquilino nuevo" }} empty={<p className="owner-wizard-help">Todavía no cargó ningún inquilino.</p>} /></>;
}

function ContractRentStep({ rent, dueDay, erroresBackend, onRentChange, onDueDayChange }: Readonly<{ rent: string; dueDay: number; erroresBackend: Record<string, string>; onRentChange: (value: string) => void; onDueDayChange: (value: number) => void }>) {
  return <><h1>¿Cuánto sale el alquiler por mes?</h1><p>Es el valor con el que arranca el contrato. Después definimos cómo se actualiza.</p><label className="owner-wizard-field owner-wizard-field--amount"><span>$</span><input inputMode="numeric" aria-label="Alquiler mensual" placeholder="Ej. 450.000" value={montoConSeparadores(rent)} onChange={(event) => onRentChange(soloNumeros(event.target.value))} /><span>por mes</span></label><Aviso texto={avisoDeCampo(erroresBackend, "contract", "initialRentAmount")} /><p className="owner-wizard-label">Día de vencimiento</p><Counter value={dueDay} unit="del mes" min={1} max={28} onChange={onDueDayChange} /><Aviso texto={avisoDeCampo(erroresBackend, "contract", "dueDay")} /><div className="owner-wizard-chips">{[1, 5, 10].map((day) => <button key={day} type="button" aria-pressed={dueDay === day} onClick={() => onDueDayChange(day)}>Día {day}</button>)}</div><small className="owner-wizard-help">Se cobra por mes adelantado. El día se puede elegir del 1 al 28.</small></>;
}

function ContractTermStep({ startDate, term, isStartDateValid, erroresBackend, onStartDateChange, onTermChange }: Readonly<{ startDate: string; term: number; isStartDateValid: boolean; erroresBackend: Record<string, string>; onStartDateChange: (value: string) => void; onTermChange: (value: number) => void }>) {
  return <><h1>¿Cuándo empieza y por cuánto tiempo?</h1><p>La fecha de fin se calcula sola a partir del plazo, no hace falta cargarla.</p><label className="owner-wizard-field owner-wizard-field--medium"><span className="sr-only">Fecha de inicio</span><input type="date" value={startDate} min={PISO_INICIO} aria-invalid={startDate !== "" && !isStartDateValid} onChange={(event) => onStartDateChange(event.target.value)} /></label>{startDate !== "" && !isStartDateValid && <p className="owner-wizard-error" role="alert">El contrato no puede empezar antes de diciembre de 2022.</p>}<Aviso texto={avisoDeCampo(erroresBackend, "contract", "startDate")} /><p className="owner-wizard-label">Plazo del contrato</p><Counter value={term} unit="meses" min={1} onChange={onTermChange} /><Aviso texto={avisoDeCampo(erroresBackend, "contract", "termMonths")} /><div className="owner-wizard-chips">{[12, 24, 36].map((months) => <button key={months} type="button" aria-pressed={term === months} onClick={() => onTermChange(months)}>{months} meses</button>)}</div>{isStartDateValid && <small className="owner-wizard-help">Termina el {fechaDeFin(startDate, term)}.</small>}</>;
}

function ContractIndexStep({ method, percentage, frequency, erroresBackend, onMethodChange, onPercentageChange, onFrequencyChange }: Readonly<{ method: ContractMethod; percentage: string; frequency: number; erroresBackend: Record<string, string>; onMethodChange: (method: ContractMethod) => void; onPercentageChange: (value: string) => void; onFrequencyChange: (value: number) => void }>) {
  return <><h1>¿Cómo se actualiza el alquiler?</h1><p>Alquia aplica la actualización cuando corresponde. Usted no tiene que hacer nada.</p><div className="owner-wizard-options owner-wizard-options--grid" role="radiogroup"><Option selected={method === "FIXED_PERCENTAGE"} icon="trend" title="Un porcentaje" description="Sube un % fijo" onClick={() => onMethodChange("FIXED_PERCENTAGE")} /><Option selected={method === "ICL"} icon="trend" title="Según el ICL" description="Índice del BCRA" onClick={() => onMethodChange("ICL")} /><Option selected={method === "IPC"} icon="trend" title="Según el IPC" description="Inflación INDEC" onClick={() => onMethodChange("IPC")} /></div>{method === "FIXED_PERCENTAGE" && <label className="owner-wizard-field owner-wizard-field--amount"><span className="sr-only">Porcentaje de aumento</span><input inputMode="decimal" placeholder="Ej. 8" value={percentage} aria-label="Porcentaje de aumento" onChange={(event) => onPercentageChange(event.target.value.replace(/[^\d.]/g, ""))} /><span>% cada vez</span></label>}<Aviso texto={avisoDeCampo(erroresBackend, "contract", "incrementMethod", "incrementValue", "incrementIndexName")} /><p className="owner-wizard-label">Cada cuánto se actualiza</p><div className="owner-wizard-chips">{[3, 4, 6, 12].map((months) => <button key={months} type="button" aria-pressed={frequency === months} onClick={() => onFrequencyChange(months)}>Cada {months} meses</button>)}</div><Aviso texto={avisoDeCampo(erroresBackend, "contract", "incrementFrequencyMonths")} />{method === "FIXED_PERCENTAGE" && <small className="owner-wizard-help">Cada aumento se calcula sobre el alquiler vigente, no sobre el inicial.</small>}</>;
}

function ContractReviewStep({ lists, propiedad, inquilino, rent, dueDay, term, startDate, method, percentage, frequency, otras, error, cantidadErrores, conflictSection, elapsedSection, onCambiar }: Readonly<{ lists: ContractLists | "error" | null; propiedad: SeleccionDeContrato; inquilino: SeleccionDeContrato; rent: string; dueDay: number; term: number; startDate: string; method: ContractMethod; percentage: string; frequency: number; otras: Condiciones; error: string | null; cantidadErrores: number; conflictSection: React.ReactNode; elapsedSection: React.ReactNode; onCambiar: (paso: number) => void }>) {
  const loadedLists = typeof lists === "object" && lists !== null ? lists : null;
  const propertyName = propiedad.borradorElegido && propiedad.borrador !== null
    ? `Propiedad nueva: ${propiedad.borrador}`
    : loadedLists?.propiedades.find((option) => option.id === propiedad.id)?.titulo ?? "Sin cargar";
  const tenantName = inquilino.borradorElegido && inquilino.borrador !== null
    ? `Inquilino nuevo: ${inquilino.borrador}`
    : loadedLists?.inquilinos.find((option) => option.id === inquilino.id)?.titulo ?? "Sin cargar";
  const adjustment = method === "FIXED_PERCENTAGE" ? `${percentage} % cada ${frequency} meses` : `Según el ${method} · cada ${frequency} meses`;
  return <><h1>Revise que esté todo bien</h1><p>Si algo no cierra, use «Cambiar» en la sección correspondiente. Recién al crear el contrato se guarda todo junto.</p>{cantidadErrores > 0 && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{cantidadErrores === 1 ? "Hay 1 dato para corregir." : `Hay ${cantidadErrores} datos para corregir.`} Use «Cambiar» en cada sección para llegar a ellos.</p>}<Summary rows={[["Propiedad", propertyName, () => onCambiar(1)], ["Inquilino", tenantName, () => onCambiar(2)], ["Alquiler inicial", `$ ${montoConSeparadores(rent)} por mes · vence el día ${dueDay}`, () => onCambiar(3)], ["Plazo", `${term} meses · termina el ${fechaDeFin(startDate, term) ?? "—"}`, () => onCambiar(4)], ["Actualización", adjustment, () => onCambiar(5)], ["Otras condiciones", resumenDeOtrasCondiciones(otras), () => onCambiar(6)]]} />{conflictSection}{elapsedSection}{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}<aside className="owner-wizard-note"><Icon name="trend" />Las próximas cuotas se calculan automáticamente según las condiciones que definió.</aside></>;
}

function ContractWizardStep(props: Readonly<{
  step: number; lists: ContractLists | "error" | null; propiedad: SeleccionDeContrato; inquilino: SeleccionDeContrato; rent: string; dueDay: number; term: number; startDate: string; isStartDateValid: boolean; method: ContractMethod; percentage: string; frequency: number; otras: Condiciones; mostrarErroresDeOtras: boolean; error: string | null; erroresBackend: Record<string, string>; cantidadErrores: number; conflictSection: React.ReactNode; elapsedSection: React.ReactNode; onRentChange: (value: string) => void; onDueDayChange: (value: number) => void; onTermChange: (value: number) => void; onStartDateChange: (value: string) => void; onMethodChange: (value: ContractMethod) => void; onPercentageChange: (value: string) => void; onFrequencyChange: (value: number) => void; onOtrasChange: (value: Condiciones) => void; onSaltearOtras: () => void; onCambiar: (paso: number) => void;
}>) {
  const { step, ...stepProps } = props;
  const steps: Record<number, React.ReactNode> = {
    1: <ContractPropertyStep lists={stepProps.lists} seleccion={stepProps.propiedad} />,
    2: <ContractTenantStep lists={stepProps.lists} seleccion={stepProps.inquilino} />,
    3: <ContractRentStep rent={stepProps.rent} dueDay={stepProps.dueDay} erroresBackend={stepProps.erroresBackend} onRentChange={stepProps.onRentChange} onDueDayChange={stepProps.onDueDayChange} />,
    4: <ContractTermStep startDate={stepProps.startDate} term={stepProps.term} isStartDateValid={stepProps.isStartDateValid} erroresBackend={stepProps.erroresBackend} onStartDateChange={stepProps.onStartDateChange} onTermChange={stepProps.onTermChange} />,
    5: <ContractIndexStep method={stepProps.method} percentage={stepProps.percentage} frequency={stepProps.frequency} erroresBackend={stepProps.erroresBackend} onMethodChange={stepProps.onMethodChange} onPercentageChange={stepProps.onPercentageChange} onFrequencyChange={stepProps.onFrequencyChange} />,
    6: <OtrasCondiciones value={stepProps.otras} onChange={stepProps.onOtrasChange} onSkip={stepProps.onSaltearOtras} mostrarErrores={stepProps.mostrarErroresDeOtras} erroresDelBackend={stepProps.erroresBackend} />,
  };
  return steps[step] ?? <ContractReviewStep lists={stepProps.lists} propiedad={stepProps.propiedad} inquilino={stepProps.inquilino} rent={stepProps.rent} dueDay={stepProps.dueDay} term={stepProps.term} startDate={stepProps.startDate} method={stepProps.method} percentage={stepProps.percentage} frequency={stepProps.frequency} otras={stepProps.otras} error={stepProps.error} cantidadErrores={stepProps.cantidadErrores} conflictSection={stepProps.conflictSection} elapsedSection={stepProps.elapsedSection} onCambiar={stepProps.onCambiar} />;
}

type ModoContrato = "pdf" | "manual";

/**
 * Cuántas lecturas de contratos le quedan al propietario. `desconocida`: no se pudo preguntar (sin
 * red, o el backend todavía no responde): se ofrece igual y el backend decide al subir el archivo.
 */
type CuotaDeLecturas = { estado: "cargando" | "desconocida" } | { estado: "disponible" | "agotada" | "apagada"; restantes: number };

function cuotaDeLecturas(respuesta: { used: number; limit: number; available: boolean }): CuotaDeLecturas {
  const restantes = Math.max(0, respuesta.limit - respuesta.used);
  if (respuesta.available) return { estado: "disponible", restantes };
  return { estado: restantes === 0 ? "agotada" : "apagada", restantes };
}

function descripcionDeSubirPdf(cuota: CuotaDeLecturas): string {
  if (cuota.estado === "agotada") return "Ya usó todas las lecturas que tiene disponibles. Puede cargar el contrato a mano.";
  if (cuota.estado === "apagada") return "La lectura de contratos no está disponible en este momento. Puede cargar el contrato a mano.";
  return "Completamos los datos desde el PDF. Usted los revisa antes de guardar.";
}

/**
 * Cuántas lecturas le quedan, en su propia línea. Mientras se pregunta, la línea queda reservada
 * (`null`): la cuota llega un momento después de abrir y, si se sumara al texto, la tarjeta crecería.
 */
function notaDeSubirPdf(cuota: CuotaDeLecturas): string | null | undefined {
  if (cuota.estado === "cargando") return null;
  if (cuota.estado !== "disponible") return undefined;
  return cuota.restantes === 1 ? "Le queda 1 lectura." : `Le quedan ${cuota.restantes} lecturas.`;
}

function ContractModeStep({ selected, onSelect, cuota }: Readonly<{ selected: ModoContrato | null; onSelect: (modo: ModoContrato) => void; cuota: CuotaDeLecturas }>) {
  const sinLecturas = cuota.estado === "agotada" || cuota.estado === "apagada";
  return <><h1>¿Cómo quiere cargar el contrato?</h1><p>Si ya lo tiene firmado, lo leemos por usted y le mostramos los datos para que los revise.</p><div className="owner-wizard-options" role="radiogroup" aria-label="Cómo cargar el contrato"><Option selected={selected === "pdf"} icon="file" title="Subir el contrato firmado" description={descripcionDeSubirPdf(cuota)} nota={notaDeSubirPdf(cuota)} disabled={sinLecturas} onClick={() => onSelect("pdf")} /><Option selected={selected === "manual"} icon="edit" title="Cargarlo a mano" description="Le pedimos los datos de a uno, en 7 pasos." onClick={() => onSelect("manual")} /></div></>;
}

type Conflicto = { tipo: "inquilino"; id: number; porTelefono: boolean } | { tipo: "propiedad"; contratoId: number | null };

/**
 * Los dos 409 del alta en un solo pedido que el propietario resuelve eligiendo: el inquilino que ya
 * tiene cargado (se usa y se reenvía) y la propiedad que ya tiene un contrato vigente (se explica y
 * se ofrece verlo). Nada se creó todavía en ninguno de los dos casos.
 */
function ConflictoDeAlta({ conflicto, nombreDelExistente, guardando, onUsarExistente, onCorregirInquilino, onVerContrato, onCambiarPropiedad }: Readonly<{
  conflicto: Conflicto;
  nombreDelExistente: string | null;
  guardando: boolean;
  onUsarExistente: () => void;
  onCorregirInquilino: () => void;
  onVerContrato?: () => void;
  onCambiarPropiedad: () => void;
}>) {
  if (conflicto.tipo === "inquilino") {
    const quien = nombreDelExistente ?? "ese inquilino";
    return <div className="owner-wizard-alert" role="alert">
      <Icon name="alert" size={19} />
      <div>
        <p>Ya tiene cargado a {quien} con ese {conflicto.porTelefono ? "teléfono" : "CUIT"}.</p>
        <span className="owner-garantia__acciones">
          <button type="button" className="owner-wizard-quiet" disabled={guardando} onClick={onUsarExistente}>Usar a {quien}</button>
          <button type="button" className="owner-wizard-quiet" disabled={guardando} onClick={onCorregirInquilino}>Corregir los datos</button>
        </span>
      </div>
    </div>;
  }
  return <div className="owner-wizard-alert" role="alert">
    <Icon name="alert" size={19} />
    <div>
      <p>Esa propiedad ya tiene un contrato vigente. Finalícelo antes de crear otro, o elija otra propiedad.</p>
      <span className="owner-garantia__acciones">
        {onVerContrato && <button type="button" className="owner-wizard-quiet" onClick={onVerContrato}>Ver ese contrato</button>}
        <button type="button" className="owner-wizard-quiet" onClick={onCambiarPropiedad}>Elegir otra propiedad</button>
      </span>
    </div>
  </div>;
}

/** Cuántas lecturas le quedan. Sin lecturas, la única opción es a mano: queda elegida para poder seguir. */
function useCuotaDeLecturas(ofrecePdf: boolean, setModoElegido: (cambio: (actual: ModoContrato | null) => ModoContrato | null) => void): CuotaDeLecturas {
  const [cuota, setCuota] = useState<CuotaDeLecturas>({ estado: "cargando" });
  useEffect(() => {
    if (!ofrecePdf) return;
    let cancelado = false;
    AlquiaBackendClient.contractImports.quota()
      .then((respuesta) => {
        if (cancelado) return;
        const nueva = cuotaDeLecturas(respuesta);
        setCuota(nueva);
        if (nueva.estado === "agotada" || nueva.estado === "apagada") setModoElegido((actual) => actual ?? "manual");
      })
      .catch(() => { if (!cancelado) setCuota({ estado: "desconocida" }); });
    return () => { cancelado = true; };
  }, [ofrecePdf, setModoElegido]);
  return cuota;
}

/**
 * Las dos listas del alta de contrato, en un solo estado: o están las dos, o hubo error, o todavía se
 * están trayendo. Nunca media pantalla usable. Sólo el alta de contrato las necesita, y en /prototipo
 * no se piden: esa ruta no tiene sesión y las dos llamadas darían 401. En demo las listas son
 * constantes y se derivan aparte: pasarlas por el estado dispararía un render en cascada.
 */
function useListasDeContrato(activo: boolean): ContractLists | "error" | null {
  const [cargaListas, setCargaListas] = useState<ContractLists | "error" | null>(null);
  useEffect(() => {
    if (!activo) return;
    let cancelado = false;
    // Los contratos entran para poder descartar las propiedades ya alquiladas:
    // el backend rechaza la segunda con «Property already has an active
    // contract», y es mejor no ofrecerla que explicar el error después.
    Promise.all([
      AlquiaBackendClient.properties.list(),
      AlquiaBackendClient.tenants.list(),
      AlquiaBackendClient.contracts.list(),
    ])
      .then(([propiedades, inquilinos, contratos]) => {
        if (cancelado) return;
        const ocupadas = new Set(
          contratos.filter((c) => c.status === "ACTIVE").map((c) => c.property.id)
        );
        setCargaListas({
          sinPropiedades: propiedades.length === 0,
          propiedades: propiedades
            .filter((p: PropertyResponse) => !ocupadas.has(p.id))
            .map((p: PropertyResponse) => ({
              id: p.id,
              titulo: formatearDireccion(p),
              detalle: detallePropiedad(p),
            })),
          inquilinos: inquilinos.map((t: TenantResponse) => ({
            id: t.id,
            titulo: `${t.firstName} ${t.lastName}`,
            detalle: t.email,
          })),
        });
      })
      .catch(() => {
        if (!cancelado) setCargaListas("error");
      });
    return () => {
      cancelado = true;
    };
  }, [activo]);
  return cargaListas;
}

/**
 * Crear un inquilino o una propiedad desde el contrato es un desvío dentro del mismo asistente: el
 * contrato en curso (elecciones, paso) queda guardado y se retoma al volver. Si el contrato se abre
 * desde una propiedad, ya se sabe cuál es: arranca en el paso del inquilino (se puede volver al 1).
 */
function useNavegacion(tipo: WizardKind, initialPropertyId: number | undefined) {
  const [desvio, setDesvio] = useState<"tenant" | "property" | null>(null);
  const [pasoDesvio, setPasoDesvio] = useState(1);
  const preseleccionada = tipo === "contract" && initialPropertyId !== undefined;
  const [pasoContrato, setPasoContrato] = useState(preseleccionada ? 2 : 1);
  const kind: WizardKind = tipo === "contract" && desvio ? desvio : tipo;
  const step = desvio ? pasoDesvio : pasoContrato;
  const setStep = desvio ? setPasoDesvio : setPasoContrato;
  return { desvio, setDesvio, setPasoDesvio, setPasoContrato, preseleccionada, kind, step, setStep };
}

function validarDatosDelContrato({ alquiler, inicio, method, porcentaje }: Readonly<{
  alquiler: string; inicio: string; method: ContractMethod; porcentaje: string;
}>) {
  return {
    alquilerOk: Number(alquiler) > 0,
    inicioOk: inicio !== "" && inicio >= PISO_INICIO,
    porcentajeOk: method !== "FIXED_PERCENTAGE" || Number(porcentaje) > 0,
  };
}

type Referencia<T> = { new: T } | { id: number };

/** Lo que viaja para la propiedad o el inquilino: el borrador si se eligió crear uno nuevo, o el que ya existe. */
function referenciaDe<T>(esNuevo: boolean, borrador: { pedido: T } | null, id: number | null): Referencia<T> | null {
  if (esNuevo && borrador) return { new: borrador.pedido };
  return id === null ? null : { id };
}

type DestinoDelError =
  | { tipo: "conflicto"; conflicto: Conflicto }
  | { tipo: "campos"; porRuta: Record<string, string>; ubicaciones: Ubicacion[] }
  | { tipo: "mensaje"; mensaje: string };

/** A dónde va un error al crear el contrato: un 409 que se resuelve eligiendo, datos que corregir, o un mensaje. */
function destinoDelErrorDeAlta(err: unknown): DestinoDelError {
  if (err instanceof ApiError) {
    const existente = idDelInquilinoExistente(err);
    if ((err.type === ERROR.DUPLICATE_TAX_ID || err.type === ERROR.DUPLICATE_PHONE_NUMBER) && existente !== null) {
      return { tipo: "conflicto", conflicto: { tipo: "inquilino", id: existente, porTelefono: err.type === ERROR.DUPLICATE_PHONE_NUMBER } };
    }
    if (err.type === ERROR.PROPERTY_HAS_ACTIVE_CONTRACT) {
      return { tipo: "conflicto", conflicto: { tipo: "propiedad", contratoId: idDelContratoActivo(err) } };
    }
    const errores = err.status === 400 ? ubicacionDeErrores(err.fieldErrors) : null;
    if (errores && errores.ubicaciones.length > 0) return { tipo: "campos", porRuta: errores.porRuta, ubicaciones: errores.ubicaciones };
  }
  return { tipo: "mensaje", mensaje: mensajeDeErrorContrato(err) };
}

/** Qué paso del contrato retoma el asistente al volver de un desvío: el de la sección que sigue con errores. */
function pasoAlVolverDelDesvio(siguiente: Ubicacion | undefined, total: number): number {
  if (!siguiente) return total;
  if (siguiente.seccion === "property") return 1;
  return siguiente.seccion === "tenant" ? 2 : siguiente.paso;
}

function nombreDelInquilinoExistente(conflicto: Conflicto | null, listas: ContractLists | "error" | null): string | null {
  if (conflicto?.tipo !== "inquilino" || typeof listas !== "object" || listas === null) return null;
  return listas.inquilinos.find((o) => o.id === conflicto.id)?.titulo ?? null;
}

function faltanDatosDelInquilino({ nombre, apellido, cuitOk, correoOk, telefonoOk }: Readonly<{
  nombre: string; apellido: string; cuitOk: boolean; correoOk: boolean; telefonoOk: boolean;
}>): boolean {
  return !nombre.trim() || !apellido.trim() || !cuitOk || !correoOk || !telefonoOk;
}

/** No se eligió uno que ya existe ni se dejó un borrador nuevo. */
function faltaElegir(id: number | null, esNuevo: boolean, borrador: unknown): boolean {
  return id === null && !(esNuevo && borrador !== null);
}

function contratoBloqueado(step: number, { propiedadSinElegir, inquilinoSinElegir, alquilerOk, inicioOk, porcentajeOk, faltaRespuesta }: Readonly<{
  propiedadSinElegir: boolean; inquilinoSinElegir: boolean; alquilerOk: boolean; inicioOk: boolean; porcentajeOk: boolean; faltaRespuesta: boolean;
}>): boolean {
  switch (step) {
    case 1: return propiedadSinElegir;
    case 2: return inquilinoSinElegir;
    case 3: return !alquilerOk;
    case 4: return !inicioOk;
    case 5: return !porcentajeOk;
    case 7: return faltaRespuesta;
    default: return false;
  }
}

function propiedadBloqueada(step: number, direccion: Direccion | null, categoria: PropertyCategory | null): boolean {
  if (step === 1) return !direccion || [direccion.street, direccion.number, direccion.city, direccion.province].some((campo) => !campo.trim());
  return step === 2 && categoria === null;
}

/** ¿Hay algo cargado? Un texto vacío, `null` o `false` es que no. */
function hayTrabajoDelContrato(campos: readonly unknown[]): boolean {
  return campos.some((campo) => campo !== null && campo !== "" && campo !== false);
}

function seleccionDe<T>({ id, borrador, esNuevo, elegir, elegirBorrador, crear }: Readonly<{
  id: number | null;
  borrador: { pedido: T; etiqueta: string } | null;
  esNuevo: boolean;
  elegir: (id: number) => void;
  elegirBorrador: () => void;
  crear: () => void;
}>): SeleccionDeContrato {
  return {
    id,
    borrador: borrador?.etiqueta ?? null,
    borradorElegido: esNuevo && borrador !== null,
    onElegir: elegir,
    onElegirBorrador: elegirBorrador,
    onNueva: crear,
  };
}

function etiquetaDePropiedad(direccion: Direccion, unidad: string): string {
  const sufijo = unidad.trim() ? `, ${unidad.trim()}` : "";
  return `${direccion.street.trim()} ${direccion.number.trim()}${sufijo}`;
}

function tituloDelAsistente(kind: WizardKind): string {
  if (kind === "property") return "Nueva propiedad";
  return kind === "tenant" ? "Nuevo inquilino" : "Nuevo contrato";
}

function ariaDelAsistente(kind: WizardKind): string {
  if (kind === "property") return "Asistente de nueva propiedad";
  return kind === "tenant" ? "Asistente de nuevo inquilino" : "Asistente de nuevo contrato";
}

/** Desde el contrato no se guarda nada todavía: el desvío sólo deja el borrador. */
function etiquetaDeCierre(kind: WizardKind, enDesvio: boolean): string {
  if (kind === "property") return enDesvio ? "Usar esta propiedad" : "Guardar propiedad";
  if (kind === "tenant") return enDesvio ? "Usar este inquilino" : "Guardar inquilino";
  return "Crear contrato";
}

function ContenidoDelBoton({ eligiendo, guardando, finish, etiquetaDeCierre }: Readonly<{ eligiendo: boolean; guardando: boolean; finish: boolean; etiquetaDeCierre: string }>) {
  if (!eligiendo && guardando) return <><Spinner />Guardando…</>;
  if (!eligiendo && finish) return <>{etiquetaDeCierre}</>;
  return <>Seguir <Icon name="arrow" /></>;
}

function PropertyWizardStep({
  step, total, demo, direccion, setDireccion, unidad, setUnidad, categoria, setCategoria, bedrooms, setBedrooms, bathrooms, setBathrooms,
  superficie, setSuperficie, mascotas, setMascotas, amoblada, setAmoblada, erroresBackend, errorGuardado, setStep,
}: Readonly<{
  step: number;
  total: number;
  demo: boolean;
  direccion: Direccion | null;
  setDireccion: (direccion: Direccion | null) => void;
  unidad: string;
  setUnidad: (unidad: string) => void;
  categoria: PropertyCategory | null;
  setCategoria: (categoria: PropertyCategory) => void;
  bedrooms: number | null;
  setBedrooms: (valor: number | null) => void;
  bathrooms: number | null;
  setBathrooms: (valor: number | null) => void;
  superficie: string;
  setSuperficie: (valor: string) => void;
  mascotas: boolean;
  setMascotas: (valor: boolean) => void;
  amoblada: boolean;
  setAmoblada: (valor: boolean) => void;
  erroresBackend: Record<string, string>;
  errorGuardado: string | null;
  setStep: (paso: number) => void;
}>) {
  const sufijoUnidad = unidad ? `, ${unidad}` : "";
  const direccionCompleta = direccion
    ? `${etiquetaDireccion(direccion)}${sufijoUnidad}`
    : "Sin cargar";
  // El paso de características es opcional: se lista solo lo que se cargó.
  const caracteristicas = descripcionCaracteristicas({
    bedrooms,
    bathrooms,
    coveredArea: superficie,
    petsAllowed: mascotas,
    furnished: amoblada,
  });
  const categoryStep = (
    <>
      <h1>¿Qué tipo de propiedad es?</h1>
      <p>Define cómo se lista y cómo se la reconoce después en el buscador.</p>
      <div className="owner-wizard-options" role="radiogroup" aria-label="Tipo de propiedad">
        {CATEGORIAS.map((c) => (
          <Option key={c.valor} selected={categoria === c.valor} icon="building"
            title={c.etiqueta} description={c.descripcion} onClick={() => setCategoria(c.valor)} />
        ))}
      </div>
      <Aviso texto={avisoDeCampo(erroresBackend, "property", "category")} />
    </>
  );

    if (step === 1) {
      return <>
      <h1>¿Dónde queda la propiedad?</h1>
      <p>Busque la dirección. Si el número, la ciudad o la provincia no aparecen, complételos a mano.</p>
      <div className="owner-wizard-stack">
        <AddressField demo={demo} value={direccion} onSelect={setDireccion} onClear={() => setDireccion(null)} />
        {direccion && (<>
          <label className="owner-wizard-field">
            <span>Calle</span>
            <input required placeholder="Ej: Lavalle" value={direccion.street}
              onChange={(e) => setDireccion({ ...direccion, street: e.target.value })} />
          </label>
          <Aviso texto={avisoDeCampo(erroresBackend, "property", "street")} />
          <label className="owner-wizard-field">
            <span>Número</span>
            <input required inputMode="numeric" placeholder="Ej: 950" value={direccion.number}
              onChange={(e) => setDireccion({ ...direccion, number: e.target.value })} />
          </label>
          <Aviso texto={avisoDeCampo(erroresBackend, "property", "number")} />
          <label className="owner-wizard-field">
            <span>Ciudad</span>
            <input required placeholder="Ej: Morón" value={direccion.city}
              onChange={(e) => setDireccion({ ...direccion, city: e.target.value })} />
          </label>
          <Aviso texto={avisoDeCampo(erroresBackend, "property", "city")} />
          <label className="owner-wizard-field">
            <span>Provincia</span>
            <input required placeholder="Ej: Buenos Aires" value={direccion.province}
              onChange={(e) => setDireccion({ ...direccion, province: e.target.value })} />
          </label>
          <Aviso texto={avisoDeCampo(erroresBackend, "property", "province")} />
          <label className="owner-wizard-field">
            <span>Código postal</span>
            <input placeholder="Ej: B1708 — si lo sabe" value={direccion.postalCode}
              onChange={(e) => setDireccion({ ...direccion, postalCode: e.target.value })} />
          </label>
          <Aviso texto={avisoDeCampo(erroresBackend, "property", "postalCode")} />
          <label className="owner-wizard-field">
            <span className="sr-only">Piso y departamento</span>
            <input placeholder="Piso y depto. — si corresponde" value={unidad}
              onChange={(e) => setUnidad(e.target.value)} />
          </label>
          <Aviso texto={avisoDeCampo(erroresBackend, "property", "floorUnit")} />
        </>)}
      </div>
      </>;
    }
    if (step === 2) return categoryStep;
    if (step === 3) {
      return <>
        <h1>¿Cómo es la propiedad?</h1>
        <p>Todo esto es opcional. Sirve para reconocerla rápido en la lista.</p>
        <div className="owner-wizard-counters">
          <Counter label="Dormitorios" value={bedrooms} onChange={setBedrooms} />
          <Counter label="Baños" value={bathrooms} onChange={setBathrooms} />
        </div>
        <p className="owner-wizard-label">Superficie cubierta</p>
        <label className="owner-wizard-field owner-wizard-field--medium">
          <span className="sr-only">Superficie cubierta en metros cuadrados</span>
          <input value={superficie} inputMode="numeric" placeholder="—" onChange={(e) => setSuperficie(e.target.value.replace(/\D/g, ""))} />
          <span>m²</span>
        </label>
        <p className="owner-wizard-label">Además</p>
        <div className="owner-wizard-chips">
          <button type="button" aria-pressed={mascotas} onClick={() => setMascotas(!mascotas)}>Acepta mascotas</button>
          <button type="button" aria-pressed={amoblada} onClick={() => setAmoblada(!amoblada)}>Se alquila amueblada</button>
        </div>
        <Aviso texto={avisoDeCampo(erroresBackend, "property", "bedrooms", "bathrooms", "coveredArea", "petsAllowed", "furnished")} />
        <button type="button" className="owner-wizard-skip" onClick={() => setStep(total)}>Saltear este paso</button>
      </>;
    }
    return <>
      <h1>Listo. ¿La guardamos?</h1>
      <p>Va a quedar sin alquilar hasta que le cree un contrato.</p>
      <Summary rows={[
        ["Dirección", direccionCompleta],
        ["Ciudad", direccion ? [direccion.city, direccion.province].filter(Boolean).join(" · ") : "Sin cargar"],
        ["Tipo", CATEGORIAS.find((categoriaItem) => categoriaItem.valor === categoria)?.etiqueta ?? "Sin cargar"],
        ["Características", caracteristicas],
        ["Estado", "Sin alquilar"],
      ]} />
      {errorGuardado && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorGuardado}</p>}
      <aside className="owner-wizard-note"><Icon name="trend" />Para empezar a cobrarla necesita un contrato, que la vincula con un inquilino y define el alquiler.</aside>
    </>;
}

export default function CreationWizard({ kind: tipo, onClose, onComplete, onOpenContract, demo = false, initialPropertyId }: Readonly<{ kind: WizardKind; onClose: () => void; onComplete: () => void; /** Abre un contrato que ya existe: lo usa el aviso de «esa propiedad ya tiene un contrato vigente». */ onOpenContract?: (contractId: number) => void; demo?: boolean; initialPropertyId?: number }>) {
  const { desvio, setDesvio, setPasoDesvio, setPasoContrato, preseleccionada, kind, step, setStep } = useNavegacion(tipo, initialPropertyId);
  const total = cantidadPasos(kind);
  const [propiedadId, setPropiedadId] = useState<number | null>(preseleccionada ? initialPropertyId ?? null : null);
  const [inquilinoId, setInquilinoId] = useState<number | null>(null);
  // Lo que se carga en un desvío no se guarda: queda acá como borrador hasta «Crear contrato».
  // `…Nueva` dice si la elegida es el borrador y no un registro que ya existe.
  const [borradorPropiedad, setBorradorPropiedad] = useState<{ pedido: PropertyRequest; etiqueta: string } | null>(null);
  const [propiedadNueva, setPropiedadNueva] = useState(false);
  const [borradorInquilino, setBorradorInquilino] = useState<{ pedido: TenantRequest; etiqueta: string } | null>(null);
  const [inquilinoNuevo, setInquilinoNuevo] = useState(false);
  const [method, setMethod] = useState<ContractMethod>("FIXED_PERCENTAGE");
  const [term, setTerm] = useState(36);
  const [alquiler, setAlquiler] = useState("");
  const [inicio, setInicio] = useState(hoyISO);
  const [diaVencimiento, setDiaVencimiento] = useState(1);
  const [porcentaje, setPorcentaje] = useState("");
  const [frecuencia, setFrecuencia] = useState(6);
  // «¿Hasta qué mes le pagaron?»: vacío hasta que el propietario contesta. Si el backend corrige la
  // lista de meses (un contrato por índice no genera todas las cuotas), su lista vale mientras no
  // cambien el inicio, el plazo o el vencimiento que la originaron.
  const [pagadoHasta, setPagadoHasta] = useState<RespuestaPagadoHasta>("");
  const [periodosBackend, setPeriodosBackend] = useState<{ clave: string; meses: string[] } | null>(null);
  // null = todavía no lo cargó. El paso es opcional, así que no puede arrancar
  // con un número puesto por nosotros: se guardaría como si lo hubiera elegido.
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [superficie, setSuperficie] = useState("");
  const [direccion, setDireccion] = useState<Direccion | null>(null);
  const [unidad, setUnidad] = useState("");
  const [categoria, setCategoria] = useState<PropertyCategory | null>(null);
  // Los dos extras arrancan apagados y, si quedan así, no se mandan: el paso es
  // opcional, y un `false` afirmaría «no acepta mascotas», que no es lo que el
  // propietario dijo. Ver `guardarPropiedad`.
  const [mascotas, setMascotas] = useState(false);
  const [amoblada, setAmoblada] = useState(false);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cuit, setCuit] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  // «Otras condiciones»: depósito, comisión, punitorios y garantías. Lo que queda vacío no viaja.
  const [otras, setOtras] = useState<Condiciones>(SIN_OTRAS_CONDICIONES);
  const [intentoOtras, setIntentoOtras] = useState(false);
  // Los errores del backend, por su ruta (`property.street`), hasta el próximo intento de crear.
  const [erroresBackend, setErroresBackend] = useState<Record<string, string>>({});
  // Un 409 que el propietario resuelve con una elección: usar al inquilino que ya existe, o ver el contrato vigente.
  const [conflicto, setConflicto] = useState<Conflicto | null>(null);
  // Salir con algo cargado pide confirmación: guarda qué hacer si el propietario confirma.
  const [confirmandoSalida, setConfirmandoSalida] = useState<(() => void) | null>(null);
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  // Antes del primer paso del contrato se elige cómo cargarlo. Con una propiedad ya elegida
  // (se abrió desde ella) se va directo a mano: el contrato leído no la tendría en cuenta. En
  // /prototipo (`demo`) no hay sesión ni backend que lea el PDF, así que tampoco se ofrece.
  const ofrecePdf = tipo === "contract" && !preseleccionada && !demo;
  const [modo, setModo] = useState<ModoContrato | "elegir">(ofrecePdf ? "elegir" : "manual");
  const [modoElegido, setModoElegido] = useState<ModoContrato | null>(null);
  const eligiendo = modo === "elegir";
  const cuota = useCuotaDeLecturas(ofrecePdf, setModoElegido);
  const cargaListas = useListasDeContrato(kind === "contract" && !demo);

  const cuitOk = cuitValido(cuit);
  const correoOk = correoValido(correo);
  const telefonoOk = telefonoValido(telefono);
  const tenantStep = <TenantWizardStep
    firstName={nombre}
    lastName={apellido}
    taxId={cuit}
    email={correo}
    phone={telefono}
    isTaxIdValid={cuitOk}
    isEmailValid={correoOk}
    isPhoneValid={telefonoOk}
    error={errorGuardado}
    erroresBackend={erroresBackend}
    onFirstNameChange={setNombre}
    onLastNameChange={setApellido}
    onTaxIdChange={setCuit}
    onEmailChange={setCorreo}
    onPhoneChange={setTelefono}
  />;
  const listas = listasDisponibles(demo, cargaListas);
  const { alquilerOk, inicioOk, porcentajeOk } = validarDatosDelContrato({ alquiler, inicio, method, porcentaje });
  const hoyArgentina = hoyEnArgentina();
  const claveDeFechas = `${inicio}|${term}|${diaVencimiento}`;
  const mesesPorPagar = periodosBackend?.clave === claveDeFechas
    ? periodosBackend.meses
    : mesesTranscurridos({ inicioISO: inicio, plazoMeses: term, diaVencimiento, hoyISO: hoyArgentina });
  const respuestaVigente = respuestaVigenteDe(pagadoHasta, mesesPorPagar);

  const finish = step === total;
  // No se puede avanzar con datos que el backend rechazaría (@NotBlank / @ValidTaxId / @Email)
  const bloqueadoPorTipo: Record<WizardKind, boolean> = {
    tenant: faltanDatosDelInquilino({ nombre, apellido, cuitOk, correoOk, telefonoOk }),
    property: propiedadBloqueada(step, direccion, categoria),
    contract: contratoBloqueado(step, {
      propiedadSinElegir: faltaElegir(propiedadId, propiedadNueva, borradorPropiedad),
      inquilinoSinElegir: faltaElegir(inquilinoId, inquilinoNuevo, borradorInquilino),
      alquilerOk,
      inicioOk,
      porcentajeOk,
      faltaRespuesta: faltaResponder(respuestaVigente, mesesPorPagar),
    }),
  };
  const bloqueado = guardando || (eligiendo ? modoElegido === null : bloqueadoPorTipo[kind]);
  function volverAlContrato() {
    setGuardando(false);
    setDesvio(null);
    setPasoDesvio(1);
  }
  // Lo que el asistente suelto guarda y el desvío del contrato sólo anota como borrador.
  function armarInquilino(): TenantRequest {
    return {
      firstName: nombre.trim(),
      lastName: apellido.trim(),
      // Sin guiones: @ValidTaxId acepta los dos formatos, pero guardar siempre
      // igual evita que el mismo CUIT entre dos veces con distinto formato y
      // esquive el chequeo de duplicados, que compara el string tal cual.
      taxId: soloDigitos(cuit),
      email: correo.trim(),
      // En dígitos por la misma razón que el CUIT —dos formatos del mismo
      // teléfono no deberían esquivar el chequeo de duplicados—, no porque el
      // backend lo exija: su normalizador reconstruye el número igual venga
      // con separadores. Ver src/lib/telefono.ts.
      phoneNumber: soloDigitosTelefono(telefono),
    };
  }
  function armarPropiedad(direccionElegida: Direccion, categoriaElegida: PropertyCategory): PropertyRequest {
    return {
      street: direccionElegida.street.trim(),
      number: direccionElegida.number.trim(),
      // El piso y el departamento son un campo aparte del número de calle.
      floorUnit: unidad.trim() || undefined,
      city: direccionElegida.city.trim(),
      province: direccionElegida.province.trim(),
      postalCode: direccionElegida.postalCode.trim() || undefined,
      latitude: direccionElegida.latitude ?? undefined,
      longitude: direccionElegida.longitude ?? undefined,
      category: categoriaElegida,
      // Lo que el propietario no cargó no se manda: el paso es opcional y un
      // cero o un false serían un dato que él nunca dio.
      bedrooms: bedrooms ?? undefined,
      bathrooms: bathrooms ?? undefined,
      coveredArea: superficie ? Number(superficie) : undefined,
      petsAllowed: mascotas || undefined,
      furnished: amoblada || undefined,
    };
  }

  // Desde el contrato, «guardar» sólo anota el borrador y vuelve con él elegido. Los campos quedan
  // cargados para poder cambiarlos después. Suelto, termina el asistente (onComplete lo desmonta,
  // sin setGuardando(false)).
  function sinErroresDe(seccion: string) {
    setErroresBackend((actuales) => Object.fromEntries(Object.entries(actuales).filter(([ruta]) => !ruta.startsWith(`${seccion}.`))));
  }
  function terminarInquilino() {
    if (tipo === "tenant") return onComplete();
    sinErroresDe("tenant");
    setBorradorInquilino({ pedido: armarInquilino(), etiqueta: `${nombre.trim()} ${apellido.trim()}` });
    setInquilinoNuevo(true);
    volverAlContrato();
  }
  function terminarPropiedad(direccionElegida: Direccion, categoriaElegida: PropertyCategory) {
    if (tipo === "property") return onComplete();
    sinErroresDe("property");
    setBorradorPropiedad({
      pedido: armarPropiedad(direccionElegida, categoriaElegida),
      etiqueta: etiquetaDePropiedad(direccionElegida, unidad),
    });
    setPropiedadNueva(true);
    volverAlContrato();
  }
  async function guardarInquilino() {
    // En /prototipo no hay sesión: guardar de verdad daría 401 y la demo se
    // cortaría justo en el paso que quiere mostrar. Y desde el contrato no se guarda: es un borrador.
    if (demo || tipo !== "tenant") return terminarInquilino();
    setErrorGuardado(null);
    setGuardando(true);
    try {
      await AlquiaBackendClient.tenants.create(armarInquilino());
      terminarInquilino();
    } catch (err) {
      setErrorGuardado(mensajeDeError(err));
      setGuardando(false);
    }
  }

  async function guardarPropiedad() {
    if (direccion === null || categoria === null) return;
    if (demo || tipo !== "property") return terminarPropiedad(direccion, categoria);
    setErrorGuardado(null);
    setGuardando(true);
    try {
      await AlquiaBackendClient.properties.create(armarPropiedad(direccion, categoria));
      terminarPropiedad(direccion, categoria);
    } catch (err) {
      setErrorGuardado(mensajeDeErrorPropiedad(err));
      setGuardando(false);
    }
  }

  /** Lleva al propietario al primer lugar con errores; al volver cae en el siguiente que quede por corregir. */
  function irAlPrimerError(ubicaciones: Ubicacion[]) {
    const [primera, ...resto] = ubicaciones;
    if (!primera) return;
    const pasoAlVolver = pasoAlVolverDelDesvio(resto[0], total);
    if (primera.seccion === "contract") {
      setDesvio(null);
      setPasoContrato(primera.paso);
      return;
    }
    setPasoContrato(pasoAlVolver);
    setPasoDesvio(primera.paso);
    setDesvio(primera.seccion);
  }

  /** Cuando el backend corrige la lista de cuotas (o la respuesta quedó fuera de rango), se vuelve a preguntar. */
  function repreguntarCuotas(err: unknown) {
    if (!(err instanceof ApiError)) return;
    if (err.type === ERROR.ELAPSED_INVOICES_DECISION_REQUIRED) {
      // Pasa cerca de la medianoche o con un contrato por índice: la lista del backend manda y se vuelve a preguntar.
      const periodos = periodosDelBackend(err.fieldErrors);
      if (periodos) setPeriodosBackend({ clave: claveDeFechas, meses: periodos });
      setPagadoHasta("");
    } else if (err.type === ERROR.ELAPSED_PAID_THROUGH_OUT_OF_RANGE) {
      setPagadoHasta("");
    }
  }

  function mostrarErrorDeAlta(err: unknown) {
    repreguntarCuotas(err);
    const destino = destinoDelErrorDeAlta(err);
    if (destino.tipo === "conflicto") {
      setConflicto(destino.conflicto);
    } else if (destino.tipo === "campos") {
      setErroresBackend(destino.porRuta);
      irAlPrimerError(destino.ubicaciones);
    } else {
      setErrorGuardado(destino.mensaje);
    }
    setGuardando(false);
  }

  async function guardarContrato(inquilinoExistente?: number) {
    const propiedad = referenciaDe(propiedadNueva, borradorPropiedad, propiedadId);
    const inquilino = inquilinoExistente === undefined
      ? referenciaDe(inquilinoNuevo, borradorInquilino, inquilinoId)
      : { id: inquilinoExistente };
    if (propiedad === null || inquilino === null) return;
    if (demo) return onComplete();
    setErrorGuardado(null);
    setErroresBackend({});
    setConflicto(null);
    setGuardando(true);
    try {
      // Un solo pedido con todo: o se crea todo, o nada. Los borradores recién se guardan acá.
      await AlquiaBackendClient.contracts.onboard({
        property: propiedad,
        tenant: inquilino,
        contract: {
          initialRentAmount: Number(alquiler),
          startDate: inicio,
          termMonths: term,
          dueDay: diaVencimiento,
          incrementFrequencyMonths: frecuencia,
          // El backend separa el cómo del qué, y es excluyente: FIXED_PERCENTAGE
          // exige incrementValue y prohíbe incrementIndexName, INDEX al revés.
          // Mandar los dos, o ninguno, es un 400.
          ...datosDeActualizacion(method, porcentaje),
          ...armarOtrasCondiciones(otras),
        },
        elapsed: paidThroughDe(respuestaVigente, mesesPorPagar),
      });
      onComplete();
    } catch (err) {
      mostrarErrorDeAlta(err);
    }
  }

  // Un contrato a medias no deja nada en el servidor, pero sí trabajo del propietario: si hay algo
  // cargado, salir se confirma. Un asistente suelto de propiedad o inquilino sale como siempre.
  const hayAlgoCargado = tipo === "contract" && hayTrabajoDelContrato([
    borradorPropiedad, borradorInquilino, direccion, hayOtrasCondiciones(otras), alquiler, porcentaje, nombre, apellido, cuit, correo, telefono,
  ]);
  function pedirSalir(salir: () => void) {
    if (hayAlgoCargado) setConfirmandoSalida(() => salir);
    else salir();
  }

  const next = () => {
    if (eligiendo) return modoElegido && setModo(modoElegido);
    // «Otras condiciones» es opcional, pero lo que se escribió tiene que estar completo: si no, se marca dónde.
    if (kind === "contract" && step === 6 && !otrasCondicionesValidas(otras)) return setIntentoOtras(true);
    if (!finish) return setStep((current) => current + 1);
    if (kind === "tenant") return void guardarInquilino();
    if (kind === "contract") return void guardarContrato();
    void guardarPropiedad();
  };

  const propertyStep = <PropertyWizardStep
    step={step}
    total={total}
    demo={demo}
    direccion={direccion}
    setDireccion={setDireccion}
    unidad={unidad}
    setUnidad={setUnidad}
    categoria={categoria}
    setCategoria={setCategoria}
    bedrooms={bedrooms}
    setBedrooms={setBedrooms}
    bathrooms={bathrooms}
    setBathrooms={setBathrooms}
    superficie={superficie}
    setSuperficie={setSuperficie}
    mascotas={mascotas}
    setMascotas={setMascotas}
    amoblada={amoblada}
    setAmoblada={setAmoblada}
    erroresBackend={erroresBackend}
    errorGuardado={errorGuardado}
    setStep={setStep}
  />;

  const contractLists = listas ?? cargaListas;
  function abrirDesvio(cual: "tenant" | "property") {
    setErrorGuardado(null);
    setPasoDesvio(1);
    setDesvio(cual);
  }
  const seleccionDePropiedad = seleccionDe({
    id: propiedadId, borrador: borradorPropiedad, esNuevo: propiedadNueva,
    elegir: (id) => { setPropiedadId(id); setPropiedadNueva(false); },
    elegirBorrador: () => { setPropiedadNueva(true); setPropiedadId(null); },
    crear: () => abrirDesvio("property"),
  });
  const seleccionDeInquilino = seleccionDe({
    id: inquilinoId, borrador: borradorInquilino, esNuevo: inquilinoNuevo,
    elegir: (id) => { setInquilinoId(id); setInquilinoNuevo(false); },
    elegirBorrador: () => { setInquilinoNuevo(true); setInquilinoId(null); },
    crear: () => abrirDesvio("tenant"),
  });
  const nombreDelExistente = nombreDelInquilinoExistente(conflicto, contractLists);
  const contratoAVer = conflicto?.tipo === "propiedad" ? conflicto.contratoId : null;
  const conflictSection = conflicto && <ConflictoDeAlta
    conflicto={conflicto}
    nombreDelExistente={nombreDelExistente}
    guardando={guardando}
    onUsarExistente={() => { if (conflicto.tipo === "inquilino") void guardarContrato(conflicto.id); }}
    onCorregirInquilino={() => { setConflicto(null); abrirDesvio("tenant"); }}
    onVerContrato={contratoAVer !== null && onOpenContract ? () => pedirSalir(() => onOpenContract(contratoAVer)) : undefined}
    onCambiarPropiedad={() => { setConflicto(null); setPasoContrato(1); }}
  />;
  const contractStep = <ContractWizardStep
    step={step}
    lists={contractLists}
    propiedad={seleccionDePropiedad}
    inquilino={seleccionDeInquilino}
    rent={alquiler}
    dueDay={diaVencimiento}
    term={term}
    startDate={inicio}
    isStartDateValid={inicioOk}
    method={method}
    percentage={porcentaje}
    frequency={frecuencia}
    otras={otras}
    mostrarErroresDeOtras={intentoOtras}
    error={errorGuardado}
    erroresBackend={erroresBackend}
    cantidadErrores={Object.keys(erroresBackend).length}
    conflictSection={conflictSection}
    elapsedSection={<PagosTranscurridos meses={mesesPorPagar} value={respuestaVigente} onChange={setPagadoHasta} inicioISO={inicio} alquiler={Number(alquiler)} frecuenciaMeses={frecuencia} tieneRecargo={punitoriosCargados(otras.punitorios)} hoyISO={hoyArgentina} />}
    onRentChange={setAlquiler}
    onDueDayChange={setDiaVencimiento}
    onTermChange={setTerm}
    onStartDateChange={setInicio}
    onMethodChange={setMethod}
    onPercentageChange={setPorcentaje}
    onFrequencyChange={setFrecuencia}
    onOtrasChange={setOtras}
    onSaltearOtras={() => setPasoContrato(total)}
    onCambiar={setPasoContrato}
  />;

  const tituloAsistente = tituloDelAsistente(kind);
  const ariaAsistente = ariaDelAsistente(kind);
  const finishLabel = etiquetaDeCierre(kind, desvio !== null);
  const stepContent = (() => {
    if (eligiendo) return <ContractModeStep selected={modoElegido} onSelect={setModoElegido} cuota={cuota} />;
    if (kind === "property") return propertyStep;
    if (kind === "tenant") return tenantStep;
    return contractStep;
  })();
  if (modo === "pdf") {
    const alternar = { onBack: () => setModo("elegir"), onManual: () => { setModoElegido("manual"); setModo("manual"); }, onClose, onComplete };
    return <ContractFromPdf {...alternar} onOpenContract={onOpenContract} />;
  }

  const atrasDeshabilitado = eligiendo || guardando || (step === 1 && !desvio && !ofrecePdf);
  // Desde el primer paso a mano, «Atrás» vuelve a la elección.
  const atras = () => {
    if (desvio && step === 1) return volverAlContrato();
    if (ofrecePdf && !desvio && step === 1) return setModo("elegir");
    setStep((current) => Math.max(1, current - 1));
  };

  return (
    <section className="owner-wizard" aria-label={ariaAsistente}>
      <header className="owner-wizard__top">
        <button type="button" aria-label="Salir del asistente" onClick={() => pedirSalir(onClose)} disabled={guardando}>
          <Icon name="x" />
        </button>
        <b>{tituloAsistente}</b>
        {total > 1 && !eligiendo && (
          <>
            <progress className="owner-wizard__progress" value={step} max={total} aria-label="Progreso del asistente" />
            <span>Paso {step} de {total}</span>
          </>
        )}
      </header>
      <main className="owner-wizard__body">{stepContent}</main>
      <footer className="owner-wizard__footer">
        <button type="button" className="owner-wizard-quiet" onClick={atras} disabled={atrasDeshabilitado}>
          Atrás
        </button>
        <button type="button" className="owner-wizard-next" onClick={next} disabled={bloqueado}>
          <ContenidoDelBoton eligiendo={eligiendo} guardando={guardando} finish={finish} etiquetaDeCierre={finishLabel} />
        </button>
      </footer>
      {confirmandoSalida && <Dialog title="¿Salir sin crear el contrato?" onClose={() => setConfirmandoSalida(null)}>
        <div className="owner-dialog__body"><p>No se guardó nada: ni la propiedad, ni el inquilino, ni el contrato. Si sale ahora, lo que cargó se pierde.</p></div>
        <div className="owner-dialog__foot">
          <button type="button" className="owner-button owner-button--quiet" onClick={() => setConfirmandoSalida(null)}>Seguir cargando</button>
          <button type="button" className="owner-button owner-button--danger" onClick={() => { const salir = confirmandoSalida; setConfirmandoSalida(null); salir(); }}>Salir</button>
        </div>
      </Dialog>}
    </section>
  );
}


function Summary({ rows }: Readonly<{ rows: (string | (() => void))[][] }>) {
  return <div className="owner-wizard-summary">{rows.map(([label, value, onCambiar]) => <div key={label as string}><span>{label as string}</span><b>{value as string}</b>{typeof onCambiar === "function" && <button type="button" className="owner-wizard-quiet" aria-label={`Cambiar ${(label as string).toLowerCase()}`} onClick={onCambiar}>Cambiar</button>}</div>)}</div>;
}
