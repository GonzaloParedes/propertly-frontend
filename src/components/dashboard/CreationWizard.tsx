"use client";

import { useEffect, useState } from "react";
import { cuitValido, formatearCuit, soloDigitos } from "@/lib/cuit";
import { errorDeTelefono, soloDigitosTelefono, telefonoValido } from "@/lib/telefono";
import { ApiError, AuthExpiredError } from "@/lib/api";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { AddressSuggestionResponse, PropertyCategory, PropertyResponse, TenantResponse } from "@/lib/backend-types";
import { CATEGORIAS, detallePropiedad } from "@/lib/propiedad";
import Counter from "@/components/ui/Counter";
import { correoValido } from "@/lib/correo";
import { formatearDireccion } from "@/lib/tenant-rows";

/**
 * El backend devuelve 400 tanto para los duplicados como para cualquier otra
 * validación, y sólo se distinguen por el texto: TenantService.create chequea
 * dos unicidades y tira IllegalArgumentException("Tax ID already registered") o
 * ("Phone number already registered"); el resto llega como "Validation failed"
 * desde el handler de bean validation. Los dos duplicados son por propietario,
 * no globales — de ahí el «en otro inquilino suyo».
 */
function mensajeDeError(err: unknown): string {
  if (err instanceof AuthExpiredError) {
    return "Su sesión expiró. Vuelva a iniciar sesión para guardar el inquilino.";
  }
  if (err instanceof ApiError && err.message === "Tax ID already registered") {
    return "Ese CUIT ya figura en otro inquilino suyo.";
  }
  if (err instanceof ApiError && err.message === "Phone number already registered") {
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
type Direccion = { street: string; number: string; city: string; province: string };

const etiquetaDireccion = (d: Direccion) => `${d.street} ${d.number}`;

/** Sólo para /prototipo: sin sesión `/address-lookup` daría 401. */
const DIRECCIONES_DEMO: (Direccion & AddressSuggestionResponse)[] = [
  { reference: "demo-1", label: "Lavalle 950", street: "Lavalle", number: "950", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { reference: "demo-2", label: "Av. Rivadavia 2340", street: "Av. Rivadavia", number: "2340", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { reference: "demo-3", label: "Mitre 78", street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires" },
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
          <small>{value.city} · {value.province}</small>
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
      elegir({ street: r.street ?? "", number: r.number ?? "", city: r.city ?? "", province: r.province ?? "" });
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
          <button type="button" onClick={() => elegir({ street: query.trim(), number: "", city: "", province: "" })}>
            Usarla igual
          </button>
        </p>
      )}
    </div>
  );
}

function Icon({ name, size = 22 }: Readonly<{ name: "x" | "arrow" | "check" | "building" | "users" | "plus" | "minus" | "trend" | "search" | "alert"; size?: number }>) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.5-4.5" /></>,
    x: <path d="m6.5 6.5 11 11m0-11-11 11" />,
    arrow: <><path d="M4 12h15" /><path d="m13.5 6 5.5 6-5.5 6" /></>,
    check: <path strokeWidth="2.6" d="m20 6.5-10.5 10L4 11.5" />,
    building: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2" /></>,
    users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.4a6.5 6.5 0 0 1 4 5.6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    trend: <path d="m3.5 17.5 5-5.5 4 3.5 7.5-8M15.5 7.5h5v5" />,
    alert: <><path d="M12 3.5 2.5 20.5h19L12 3.5Z" /><path d="M12 10v4.5M12 17.8v.1" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Option({ selected, icon, title, description, onClick }: Readonly<{ selected: boolean; icon: "building" | "users" | "trend"; title: string; description: string; onClick: () => void }>) {
  return <button type="button" className="owner-wizard-option" role="radio" aria-checked={selected} onClick={onClick}><span className="owner-wizard-option__icon"><Icon name={icon} /></span><span><b>{title}</b><small>{description}</small></span><span className="owner-wizard-option__check"><Icon name="check" /></span></button>;
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
  if (err instanceof ApiError && err.message === "Property already has an active contract") {
    return "Esa propiedad ya tiene un contrato vigente. Finalícelo antes de crear otro.";
  }
  if (err instanceof ApiError && err.status === 400) {
    return "Verifique los datos del contrato e inténtelo de nuevo.";
  }
  return "No pudimos crear el contrato. Inténtelo de nuevo más tarde.";
}

/** El backend no acepta contratos que empiecen antes de diciembre de 2022. */
const PISO_INICIO = "2022-12-01";

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
  if (kind === "contract") return 6;
  if (kind === "tenant") return 1;
  return 4;
}

function datosDeActualizacion(
  method: "FIXED_PERCENTAGE" | "ICL" | "IPC",
  porcentaje: string
) {
  if (method === "FIXED_PERCENTAGE") {
    return { incrementMethod: "FIXED_PERCENTAGE" as const, incrementValue: Number(porcentaje) };
  }
  return { incrementMethod: "INDEX" as const, incrementIndexName: method };
}

type ContractLists = { propiedades: Opcion[]; inquilinos: Opcion[] };
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
  onFirstNameChange,
  onLastNameChange,
  onTaxIdChange,
  onEmailChange,
  onPhoneChange,
}: Readonly<{
  firstName: string; lastName: string; taxId: string; email: string; phone: string;
  isTaxIdValid: boolean; isEmailValid: boolean; isPhoneValid: boolean; error: string | null;
  onFirstNameChange: (value: string) => void; onLastNameChange: (value: string) => void;
  onTaxIdChange: (value: string) => void; onEmailChange: (value: string) => void; onPhoneChange: (value: string) => void;
}>) {
  const taxIdError = soloDigitos(taxId).length < 11
    ? "Faltan dígitos: son 11 en total."
    : "El número no es válido. Revise que no haya un dígito cambiado.";
  return <><h1>¿Quién es el inquilino?</h1><p>Estos son los datos que van a figurar en el contrato. Al correo le llegan los avisos de vencimiento y el enlace para subir comprobantes.</p><div className="owner-wizard-stack"><div className="owner-wizard-duo"><label className="owner-wizard-field"><span className="sr-only">Nombre</span><input placeholder="Nombre" value={firstName} onChange={(event) => onFirstNameChange(event.target.value)} /></label><label className="owner-wizard-field"><span className="sr-only">Apellido</span><input placeholder="Apellido" value={lastName} onChange={(event) => onLastNameChange(event.target.value)} /></label></div><label className="owner-wizard-field"><span className="sr-only">CUIT o CUIL</span><input inputMode="numeric" placeholder="CUIT o CUIL — 20-12345678-9" value={taxId} aria-invalid={taxId.length > 0 && !isTaxIdValid} onChange={(event) => onTaxIdChange(formatearCuit(event.target.value))} /></label>{taxId.length > 0 && !isTaxIdValid && <p className="owner-wizard-error" role="alert">{taxIdError}</p>}<label className="owner-wizard-field"><span className="sr-only">Correo electrónico</span><input type="email" placeholder="Correo electrónico" value={email} aria-invalid={email.length > 0 && !isEmailValid} onChange={(event) => onEmailChange(event.target.value)} /></label>{email.length > 0 && !isEmailValid && <p className="owner-wizard-error" role="alert">Ese correo no parece completo.</p>}<label className="owner-wizard-field"><span className="sr-only">Teléfono</span><input type="tel" inputMode="tel" placeholder="Teléfono — 11 44552210" value={phone} aria-invalid={phone.length > 0 && !isPhoneValid} onChange={(event) => onPhoneChange(event.target.value)} /></label>{phone.length > 0 && !isPhoneValid && <p className="owner-wizard-error" role="alert">{errorDeTelefono(phone)}</p>}{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}</div></>;
}

