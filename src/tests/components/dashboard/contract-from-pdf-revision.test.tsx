import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractFromPdf from "@/components/dashboard/ContractFromPdf";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import type { ContractResponse } from "@/lib/backend-types";
import { campo, cita, lectura } from "@/tests/lectura-de-contrato";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    contractImports: { quota: vi.fn(), upload: vi.fn(), get: vi.fn(), retry: vi.fn(), complete: vi.fn(), discard: vi.fn(), document: vi.fn() },
    contracts: { onboard: vi.fn() },
    properties: { get: vi.fn() },
    tenants: { get: vi.fn() },
  },
}));

vi.mock("@/components/dashboard/PdfPageViewer", async () => {
  const { useEffect } = await import("react");
  return {
    // Pide el PDF como lo hace el visor de verdad, para comprobar cuántas veces se descarga.
    default: function Visor({ pagina, cargar }: { pagina: number; cargar: () => Promise<Blob> }) {
      useEffect(() => { void cargar(); }, [cargar]);
      return <div data-testid="visor">Visor en la página {pagina}</div>;
    },
  };
});

import { AlquiaBackendClient } from "@/lib/backend-client";
const importaciones = vi.mocked(AlquiaBackendClient.contractImports);
const mockOnboard = vi.mocked(AlquiaBackendClient.contracts.onboard);
const mockPropiedad = vi.mocked(AlquiaBackendClient.properties.get);
const mockInquilino = vi.mocked(AlquiaBackendClient.tenants.get);

let onBack: ReturnType<typeof vi.fn>;
let onManual: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;
let onComplete: ReturnType<typeof vi.fn>;
let onOpenContract: ReturnType<typeof vi.fn>;

/** Sólo el reloj es falso: «hoy» es mediados de agosto de 2026, así que un contrato que empieza en septiembre no tiene cuotas vencidas. */
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-08-15T15:00:00Z"));
  onBack = vi.fn();
  onManual = vi.fn();
  onClose = vi.fn();
  onComplete = vi.fn();
  onOpenContract = vi.fn();
  importaciones.discard.mockResolvedValue(undefined);
  importaciones.document.mockResolvedValue(new Blob(["%PDF-"], { type: "application/pdf" }));
  importaciones.complete.mockResolvedValue(lectura());
  mockOnboard.mockResolvedValue({ id: 99 } as ContractResponse);
});

afterEach(() => {
  vi.useRealTimers();
  // @ts-expect-error -- jsdom no define matchMedia: se borra el que algún test haya puesto.
  delete window.matchMedia;
});

const pdf = () => new File(["%PDF-1.7"], "contrato.pdf", { type: "application/pdf" });

async function hastaLaRevision(respuesta = lectura()) {
  importaciones.upload.mockResolvedValue(respuesta);
  render(<ContractFromPdf onBack={onBack} onManual={onManual} onClose={onClose} onComplete={onComplete} onOpenContract={onOpenContract} />);
  fireEvent.change(screen.getByLabelText("Archivo del contrato"), { target: { files: [pdf()] } });
  await userEvent.click(screen.getByRole("button", { name: /Leer el contrato/ }));
  await screen.findByRole("heading", { name: "Revise lo que encontramos" });
}

const tarjeta = (nombre: string) => screen.getByRole("article", { name: nombre });
const boton = (donde: HTMLElement, nombre: string | RegExp) => within(donde).getByRole("button", { name: nombre });
const crear = () => screen.getByRole("button", { name: /Crear contrato|Guardando/ });

async function confirmar(...nombres: string[]) {
  for (const nombre of nombres) await userEvent.click(boton(tarjeta(nombre), "Está bien así"));
}

async function completarContacto() {
  await userEvent.type(screen.getByLabelText("Correo electrónico"), "lucia@correo.com");
  await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
}

/** Resuelve lo que la lectura de ejemplo deja pendiente: tipo, vencimiento y depósito por confirmar, y el contacto por completar. */
async function resolverTodo() {
  await confirmar("Tipo de propiedad", "Vencimiento", "Depósito en garantía");
  await completarContacto();
}

