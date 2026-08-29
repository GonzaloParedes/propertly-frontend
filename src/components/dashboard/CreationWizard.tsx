"use client";

import { useState } from "react";

type WizardKind = "property" | "contract" | "tenant";

/**
 * Validación de CUIT/CUIL con dígito verificador (módulo 11).
 * El backend lo exige con @ValidTaxId en TenantRequest: si acá no se valida,
 * el alta falla recién al guardar y sin decir por qué.
 */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

function soloDigitos(s: string) { return s.replace(/\D/g, "").slice(0, 11); }

function formatearCuit(s: string) {
  const d = soloDigitos(s);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

function cuitValido(s: string) {
  const d = soloDigitos(s);
  if (d.length !== 11) return false;
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(d[i]), 0);
  const resto = suma % 11;
  const esperado = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return esperado === Number(d[10]);
}

const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/**
 * Direcciones de ejemplo. Al conectar el backend esto se reemplaza por el
 * proveedor de geocodificación; el componente ya devuelve los campos con los
 * mismos nombres que `PropertyRequest` (street, number, city, province).
 */
type Direccion = { street: string; number: string; city: string; province: string };

const DIRECCIONES: Direccion[] = [
  { street: "Av. Rivadavia", number: "2340", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { street: "Av. Rivadavia", number: "5100", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { street: "Lavalle", number: "950", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { street: "Av. Corrientes", number: "1820", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { street: "Güemes", number: "1120", city: "CABA", province: "Ciudad Autónoma de Buenos Aires" },
  { street: "Colón", number: "2255", city: "Vicente López", province: "Buenos Aires" },
  { street: "Belgrano", number: "445", city: "Morón", province: "Buenos Aires" },
  { street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires" },
  { street: "San Martín", number: "1430", city: "Olivos", province: "Buenos Aires" },
  { street: "Av. Maipú", number: "2600", city: "Olivos", province: "Buenos Aires" },
];

const etiquetaDireccion = (d: Direccion) => `${d.street} ${d.number}`;

function normalizar(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Combobox accesible: flechas para moverse, Enter para elegir, Escape para cerrar. */
function AddressField({ value, onSelect, onClear }: {
  value: Direccion | null;
  onSelect: (d: Direccion) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const q = normalizar(query.trim());
  const sugerencias = q.length < 2 ? [] :
    DIRECCIONES.filter((d) => normalizar(`${d.street} ${d.number} ${d.city}`).includes(q)).slice(0, 6);

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

  return (
    <div className="owner-ac">
      <div className="owner-ac__box">
        <Icon name="search" />
        <input
          autoFocus
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
            else if (e.key === "Enter") { e.preventDefault(); elegir(sugerencias[activo]); }
            else if (e.key === "Escape") { setAbierto(false); }
          }}
        />
      </div>
      {abierto && sugerencias.length > 0 && (
        <ul className="owner-ac__list" id="ac-lista" role="listbox" aria-label="Direcciones sugeridas">
          {sugerencias.map((d, i) => (
            <li key={`${d.street}-${d.number}`} id={`ac-opt-${i}`} role="option" aria-selected={i === activo}>
              <button type="button" className={i === activo ? "is-active" : ""}
                onMouseEnter={() => setActivo(i)} onClick={() => elegir(d)}>
                <b>{etiquetaDireccion(d)}</b>
                <small>{d.city} · {d.province}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length >= 2 && sugerencias.length === 0 && (
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

function Icon({ name }: { name: "x" | "arrow" | "check" | "building" | "users" | "plus" | "minus" | "trend" | "search" }) {
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
  };
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Option({ selected, icon, title, description, onClick }: { selected: boolean; icon: "building" | "users" | "trend"; title: string; description: string; onClick: () => void }) {
  return <button type="button" className="owner-wizard-option" role="radio" aria-checked={selected} onClick={onClick}><span className="owner-wizard-option__icon"><Icon name={icon} /></span><span><b>{title}</b><small>{description}</small></span><span className="owner-wizard-option__check"><Icon name="check" /></span></button>;
}

export default function CreationWizard({ kind, onClose, onComplete, onNewTenant }: { kind: WizardKind; onClose: () => void; onComplete: () => void; onNewTenant?: () => void }) {
  const total = kind === "contract" ? 6 : kind === "tenant" ? 1 : 3;
  const [step, setStep] = useState(1);
  const [property, setProperty] = useState("Mitre 78");
  const [tenant, setTenant] = useState("Diego Ferrari");
  const [method, setMethod] = useState("Porcentaje fijo");
  const [term, setTerm] = useState(36);
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [direccion, setDireccion] = useState<Direccion | null>(null);
  const [unidad, setUnidad] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [cuit, setCuit] = useState("");
  const [correo, setCorreo] = useState("");
  const direccionCompleta = direccion
    ? `${etiquetaDireccion(direccion)}${unidad ? `, ${unidad}` : ""}`
    : "Sin cargar";
  const cuitOk = cuitValido(cuit);
  const correoOk = correoValido(correo);
  const tenantStep = (
    <>
      <h1>¿Quién es el inquilino?</h1>
      <p>Estos son los datos que van a figurar en el contrato. Al correo le llegan los avisos de vencimiento.</p>
      <div className="owner-wizard-stack">
        <div className="owner-wizard-duo">
          <label className="owner-wizard-field">
            <span className="sr-only">Nombre</span>
            <input autoFocus placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="owner-wizard-field">
            <span className="sr-only">Apellido</span>
            <input placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} />
          </label>
        </div>
        <label className="owner-wizard-field">
          <span className="sr-only">CUIT o CUIL</span>
          <input inputMode="numeric" placeholder="CUIT o CUIL — 20-12345678-9" value={cuit}
            aria-invalid={cuit.length > 0 && !cuitOk}
            onChange={(e) => setCuit(formatearCuit(e.target.value))} />
        </label>
        {cuit.length > 0 && !cuitOk && (
          <p className="owner-wizard-error" role="alert">
            {soloDigitos(cuit).length < 11
              ? "Faltan dígitos: son 11 en total."
              : "El número no es válido. Revisá que no haya un dígito cambiado."}
          </p>
        )}
        <label className="owner-wizard-field">
          <span className="sr-only">Correo electrónico</span>
          <input type="email" placeholder="Correo electrónico" value={correo}
            aria-invalid={correo.length > 0 && !correoOk}
            onChange={(e) => setCorreo(e.target.value)} />
        </label>
        {correo.length > 0 && !correoOk && (
          <p className="owner-wizard-error" role="alert">Ese correo no parece completo.</p>
        )}
      </div>
    </>
  );
  const finish = step === total;
  // No se puede avanzar con datos que el backend rechazaría (@NotBlank / @ValidTaxId / @Email)
  const bloqueado =
    kind === "tenant" ? !nombre.trim() || !apellido.trim() || !cuitOk || !correoOk
    : kind === "property" && step === 1 ? !direccion
    : false;
  const next = () => finish ? onComplete() : setStep((current) => current + 1);

  const propertyStep = step === 1 ? <>
      <h1>¿Dónde queda la propiedad?</h1>
      <p>Buscá la dirección y completamos la ciudad y la provincia solas.</p>
      <div className="owner-wizard-stack">
        <AddressField value={direccion} onSelect={setDireccion} onClear={() => setDireccion(null)} />
        {direccion && (
          <label className="owner-wizard-field">
            <span className="sr-only">Piso y departamento</span>
            <input placeholder="Piso y depto. — si corresponde" value={unidad}
              onChange={(e) => setUnidad(e.target.value)} />
          </label>
        )}
      </div>
    </> : step === 2 ? <><h1>¿Cómo es la propiedad?</h1><p>Todo esto es opcional. Sirve para reconocerla rápido en la lista.</p><div className="owner-wizard-counters"><Counter label="Dormitorios" value={bedrooms} onChange={setBedrooms} /><Counter label="Baños" value={bathrooms} onChange={setBathrooms} /></div><p className="owner-wizard-label">SUPERFICIE CUBIERTA</p><label className="owner-wizard-field owner-wizard-field--medium"><input defaultValue="68" inputMode="numeric" /><span>m²</span></label><p className="owner-wizard-label">ADEMÁS</p><div className="owner-wizard-chips"><button type="button">Acepta mascotas</button><button type="button">Se alquila amueblada</button></div></> : <><h1>Listo. ¿La guardamos?</h1><p>Va a quedar sin alquilar hasta que le cree un contrato.</p><Summary rows={[["Dirección", direccionCompleta], ["Ciudad", direccion ? `${direccion.city} · ${direccion.province}` : "Sin cargar"], ["Características", `${bedrooms} dormitorios · ${bathrooms} baño${bathrooms === 1 ? "" : "s"} · 68 m²`], ["Estado", "Sin alquilar"]]} /><aside className="owner-wizard-note"><Icon name="trend" />Para empezar a cobrarla necesita un contrato, que la vincula con un inquilino y define el alquiler.</aside></>;

  const contractStep = step === 1 ? <><h1>¿Qué propiedad va a alquilar?</h1><p>Elija una de sus propiedades. Después le pedimos el inquilino.</p><div className="owner-wizard-options"><Option selected={property === "Mitre 78"} icon="building" title="Mitre 78" description="Local · San Isidro · 52 m² · sin alquilar" onClick={() => setProperty("Mitre 78")} /><Option selected={property === "Colón 2255"} icon="building" title="Colón 2255, 4.º D" description="Departamento · Vicente López · 58 m²" onClick={() => setProperty("Colón 2255")} /></div></> : step === 2 ? <><h1>¿A quién se la alquila?</h1><p>El inquilino va a figurar en el contrato y recibir los avisos de vencimiento.</p><div className="owner-wizard-options"><Option selected={tenant === "Diego Ferrari"} icon="users" title="Diego Ferrari" description="20-30115482-9 · diego.ferrari@outlook.com" onClick={() => setTenant("Diego Ferrari")} /><Option selected={tenant === "Marta Suárez"} icon="users" title="Marta Suárez" description="27-24891055-6 · marta.suarez@gmail.com" onClick={() => setTenant("Marta Suárez")} /></div><button type="button" className="owner-wizard-quiet" onClick={onNewTenant}><Icon name="plus" />Agregar un inquilino nuevo</button></> : step === 3 ? <><h1>¿Cuánto sale el alquiler por mes?</h1><p>Es el valor con el que arranca el contrato. Después definimos cómo se actualiza.</p><label className="owner-wizard-field owner-wizard-field--amount"><span>$</span><input defaultValue="620.000" inputMode="numeric" /><span>por mes</span></label><small className="owner-wizard-help">Se cobra por mes adelantado, con vencimiento el día 1.</small></> : step === 4 ? <><h1>¿Cuándo empieza y por cuánto tiempo?</h1><p>La fecha de fin se calcula sola a partir del plazo, no hace falta cargarla.</p><label className="owner-wizard-field owner-wizard-field--medium"><input defaultValue="01/09/2026" /><span>día / mes / año</span></label><p className="owner-wizard-label">PLAZO DEL CONTRATO</p><Counter value={term} unit="meses" step={6} onChange={setTerm} /><div className="owner-wizard-chips"><button type="button" onClick={() => setTerm(12)}>12 meses</button><button type="button" onClick={() => setTerm(24)}>24 meses</button><button type="button" aria-pressed={term === 36} onClick={() => setTerm(36)}>36 meses</button></div><small className="owner-wizard-help">Termina el 31/08/2029.</small></> : step === 5 ? <><h1>¿Cómo se actualiza el alquiler?</h1><p>Alquia aplica la actualización cuando corresponde. Usted no tiene que hacer nada.</p><div className="owner-wizard-options owner-wizard-options--grid"><Option selected={method === "Porcentaje fijo"} icon="trend" title="Un porcentaje" description="Sube un % fijo" onClick={() => setMethod("Porcentaje fijo")} /><Option selected={method === "ICL"} icon="trend" title="Según el ICL" description="Índice del BCRA" onClick={() => setMethod("ICL")} /><Option selected={method === "IPC"} icon="trend" title="Según el IPC" description="Inflación INDEC" onClick={() => setMethod("IPC")} /></div>{method === "Porcentaje fijo" && <label className="owner-wizard-field owner-wizard-field--amount"><input defaultValue="12" inputMode="decimal" /><span>% cada vez</span></label>}<p className="owner-wizard-label">CADA CUÁNTO SE ACTUALIZA</p><div className="owner-wizard-chips"><button type="button">Cada 3 meses</button><button type="button">Cada 4 meses</button><button type="button" aria-pressed="true">Cada 6 meses</button><button type="button">Cada 12 meses</button></div></> : <><h1>Revise que esté todo bien</h1><p>Si algo no cierra, vuelva al paso correspondiente y modifíquelo.</p><Summary rows={[["Propiedad", property], ["Inquilino", tenant], ["Alquiler inicial", "$ 620.000 por mes"], ["Plazo", `${term} meses · 01/09/2026 → 31/08/2029`], ["Actualización", `${method} · cada 6 meses`]]} /><aside className="owner-wizard-note"><Icon name="trend" />Las próximas cuotas se calculan automáticamente según las condiciones que definió.</aside></>;

  return <section className="owner-wizard" aria-label={kind === "property" ? "Asistente de nueva propiedad" : kind === "tenant" ? "Asistente de nuevo inquilino" : "Asistente de nuevo contrato"}><header className="owner-wizard__top"><button type="button" aria-label="Salir del asistente" onClick={onClose}><Icon name="x" /></button><b>{kind === "property" ? "Nueva propiedad" : kind === "tenant" ? "Nuevo inquilino" : "Nuevo contrato"}</b>{total > 1 && <><div className="owner-wizard__progress" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step}><i style={{ width: `${(step / total) * 100}%` }} /></div><span>Paso {step} de {total}</span></>}</header><main className="owner-wizard__body">{kind === "property" ? propertyStep : kind === "tenant" ? tenantStep : contractStep}</main><footer className="owner-wizard__footer"><button type="button" className="owner-wizard-quiet" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>Atrás</button><button type="button" className="owner-wizard-next" onClick={next} disabled={bloqueado}>{finish ? (kind === "property" ? "Guardar propiedad" : kind === "tenant" ? "Guardar inquilino" : "Crear contrato") : <>Seguir <Icon name="arrow" /></>}</button></footer></section>;
}

function Counter({ label, value, unit, step = 1, onChange }: { label?: string; value: number; unit?: string; step?: number; onChange: (value: number) => void }) {
  return <div className="owner-wizard-counter">{label && <p className="owner-wizard-label">{label}</p>}<div><button type="button" aria-label={`Restar ${label?.toLowerCase() ?? unit}`} onClick={() => onChange(Math.max(0, value - step))}><Icon name="minus" /></button><strong>{value}</strong>{unit && <span>{unit}</span>}<button type="button" aria-label={`Sumar ${label?.toLowerCase() ?? unit}`} onClick={() => onChange(value + step)}><Icon name="plus" /></button></div></div>;
}

function Summary({ rows }: { rows: string[][] }) { return <div className="owner-wizard-summary">{rows.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>; }