function ContractOptions({
  loadState,
  options,
  selected,
  onSelect,
  icon,
  empty,
}: Readonly<{
  loadState: ContractLists | "error" | null;
  options: Opcion[];
  selected: number | null;
  onSelect: (id: number) => void;
  icon: "building" | "users";
  empty: React.ReactNode;
}>) {
  if (loadState === "error") {
    return <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />No pudimos cargar sus datos. Inténtelo de nuevo más tarde.</p>;
  }
  if (loadState === null) return <p className="owner-wizard-help">Cargando…</p>;
  if (options.length === 0) return empty;

  return <div className="owner-wizard-options" role="radiogroup">
    {options.map((option) => <Option key={option.id} selected={selected === option.id} icon={icon} title={option.titulo} description={option.detalle} onClick={() => onSelect(option.id)} />)}
  </div>;
}

function ContractPropertyStep({ lists, selected, onSelect }: Readonly<{ lists: ContractLists | "error" | null; selected: number | null; onSelect: (id: number) => void }>) {
  const options = typeof lists === "object" && lists !== null ? lists.propiedades : [];
  return <><h1>¿Qué propiedad va a alquilar?</h1><p>Elija una de sus propiedades sin contrato vigente. Después le pedimos el inquilino.</p><ContractOptions loadState={lists} options={options} selected={selected} onSelect={onSelect} icon="building" empty={<p className="owner-wizard-help">Todas sus propiedades ya tienen un contrato vigente. Cargue una nueva para poder alquilarla.</p>} /></>;
}

