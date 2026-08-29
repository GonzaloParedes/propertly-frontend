"use client";
/* eslint-disable react-hooks/static-components -- render helpers share the local prototype state. */

import { useState } from "react";
import CreationWizard from "@/components/dashboard/CreationWizard";

export type OwnerView = "inicio" | "propiedades" | "contratos" | "cobranzas" | "inquilinos" | "configuracion";
type View = OwnerView;
type Detail = "property" | "contract" | "tenant" | null;
type Creation = "property" | "contract" | "tenant" | null;
type IconName = "search" | "sliders" | "plus" | "building" | "file" | "card" | "users" | "check" | "clock" | "alert" | "x" | "arrow" | "link" | "download" | "edit" | "archive" | "receipt" | "calendar" | "trend" | "paperclip" | "copy";

function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
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
    archive: <><path d="M4 7h16v13H4zM3 4h18v3H3zM10 12h4" /></>,
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
  { id: "belgrano", property: properties[3], end: "30/09/2027", increment: "Sube $ 35.000 cada 6 meses", document: "Contrato-Belgrano-Ferreyra.pdf" },
];

const tenants = [
  { name: "Jorge Paletta", tax: "20-22456789-9", email: "jorge.paletta@gmail.com", property: properties[0] },
  { name: "Marta Suárez", tax: "27-24891055-6", email: "marta.suarez@gmail.com", property: properties[1] },
  { name: "Diego Ferrari", tax: "20-30115482-9", email: "diego.ferrari@outlook.com", property: properties[2] },
  { name: "Ana Ferreyra", tax: "27-28904113-9", email: "ana.ferreyra@gmail.com", property: properties[3] },
];

function Status({ children }: { children: string }) {
  const config = children === "Al día" ? ["ok", "check"] : children === "Vencida" ? ["bad", "x"] : children === "Sin alquilar" ? ["none", "building"] : children === "Pago a confirmar" ? ["info", "clock"] : ["warn", "clock"];
  return <span className={`owner-status owner-status--${config[0]}`}><Icon name={config[1] as IconName} size={15} />{children}</span>;
}