describe("la revisión muestra cada dato con su estado y su fuente", () => {
  it("lo que el contrato dice tal cual muestra su página; lo interpretado, «Revisar» con lo que dedujo; lo que falta, «Falta completar»", async () => {
    await hastaLaRevision();
    const alquiler = tarjeta("Alquiler inicial");
    expect(within(alquiler).getByText("$ 450.000 por mes")).toBeInTheDocument();
    expect(within(alquiler).getByText("Página 2")).toBeInTheDocument();

    const vencimiento = tarjeta("Vencimiento");
    expect(within(vencimiento).getByText("Revisar")).toBeInTheDocument();
    expect(within(vencimiento).getByText("Día 10 de cada mes")).toBeInTheDocument();
    expect(within(vencimiento).getByText("El contrato dice «del 1 al 10 de cada mes»")).toBeInTheDocument();
    expect(boton(vencimiento, "Está bien así")).toBeInTheDocument();
    expect(boton(vencimiento, "Corregir")).toBeInTheDocument();

    expect(within(tarjeta("Correo y teléfono del inquilino")).getByText("Falta completar")).toBeInTheDocument();
  });

  it("todo es de sólo lectura hasta «Corregir»", async () => {
    await hastaLaRevision();
    expect(screen.queryByLabelText("Alquiler mensual")).not.toBeInTheDocument();
    await userEvent.click(boton(tarjeta("Alquiler inicial"), "Corregir"));
    expect(screen.getByLabelText("Alquiler mensual")).toHaveValue("450.000");
  });

  it("la propiedad y el inquilino nuevos dicen que se van a agregar", async () => {
    await hastaLaRevision();
    expect(within(tarjeta("Propiedad")).getByText("Colón 2255, 4.º D · Vicente López")).toBeInTheDocument();
    expect(within(tarjeta("Inquilino")).getByText("Lucía Benítez")).toBeInTheDocument();
    expect(within(tarjeta("Inquilino")).getByText(/CUIT 27-33456789-9 · Es nuevo/)).toBeInTheDocument();
  });

  it("un texto del archivo se muestra como texto, nunca como HTML", async () => {
    await hastaLaRevision(lectura({
      "rent.dueDay": campo(10, "INFERRED", { note: "<b>negrita</b><img src=x onerror=alert(1)>" }),
    }));
    expect(screen.getByText("<b>negrita</b><img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });

  it("la nota técnica en inglés del backend no se muestra", async () => {
    await hastaLaRevision(lectura({
      "rent.initialAmount": campo(450000, "INFERRED", { note: "Evidence could not be verified", validation: ["EVIDENCE_UNVERIFIED"] }),
    }));
    expect(screen.queryByText(/Evidence could not be verified/)).not.toBeInTheDocument();
    expect(within(tarjeta("Alquiler inicial")).getByText("No pudimos comprobar la cita en el documento.")).toBeInTheDocument();
  });
});

describe("el contador y «Crear contrato»", () => {
  it("con cuatro cosas por resolver, el botón está apagado y el pie dice cuántas quedan", async () => {
    await hastaLaRevision();
    expect(screen.getByText("Quedan 4 por resolver")).toBeInTheDocument();
    expect(crear()).toBeDisabled();
  });

  it("«Está bien así» resuelve un dato a revisar", async () => {
    await hastaLaRevision();
    await userEvent.click(boton(tarjeta("Vencimiento"), "Está bien así"));
    expect(screen.getByText("Quedan 3 por resolver")).toBeInTheDocument();
    expect(within(tarjeta("Vencimiento")).getByText("Revisado")).toBeInTheDocument();
  });

  it("corregir un dato también cuenta como haberlo revisado", async () => {
    await hastaLaRevision();
    const vencimiento = tarjeta("Vencimiento");
    await userEvent.click(boton(vencimiento, "Corregir"));
    await userEvent.clear(screen.getByLabelText("Día del mes (del 1 al 28)"));
    await userEvent.type(screen.getByLabelText("Día del mes (del 1 al 28)"), "15");
    await userEvent.click(boton(vencimiento, "Listo"));
    expect(within(vencimiento).getByText("Día 15 de cada mes")).toBeInTheDocument();
    expect(screen.getByText("Quedan 3 por resolver")).toBeInTheDocument();
  });

  it("completar el correo y el teléfono resuelve lo que faltaba", async () => {
    await hastaLaRevision();
    await completarContacto();
    expect(screen.getByText("Quedan 3 por resolver")).toBeInTheDocument();
    expect(within(tarjeta("Correo y teléfono del inquilino")).getByText("Completado")).toBeInTheDocument();
  });

  it("un correo incompleto lo marca y sigue faltando", async () => {
    await hastaLaRevision();
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "lucia@");
    expect(screen.getByText("Ese correo no parece completo.")).toBeInTheDocument();
    expect(screen.getByText("Quedan 4 por resolver")).toBeInTheDocument();
  });

  it("con todo resuelto, el botón se habilita y el pie ya no cuenta nada", async () => {
    await hastaLaRevision();
    await resolverTodo();
    expect(screen.queryByText(/por resolver/)).not.toBeInTheDocument();
    expect(crear()).toBeEnabled();
    expect(screen.getByText(/Está todo listo/)).toBeInTheDocument();
  });

  it("un dato resuelto que después queda inválido vuelve a bloquear", async () => {
    await hastaLaRevision();
    await resolverTodo();
    await userEvent.click(boton(tarjeta("Alquiler inicial"), "Corregir"));
    await userEvent.clear(screen.getByLabelText("Alquiler mensual"));
    expect(within(tarjeta("Alquiler inicial")).getByText("Falta completar")).toBeInTheDocument();
    expect(crear()).toBeDisabled();
  });

  it("el tipo de propiedad se sugiere, se confirma o se cambia", async () => {
    await hastaLaRevision();
    const tipo = tarjeta("Tipo de propiedad");
    expect(within(tipo).getByText("Departamento")).toBeInTheDocument();
    await userEvent.click(boton(tipo, "Corregir"));
    await userEvent.click(within(tipo).getByRole("radio", { name: /Casa/ }));
    await userEvent.click(boton(tipo, "Listo"));
    expect(within(tipo).getByText("Casa")).toBeInTheDocument();
  });
});

describe("ver en el contrato", () => {
  it("con lugar al lado, muestra la página citada en el visor y la cita", async () => {
    await hastaLaRevision();
    expect(screen.getByTestId("visor")).toHaveTextContent("página 1");

    await userEvent.click(boton(tarjeta("Alquiler inicial"), "Ver en el contrato"));

    expect(screen.getByTestId("visor")).toHaveTextContent("página 2");
    expect(screen.getAllByText(/la suma de pesos cuatrocientos cincuenta mil/).length).toBeGreaterThan(0);
    expect(boton(tarjeta("Alquiler inicial"), "Ocultar en el contrato")).toBeInTheDocument();
  });

  it("en pantallas angostas no carga el visor: muestra la cita bajo el dato y un «Ver página N»", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
    await hastaLaRevision();
    expect(screen.queryByTestId("visor")).not.toBeInTheDocument();

    await userEvent.click(boton(tarjeta("Alquiler inicial"), "Ver en el contrato"));
    const alquiler = tarjeta("Alquiler inicial");
    expect(within(alquiler).getByText(/la suma de pesos cuatrocientos cincuenta mil/)).toBeInTheDocument();

    await userEvent.click(boton(alquiler, "Ver página 2"));
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByTestId("visor")).toHaveTextContent("página 2");
  });

  it("pide el PDF una sola vez, aunque lo usen el costado y el diálogo", async () => {
    await hastaLaRevision();
    await userEvent.click(boton(tarjeta("Alquiler inicial"), "Ver en el contrato"));
    await userEvent.click(boton(tarjeta("Alquiler inicial"), "Ver página 2"));
    expect(screen.getAllByTestId("visor")).toHaveLength(2);
    expect(importaciones.document).toHaveBeenCalledTimes(1);
    expect(importaciones.document).toHaveBeenCalledWith(41);
  });
});

describe("cláusulas que no se cargan tal cual", () => {
  it("vencimiento el día 30: ofrece el 28 diciendo qué dice el contrato, o cargarlo a mano", async () => {
    await hastaLaRevision(lectura({ "rent.dueDay": campo(30, "INFERRED", { validation: ["DUE_DAY_OUT_OF_RANGE"] }) }));
    const vencimiento = tarjeta("Vencimiento");
    expect(within(vencimiento).getByText("No se puede cargar así")).toBeInTheDocument();
    expect(screen.getByText("Quedan 4 por resolver")).toBeInTheDocument();
    expect(within(vencimiento).getByText(/El contrato dice día 30, pero Alquia llega hasta el 28/)).toBeInTheDocument();
    expect(boton(vencimiento, "Cargarlo a mano")).toBeInTheDocument();

    await userEvent.click(boton(vencimiento, "Usar el día 28"));
    expect(within(vencimiento).getByText("Día 28 de cada mes")).toBeInTheDocument();
    expect(within(vencimiento).getByText(/El contrato dice día 30; se carga el 28/)).toBeInTheDocument();
    expect(screen.getByText("Quedan 3 por resolver")).toBeInTheDocument();

    await userEvent.click(boton(vencimiento, "Deshacer"));
    expect(within(vencimiento).getByText("Sin elegir")).toBeInTheDocument();
  });

  it("alquiler escalonado: lo explica, deja «Crear contrato» apagado aunque se resuelva todo lo demás, y ofrece cargarlo a mano", async () => {
    await hastaLaRevision(lectura({
      "rent.initialAmount": campo(null, "UNSUPPORTED", { evidence: [cita(2, "$ 300.000 los primeros seis meses y $ 420.000 después")] }),
    }));
    const alquiler = tarjeta("Alquiler inicial");
    expect(within(alquiler).getByText("No se puede cargar así")).toBeInTheDocument();
    expect(within(alquiler).getByText(/alquileres distintos para cada período/)).toBeInTheDocument();
    expect(within(alquiler).getByText(/\$ 300\.000 los primeros seis meses/)).toBeInTheDocument();

    await resolverTodo();
    expect(crear()).toBeDisabled();
    expect(screen.getByText("Queda 1 por resolver")).toBeInTheDocument();

    await userEvent.click(boton(alquiler, "Cargarlo a mano"));
    expect(onManual).toHaveBeenCalled();
    expect(importaciones.discard).toHaveBeenCalledWith(41);
  });

  it("un índice que no es ICL ni IPC bloquea y ofrece cargarlo a mano", async () => {
    await hastaLaRevision(lectura({ "increments.method": campo(null, "UNSUPPORTED"), "increments.indexName": campo(null, "UNSUPPORTED") }));
    const actualizacion = tarjeta("Actualización");
    expect(within(actualizacion).getByText(/índice que Alquia no usa/)).toBeInTheDocument();
    await resolverTodo();
    expect(crear()).toBeDisabled();
    expect(boton(actualizacion, "Cargarlo a mano")).toBeInTheDocument();
  });

  it("dos inquilinos: muestra las dos citas y se resuelve indicando quién es el del contrato", async () => {
    const dosNombres = [cita(1, "Lucía Benítez y Mario Pérez")];
    await hastaLaRevision(lectura({
      "tenant.firstName": campo(null, "UNSUPPORTED", { evidence: dosNombres }),
      "tenant.lastName": campo(null, "UNSUPPORTED", { evidence: dosNombres }),
      "tenant.taxId": campo(null, "UNSUPPORTED", { evidence: dosNombres }),
    }, { unsupported: [{ field: "tenants", reason: "MULTIPLE_TENANTS", evidence: dosNombres }] }));

    const inquilino = tarjeta("Inquilino");
    expect(within(inquilino).getByText("No se puede cargar así")).toBeInTheDocument();
    expect(within(inquilino).getByText(/Lucía Benítez y Mario Pérez/)).toBeInTheDocument();
    expect(boton(inquilino, "Cargarlo a mano")).toBeInTheDocument();

    await resolverTodo();
    expect(crear()).toBeDisabled();

    await userEvent.type(within(inquilino).getByLabelText("Nombre"), "Lucía");
    await userEvent.type(within(inquilino).getByLabelText("Apellido"), "Benítez");
    await userEvent.type(within(inquilino).getByLabelText("CUIT o CUIL"), "27334567899");
    expect(crear()).toBeEnabled();
  });

  it("punitorios atados a una tasa del banco: se puede crear sin punitorios", async () => {
    await hastaLaRevision(lectura({
      "lateFee.method": campo(null, "UNSUPPORTED", { evidence: [cita(4, "la tasa activa del Banco Nación")] }),
    }));
    const punitorios = tarjeta("Punitorios");
    expect(within(punitorios).getByText(/tasa del banco/)).toBeInTheDocument();
    await resolverTodo();
    expect(crear()).toBeDisabled();
    await userEvent.click(boton(punitorios, "Crear sin punitorios"));
    expect(within(punitorios).getByText(/se crea sin punitorios/)).toBeInTheDocument();
    expect(crear()).toBeEnabled();
  });

  it("un depósito en otra moneda no se propone como monto: se crea sin depósito o se carga a mano", async () => {
    await hastaLaRevision(lectura({ "deposit.amount": campo(1000, "LITERAL"), "deposit.currency": campo("USD") }));
    const deposito = tarjeta("Depósito en garantía");
    expect(within(deposito).getByText(/moneda distinta a la del alquiler/)).toBeInTheDocument();
    expect(boton(deposito, "Cargarlo a mano")).toBeInTheDocument();
    await userEvent.click(boton(deposito, "Crear sin depósito"));
    expect(within(deposito).getByText(/se crea sin depósito/)).toBeInTheDocument();
  });

  it("una cláusula que ninguna sección reconoce bloquea y ofrece cargarlo a mano", async () => {
    await hastaLaRevision(lectura({}, { unsupported: [{ field: "algo.raro", reason: "OTHER", evidence: [cita(5, "cláusula extraña")] }] }));
    await resolverTodo();
    expect(crear()).toBeDisabled();
    expect(boton(tarjeta("Otra cláusula"), "Cargarlo a mano")).toBeInTheDocument();
  });
});

describe("la propiedad y el inquilino que ya tiene", () => {
  const coincidencias = { property: { id: 12, by: "ADDRESS" as const }, tenant: { id: 7, by: "TAX_ID" as const } };

  beforeEach(() => {
    mockPropiedad.mockResolvedValue({ id: 12, street: "Colón", number: "2255", floorUnit: "4.º D", city: "Vicente López", province: "Buenos Aires", category: "APARTMENT" });
    mockInquilino.mockResolvedValue({ id: 7, firstName: "Lucía", lastName: "Benítez Paz", taxId: "27334567899", email: "l@x.com", phoneNumber: "1144552210" });
  });

  it("ofrece la que ya existe por defecto, con el nombre que tiene cargado", async () => {
    await hastaLaRevision(lectura({}, { matches: coincidencias }));
    await waitFor(() => expect(within(tarjeta("Inquilino")).getByText("Lucía Benítez Paz")).toBeInTheDocument());
    expect(within(tarjeta("Inquilino")).getByText(/Ya lo tiene cargado/)).toBeInTheDocument();
    expect(within(tarjeta("Propiedad")).getByText(/Ya la tiene cargada/)).toBeInTheDocument();
    // Con una propiedad que ya existe no hay que elegir su tipo, y con el inquilino tampoco su contacto.
    expect(screen.queryByRole("article", { name: "Tipo de propiedad" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Correo y teléfono del inquilino" })).not.toBeInTheDocument();
  });

  it("crear usa los ids de lo que ya existe en vez de crear otros", async () => {
    await hastaLaRevision(lectura({}, { matches: coincidencias }));
    await confirmar("Vencimiento", "Depósito en garantía");
    await userEvent.click(crear());
    await waitFor(() => expect(mockOnboard).toHaveBeenCalled());
    const pedido = mockOnboard.mock.calls[0][0];
    expect(pedido.property).toEqual({ id: 12 });
    expect(pedido.tenant).toEqual({ id: 7 });
  });

  it("«Crear uno nuevo» vuelve a pedir el contacto y manda los datos leídos", async () => {
    await hastaLaRevision(lectura({}, { matches: coincidencias }));
    const inquilino = tarjeta("Inquilino");
    await userEvent.click(boton(inquilino, "Corregir"));
    await userEvent.click(within(inquilino).getByRole("radio", { name: /Crear uno nuevo/ }));
    expect(screen.getByText("Quedan 3 por resolver")).toBeInTheDocument();
    expect(within(screen.getByRole("article", { name: "Correo y teléfono del inquilino" })).getByText("Falta completar")).toBeInTheDocument();
  });
});

describe("garantías leídas del contrato", () => {
  const conGarante = () => lectura({
    guarantors: campo([{ fullName: "Ana Gómez", taxId: "27248910556", type: "PERSONAL", address: "Lavalle 950" }]),
  });

  it("figuran como datos a revisar, no como garantías definitivas, y bloquean crear hasta confirmarlas", async () => {
    await hastaLaRevision(conGarante());
    const garantias = tarjeta("Garantías");
    expect(within(garantias).getByText("Revisar")).toBeInTheDocument();
    expect(within(garantias).getByText(/Se guardan con el contrato al crearlo/)).toBeInTheDocument();
    await resolverTodo();
    expect(crear()).toBeDisabled();
    await userEvent.click(boton(garantias, "Está bien así"));
    expect(crear()).toBeEnabled();
  });

  it("se pueden editar, y se mandan como `guarantees` con el contrato: cerrar la lectura no las guarda", async () => {
    await hastaLaRevision(conGarante());
    await resolverTodo();
    const garantias = tarjeta("Garantías");
    await userEvent.click(boton(garantias, "Corregir"));
    const nombre = within(garantias).getByDisplayValue("Ana Gómez");
    await userEvent.clear(nombre);
    await userEvent.type(nombre, "Ana María Gómez");
    await userEvent.click(boton(garantias, "Listo"));

    await userEvent.click(crear());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockOnboard.mock.calls[0][0].contract.guarantees).toEqual([expect.objectContaining({ fullName: "Ana María Gómez" })]);
  });
});

describe("opcionales que el contrato no menciona", () => {
  it("no se muestran hasta que el propietario los suma", async () => {
    await hastaLaRevision(lectura({ "deposit.amount": campo(null, "MISSING") }));
    expect(screen.queryByRole("article", { name: "Depósito en garantía" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Comisión de la inmobiliaria" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Agregar: depósito" }));
    const deposito = tarjeta("Depósito en garantía");
    await userEvent.type(within(deposito).getByLabelText("Monto del depósito"), "900000");
    expect(within(deposito).getByText("$ 900.000")).toBeInTheDocument();
  });
});

describe("cuotas anteriores a hoy", () => {
  it("con el inicio en el pasado, exige «¿Hasta qué mes le pagaron?» antes de crear", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2026-03-01") }));
    await resolverTodo();
    expect(within(screen.getByRole("radiogroup", { name: "¿Hasta qué mes le pagaron?" })).getAllByRole("radio").length).toBeGreaterThan(1);
    expect(crear()).toBeDisabled();
    expect(screen.getByText("Queda 1 por resolver")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Ninguno todavía" }));
    expect(crear()).toBeEnabled();
  });

  const pregunta = () => screen.getByRole("radiogroup", { name: "¿Hasta qué mes le pagaron?" });
  const mes = () => screen.getByRole("combobox", { name: "Mes" });
  const anio = () => screen.getByRole("combobox", { name: "Año" });
  const nombresDe = (selector: HTMLElement) => within(selector).getAllByRole("option").map((o) => o.textContent);

  it("con muchos meses (un contrato que empezó hace más de un año) pregunta «algunas cuotas» o «ninguna», y recién después el mes y el año", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2025-06-01") }));
    await resolverTodo();

    // Nada viene elegido, y no hay un chip por mes.
    expect(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ })).toHaveAttribute("aria-checked", "false");
    expect(within(pregunta()).getByRole("radio", { name: /Todavía no se pagó ninguna/ })).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByRole("combobox", { name: "Mes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "julio 2026" })).not.toBeInTheDocument();
    expect(crear()).toBeDisabled();

    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ }));

    expect(nombresDe(mes())).toEqual(["Elija el mes", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]);
    expect(nombresDe(anio())).toEqual(["Elija el año", "2025", "2026"]);
    expect(crear()).toBeDisabled();
  });

  it("los meses son los del año elegido: no se puede armar un mes que no corresponde", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2025-06-01") }));
    await resolverTodo();
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ }));

    await userEvent.selectOptions(anio(), "2025");
    expect(nombresDe(mes())).toEqual(["Elija el mes", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]);

    await userEvent.selectOptions(anio(), "2026");
    expect(nombresDe(mes())).toEqual(["Elija el mes", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto"]);
  });

  it("elegir mes y año habilita crear, dice qué pasa y viaja con el contrato", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2025-06-01") }));
    await resolverTodo();
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ }));

    await userEvent.selectOptions(anio(), "2025");
    expect(crear()).toBeDisabled();
    await userEvent.selectOptions(mes(), "Diciembre");
    expect(screen.getByText(/cobradas/)).toBeInTheDocument();
    expect(crear()).toBeEnabled();

    await userEvent.click(crear());
    await waitFor(() => expect(mockOnboard).toHaveBeenCalled());
    expect(mockOnboard.mock.calls[0][0].elapsed).toEqual({ paidThrough: "2025-12" });
  });

  it("si cambia el año y ese año no tiene el mes elegido, vuelve a pedir el mes en vez de dejar una respuesta falsa", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2025-06-01") }));
    await resolverTodo();
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ }));
    await userEvent.selectOptions(anio(), "2025");
    await userEvent.selectOptions(mes(), "Diciembre");
    expect(crear()).toBeEnabled();

    await userEvent.selectOptions(anio(), "2026");
    expect(mes()).toHaveValue("");
    expect(crear()).toBeDisabled();
  });

  it("«Todavía no se pagó ninguna» no pide mes ni año y viaja como ninguna", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2025-06-01") }));
    await resolverTodo();
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Todavía no se pagó ninguna/ }));
    expect(screen.queryByRole("combobox", { name: "Mes" })).not.toBeInTheDocument();
    expect(crear()).toBeEnabled();
    await userEvent.click(crear());
    await waitFor(() => expect(mockOnboard).toHaveBeenCalled());
    expect(mockOnboard.mock.calls[0][0].elapsed).toEqual({ paidThrough: null });
  });

  it("pasar de «ninguna» a «algunas» deja la respuesta sin elegir hasta que se pone el mes", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2025-06-01") }));
    await resolverTodo();
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Todavía no se pagó ninguna/ }));
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ }));
    expect(crear()).toBeDisabled();
    expect(within(pregunta()).getByRole("radio", { name: /Todavía no se pagó ninguna/ })).toHaveAttribute("aria-checked", "false");
  });

  it("con todos los meses en un solo año, el año ya viene a la vista", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2026-01-01") }));
    await resolverTodo();
    await userEvent.click(within(pregunta()).getByRole("radio", { name: /Ya se pagaron algunas cuotas/ }));
    expect(nombresDe(anio())).toEqual(["Elija el año", "2026"]);
    expect(anio()).toHaveValue("2026");
    await userEvent.selectOptions(mes(), "Marzo");
    expect(crear()).toBeEnabled();
  });

  it("manda la respuesta con el contrato", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2026-03-01") }));
    await resolverTodo();
    await userEvent.click(screen.getByRole("radio", { name: "Ninguno todavía" }));
    await userEvent.click(crear());
    await waitFor(() => expect(mockOnboard).toHaveBeenCalled());
    expect(mockOnboard.mock.calls[0][0].elapsed).toEqual({ paidThrough: null });
  });

  it("si el backend corrige la lista de meses, vuelve a preguntar con la suya", async () => {
    await hastaLaRevision(lectura({ "dates.startDate": campo("2026-03-01") }));
    await resolverTodo();
    await userEvent.click(screen.getByRole("radio", { name: "Ninguno todavía" }));
    mockOnboard.mockRejectedValueOnce(new ApiError(400, "x", ERROR.ELAPSED_INVOICES_DECISION_REQUIRED, { "elapsed.periods": "2026-03,2026-04" }));
    await userEvent.click(crear());
    expect(await screen.findByRole("alert")).toHaveTextContent(/Indique hasta qué mes le pagaron/);
    expect(crear()).toBeDisabled();
  });
});