function ContractTenantStep({ lists, selected, onSelect, onNewTenant }: Readonly<{ lists: ContractLists | "error" | null; selected: number | null; onSelect: (id: number) => void; onNewTenant?: () => void }>) {
  const options = typeof lists === "object" && lists !== null ? lists.inquilinos : [];
  return <><h1>¿A quién se la alquila?</h1><p>El inquilino va a figurar en el contrato y recibir los avisos de vencimiento.</p><ContractOptions loadState={lists} options={options} selected={selected} onSelect={onSelect} icon="users" empty={<p className="owner-wizard-help">Todavía no cargó ningún inquilino.</p>} /><button type="button" className="owner-wizard-quiet" onClick={onNewTenant}><Icon name="plus" />Agregar un inquilino nuevo</button></>;
}

function ContractRentStep({ rent, dueDay, onRentChange, onDueDayChange }: Readonly<{ rent: string; dueDay: number; onRentChange: (value: string) => void; onDueDayChange: (value: number) => void }>) {
  return <><h1>¿Cuánto sale el alquiler por mes?</h1><p>Es el valor con el que arranca el contrato. Después definimos cómo se actualiza.</p><label className="owner-wizard-field owner-wizard-field--amount"><span>$</span><input inputMode="numeric" aria-label="Alquiler mensual" value={montoConSeparadores(rent)} onChange={(event) => onRentChange(soloNumeros(event.target.value))} /><span>por mes</span></label><p className="owner-wizard-label">DÍA DE VENCIMIENTO</p><Counter value={dueDay} unit="del mes" min={1} max={28} onChange={onDueDayChange} /><div className="owner-wizard-chips">{[1, 5, 10].map((day) => <button key={day} type="button" aria-pressed={dueDay === day} onClick={() => onDueDayChange(day)}>Día {day}</button>)}</div><small className="owner-wizard-help">Se cobra por mes adelantado. El día se puede elegir del 1 al 28.</small></>;
}

function ContractTermStep({ startDate, term, isStartDateValid, onStartDateChange, onTermChange }: Readonly<{ startDate: string; term: number; isStartDateValid: boolean; onStartDateChange: (value: string) => void; onTermChange: (value: number) => void }>) {
  return <><h1>¿Cuándo empieza y por cuánto tiempo?</h1><p>La fecha de fin se calcula sola a partir del plazo, no hace falta cargarla.</p><label className="owner-wizard-field owner-wizard-field--medium"><span className="sr-only">Fecha de inicio</span><input type="date" value={startDate} min={PISO_INICIO} aria-invalid={startDate !== "" && !isStartDateValid} onChange={(event) => onStartDateChange(event.target.value)} /></label>{startDate !== "" && !isStartDateValid && <p className="owner-wizard-error" role="alert">El contrato no puede empezar antes de diciembre de 2022.</p>}<p className="owner-wizard-label">PLAZO DEL CONTRATO</p><Counter value={term} unit="meses" min={1} onChange={onTermChange} /><div className="owner-wizard-chips">{[12, 24, 36].map((months) => <button key={months} type="button" aria-pressed={term === months} onClick={() => onTermChange(months)}>{months} meses</button>)}</div>{isStartDateValid && <small className="owner-wizard-help">Termina el {fechaDeFin(startDate, term)}.</small>}</>;
}