function Button({ children, tone = "primary", onClick, disabled = false, small = false }: { children: React.ReactNode; tone?: "primary" | "secondary" | "quiet" | "danger"; onClick?: () => void; disabled?: boolean; small?: boolean }) {
  return <button type="button" className={`owner-button owner-button--${tone}${small ? " owner-button--small" : ""}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Notice({ tone, title, children, action }: { tone: "info" | "warn" | "bad"; title: string; children: React.ReactNode; action: React.ReactNode }) {
  const icon = tone === "info" ? "card" : tone === "warn" ? "alert" : "x";
  return <article className={`owner-notice owner-notice--${tone}`}><span className="owner-notice__icon"><Icon name={icon} /></span><div><strong>{title}</strong><p>{children}</p></div><div className="owner-notice__action">{action}</div></article>;
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="owner-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button type="button" aria-label="Cerrar" className="owner-dialog__backdrop" onClick={onClose} /><section className="owner-dialog__panel"><div className="owner-dialog__head"><h2 id="dialog-title">{title}</h2><button type="button" className="owner-icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="x" /></button></div>{children}</section></div>;
}

export default function OwnerWorkspace({ initialView, activeView, onNavigate }: { initialView: View; activeView?: View; onNavigate?: (view: View) => void }) {
  const [localView, setLocalView] = useState<View>(initialView);
  const [detail, setDetail] = useState<Detail>(null);
  const [creation, setCreation] = useState<Creation>(null);
  const [wizard, setWizard] = useState<Creation>(null);
  const [creationComplete, setCreationComplete] = useState<Creation>(null);
  const [selected, setSelected] = useState("rivadavia");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [conditionMode, setConditionMode] = useState<"one" | "future">("future");
  const [linkCopied, setLinkCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<"todas" | "conContrato" | "sinAlquilar">("todas");
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [dorms, setDorms] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const view = activeView ?? localView;
  const selectedProperty = properties.find((property) => property.id === selected) ?? properties[0];
  const selectedContract = contracts.find((contract) => contract.id === selected) ?? contracts[0];

  function openDetail(kind: Detail, id: string) { setSelected(id); setCreation(null); setDetail(kind); }
  function go(next: View) { onNavigate?.(next); if (!onNavigate) setLocalView(next); setCreation(null); setWizard(null); setDetail(null); }
  function beginCreation(kind: Creation) { setCreationComplete(null); setDetail(null); setWizard(kind); }

  const pageHeader = (title: string, description: string, action?: React.ReactNode) => <header className="owner-page-head"><div><h1>{title}</h1><p>{description}</p></div>{action && <div className="owner-page-head__action">{action}</div>}</header>;

  function overview() {
    return <>
      {pageHeader("Buen día, Ricardo", "Así está su cartera hoy, martes 19 de agosto de 2026.", <><Button tone="secondary" onClick={() => beginCreation("property")}><Icon name="plus" size={18} />Agregar propiedad</Button><Button onClick={() => beginCreation("contract")}><Icon name="file" size={18} />Nuevo contrato</Button></>)}
      <section className="owner-portfolio" aria-label="Resumen de cobranzas"><div className="owner-portfolio__money"><p className="owner-eyebrow">COBRANZA DE AGOSTO 2026</p><strong>$ 430.000</strong><p>de $ 1.933.691 emitidos este mes · 1 de 4 cuotas cobradas</p><div className="owner-meter" aria-label="22% cobrado, 26% por vencer y 52% vencido"><i className="owner-meter__ok" /><i className="owner-meter__warn" /><i className="owner-meter__bad" /></div><div className="owner-key"><span><Icon name="check" />Cobrado <b>$ 430.000</b></span><span><Icon name="clock" />A vencer <b>$ 505.000</b></span><span><Icon name="x" />Vencido <b>$ 998.691</b></span></div></div><div className="owner-portfolio__summary"><div><p className="owner-eyebrow">PROPIEDADES</p><b>5</b><small>4 con contrato activo · 1 sin alquilar</small></div><div><p className="owner-eyebrow">PROYECTADO · SEPTIEMBRE</p><b>$ 1.451.986</b><small>más 1 contrato a definir según ICL</small></div></div></section>
      <section className="owner-section"><div className="owner-section__head"><h2>Requieren su acción</h2><Button tone="secondary" small onClick={() => go("cobranzas")}>Ir a cobranzas</Button></div><div className="owner-notices"><Notice tone="info" title="Marta Suárez cargó un pago y espera su confirmación" action={<Button tone="secondary" small onClick={() => setPaymentOpen(true)}>Revisar</Button>}>Lavalle 950, 3.º B · cuota de agosto ($ 520.000). Subió el comprobante el 18/08/2026.</Notice><Notice tone="warn" title="La cuota de Colón 2255 está sin confirmar" action={<Button tone="secondary" small onClick={() => go("cobranzas")}>Confirmar</Button>}>Hasta que la confirme no se puede registrar un pago. Vence el 25/08/2026.</Notice><Notice tone="bad" title="Dos cuotas vencidas sin pago" action={<Button tone="secondary" small onClick={() => go("cobranzas")}>Ver</Button>}>Av. Rivadavia 2340 ($ 478.691) y Lavalle 950 ($ 520.000). Vencieron el 10/08, hace 9 días.</Notice></div></section>
      <section className="owner-section"><div className="owner-section__head"><h2>Contratos activos</h2><Button tone="secondary" small onClick={() => go("contratos")}><Icon name="plus" size={17} />Nuevo contrato</Button></div><div className="owner-list">{contracts.map((contract) => <button type="button" className="owner-row owner-row--button" key={contract.id} onClick={() => openDetail("contract", contract.id)}><span className="owner-row__icon"><Icon name="building" /></span><span className="owner-row__body"><b>{contract.property.address}</b><small>{contract.property.tenant} · {contract.increment.toLowerCase()} · termina {contract.end}</small></span><span className="owner-row__amount"><b>{contract.property.rent}</b><small>por mes</small></span><Status>{contract.property.state}</Status></button>)}</div></section>
    </>;
  }

  function propertiesView() {
    const alterna = (lista: string[], set: (v: string[]) => void, v: string) =>
      set(lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

    // Facetas: cada dimensión se cuenta sobre el resto de los filtros ya aplicados,
    // así el número que ves en un chip es el que vas a obtener si lo tocás.
    const porTexto = (p: (typeof properties)[number]) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return `${p.address} ${p.city} ${p.tenant ?? ""}`.toLowerCase().includes(q);
    };
    const porCiudad = (p: (typeof properties)[number]) => !ciudades.length || ciudades.includes(p.city);
    const porDorms = (p: (typeof properties)[number]) =>
      !dorms.length || dorms.some((d) => (d === "3+" ? p.bedrooms >= 3 : p.bedrooms === Number(d)));
    const porExtras = (p: (typeof properties)[number]) =>
      extras.every((e) => (e === "pets" ? p.pets : e === "furnished" ? p.furnished : true));
    const porEstado = (p: (typeof properties)[number]) =>
      estado === "todas" ? true : estado === "sinAlquilar" ? p.tenant === null : p.tenant !== null;

    const base = properties.filter((p) => porTexto(p) && porCiudad(p) && porDorms(p) && porExtras(p));
    const visibles = base.filter(porEstado);

    const cuenta = {
      todas: base.length,
      conContrato: base.filter((p) => p.tenant !== null).length,
      sinAlquilar: base.filter((p) => p.tenant === null).length,
    };
    const ciudadesDisponibles = [...new Set(properties.map((p) => p.city))];
    const activos = ciudades.length + dorms.length + extras.length;
    const etiquetaExtra: Record<string, string> = { pets: "Acepta mascotas", furnished: "Amueblada" };
    const etiquetaDorm = (d: string) => (d === "3+" ? "3+ dormitorios" : d === "1" ? "1 dormitorio" : `${d} dormitorios`);

    const chipsAplicados = [
      ...ciudades.map((c) => ({ k: `c-${c}`, texto: c, quitar: () => alterna(ciudades, setCiudades, c) })),
      ...dorms.map((d) => ({ k: `d-${d}`, texto: etiquetaDorm(d), quitar: () => alterna(dorms, setDorms, d) })),
      ...extras.map((e) => ({ k: `e-${e}`, texto: etiquetaExtra[e], quitar: () => alterna(extras, setExtras, e) })),
    ];
    const limpiar = () => { setCiudades([]); setDorms([]); setExtras([]); setQuery(""); setEstado("todas"); };

    return (
      <>
        {pageHeader("Propiedades", `${properties.length} propiedades · ${properties.filter((p) => p.tenant).length} con contrato activo`,
          <Button onClick={() => beginCreation("property")}><Icon name="plus" size={18} />Agregar propiedad</Button>)}

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
                      {["1", "2", "3+"].map((d) => (
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

        <div className="owner-filter" role="group" aria-label="Estado de la propiedad">
          {([["todas", "Todas"], ["conContrato", "Con contrato"], ["sinAlquilar", "Sin alquilar"]] as const).map(([k, txt]) => (
            <button key={k} type="button" aria-pressed={estado === k} onClick={() => setEstado(k)}>
              {txt} <b>{cuenta[k]}</b>
            </button>
          ))}
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

        <p className="owner-result-count" role="status">
          {visibles.length === properties.length
            ? `${visibles.length} propiedades`
            : `${visibles.length} de ${properties.length} propiedades`}
        </p>

        {visibles.length === 0 ? (
          <div className="owner-empty">
            <b>No hay propiedades que coincidan</b>
            <span>Probá con otra búsqueda o quitá algún filtro.</span>
            <Button tone="secondary" small onClick={limpiar}>Limpiar todo</Button>
          </div>
        ) : (
          <div className="owner-list">
            {visibles.map((property) => (
              <button type="button" className="owner-row owner-row--button owner-property" key={property.id}
                onClick={() => openDetail("property", property.id)}>
                <span className="owner-row__icon"><Icon name="building" /></span>
                <span className="owner-row__body">
                  <b>{property.address}</b>
                  <small>{property.type} · {property.city} · {property.detail}</small>
                  {property.tenant && <em>{property.tenant}</em>}
                </span>
                {property.rent && <span className="owner-row__amount"><b>{property.rent}</b><small>por mes</small></span>}
                <Status>{property.state}</Status>
                <span className="owner-row__arrow"><Icon name="arrow" /></span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  }

  function contractsView() { return <>{pageHeader("Contratos", "4 vigentes · 1 propiedad disponible", <Button onClick={() => beginCreation("contract")}><Icon name="plus" size={18} />Nuevo contrato</Button>)}<div className="owner-filter"><button type="button" aria-pressed="true">Vigentes <b>4</b></button><button type="button">Por terminar <b>1</b></button><button type="button">Finalizados <b>0</b></button></div><div className="owner-list">{contracts.map((contract) => <button type="button" className="owner-row owner-row--button" key={contract.id} onClick={() => openDetail("contract", contract.id)}><span className="owner-row__icon"><Icon name="file" /></span><span className="owner-row__body"><b>{contract.property.address}</b><small>{contract.property.tenant} · {contract.increment} · termina {contract.end}</small></span><span className="owner-row__amount"><b>{contract.property.rent}</b><small>por mes</small></span><Status>{contract.property.state}</Status><span className="owner-row__arrow"><Icon name="arrow" /></span></button>)}</div></>; }

  function collectionsView() { return <>{pageHeader("Cobranzas", "Cuotas confirmadas, pagos y vencimientos de agosto.", <Button tone="secondary"><Icon name="download" size={18} />Descargar resumen</Button>)}<div className="owner-filter"><button type="button" aria-pressed="true">Todas <b>4</b></button><button type="button">Vencidas <b>2</b></button><button type="button">A vencer <b>1</b></button><button type="button">Pagadas <b>1</b></button></div><div className="owner-table-wrap"><table className="owner-table"><thead><tr><th data-cell="propiedad">Propiedad</th><th data-cell="monto" className="owner-number">Monto</th><th data-cell="vencimiento">Vencimiento</th><th data-cell="estado">Estado</th><th data-cell="accion">Acción</th></tr></thead><tbody><tr><td data-cell="propiedad"><b>Av. Rivadavia 2340, 5.º A</b><small>Jorge Paletta · agosto</small></td><td data-cell="monto" className="owner-number owner-money">$ 478.691</td><td data-cell="vencimiento">10/08/2026</td><td data-cell="estado"><Status>Vencida</Status></td><td data-cell="accion"><Button tone="secondary" small>Registrar pago</Button></td></tr><tr><td data-cell="propiedad"><b>Lavalle 950, 3.º B</b><small>Marta Suárez · agosto</small></td><td data-cell="monto" className="owner-number owner-money">$ 520.000</td><td data-cell="vencimiento">10/08/2026</td><td data-cell="estado">{paymentConfirmed ? <Status>Al día</Status> : <span className="owner-status owner-status--info"><Icon name="clock" size={15} />Pago a confirmar</span>}</td><td data-cell="accion"><Button tone="secondary" small onClick={() => setPaymentOpen(true)}>{paymentConfirmed ? "Comprobante" : "Revisar pago"}</Button></td></tr><tr><td data-cell="propiedad"><b>Colón 2255, 4.º D</b><small>Diego Ferrari · agosto</small></td><td data-cell="monto" className="owner-number owner-money">$ 505.000</td><td data-cell="vencimiento">25/08/2026</td><td data-cell="estado"><Status>A vencer</Status><small className="owner-substatus">Sin confirmar</small></td><td data-cell="accion"><Button tone="secondary" small>Confirmar cuota</Button></td></tr><tr><td data-cell="propiedad"><b>Belgrano 445, PB</b><small>Ana Ferreyra · agosto</small></td><td data-cell="monto" className="owner-number owner-money">$ 430.000</td><td data-cell="vencimiento">05/08/2026</td><td data-cell="estado"><Status>Al día</Status></td><td data-cell="accion"><Button tone="secondary" small><Icon name="download" size={16} />Comprobante</Button></td></tr></tbody></table></div></>; }

  function tenantsView() { return <>{pageHeader("Inquilinos", "4 inquilinos · todos con contrato vigente", <Button onClick={() => beginCreation("tenant")}><Icon name="plus" size={18} />Agregar inquilino</Button>)}<div className="owner-list">{tenants.map((tenant) => <button type="button" className="owner-row owner-row--button" key={tenant.tax} onClick={() => openDetail("tenant", tenant.property.id)}><span className="owner-row__icon"><Icon name="users" /></span><span className="owner-row__body"><b>{tenant.name}</b><small>{tenant.tax} · {tenant.email} · {tenant.property.address}</small></span><span className="owner-row__amount"><b>{tenant.property.rent}</b><small>por mes</small></span><Status>{tenant.property.state}</Status><span className="owner-row__arrow"><Icon name="arrow" /></span></button>)}</div></>; }

  function settingsView() { return <>{pageHeader("Configuración", "Preferencias de su cuenta y recordatorios.")}<section className="owner-detail-grid owner-detail-grid--even"><div className="owner-card"><h2>Recordatorios de pago</h2><p className="owner-card__copy">Los inquilinos reciben recordatorios por correo cuando una cuota está por vencer o se encuentra vencida.</p><dl className="owner-definition"><div><dt>Antes del vencimiento</dt><dd>7 días</dd></div><div><dt>El día del vencimiento</dt><dd>Activo</dd></div><div><dt>Después del vencimiento</dt><dd>3 días</dd></div></dl><Button tone="secondary" small>Editar recordatorios</Button></div><div className="owner-card"><h2>Cuenta</h2><dl className="owner-definition"><div><dt>Nombre</dt><dd>Ricardo Rosas</dd></div><div><dt>Correo</dt><dd>ricardo@alquia.com</dd></div><div><dt>Moneda operativa</dt><dd>Pesos argentinos (ARS)</dd></div></dl><Button tone="secondary" small>Editar datos</Button></div></section></>; }

  function propertyDetail() { return <>{<nav className="owner-crumb"><button type="button" onClick={() => setDetail(null)}>Propiedades</button><span>/</span><span>{selectedProperty.address}</span></nav>}{pageHeader(selectedProperty.address, `${selectedProperty.type} · ${selectedProperty.city}`, <><Button tone="secondary"><Icon name="edit" size={18} />Editar</Button><Button tone="danger"><Icon name="archive" size={18} />Archivar</Button></>)}<section className="owner-detail-grid"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ESTADO ACTUAL</p><Status>{selectedProperty.state}</Status></div>{selectedProperty.tenant && <div className="owner-current-rent"><p className="owner-eyebrow">ALQUILER ACTUAL</p><b>{selectedProperty.rent}</b><small>por mes</small></div>}</div>{selectedProperty.tenant ? <button type="button" className="owner-contract-callout" onClick={() => openDetail("contract", selectedProperty.id)}><span><Icon name="file" /></span><div><b>Contrato con {selectedProperty.tenant}</b><small>Ver condiciones, documento y próximas cuotas</small></div><Icon name="arrow" /></button> : <div className="owner-empty-callout"><Icon name="building" /><div><b>Esta propiedad está disponible</b><small>Cuando tenga un inquilino, cree un contrato para empezar a cobrarla.</small></div><Button small onClick={() => beginCreation("contract")}>Crear contrato</Button></div>}</div><div className="owner-card"><h2>Características</h2><dl className="owner-definition"><div><dt>Dirección</dt><dd>{selectedProperty.address}, {selectedProperty.city}</dd></div><div><dt>Tipo</dt><dd>{selectedProperty.type}</dd></div><div><dt>Detalles</dt><dd>{selectedProperty.detail}</dd></div><div><dt>Preferencias</dt><dd>Acepta mascotas · Sin amoblar</dd></div></dl></div></section></>; }

  function ContractDetail() { return <>{<nav className="owner-crumb"><button type="button" onClick={() => setDetail(null)}>Contratos</button><span>/</span><span>{selectedContract.property.address}</span></nav>}{pageHeader(selectedContract.property.address, `Contrato con ${selectedContract.property.tenant} · vigente hasta el ${selectedContract.end}`, <><Button tone="secondary" onClick={() => setConditionsOpen(true)}><Icon name="edit" size={18} />Cambiar condiciones</Button><Button tone="danger">Finalizar contrato</Button></>)}<section className="owner-detail-grid"><div className="owner-card"><div className="owner-card__top"><div><p className="owner-eyebrow">ALQUILER ACTUAL</p><strong className="owner-detail-money">{selectedContract.property.rent}</strong><small>por mes · vence el día 1</small></div><Status>{selectedContract.property.state}</Status></div><div className="owner-timeline"><div><span><Icon name="calendar" /></span><p><b>Inicio del contrato</b><small>01/03/2025</small></p></div><div><span><Icon name="trend" /></span><p><b>Próxima actualización</b><small>01/09/2026 · {selectedContract.increment}</small></p></div><div><span><Icon name="calendar" /></span><p><b>Fin previsto</b><small>{selectedContract.end}</small></p></div></div></div><div className="owner-card"><h2>Inquilino y acceso de pago</h2><div className="owner-tenant-card"><span className="owner-row__icon"><Icon name="users" /></span><div><b>{selectedContract.property.tenant}</b><small>{tenants.find((tenant) => tenant.property.id === selectedContract.id)?.email}</small></div></div><div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace para comprobantes</b><small>Activo hasta que finalice este contrato</small></span></div><Button tone="secondary" small onClick={() => setLinkCopied(true)}><Icon name="copy" size={16} />{linkCopied ? "Copiado" : "Copiar enlace"}</Button></div></div><div className="owner-card"><h2>Documento firmado</h2>{selectedContract.document ? <div className="owner-document"><span><Icon name="file" /></span><div><b>{selectedContract.document}</b><small>PDF · 2,4 MB · cargado el 01/03/2025</small></div><Button tone="quiet" small><Icon name="download" size={16} />Descargar</Button></div> : <div className="owner-empty-callout"><Icon name="paperclip" /><div><b>Todavía no cargó el contrato</b><small>Puede adjuntar un PDF o una imagen firmada en cualquier momento.</small></div><Button small>Adjuntar</Button></div>}</div></section></>; }

  function TenantDetail() { const tenant = tenants.find((item) => item.property.id === selected) ?? tenants[0]; return <>{<nav className="owner-crumb"><button type="button" onClick={() => setDetail(null)}>Inquilinos</button><span>/</span><span>{tenant.name}</span></nav>}{pageHeader(tenant.name, `${tenant.tax} · ${tenant.email}`, <Button tone="secondary"><Icon name="edit" size={18} />Editar datos</Button>)}<section className="owner-detail-grid"><div className="owner-card"><h2>Contrato vigente</h2><button type="button" className="owner-contract-callout" onClick={() => openDetail("contract", tenant.property.id)}><span><Icon name="file" /></span><div><b>{tenant.property.address}</b><small>{tenant.property.rent} por mes · {tenant.property.state}</small></div><Icon name="arrow" /></button></div><div className="owner-card"><h2>Acceso de pago</h2><p className="owner-card__copy">El inquilino no necesita una cuenta. Comparte un enlace seguro para ver cuotas habilitadas y subir su comprobante.</p><div className="owner-link-box"><div><Icon name="link" /><span><b>Enlace activo</b><small>Se puede revocar y regenerar cuando quiera.</small></span></div><Button tone="secondary" small>Administrar</Button></div></div></section></>; }

  const content = wizard ? <CreationWizard kind={wizard} onClose={() => setWizard(null)} onNewTenant={() => beginCreation("tenant")} onComplete={() => go(wizard === "property" ? "propiedades" : wizard === "tenant" ? "inquilinos" : "contratos")} /> : detail === "property" ? propertyDetail() : detail === "contract" ? <ContractDetail /> : detail === "tenant" ? <TenantDetail /> : view === "propiedades" ? propertiesView() : view === "contratos" ? contractsView() : view === "cobranzas" ? collectionsView() : view === "inquilinos" ? tenantsView() : view === "configuracion" ? settingsView() : overview();
  return <div className="owner-workspace"><main className="owner-content">{content}</main>{paymentOpen && <Dialog title="Revisar pago de Marta Suárez" onClose={() => setPaymentOpen(false)}><div className="owner-dialog__body"><p>Lavalle 950, 3.º B · cuota de agosto por <b>$ 520.000</b>.</p><div className="owner-receipt"><Icon name="receipt" size={34} /><b>comprobante-transferencia.jpg</b><small>Imagen · 1,8 MB · subido el 18/08/2026</small><Button tone="secondary" small><Icon name="download" size={16} />Ver archivo</Button></div><p className="owner-dialog__hint">Al confirmar, la cuota quedará marcada como pagada. Si el comprobante no corresponde, puede rechazarlo; el inquilino podrá cargar uno nuevo.</p><div className="owner-dialog__actions"><Button tone="danger" onClick={() => setPaymentOpen(false)}>Rechazar</Button><Button onClick={() => { setPaymentConfirmed(true); setPaymentOpen(false); }}>Confirmar pago</Button></div></div></Dialog>}{conditionsOpen && <Dialog title="Cambiar condiciones" onClose={() => setConditionsOpen(false)}><div className="owner-dialog__body"><p>Los cambios no alteran cuotas ya emitidas ni el historial del contrato.</p><div className="owner-mode"><button type="button" aria-pressed={conditionMode === "one"} onClick={() => setConditionMode("one")}><span><Icon name="calendar" /></span><div><b>Modificar solo la próxima cuota</b><small>Para un ajuste puntual. Define el importe final y un motivo.</small></div></button><button type="button" aria-pressed={conditionMode === "future"} onClick={() => setConditionMode("future")}><span><Icon name="trend" /></span><div><b>Cambiar condiciones a futuro</b><small>Modifica el monto, frecuencia o ajuste desde el próximo período.</small></div></button></div>{conditionMode === "one" ? <div className="owner-form-preview"><label>Importe final de la próxima cuota <b>$</b><input defaultValue="520.000" inputMode="numeric" /></label><label>Motivo <input placeholder="Ej.: reparación acordada" /></label></div> : <div className="owner-form-preview"><label>Nuevo alquiler mensual <b>$</b><input defaultValue="520.000" inputMode="numeric" /></label><label>Actualización <span className="owner-input-static">8 % cada 3 meses</span></label></div>}<div className="owner-dialog__actions"><Button tone="secondary" onClick={() => setConditionsOpen(false)}>Cancelar</Button><Button onClick={() => setConditionsOpen(false)}>{conditionMode === "one" ? "Guardar ajuste" : "Revisar cambios"}</Button></div></div></Dialog>}{creation && <Dialog title={creation === "property" ? "Agregar propiedad" : "Nuevo contrato"} onClose={() => setCreation(null)}><div className="owner-dialog__body">{creationComplete === creation ? <div className="owner-creation-success"><span><Icon name="check" size={28} /></span><h3>{creation === "property" ? "Propiedad guardada" : "Contrato creado"}</h3><p>{creation === "property" ? "Ya puede asignarle un inquilino o crear su contrato." : "La propiedad queda asociada al inquilino y se generarán las próximas cuotas."}</p><Button onClick={() => go(creation === "property" ? "propiedades" : "contratos")}>Ver {creation === "property" ? "propiedades" : "contratos"}</Button></div> : creation === "property" ? <><p>Empiece por registrar la ubicación. Los demás datos se pueden completar después.</p><div className="owner-form-preview owner-creation-form"><label>Dirección<input placeholder="Ej.: Av. Santa Fe 1420" autoFocus /></label><label>Tipo de propiedad<span className="owner-input-static">Departamento</span></label><label>Ciudad<input placeholder="Ej.: CABA" /></label></div><div className="owner-dialog__actions"><Button tone="secondary" onClick={() => setCreation(null)}>Cancelar</Button><Button onClick={() => setCreationComplete("property")}>Guardar propiedad</Button></div></> : <><p>Asocie una propiedad disponible con su inquilino y defina las condiciones iniciales.</p><div className="owner-creation-choice"><span><Icon name="building" /></span><div><b>Mitre 78</b><small>Local · San Isidro · propiedad disponible</small></div></div><div className="owner-creation-choice"><span><Icon name="users" /></span><div><b>Nuevo inquilino</b><small>Complete sus datos y recibirá su enlace de comprobantes.</small></div></div><div className="owner-form-preview owner-creation-form"><label>Alquiler mensual<input defaultValue="450.000" inputMode="numeric" /></label><label>Actualización<span className="owner-input-static">Porcentaje fijo · cada 3 meses</span></label></div><div className="owner-dialog__actions"><Button tone="secondary" onClick={() => setCreation(null)}>Cancelar</Button><Button onClick={() => setCreationComplete("contract")}>Crear contrato</Button></div></>}</div></Dialog>}</div>;
}