describe("crear el contrato", () => {
  it("manda un solo pedido con lo revisado y después cierra la lectura con los valores finales y lo que hizo el propietario", async () => {
    await hastaLaRevision();
    // Confirma el vencimiento, corrige el depósito, completa el correo y deja el alquiler como estaba.
    await confirmar("Tipo de propiedad", "Vencimiento");
    const deposito = tarjeta("Depósito en garantía");
    await userEvent.click(boton(deposito, "Corregir"));
    await userEvent.clear(within(deposito).getByLabelText("Monto del depósito"));
    await userEvent.type(within(deposito).getByLabelText("Monto del depósito"), "500000");
    await userEvent.click(boton(deposito, "Listo"));
    await completarContacto();

    await userEvent.click(crear());

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockOnboard).toHaveBeenCalledTimes(1);
    const pedido = mockOnboard.mock.calls[0][0];
    expect(pedido.property).toEqual({
      new: { street: "Colón", number: "2255", floorUnit: "4.º D", city: "Vicente López", province: "Buenos Aires", postalCode: undefined, category: "APARTMENT" },
    });
    expect(pedido.tenant).toEqual({ new: { firstName: "Lucía", lastName: "Benítez", taxId: "27334567899", email: "lucia@correo.com", phoneNumber: "1144552210" } });
    expect(pedido.contract).toMatchObject({
      initialRentAmount: 450000, startDate: "2026-09-01", termMonths: 36, dueDay: 10,
      incrementMethod: "INDEX", incrementIndexName: "IPC", incrementFrequencyMonths: 4, depositAmount: 500000,
    });

    expect(importaciones.complete).toHaveBeenCalledTimes(1);
    const [id, cierre] = importaciones.complete.mock.calls[0];
    expect(id).toBe(41);
    expect(cierre.contractId).toBe(99);
    expect(cierre.fieldActions).toMatchObject({
      "rent.dueDay": "CONFIRMED",
      "deposit.amount": "CORRECTED",
      "tenant.email": "FILLED",
      "rent.initialAmount": "UNTOUCHED",
    });
    expect(cierre.finalValues).toMatchObject({ "rent.initialAmount": 450000, "deposit.amount": 500000, "tenant.email": "lucia@correo.com" });
  });

  it("mientras guarda, el botón dice «Guardando…», no se puede salir ni crear dos veces", async () => {
    await hastaLaRevision();
    await resolverTodo();
    mockOnboard.mockReturnValue(new Promise(() => {}));
    await userEvent.click(crear());
    expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salir del asistente" })).toBeDisabled();
    expect(mockOnboard).toHaveBeenCalledTimes(1);
  });

  it("si cerrar la lectura falla una vez, la reintenta y no crea el contrato dos veces", async () => {
    await hastaLaRevision();
    await resolverTodo();
    importaciones.complete.mockRejectedValueOnce(new Error("sin red"));
    await userEvent.click(crear());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(importaciones.complete).toHaveBeenCalledTimes(2);
    expect(mockOnboard).toHaveBeenCalledTimes(1);
  });

  it("si cerrarla falla otra vez, muestra el contrato como creado con un camino para adjuntar el PDF, y no lo vuelve a crear", async () => {
    await hastaLaRevision();
    await resolverTodo();
    importaciones.complete.mockRejectedValue(new Error("sin red"));
    await userEvent.click(crear());

    expect(await screen.findByRole("heading", { name: "El contrato se creó" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/No pudimos adjuntar el PDF/);
    expect(importaciones.complete).toHaveBeenCalledTimes(2);
    expect(mockOnboard).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Ver el contrato/ }));
    expect(onOpenContract).toHaveBeenCalledWith(99);
  });

  it("un 400 del servidor marca los datos y no pierde lo revisado", async () => {
    await hastaLaRevision();
    await resolverTodo();
    const campos: Record<string, string> = { "contract.dueDay": "must be between 1 and 28" };
    mockOnboard.mockRejectedValueOnce(new ApiError(400, "Validation failed", null, campos));
    await userEvent.click(crear());

    expect(await screen.findByText(/El servidor no aceptó algunos datos/)).toBeInTheDocument();
    expect(within(tarjeta("Vencimiento")).getByText("Revise este dato.")).toBeInTheDocument();
    expect(screen.queryByText(/must be between/)).not.toBeInTheDocument();
    expect(importaciones.complete).not.toHaveBeenCalled();
    expect(crear()).toBeEnabled();
  });

  it("un inquilino que ya existe con ese CUIT: lo deja elegido y se vuelve a crear con su id", async () => {
    mockInquilino.mockResolvedValue({ id: 7, firstName: "Lucía", lastName: "Benítez Paz", taxId: "27334567899", email: "l@x.com", phoneNumber: "1144552210" });
    await hastaLaRevision();
    await resolverTodo();
    mockOnboard.mockRejectedValueOnce(new ApiError(409, "dup", ERROR.DUPLICATE_PHONE_NUMBER, null, { existingTenantId: 7 }));
    await userEvent.click(crear());
    expect(await screen.findByText(/Ya tiene cargado a ese inquilino/)).toBeInTheDocument();

    await userEvent.click(crear());
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockOnboard.mock.calls[1][0].tenant).toEqual({ id: 7 });
  });

  it("una propiedad con contrato vigente: lo explica y ofrece ver ese contrato", async () => {
    await hastaLaRevision();
    await resolverTodo();
    mockOnboard.mockRejectedValueOnce(new ApiError(409, "active", ERROR.PROPERTY_HAS_ACTIVE_CONTRACT, null, { activeContractId: 42 }));
    await userEvent.click(crear());
    expect(await screen.findByRole("alert")).toHaveTextContent(/ya tiene un contrato vigente/);

    await userEvent.click(screen.getByRole("button", { name: "Ver ese contrato" }));
    // Salir de la revisión se confirma, también para ir a ver el otro contrato.
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(onOpenContract).toHaveBeenCalledWith(42);
  });

  it("un error inesperado no muestra el texto técnico y deja reintentar", async () => {
    await hastaLaRevision();
    await resolverTodo();
    mockOnboard.mockRejectedValueOnce(new ApiError(500, "NullPointerException at Foo.bar"));
    await userEvent.click(crear());
    expect(await screen.findByRole("alert")).toHaveTextContent(/No pudimos/);
    expect(screen.getByRole("alert")).not.toHaveTextContent("NullPointer");
    expect(crear()).toBeEnabled();
  });
});

describe("salir de la revisión", () => {
  it("pide confirmación en un diálogo de la app, dice que se descarta y que el archivo no se guarda", async () => {
    await hastaLaRevision();
    await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByRole("heading", { name: "¿Salir sin crear el contrato?" })).toBeInTheDocument();
    expect(within(dialogo).getByText(/se descarta la lectura y no guardamos el archivo/)).toBeInTheDocument();
    expect(importaciones.discard).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("«Seguir revisando» no descarta nada", async () => {
    await hastaLaRevision();
    await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));
    await userEvent.click(screen.getByRole("button", { name: "Seguir revisando" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(importaciones.discard).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("al confirmar, descarta la lectura y sale", async () => {
    await hastaLaRevision();
    await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(importaciones.discard).toHaveBeenCalledWith(41);
    expect(onClose).toHaveBeenCalled();
  });

  it("«Atrás» también confirma antes de descartar", async () => {
    await hastaLaRevision();
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(importaciones.discard).toHaveBeenCalledWith(41);
    expect(onBack).toHaveBeenCalled();
  });

  it("sin nada leído todavía, salir es directo", async () => {
    render(<ContractFromPdf onBack={onBack} onManual={onManual} onClose={onClose} onComplete={onComplete} />);
    await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });
});