function ContractIndexStep({ method, percentage, frequency, onMethodChange, onPercentageChange, onFrequencyChange }: Readonly<{ method: ContractMethod; percentage: string; frequency: number; onMethodChange: (method: ContractMethod) => void; onPercentageChange: (value: string) => void; onFrequencyChange: (value: number) => void }>) {
  return <><h1>¿Cómo se actualiza el alquiler?</h1><p>Alquia aplica la actualización cuando corresponde. Usted no tiene que hacer nada.</p><div className="owner-wizard-options owner-wizard-options--grid" role="radiogroup"><Option selected={method === "FIXED_PERCENTAGE"} icon="trend" title="Un porcentaje" description="Sube un % fijo" onClick={() => onMethodChange("FIXED_PERCENTAGE")} /><Option selected={method === "ICL"} icon="trend" title="Según el ICL" description="Índice del BCRA" onClick={() => onMethodChange("ICL")} /><Option selected={method === "IPC"} icon="trend" title="Según el IPC" description="Inflación INDEC" onClick={() => onMethodChange("IPC")} /></div>{method === "FIXED_PERCENTAGE" && <label className="owner-wizard-field owner-wizard-field--amount"><span className="sr-only">Porcentaje de aumento</span><input inputMode="decimal" value={percentage} aria-label="Porcentaje de aumento" onChange={(event) => onPercentageChange(event.target.value.replace(/[^\d.]/g, ""))} /><span>% cada vez</span></label>}<p className="owner-wizard-label">CADA CUÁNTO SE ACTUALIZA</p><div className="owner-wizard-chips">{[3, 4, 6, 12].map((months) => <button key={months} type="button" aria-pressed={frequency === months} onClick={() => onFrequencyChange(months)}>Cada {months} meses</button>)}</div>{method === "FIXED_PERCENTAGE" && <small className="owner-wizard-help">Cada aumento se calcula sobre el alquiler vigente, no sobre el inicial.</small>}</>;
}

function ContractReviewStep({ lists, propertyId, tenantId, rent, dueDay, term, startDate, method, percentage, frequency, error }: Readonly<{ lists: ContractLists | "error" | null; propertyId: number | null; tenantId: number | null; rent: string; dueDay: number; term: number; startDate: string; method: ContractMethod; percentage: string; frequency: number; error: string | null }>) {
  const loadedLists = typeof lists === "object" && lists !== null ? lists : null;
  const propertyName = loadedLists?.propiedades.find((option) => option.id === propertyId)?.titulo ?? "Sin cargar";
  const tenantName = loadedLists?.inquilinos.find((option) => option.id === tenantId)?.titulo ?? "Sin cargar";
  const adjustment = method === "FIXED_PERCENTAGE" ? `${percentage} % cada ${frequency} meses` : `Según el ${method} · cada ${frequency} meses`;
  return <><h1>Revise que esté todo bien</h1><p>Si algo no cierra, vuelva al paso correspondiente y modifíquelo.</p><Summary rows={[["Propiedad", propertyName], ["Inquilino", tenantName], ["Alquiler inicial", `$ ${montoConSeparadores(rent)} por mes · vence el día ${dueDay}`], ["Plazo", `${term} meses · termina el ${fechaDeFin(startDate, term) ?? "—"}`], ["Actualización", adjustment]]} />{error && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{error}</p>}<aside className="owner-wizard-note"><Icon name="trend" />Las próximas cuotas se calculan automáticamente según las condiciones que definió.</aside></>;
}

function ContractWizardStep(props: Readonly<{
  step: number; lists: ContractLists | "error" | null; propertyId: number | null; tenantId: number | null; rent: string; dueDay: number; term: number; startDate: string; isStartDateValid: boolean; method: ContractMethod; percentage: string; frequency: number; error: string | null; onPropertyChange: (value: number) => void; onTenantChange: (value: number) => void; onRentChange: (value: string) => void; onDueDayChange: (value: number) => void; onTermChange: (value: number) => void; onStartDateChange: (value: string) => void; onMethodChange: (value: ContractMethod) => void; onPercentageChange: (value: string) => void; onFrequencyChange: (value: number) => void; onNewTenant?: () => void;
}>) {
  const { step, ...stepProps } = props;
  const steps: Record<number, React.ReactNode> = {
    1: <ContractPropertyStep lists={stepProps.lists} selected={stepProps.propertyId} onSelect={stepProps.onPropertyChange} />,
    2: <ContractTenantStep lists={stepProps.lists} selected={stepProps.tenantId} onSelect={stepProps.onTenantChange} onNewTenant={stepProps.onNewTenant} />,
    3: <ContractRentStep rent={stepProps.rent} dueDay={stepProps.dueDay} onRentChange={stepProps.onRentChange} onDueDayChange={stepProps.onDueDayChange} />,
    4: <ContractTermStep startDate={stepProps.startDate} term={stepProps.term} isStartDateValid={stepProps.isStartDateValid} onStartDateChange={stepProps.onStartDateChange} onTermChange={stepProps.onTermChange} />,
    5: <ContractIndexStep method={stepProps.method} percentage={stepProps.percentage} frequency={stepProps.frequency} onMethodChange={stepProps.onMethodChange} onPercentageChange={stepProps.onPercentageChange} onFrequencyChange={stepProps.onFrequencyChange} />,
  };
  return steps[step] ?? <ContractReviewStep lists={stepProps.lists} propertyId={stepProps.propertyId} tenantId={stepProps.tenantId} rent={stepProps.rent} dueDay={stepProps.dueDay} term={stepProps.term} startDate={stepProps.startDate} method={stepProps.method} percentage={stepProps.percentage} frequency={stepProps.frequency} error={stepProps.error} />;
}

export default function CreationWizard({ kind, onClose, onComplete, onNewTenant, demo = false }: Readonly<{ kind: WizardKind; onClose: () => void; onComplete: () => void; onNewTenant?: () => void; demo?: boolean }>) {
  const total = cantidadPasos(kind);
  const [step, setStep] = useState(1);
  const [propiedadId, setPropiedadId] = useState<number | null>(null);
  const [inquilinoId, setInquilinoId] = useState<number | null>(null);
  const [method, setMethod] = useState<"FIXED_PERCENTAGE" | "ICL" | "IPC">("FIXED_PERCENTAGE");
  const [term, setTerm] = useState(36);
  const [alquiler, setAlquiler] = useState("");
  const [inicio, setInicio] = useState("");
  const [diaVencimiento, setDiaVencimiento] = useState(1);
  const [porcentaje, setPorcentaje] = useState("");
  const [frecuencia, setFrecuencia] = useState(6);
  // Las dos listas del alta de contrato, en un solo estado: o están las dos, o
  // hubo error, o todavía se están trayendo. Nunca media pantalla usable.
  const [cargaListas, setCargaListas] = useState<ContractLists | "error" | null>(null);
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
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  // Sólo el alta de contrato necesita las listas, y en /prototipo no se piden:
  // esa ruta no tiene sesión y las dos llamadas darían 401.
  useEffect(() => {
    // En demo las listas son constantes y se derivan más abajo: no hace falta
    // pasarlas por el estado, y hacerlo dispararía un render en cascada.
    if (kind !== "contract" || demo) return;
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
  }, [kind, demo]);

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
    onFirstNameChange={setNombre}
    onLastNameChange={setApellido}
    onTaxIdChange={setCuit}
    onEmailChange={setCorreo}
    onPhoneChange={setTelefono}
  />;
  const listas = listasDisponibles(demo, cargaListas);
  const alquilerOk = Number(alquiler) > 0;
  const inicioOk = inicio !== "" && inicio >= PISO_INICIO;
  const porcentajeOk = method !== "FIXED_PERCENTAGE" || Number(porcentaje) > 0;

  const finish = step === total;
  // No se puede avanzar con datos que el backend rechazaría (@NotBlank / @ValidTaxId / @Email)
  function tenantBloqueado(): boolean {
    return !nombre.trim() || !apellido.trim() || !cuitOk || !correoOk || !telefonoOk;
  }
  function propertyBloqueado(): boolean {
    if (step === 1) return !direccion;
    if (step === 2) return categoria === null;
    return false;
  }
  function contractBloqueado(): boolean {
    if (step === 1) return propiedadId === null;
    if (step === 2) return inquilinoId === null;
    if (step === 3) return !alquilerOk;
    if (step === 4) return !inicioOk;
    if (step === 5) return !porcentajeOk;
    return false;
  }
  function calcularBloqueado(): boolean {
    if (guardando) return true;
    if (kind === "tenant") return tenantBloqueado();
    if (kind === "property") return propertyBloqueado();
    return contractBloqueado();
  }
  const bloqueado = calcularBloqueado();
  async function guardarInquilino() {
    // En /prototipo no hay sesión: guardar de verdad daría 401 y la demo se
    // cortaría justo en el paso que quiere mostrar.
    if (demo) return onComplete();
    setErrorGuardado(null);
    setGuardando(true);
    try {
      await AlquiaBackendClient.tenants.create({
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
      });
      // Sin setGuardando(false): onComplete desmonta el asistente.
      onComplete();
    } catch (err) {
      setErrorGuardado(mensajeDeError(err));
      setGuardando(false);
    }
  }

  async function guardarPropiedad() {
    if (direccion === null || categoria === null) return;
    if (demo) return onComplete();
    setErrorGuardado(null);
    setGuardando(true);
    try {
      await AlquiaBackendClient.properties.create({
        street: direccion.street,
        number: direccion.number,
        // El piso y el departamento son un campo aparte del número de calle.
        floorUnit: unidad.trim() || undefined,
        city: direccion.city,
        province: direccion.province,
        category: categoria,
        // Lo que el propietario no cargó no se manda: el paso es opcional y un
        // cero o un false serían un dato que él nunca dio.
        bedrooms: bedrooms ?? undefined,
        bathrooms: bathrooms ?? undefined,
        coveredArea: superficie ? Number(superficie) : undefined,
        petsAllowed: mascotas || undefined,
        furnished: amoblada || undefined,
      });
      onComplete();
    } catch (err) {
      setErrorGuardado(mensajeDeErrorPropiedad(err));
      setGuardando(false);
    }
  }

  async function guardarContrato() {
    if (propiedadId === null || inquilinoId === null) return;
    if (demo) return onComplete();
    setErrorGuardado(null);
    setGuardando(true);
    try {
      await AlquiaBackendClient.contracts.create({
        propertyId: propiedadId,
        tenantId: inquilinoId,
        initialRentAmount: Number(alquiler),
        startDate: inicio,
        termMonths: term,
        dueDay: diaVencimiento,
        incrementFrequencyMonths: frecuencia,
        // El backend separa el cómo del qué, y es excluyente: FIXED_PERCENTAGE
        // exige incrementValue y prohíbe incrementIndexName, INDEX al revés.
        // Mandar los dos, o ninguno, es un 400.
        ...datosDeActualizacion(method, porcentaje),
      });
      onComplete();
    } catch (err) {
      setErrorGuardado(mensajeDeErrorContrato(err));
      setGuardando(false);
    }
  }

  const next = () => {
    if (!finish) return setStep((current) => current + 1);
    if (kind === "tenant") return void guardarInquilino();
    if (kind === "contract") return void guardarContrato();
    void guardarPropiedad();
  };

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
    </>
  );

  const propertyStep = (() => {
    if (step === 1) {
      return <>
      <h1>¿Dónde queda la propiedad?</h1>
      <p>Busque la dirección y completamos la ciudad y la provincia solas.</p>
      <div className="owner-wizard-stack">
        <AddressField demo={demo} value={direccion} onSelect={setDireccion} onClear={() => setDireccion(null)} />
        {direccion && (
          <label className="owner-wizard-field">
            <span className="sr-only">Piso y departamento</span>
            <input placeholder="Piso y depto. — si corresponde" value={unidad}
              onChange={(e) => setUnidad(e.target.value)} />
          </label>
        )}
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
        <p className="owner-wizard-label">SUPERFICIE CUBIERTA</p>
        <label className="owner-wizard-field owner-wizard-field--medium">
          <span className="sr-only">Superficie cubierta en metros cuadrados</span>
          <input value={superficie} inputMode="numeric" placeholder="—" onChange={(e) => setSuperficie(e.target.value.replace(/\D/g, ""))} />
          <span>m²</span>
        </label>
        <p className="owner-wizard-label">ADEMÁS</p>
        <div className="owner-wizard-chips">
          <button type="button" aria-pressed={mascotas} onClick={() => setMascotas(!mascotas)}>Acepta mascotas</button>
          <button type="button" aria-pressed={amoblada} onClick={() => setAmoblada(!amoblada)}>Se alquila amueblada</button>
        </div>
        <button type="button" className="owner-wizard-quiet" onClick={() => setStep(total)}>Saltear este paso</button>
      </>;
    }
    return <>
      <h1>Listo. ¿La guardamos?</h1>
      <p>Va a quedar sin alquilar hasta que le cree un contrato.</p>
      <Summary rows={[
        ["Dirección", direccionCompleta],
        ["Ciudad", direccion ? `${direccion.city} · ${direccion.province}` : "Sin cargar"],
        ["Tipo", CATEGORIAS.find((categoriaItem) => categoriaItem.valor === categoria)?.etiqueta ?? "Sin cargar"],
        ["Características", caracteristicas],
        ["Estado", "Sin alquilar"],
      ]} />
      {errorGuardado && <p className="owner-wizard-alert" role="alert"><Icon name="alert" size={19} />{errorGuardado}</p>}
      <aside className="owner-wizard-note"><Icon name="trend" />Para empezar a cobrarla necesita un contrato, que la vincula con un inquilino y define el alquiler.</aside>
    </>;
  })();

  const contractLists = listas ?? cargaListas;
  const contractStep = <ContractWizardStep
    step={step}
    lists={contractLists}
    propertyId={propiedadId}
    tenantId={inquilinoId}
    rent={alquiler}
    dueDay={diaVencimiento}
    term={term}
    startDate={inicio}
    isStartDateValid={inicioOk}
    method={method}
    percentage={porcentaje}
    frequency={frecuencia}
    error={errorGuardado}
    onPropertyChange={setPropiedadId}
    onTenantChange={setInquilinoId}
    onRentChange={setAlquiler}
    onDueDayChange={setDiaVencimiento}
    onTermChange={setTerm}
    onStartDateChange={setInicio}
    onMethodChange={setMethod}
    onPercentageChange={setPorcentaje}
    onFrequencyChange={setFrecuencia}
    onNewTenant={onNewTenant}
  />;

  const tituloAsistente = (() => {
    if (kind === "property") return "Nueva propiedad";
    if (kind === "tenant") return "Nuevo inquilino";
    return "Nuevo contrato";
  })();
  const ariaAsistente = (() => {
    if (kind === "property") return "Asistente de nueva propiedad";
    if (kind === "tenant") return "Asistente de nuevo inquilino";
    return "Asistente de nuevo contrato";
  })();
  const finishLabel = (() => {
    if (kind === "property") return "Guardar propiedad";
    if (kind === "tenant") return "Guardar inquilino";
    return "Crear contrato";
  })();
  const stepContent = (() => {
    if (kind === "property") return propertyStep;
    if (kind === "tenant") return tenantStep;
    return contractStep;
  })();
  const footerButtonContent = (() => {
    if (guardando) return <><span className="owner-wizard-spinner" />Guardando…</>;
    if (finish) return finishLabel;
    return <>Seguir <Icon name="arrow" /></>;
  })();

  return (
    <section className="owner-wizard" aria-label={ariaAsistente}>
      <header className="owner-wizard__top">
        <button type="button" aria-label="Salir del asistente" onClick={onClose} disabled={guardando}>
          <Icon name="x" />
        </button>
        <b>{tituloAsistente}</b>
        {total > 1 && (
          <>
            <progress className="owner-wizard__progress" value={step} max={total} aria-label="Progreso del asistente" />
            <span>Paso {step} de {total}</span>
          </>
        )}
      </header>
      <main className="owner-wizard__body">{stepContent}</main>
      <footer className="owner-wizard__footer">
        <button type="button" className="owner-wizard-quiet" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || guardando}>
          Atrás
        </button>
        <button type="button" className="owner-wizard-next" onClick={next} disabled={bloqueado}>
          {footerButtonContent}
        </button>
      </footer>
    </section>
  );
}


function Summary({ rows }: Readonly<{ rows: string[][] }>) { return <div className="owner-wizard-summary">{rows.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>; }
