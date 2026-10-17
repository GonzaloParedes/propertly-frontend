import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreationWizard from "@/components/dashboard/CreationWizard";
import { ApiError, AuthExpiredError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import { serializar, type EstadoDelBorrador } from "@/lib/borradores";
import { SIN_OTRAS_CONDICIONES } from "@/lib/otras-condiciones";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { create: vi.fn(), list: vi.fn() },
    properties: { list: vi.fn(), create: vi.fn() },
    contracts: { list: vi.fn(), create: vi.fn(), onboard: vi.fn(), attachDocument: vi.fn() },
    contractImports: { quota: vi.fn(), upload: vi.fn(), get: vi.fn(), retry: vi.fn(), complete: vi.fn(), discard: vi.fn(), document: vi.fn() },
    contractDrafts: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), attachDocument: vi.fn(), getDocument: vi.fn(), removeDocument: vi.fn() },
    addressLookup: { autocomplete: vi.fn(), resolve: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockCreate = vi.mocked(AlquiaBackendClient.tenants.create);
const mockPropiedades = vi.mocked(AlquiaBackendClient.properties.list);
const mockCrearPropiedad = vi.mocked(AlquiaBackendClient.properties.create);
const mockInquilinos = vi.mocked(AlquiaBackendClient.tenants.list);
const mockContratos = vi.mocked(AlquiaBackendClient.contracts.list);
const mockAutocompletar = vi.mocked(AlquiaBackendClient.addressLookup.autocomplete);
const mockResolver = vi.mocked(AlquiaBackendClient.addressLookup.resolve);
const mockCrearContrato = vi.mocked(AlquiaBackendClient.contracts.onboard);
const mockCuota = vi.mocked(AlquiaBackendClient.contractImports.quota);
const mockBorradores = vi.mocked(AlquiaBackendClient.contractDrafts);

/** Un borrador como lo devuelve el backend. */
function borradorGuardado(cuerpo: { label: string; payload: Record<string, unknown> }, id = 5, version = 0) {
  return { id, version, ...cuerpo, createdAt: "2026-08-15T15:00:00Z", updatedAt: "2026-08-15T15:00:00Z", expiresAt: "2026-11-13T15:00:00Z", document: null };
}

const MITRE = {
  id: 10, street: "Mitre", number: "78", city: "San Isidro", province: "Buenos Aires",
  category: "COMMERCIAL_PREMISES" as const, coveredArea: 52,
};
const COLON = {
  id: 11, street: "Colón", number: "2255", floorUnit: "4.º D", city: "Vicente López",
  province: "Buenos Aires", category: "APARTMENT" as const, coveredArea: 58,
};
const DIEGO = {
  id: 20, firstName: "Diego", lastName: "Ferrari", taxId: "20301154829",
  email: "diego@ejemplo.com", phoneNumber: "+5491144552210",
};

// 27-24891055-6 tiene dígito verificador válido; el asistente no deja avanzar
// con uno inventado, así que los tests necesitan uno real.
const CUIT_VALIDO = "27248910556";

/** Sólo el reloj es falso: las promesas y los timers de userEvent siguen reales. */
function fijarHoy(isoUtc: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(isoUtc));
}

let onComplete: ReturnType<typeof vi.fn>;
let onClose: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  onComplete = vi.fn();
  onClose = vi.fn();
  mockPropiedades.mockResolvedValue([MITRE, COLON]);
  mockInquilinos.mockResolvedValue([DIEGO]);
  mockContratos.mockResolvedValue([]);
  mockCuota.mockResolvedValue({ used: 0, limit: 5, available: true });
  mockBorradores.create.mockImplementation(async (cuerpo) => borradorGuardado(cuerpo));
  mockBorradores.update.mockImplementation(async (id, cuerpo) => borradorGuardado(cuerpo, id, cuerpo.version + 1));
  mockAutocompletar.mockResolvedValue([{ reference: "ref-lavalle", label: "Lavalle 950" }]);
  mockResolver.mockResolvedValue({
    street: "Lavalle", number: "950", city: "CABA", province: "Ciudad Autónoma de Buenos Aires",
    postalCode: "C1047", latitude: null, longitude: null,
  });
});

function renderWizard() {
  render(<CreationWizard kind="tenant" onClose={onClose} onComplete={onComplete} />);
}

/**
 * El asistente de contrato abre preguntando cómo cargarlo. Estos tests recorren la carga a mano:
 * eligen esa opción y siguen, sin esperar la cuota de lecturas.
 */
function renderContratoAMano(props: Partial<React.ComponentProps<typeof CreationWizard>> = {}) {
  render(<CreationWizard kind="contract" onClose={onClose} onComplete={onComplete} {...props} />);
  fireEvent.click(screen.getByRole("radio", { name: /Cargarlo a mano/ }));
  fireEvent.click(screen.getByRole("button", { name: /Seguir/ }));
}

async function fillAndSave({
  nombre = "Jorge",
  apellido = "Paletta",
  cuit = CUIT_VALIDO,
  correo = "jorge@ejemplo.com",
  telefono = "1144552210",
} = {}) {
  if (nombre) await userEvent.type(screen.getByLabelText("Nombre"), nombre);
  if (apellido) await userEvent.type(screen.getByLabelText("Apellido"), apellido);
  if (cuit) await userEvent.type(screen.getByLabelText("CUIT o CUIL"), cuit);
  if (correo) await userEvent.type(screen.getByLabelText("Correo electrónico"), correo);
  if (telefono) await userEvent.type(screen.getByLabelText("Teléfono"), telefono);
  await userEvent.click(screen.getByRole("button", { name: "Guardar inquilino" }));
}

// --- Guardado exitoso ---

describe("guardado exitoso", () => {
  it("llama a tenants.create con los datos cargados", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave();

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        firstName: "Jorge",
        lastName: "Paletta",
        taxId: CUIT_VALIDO,
        email: "jorge@ejemplo.com",
        phoneNumber: "1144552210",
      })
    );
  });

  it("manda el CUIT sin guiones aunque en pantalla se vea formateado", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    expect(screen.getByLabelText("CUIT o CUIL")).toHaveValue("27-24891055-6");
    await fillAndSave({ cuit: "" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ taxId: "27248910556" })
      )
    );
  });

  it("avisa que terminó recién cuando el backend respondió", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave();

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});

// --- Mientras guarda ---

describe("mientras guarda", () => {
  it("muestra «Guardando…» y no deja volver a enviar", async () => {
    mockCreate.mockReturnValueOnce(new Promise(() => {}));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("no deja salir del asistente ni volver atrás", async () => {
    mockCreate.mockReturnValueOnce(new Promise(() => {}));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("button", { name: "Guardando…" });
    expect(screen.getByRole("button", { name: "Salir del asistente" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Atrás" })).toBeDisabled();
  });
});

// --- Errores ---

describe("errores al guardar", () => {
  it("avisa cuando el CUIT ya está cargado", async () => {
    mockCreate.mockRejectedValueOnce(
      new ApiError(409, "Tax ID already registered", ERROR.DUPLICATE_TAX_ID)
    );
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ese CUIT ya figura en otro inquilino suyo."
    );
  });

  it("muestra un mensaje de validación para otros 400", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(400, "Validation failed"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Verifique los datos ingresados");
  });

  it("muestra un mensaje genérico ante un error de red", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network error"));
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar el inquilino");
  });

  it("avisa si la sesión expiró", async () => {
    mockCreate.mockRejectedValueOnce(new AuthExpiredError());
    renderWizard();
    await fillAndSave();

    expect(await screen.findByRole("alert")).toHaveTextContent("Su sesión expiró");
  });

  it("no da por terminado el alta si falló", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(500, "Boom"));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("alert");
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("deja reintentar después del error", async () => {
    mockCreate.mockRejectedValueOnce(new ApiError(500, "Boom"));
    renderWizard();
    await fillAndSave();

    await screen.findByRole("alert");
    expect(screen.getByRole("button", { name: "Guardar inquilino" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Salir del asistente" })).not.toBeDisabled();
  });
});

// --- Validación previa ---

describe("validación previa", () => {
  it("no habilita guardar hasta que los cinco campos son válidos", async () => {
    renderWizard();
    const guardar = screen.getByRole("button", { name: "Guardar inquilino" });
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Nombre"), "Jorge");
    await userEvent.type(screen.getByLabelText("Apellido"), "Paletta");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Correo electrónico"), "jorge@ejemplo.com");
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
    expect(guardar).not.toBeDisabled();
  });

  it("no llega al backend con un CUIT de dígito verificador inválido", async () => {
    renderWizard();
    await fillAndSave({ cuit: "27248910557" });

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Hasta el 28/09/2026 el normalizador del backend guardaba esto mal
  // (+54901144552210, con el 0 adentro), y se cortaba acá. Ya está arreglado
  // —verificado en vivo: ahora guarda +549...2210, sin el 0— así que el 0 se
  // manda en dígitos como cualquier otro. Ver src/lib/telefono.ts.
  it("acepta el 0 de la característica: el backend ya lo saca bien", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave({ telefono: "01144552210" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "01144552210" })
      )
    );
  });

  it("manda el teléfono en dígitos aunque se escriba con guiones y espacios", async () => {
    mockCreate.mockResolvedValueOnce({
      id: 1, firstName: "Jorge", lastName: "Paletta", taxId: CUIT_VALIDO,
      email: "jorge@ejemplo.com", phoneNumber: "+5491144552210",
    });
    renderWizard();
    await fillAndSave({ telefono: "11 4455-2210" });

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "1144552210" })
      )
    );
  });
});

// --- contador de plazo del contrato ---

describe("asistente de contrato", () => {
  // Con el inicio del 01/09 y «hoy» a mediados de agosto, el contrato no tiene cuotas vencidas
  // que preguntar: estos tests no dependen del día en que se corren.
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  function renderContrato() {
    renderContratoAMano();
  }

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

  /** Deja el asistente en el paso `hasta`, cargando lo que cada paso exige. */
  async function avanzarHasta(hasta: number, { porcentaje = "12" } = {}) {
    renderContrato();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    if (hasta === 1) return;
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    if (hasta === 2) return;
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "620000");
    if (hasta === 3) return;
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    if (hasta === 4) return;
    await seguir();
    if (porcentaje) await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), porcentaje);
    if (hasta === 5) return;
    await seguir();
    if (hasta === 6) return;
    await seguir();
  }

  // --- las listas ---

  it("no ofrece una propiedad que ya tiene un contrato vigente", async () => {
    mockContratos.mockResolvedValue([
      { id: 1, property: COLON, tenant: DIEGO, status: "ACTIVE" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- fixture parcial: sólo se leen property.id y status.
    ] as any);
    renderContrato();

    expect(await screen.findByRole("radio", { name: /Mitre 78/ })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Colón 2255/ })).not.toBeInTheDocument();
  });

  it("avisa si no pudo cargar las listas, en vez de mostrar una pantalla vacía", async () => {
    mockPropiedades.mockRejectedValue(new ApiError(500, "Boom"));
    renderContrato();

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar sus datos");
  });

  // --- lo que cada paso exige ---

  it("no deja pasar del primer paso sin elegir una propiedad", async () => {
    renderContrato();
    await screen.findByRole("radio", { name: /Mitre 78/ });
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
  });

  it("no acepta una fecha de inicio anterior a diciembre de 2022", async () => {
    await avanzarHasta(4);
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2020-01-01" } });

    expect(screen.getByRole("alert")).toHaveTextContent("antes de diciembre de 2022");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
  });

  it("suma y resta el plazo de a un mes, no de a seis", async () => {
    await avanzarHasta(4);
    expect(screen.getByText("36")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sumar meses" }));
    expect(screen.getByText("37")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Restar meses" }));
    await userEvent.click(screen.getByRole("button", { name: "Restar meses" }));
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("no baja de un mes", async () => {
    await avanzarHasta(4);
    await userEvent.click(screen.getByRole("button", { name: "12 meses" }));
    const restar = screen.getByRole("button", { name: "Restar meses" });
    for (let i = 0; i < 15; i++) await userEvent.click(restar);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  // La fecha de fin que muestra el asistente tiene que ser la que el backend va
  // a guardar: startDate + termMonths, sin restarle un día.
  it("muestra la misma fecha de fin que va a calcular el backend", async () => {
    await avanzarHasta(4);
    expect(screen.getByText("Termina el 1/9/2029.")).toBeInTheDocument();
  });

  // --- el guardado ---

  it("crea el contrato por porcentaje con incrementValue y sin nombre de índice", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await avanzarHasta(7);
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() =>
      expect(mockCrearContrato).toHaveBeenCalledWith({
        property: { id: 10 },
        tenant: { id: 20 },
        // Desde el segundo paso el contrato es un borrador: al crearlo, el backend lo consume.
        draftId: 5,
        contract: {
          initialRentAmount: 620000,
          startDate: "2026-09-01",
          termMonths: 36,
          dueDay: 1,
          incrementFrequencyMonths: 6,
          incrementMethod: "FIXED_PERCENTAGE",
          incrementValue: 12,
        },
      })
    );
    expect(onComplete).toHaveBeenCalled();
  });

  // El backend rechaza que vengan los dos campos: INDEX exige incrementIndexName
  // y prohíbe incrementValue.
  it("crea el contrato por ICL con el nombre del índice y sin incrementValue", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await avanzarHasta(5, { porcentaje: "" });
    await userEvent.click(screen.getByRole("radio", { name: /Según el ICL/ }));
    await seguir();
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    const { contract } = mockCrearContrato.mock.calls[0][0];
    expect(contract.incrementMethod).toBe("INDEX");
    expect(contract.incrementIndexName).toBe("ICL");
    expect(contract).not.toHaveProperty("incrementValue");
  });

  it("traduce el 400 de la propiedad ya alquilada", async () => {
    mockCrearContrato.mockRejectedValueOnce(
      new ApiError(409, "Property already has an active contract", ERROR.PROPERTY_HAS_ACTIVE_CONTRACT)
    );
    await avanzarHasta(7);
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ya tiene un contrato vigente");
    expect(onComplete).not.toHaveBeenCalled();
  });
});

// --- paso opcional de características de la propiedad ---

describe("asistente de propiedad · características", () => {
  async function irAlPasoDeCaracteristicas() {
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  }

  it("arranca sin valores puestos por defecto", async () => {
    await irAlPasoDeCaracteristicas();
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Restar dormitorios" })).toBeDisabled();
    expect(screen.getByLabelText(/Superficie cubierta/)).toHaveValue("");
  });

  it("el primer + deja el contador en 1", async () => {
    await irAlPasoDeCaracteristicas();
    await userEvent.click(screen.getByRole("button", { name: "Sumar dormitorios" }));
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restar dormitorios" })).toBeEnabled();
  });

  it("se puede saltear y el resumen queda sin cargar", async () => {
    await irAlPasoDeCaracteristicas();
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    expect(screen.getByText("Sin cargar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar propiedad" })).toBeInTheDocument();
  });

  it("lista solo lo que se cargó", async () => {
    await irAlPasoDeCaracteristicas();
    await userEvent.click(screen.getByRole("button", { name: "Sumar baños" }));
    await userEvent.type(screen.getByLabelText(/Superficie cubierta/), "68");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByText("1 baño · 68 m²")).toBeInTheDocument();
  });
});

// --- el tipo, que el backend exige, y el guardado ---

describe("asistente de propiedad · tipo y guardado", () => {
  async function cargarDireccion() {
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  }

  /** Dirección + tipo, el mínimo que el backend acepta, hasta el resumen. */
  async function irAlResumen() {
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
  }

  it("ofrece las ocho categorías que el backend acepta", async () => {
    await cargarDireccion();
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: /Local comercial/ })).toBeInTheDocument();
    // Las cuatro que llegaron con `codex/frontend-integration-lots`: antes había
    // que ocultarlas porque el backend las rechazaba.
    expect(screen.getByRole("radio", { name: /Cochera/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Oficina/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Terreno/ })).toBeInTheDocument();
  });

  it("guarda una de las categorías nuevas", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /Cochera/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(mockCrearPropiedad).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith(
      expect.objectContaining({ category: "GARAGE" })
    );
  });

  it("no deja seguir sin elegir el tipo", async () => {
    await cargarDireccion();
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("radio", { name: /Casa/ }));
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeEnabled();
  });

  it("nombra el tipo elegido en el resumen", async () => {
    await irAlResumen();
    expect(screen.getByText("Departamento")).toBeInTheDocument();
  });

  it("guarda la propiedad con la dirección y el tipo", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    await irAlResumen();
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith({
      street: "Lavalle",
      number: "950",
      floorUnit: undefined,
      city: "CABA",
      province: "Ciudad Autónoma de Buenos Aires",
      postalCode: "C1047",
      latitude: undefined,
      longitude: undefined,
      category: "APARTMENT",
      bedrooms: undefined,
      bathrooms: undefined,
      coveredArea: undefined,
      petsAllowed: undefined,
      furnished: undefined,
    });
  });

  it("manda las características que se cargaron, y sólo esas", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /Casa/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Sumar dormitorios" }));
    await userEvent.type(screen.getByLabelText(/Superficie cubierta/), "92");
    await userEvent.click(screen.getByRole("button", { name: "Acepta mascotas" }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(mockCrearPropiedad).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "HOUSE",
        bedrooms: 1,
        coveredArea: 92,
        petsAllowed: true,
        // No los tocó: no se mandan, en vez de afirmar que no tiene baños
        // ni que no está amoblada.
        bathrooms: undefined,
        furnished: undefined,
      })
    );
  });

  it("los extras marcados figuran en el resumen", async () => {
    await cargarDireccion();
    await userEvent.click(screen.getByRole("radio", { name: /PH/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Se alquila amueblada" }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    expect(screen.getByText("amoblada")).toBeInTheDocument();
  });

  it("el piso y el departamento viajan en su propio campo", async () => {
    mockCrearPropiedad.mockResolvedValueOnce({} as never);
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.type(screen.getByPlaceholderText(/Piso y depto/), "3.º B");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    await waitFor(() => expect(mockCrearPropiedad).toHaveBeenCalled());
    expect(mockCrearPropiedad).toHaveBeenCalledWith(
      expect.objectContaining({ number: "950", floorUnit: "3.º B" })
    );
  });

  it("explica el 400 y deja volver a intentar", async () => {
    mockCrearPropiedad.mockRejectedValueOnce(new ApiError(400, "Validation failed"));
    await irAlResumen();
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verifique los datos ingresados e inténtelo de nuevo."
    );
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Guardar propiedad" })).toBeEnabled();
  });

  it("avisa cuando la sesión venció", async () => {
    mockCrearPropiedad.mockRejectedValueOnce(new AuthExpiredError());
    await irAlResumen();
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Su sesión expiró. Vuelva a iniciar sesión para guardar la propiedad."
    );
  });

  it("en el prototipo no llama al backend", async () => {
    render(<CreationWizard kind="property" demo onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Departamento/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar propiedad" }));

    expect(mockCrearPropiedad).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });
});

// --- día de vencimiento: el backend lo amplió de 1–10 a 1–28 (263576d) ---

describe("asistente de contrato · día de vencimiento", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  async function irAlPasoDelDia() {
    mockPropiedades.mockResolvedValueOnce([MITRE]);
    mockInquilinos.mockResolvedValueOnce([DIEGO]);
    mockContratos.mockResolvedValueOnce([]);
    renderContratoAMano();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  }

  it("deja elegir un día más allá del 10", async () => {
    await irAlPasoDelDia();
    const sumar = screen.getByRole("button", { name: /Sumar/ });
    for (let i = 0; i < 14; i += 1) await userEvent.click(sumar);
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("no pasa del 28: más allá no hay día en febrero", async () => {
    await irAlPasoDelDia();
    const sumar = screen.getByRole("button", { name: /Sumar/ });
    for (let i = 0; i < 40; i += 1) await userEvent.click(sumar);
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(sumar).toBeDisabled();
  });

  it("los chips siguen fijando los días habituales", async () => {
    await irAlPasoDelDia();
    await userEvent.click(screen.getByRole("button", { name: "Día 10" }));
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("guarda el día elegido", async () => {
    mockCrearContrato.mockResolvedValueOnce({} as never);
    await irAlPasoDelDia();
    await userEvent.click(screen.getByRole("button", { name: "Día 5" }));
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "400000");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.type(screen.getByLabelText(/Porcentaje/), "8");
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    expect(mockCrearContrato).toHaveBeenCalledWith(expect.objectContaining({ contract: expect.objectContaining({ dueDay: 5 }) }));
  });
});

describe("asistente de propiedad · ciudad y provincia", () => {
  async function elegirDireccion() {
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
  }

  it("no deja seguir si Pelias no trajo ciudad ni provincia hasta completarlas", async () => {
    mockResolver.mockResolvedValue({
      street: "Lavalle", number: "950", city: null, province: null,
      postalCode: null, latitude: null, longitude: null,
    });
    await elegirDireccion();
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Ciudad"), "Chivilcoy");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Provincia"), "Buenos Aires");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeEnabled();
  });
});

describe("asistente de propiedad · dirección que el buscador no encuentra", () => {
  it("con «Usarla igual» pide número, ciudad y provincia antes de dejar seguir", async () => {
    mockAutocompletar.mockResolvedValue([]);
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Calle Inexistente");
    await userEvent.click(await screen.findByRole("button", { name: "Usarla igual" }));
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Número"), "123");
    await userEvent.type(screen.getByLabelText("Ciudad"), "Chivilcoy");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Provincia"), "Buenos Aires");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeEnabled();
    // El código postal es opcional.
    expect(screen.getByLabelText("Código postal")).not.toBeRequired();
  });
});

describe("asistente de propiedad · corregir la dirección elegida", () => {
  it("deja editar la calle y el número sin volver a buscar", async () => {
    render(<CreationWizard kind="property" onClose={onClose} onComplete={onComplete} />);
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));

    await userEvent.clear(screen.getByLabelText("Calle"));
    await userEvent.type(screen.getByLabelText("Calle"), "Corrientes");
    await userEvent.clear(screen.getByLabelText("Número"));
    await userEvent.type(screen.getByLabelText("Número"), "1200");

    expect(screen.getByText("Corrientes 1200")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeEnabled();
  });
});

describe("asistente de contrato · propiedad preseleccionada", () => {
  it("arranca en el paso del inquilino con la propiedad ya elegida", async () => {
    mockPropiedades.mockResolvedValue([MITRE, COLON]);
    render(<CreationWizard kind="contract" initialPropertyId={MITRE.id} onClose={onClose} onComplete={onComplete} />);

    expect(await screen.findByRole("radio", { name: /Diego Ferrari/ })).toBeInTheDocument();
    expect(screen.getByText("Paso 2 de 7")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Mitre 78/ })).not.toBeInTheDocument();
  });

  it("sin propiedad preseleccionada arranca pidiéndola", async () => {
    renderContratoAMano();
    expect(await screen.findByRole("radio", { name: /Mitre 78/ })).toBeInTheDocument();
  });
});

describe("asistente de contrato · propiedad nueva sobre la marcha", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  async function cargarPropiedadNueva() {
    mockPropiedades.mockResolvedValueOnce([]);
    renderContratoAMano();

    expect(await screen.findByText("Todavía no cargó ninguna propiedad.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Una propiedad nueva/ }));
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(await screen.findByText("Casa"));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
    await userEvent.click(screen.getByRole("button", { name: "Usar esta propiedad" }));
  }

  it("la anota como borrador, vuelve al paso 1 con la nueva elegida y no la guarda", async () => {
    await cargarPropiedadNueva();

    expect(await screen.findByText("Paso 1 de 7")).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /Propiedad nueva: Lavalle 950/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeEnabled();
    expect(mockCrearPropiedad).not.toHaveBeenCalled();
  });

  it("se puede cambiar el borrador sin volver a cargarlo todo, y elegir otra propiedad lo deja sin elegir", async () => {
    mockPropiedades.mockResolvedValue([MITRE]);
    await cargarPropiedadNueva();
    await userEvent.click(screen.getByRole("button", { name: "Cambiar sus datos" }));
    expect(await screen.findByText("Paso 1 de 4")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Atrás" }));

    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    expect(screen.getByRole("radio", { name: /Propiedad nueva: Lavalle 950/ })).toHaveAttribute("aria-checked", "false");
    expect(mockCrearPropiedad).not.toHaveBeenCalled();
  });
});

// --- propiedad e inquilino nuevos: un solo pedido al final ---

describe("asistente de contrato · borradores y un solo guardado", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

  it("con propiedad e inquilino nuevos no se crea nada hasta «Crear contrato», y sale un solo pedido con todo", async () => {
    mockPropiedades.mockResolvedValue([]);
    mockInquilinos.mockResolvedValue([]);
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    renderContratoAMano();

    // Propiedad nueva
    await userEvent.click(await screen.findByRole("radio", { name: /Una propiedad nueva/ }));
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await seguir();
    await userEvent.click(await screen.findByText("Casa"));
    await seguir();
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Usar esta propiedad" }));

    // Inquilino nuevo
    await seguir();
    await userEvent.click(await screen.findByRole("radio", { name: /Un inquilino nuevo/ }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
    await userEvent.type(screen.getByLabelText("Apellido"), "Gómez");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
    await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
    await userEvent.click(screen.getByRole("button", { name: "Usar este inquilino" }));

    // Condiciones
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();

    // Revisión: todo lo nuevo figura como tal y todavía no se creó nada
    expect(screen.getByText("Propiedad nueva: Lavalle 950")).toBeInTheDocument();
    expect(screen.getByText("Inquilino nuevo: Ana Gómez")).toBeInTheDocument();
    expect(mockCrearPropiedad).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCrearContrato).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalledTimes(1));
    const pedido = mockCrearContrato.mock.calls[0][0];
    expect(pedido.property).toEqual({ new: expect.objectContaining({ street: "Lavalle", number: "950", category: "HOUSE" }) });
    expect(pedido.tenant).toEqual({
      new: { firstName: "Ana", lastName: "Gómez", taxId: CUIT_VALIDO, email: "ana@ejemplo.com", phoneNumber: "1144552210" },
    });
    expect(pedido.contract).toMatchObject({ initialRentAmount: 450000, startDate: "2026-09-01" });
    expect(mockCrearPropiedad).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("con dos clics seguidos en «Crear contrato» sale un solo pedido", async () => {
    mockCrearContrato.mockImplementation(() => new Promise(() => {}));
    renderContratoAMano();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();

    const crear = screen.getByRole("button", { name: "Crear contrato" });
    await userEvent.dblClick(crear);

    expect(mockCrearContrato).toHaveBeenCalledTimes(1);
  });
});

// --- «¿Hasta qué mes le pagaron?» en un contrato que ya empezó ---

describe("asistente de contrato · cuotas anteriores a hoy", () => {
  // 12:00 del 10/10/2026 en Buenos Aires.
  beforeEach(() => fijarHoy("2026-10-10T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

  /** Llega a la revisión de un contrato de $ 450.000 que vence el día 10. */
  async function irALaRevision(inicio: string) {
    renderContratoAMano();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Día 10" }));
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: inicio } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();
  }

  const grupo = () => screen.getByRole("radiogroup", { name: "¿Hasta qué mes le pagaron?" });
  const crear = () => screen.getByRole("button", { name: "Crear contrato" });

  it("pregunta con cada mes transcurrido y «Ninguno todavía», sin nada elegido, y no deja crear", async () => {
    await irALaRevision("2026-06-01");

    const opciones = within(grupo()).getAllByRole("radio");
    expect(opciones.map((o) => o.textContent)).toEqual(["junio 2026", "julio 2026", "agosto 2026", "septiembre 2026", "Ninguno todavía"]);
    expect(opciones.every((o) => o.getAttribute("aria-checked") === "false")).toBe(true);
    expect(crear()).toBeDisabled();
    expect(screen.getByText("Elija una opción para poder seguir.")).toBeInTheDocument();
  });

  it("al elegir agosto explica qué queda cobrado y qué queda como deuda, y manda paidThrough", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await irALaRevision("2026-06-01");
    await userEvent.click(within(grupo()).getByRole("radio", { name: "agosto 2026" }));

    expect(screen.getByText("Junio a agosto quedan como cobradas (sin comprobante).")).toBeInTheDocument();
    expect(screen.getByText("Septiembre queda como deuda: $ 450.000.")).toBeInTheDocument();
    expect(screen.getByText("Su inquilino va a recibir el aviso de cuota vencida.")).toBeInTheDocument();
    expect(screen.queryByText(/recargo/i)).not.toBeInTheDocument();

    await userEvent.click(crear());
    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    expect(mockCrearContrato.mock.calls[0][0].elapsed).toEqual({ paidThrough: "2026-08" });
  });

  it("«Ninguno todavía» se manda como paidThrough null", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await irALaRevision("2026-06-01");
    await userEvent.click(within(grupo()).getByRole("radio", { name: "Ninguno todavía" }));
    expect(screen.getByText("Ninguna cuota queda como cobrada.")).toBeInTheDocument();

    await userEvent.click(crear());
    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    expect(mockCrearContrato.mock.calls[0][0].elapsed).toEqual({ paidThrough: null });
  });

  it("un contrato que no tiene cuotas vencidas no pregunta y no manda elapsed", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await irALaRevision("2026-12-01");

    expect(screen.queryByRole("radiogroup", { name: "¿Hasta qué mes le pagaron?" })).not.toBeInTheDocument();
    await userEvent.click(crear());
    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    expect(mockCrearContrato.mock.calls[0][0].elapsed).toBeUndefined();
  });

  it("cambiar la fecha de inicio después de contestar descarta una respuesta que ya no corresponde", async () => {
    await irALaRevision("2026-06-01");
    await userEvent.click(within(grupo()).getByRole("radio", { name: "septiembre 2026" }));
    expect(crear()).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-08-01" } });
    await seguir();
    await seguir();
    await seguir();

    expect(within(grupo()).getAllByRole("radio").map((o) => o.textContent)).toEqual(["agosto 2026", "septiembre 2026", "Ninguno todavía"]);
    expect(within(grupo()).getByRole("radio", { name: "septiembre 2026" })).toHaveAttribute("aria-checked", "true");
  });

  it("si el backend corrige los períodos, vuelve a preguntar con los suyos", async () => {
    mockCrearContrato.mockRejectedValueOnce(
      new ApiError(400, "Elapsed invoices require a decision", ERROR.ELAPSED_INVOICES_DECISION_REQUIRED, { elapsed: "2026-06, 2026-07" })
    );
    await irALaRevision("2026-06-01");
    await userEvent.click(within(grupo()).getByRole("radio", { name: "agosto 2026" }));
    await userEvent.click(crear());

    expect(await screen.findByRole("alert")).toHaveTextContent("Hay cuotas anteriores a hoy. Indique hasta qué mes le pagaron.");
    expect(within(grupo()).getAllByRole("radio").map((o) => o.textContent)).toEqual(["junio 2026", "julio 2026", "Ninguno todavía"]);
    expect(crear()).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

// --- «Otras condiciones», la revisión y los errores del alta en un solo pedido ---

describe("asistente de contrato · otras condiciones", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  const crear = () => userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

  /** Llega a «Otras condiciones» (paso 6) con propiedad e inquilino existentes. */
  async function irAOtrasCondiciones(props: { onOpenContract?: (id: number) => void } = {}) {
    renderContratoAMano(props);
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "620000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "12");
    await seguir();
    expect(screen.getByText("Paso 6 de 7")).toBeInTheDocument();
  }

  const abrirGrupo = (nombre: string) => userEvent.click(screen.getByRole("button", { name: new RegExp(nombre) }));
  const terminosEnviados = () => mockCrearContrato.mock.calls[0][0].contract;

  it("se puede saltear: pasa a la revisión y no manda ninguna condición opcional", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await irAOtrasCondiciones();
    await userEvent.click(screen.getByRole("button", { name: "Saltear este paso" }));

    expect(screen.getByText("Paso 7 de 7")).toBeInTheDocument();
    await crear();
    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    const terminos = terminosEnviados();
    for (const campo of ["depositAmount", "commissionPercent", "commissionPayer", "lateFeeMethod", "lateFeeValue", "lateFeeGraceDays", "guarantees"]) {
      expect(terminos).not.toHaveProperty(campo);
    }
  });

  it("con algo cargado ya no ofrece saltear: no descarta lo escrito en silencio", async () => {
    await irAOtrasCondiciones();
    await abrirGrupo("Depósito");
    await userEvent.type(screen.getByLabelText("Monto del depósito"), "900000");

    expect(screen.queryByRole("button", { name: "Saltear este paso" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Depósito/ })).toHaveTextContent("$ 900.000");
  });

  it("carga parcial: manda el depósito y la comisión, y nada más", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await irAOtrasCondiciones();
    await abrirGrupo("Depósito");
    await userEvent.type(screen.getByLabelText("Monto del depósito"), "900000");
    await abrirGrupo("Comisión");
    await userEvent.type(screen.getByLabelText("Porcentaje de comisión"), "3,5");
    await userEvent.click(screen.getByRole("button", { name: "La paga el inquilino" }));
    await seguir();
    await crear();

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    const terminos = terminosEnviados();
    expect(terminos).toMatchObject({ depositAmount: 900000, commissionPercent: 3.5, commissionPayer: "TENANT" });
    expect(terminos).not.toHaveProperty("lateFeeMethod");
    expect(terminos).not.toHaveProperty("guarantees");
  });

  it("no deja seguir con una comisión mayor a 100 y marca dónde", async () => {
    await irAOtrasCondiciones();
    await abrirGrupo("Comisión");
    await userEvent.type(screen.getByLabelText("Porcentaje de comisión"), "150");
    await seguir();

    expect(screen.getByText("Paso 6 de 7")).toBeInTheDocument();
    expect(screen.getByText("La comisión es un porcentaje entre 0 y 100.")).toBeInTheDocument();
  });

  describe("punitorios", () => {
    it.each([
      ["Un porcentaje por día de atraso", "Porcentaje del recargo", "0,5", "PERCENT_PER_DAY", 0.5],
      ["Un porcentaje mensual, proporcional a los días", "Porcentaje del recargo", "5", "PERCENT_PER_MONTH", 5],
      ["Una tasa anual, proporcional a los días", "Porcentaje del recargo", "60", "PERCENT_PER_YEAR", 60],
      ["Un monto fijo por día de atraso", "Monto del recargo", "5000", "FIXED_PER_DAY", 5000],
      ["Una multa única", "Monto del recargo", "20000", "FIXED_ONCE", 20000],
    ])("%s", async (opcion, campo, escrito, metodo, valor) => {
      mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
      await irAOtrasCondiciones();
      await abrirGrupo("Punitorios");
      await userEvent.click(screen.getByRole("radio", { name: new RegExp(opcion) }));
      await userEvent.type(screen.getByLabelText(campo), escrito);
      await seguir();
      await crear();

      await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
      expect(terminosEnviados()).toMatchObject({ lateFeeMethod: metodo, lateFeeValue: valor });
      expect(terminosEnviados()).not.toHaveProperty("lateFeeGraceDays");
    });

    it("explica los días de gracia y los manda cuando se cargan", async () => {
      mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
      await irAOtrasCondiciones();
      await abrirGrupo("Punitorios");
      await userEvent.click(screen.getByRole("radio", { name: /Un porcentaje por día de atraso/ }));
      await userEvent.type(screen.getByLabelText("Porcentaje del recargo"), "0,5");
      expect(screen.getByText(/el vencimiento es el 10 y los días de gracia son 0/)).toBeInTheDocument();
      await userEvent.type(screen.getByLabelText("Días de gracia después del vencimiento"), "3");
      await seguir();
      await crear();

      await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
      expect(terminosEnviados()).toMatchObject({ lateFeeMethod: "PERCENT_PER_DAY", lateFeeValue: 0.5, lateFeeGraceDays: 3 });
    });

    it("elegido un método, no deja seguir sin el valor", async () => {
      await irAOtrasCondiciones();
      await abrirGrupo("Punitorios");
      await userEvent.click(screen.getByRole("radio", { name: /Una multa única/ }));
      await seguir();

      expect(screen.getByText("Paso 6 de 7")).toBeInTheDocument();
      expect(screen.getByText("Indique cuánto se cobra por el atraso.")).toBeInTheDocument();
    });

    it("volver a tocar el método elegido lo quita y no manda punitorios", async () => {
      mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
      await irAOtrasCondiciones();
      await abrirGrupo("Punitorios");
      await userEvent.click(screen.getByRole("radio", { name: /Una multa única/ }));
      await userEvent.click(screen.getByRole("radio", { name: /Una multa única/ }));
      await seguir();
      await crear();

      await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
      expect(terminosEnviados()).not.toHaveProperty("lateFeeMethod");
    });
  });

  describe("garantías", () => {
    it("una sección vacía no manda guarantees", async () => {
      mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
      await irAOtrasCondiciones();
      await abrirGrupo("Garantías");
      await seguir();
      await crear();

      await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
      expect(terminosEnviados()).not.toHaveProperty("guarantees");
    });

    it("manda la garantía cargada con sólo sus campos", async () => {
      mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
      await irAOtrasCondiciones();
      await abrirGrupo("Garantías");
      await userEvent.click(screen.getByRole("button", { name: "Agregar una garantía" }));
      await userEvent.click(screen.getByRole("radio", { name: /Un seguro de caución/ }));
      await userEvent.type(screen.getByLabelText("Aseguradora"), "Aseguradora Sur");
      await seguir();
      await crear();

      await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
      expect(terminosEnviados().guarantees).toEqual([{ type: "SURETY_INSURANCE", insurerName: "Aseguradora Sur" }]);
    });

    it("una garantía incompleta no deja seguir y marca el campo que falta", async () => {
      await irAOtrasCondiciones();
      await abrirGrupo("Garantías");
      await userEvent.click(screen.getByRole("button", { name: "Agregar una garantía" }));
      await userEvent.click(screen.getByRole("radio", { name: /Un seguro de caución/ }));
      await seguir();

      expect(screen.getByText("Paso 6 de 7")).toBeInTheDocument();
      expect(screen.getByText("Ingrese la aseguradora.")).toBeInTheDocument();
    });

    it("un error del backend en una garantía vuelve a este paso, junto a su campo", async () => {
      mockCrearContrato.mockRejectedValueOnce(
        new ApiError(400, "Validation failed", null, { "contract.guarantees[0].insurerName": "must not be blank" })
      );
      await irAOtrasCondiciones();
      await abrirGrupo("Garantías");
      await userEvent.click(screen.getByRole("button", { name: "Agregar una garantía" }));
      await userEvent.click(screen.getByRole("radio", { name: /Un seguro de caución/ }));
      await userEvent.type(screen.getByLabelText("Aseguradora"), "Aseguradora Sur");
      await seguir();
      await crear();

      expect(await screen.findByText("Paso 6 de 7")).toBeInTheDocument();
      const campo = screen.getByLabelText("Aseguradora");
      expect(campo).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Revise este dato.")).toBeInTheDocument();
    });
  });

  it("con punitorios y cuotas ya vencidas, avisa que el recargo corre desde hoy", async () => {
    vi.useRealTimers();
    fijarHoy("2026-10-10T15:00:00Z");
    renderContratoAMano();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Día 10" }));
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-06-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await abrirGrupo("Punitorios");
    await userEvent.click(screen.getByRole("radio", { name: /Una multa única/ }));
    await userEvent.type(screen.getByLabelText("Monto del recargo"), "20000");
    await seguir();
    await userEvent.click(within(screen.getByRole("radiogroup", { name: "¿Hasta qué mes le pagaron?" })).getByRole("radio", { name: "agosto 2026" }));

    expect(screen.getByText("El recargo por atraso empieza a correr desde hoy.")).toBeInTheDocument();
  });
});

describe("asistente de contrato · revisión y errores del alta", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  const crear = () => userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

  /** Llega a la revisión con propiedad e inquilino existentes. */
  async function irALaRevision(props: { onOpenContract?: (id: number) => void } = {}) {
    renderContratoAMano(props);
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "620000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "12");
    await seguir();
    await seguir();
    expect(screen.getByText("Paso 7 de 7")).toBeInTheDocument();
  }

  /** Revisión con propiedad e inquilino nuevos, sólo en borrador. */
  async function irALaRevisionConBorradores(props: Partial<React.ComponentProps<typeof CreationWizard>> = {}) {
    mockPropiedades.mockResolvedValue([]);
    mockInquilinos.mockResolvedValue([]);
    renderContratoAMano(props);
    await userEvent.click(await screen.findByRole("radio", { name: /Una propiedad nueva/ }));
    await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
    await userEvent.click(await screen.findByText(/Lavalle 950/));
    await seguir();
    await userEvent.click(await screen.findByText("Casa"));
    await seguir();
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Usar esta propiedad" }));
    await seguir();
    await userEvent.click(await screen.findByRole("radio", { name: /Un inquilino nuevo/ }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
    await userEvent.type(screen.getByLabelText("Apellido"), "Gómez");
    await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
    await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
    await userEvent.click(screen.getByRole("button", { name: "Usar este inquilino" }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();
  }

  describe("secciones con «Cambiar»", () => {
    it("cada sección de la revisión lleva a su paso", async () => {
      await irALaRevision();
      const pasos: [string, string, RegExp][] = [
        ["Cambiar propiedad", "Paso 1 de 7", /¿Qué propiedad va a alquilar\?/],
        ["Cambiar inquilino", "Paso 2 de 7", /¿A quién se la alquila\?/],
        ["Cambiar alquiler inicial", "Paso 3 de 7", /¿Cuánto sale el alquiler por mes\?/],
        ["Cambiar plazo", "Paso 4 de 7", /¿Cuándo empieza y por cuánto tiempo\?/],
        ["Cambiar actualización", "Paso 5 de 7", /¿Cómo se actualiza el alquiler\?/],
        ["Cambiar otras condiciones", "Paso 6 de 7", /¿Hay otras condiciones\?/],
      ];
      for (const [boton, paso, titulo] of pasos) {
        await userEvent.click(screen.getByRole("button", { name: boton }));
        expect(screen.getByText(paso)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: titulo })).toBeInTheDocument();
        while (!screen.queryByText("Paso 7 de 7")) await seguir();
      }
    });

    it("lista lo nuevo como tal, con «Cambiar» en cada sección", async () => {
      await irALaRevisionConBorradores();

      expect(screen.getByText("Propiedad nueva: Lavalle 950")).toBeInTheDocument();
      expect(screen.getByText("Inquilino nuevo: Ana Gómez")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cambiar propiedad" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cambiar inquilino" })).toBeInTheDocument();
      expect(mockCrearPropiedad).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("una validación con errores en varias secciones", () => {
    it("abre el primer paso con error y deja el otro para cuando se llegue a él", async () => {
      mockCrearContrato.mockRejectedValueOnce(
        new ApiError(400, "Validation failed", null, { "property.street": "must not be blank", "contract.dueDay": "must be between 1 and 28" })
      );
      await irALaRevisionConBorradores();
      await crear();

      // Primero la propiedad, con el aviso junto a su campo (calle)
      expect(await screen.findByText("Paso 1 de 4")).toBeInTheDocument();
      expect(screen.getByLabelText("Calle")).toBeInTheDocument();
      expect(screen.getByText("Revise este dato.")).toBeInTheDocument();
      expect(onComplete).not.toHaveBeenCalled();

      // Al confirmar la propiedad, el asistente retoma en el paso del contrato que sigue con error
      await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
      await userEvent.click(await screen.findByText("Casa"));
      await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
      await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
      await userEvent.click(screen.getByRole("button", { name: "Usar esta propiedad" }));

      expect(await screen.findByText("Paso 3 de 7")).toBeInTheDocument();
      expect(screen.getByText("Revise este dato.")).toBeInTheDocument();
    });

    it("un error de un dato del contrato lleva directo a su paso", async () => {
      mockCrearContrato.mockRejectedValueOnce(
        new ApiError(400, "Validation failed", null, { "contract.termMonths": "must be positive" })
      );
      await irALaRevision();
      await crear();

      expect(await screen.findByText("Paso 4 de 7")).toBeInTheDocument();
      expect(screen.getByText("Revise este dato.")).toBeInTheDocument();
    });

    it("al volver a la revisión cuenta cuántos datos quedan por corregir", async () => {
      mockCrearContrato.mockRejectedValueOnce(
        new ApiError(400, "Validation failed", null, { "contract.dueDay": "x", "contract.startDate": "y" })
      );
      await irALaRevision();
      await crear();
      await screen.findByText("Paso 3 de 7");
      while (!screen.queryByText("Paso 7 de 7")) await seguir();

      expect(screen.getByText(/Hay 2 datos para corregir/)).toBeInTheDocument();
    });
  });

  describe("inquilino que ya está cargado", () => {
    const duplicado = () => new ApiError(409, "Tenant already exists", ERROR.DUPLICATE_TAX_ID, null, { existingTenantId: 20 });

    it("ofrece usar al existente y reenvía con su id", async () => {
      mockCrearContrato.mockRejectedValueOnce(duplicado()).mockResolvedValueOnce({ id: 1 } as never);
      mockInquilinos.mockResolvedValue([DIEGO]);
      mockPropiedades.mockResolvedValue([]);
      await irALaRevisionConInquilinoNuevo();
      await crear();

      expect(await screen.findByText("Ya tiene cargado a Diego Ferrari con ese CUIT.")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Usar a Diego Ferrari" }));

      await waitFor(() => expect(mockCrearContrato).toHaveBeenCalledTimes(2));
      expect(mockCrearContrato.mock.calls[1][0].tenant).toEqual({ id: 20 });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("«Corregir los datos» abre el formulario del inquilino con lo ya escrito", async () => {
      mockCrearContrato.mockRejectedValueOnce(duplicado());
      mockInquilinos.mockResolvedValue([DIEGO]);
      mockPropiedades.mockResolvedValue([]);
      await irALaRevisionConInquilinoNuevo();
      await crear();
      await userEvent.click(await screen.findByRole("button", { name: "Corregir los datos" }));

      expect(screen.getByLabelText("Nombre")).toHaveValue("Ana");
      expect(mockCrearContrato).toHaveBeenCalledTimes(1);
    });

    it("también lo distingue por teléfono", async () => {
      mockCrearContrato.mockRejectedValueOnce(new ApiError(409, "Tenant already exists", ERROR.DUPLICATE_PHONE_NUMBER, null, { existingTenantId: 20 }));
      mockInquilinos.mockResolvedValue([DIEGO]);
      mockPropiedades.mockResolvedValue([]);
      await irALaRevisionConInquilinoNuevo();
      await crear();

      expect(await screen.findByText("Ya tiene cargado a Diego Ferrari con ese teléfono.")).toBeInTheDocument();
    });

    /** Propiedad existente (Mitre) e inquilino nuevo en borrador. */
    async function irALaRevisionConInquilinoNuevo() {
      mockPropiedades.mockResolvedValue([MITRE]);
      renderContratoAMano();
      await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
      await seguir();
      await userEvent.click(await screen.findByRole("radio", { name: /Un inquilino nuevo/ }));
      await userEvent.type(screen.getByLabelText("Nombre"), "Ana");
      await userEvent.type(screen.getByLabelText("Apellido"), "Gómez");
      await userEvent.type(screen.getByLabelText("CUIT o CUIL"), CUIT_VALIDO);
      await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.com");
      await userEvent.type(screen.getByLabelText("Teléfono"), "1144552210");
      await userEvent.click(screen.getByRole("button", { name: "Usar este inquilino" }));
      await seguir();
      await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
      await seguir();
      fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
      await seguir();
      await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
      await seguir();
      await seguir();
    }
  });

  describe("propiedad con contrato vigente", () => {
    const ocupada = () => new ApiError(409, "Property already has an active contract", ERROR.PROPERTY_HAS_ACTIVE_CONTRACT, null, { activeContractId: 55 });

    it("lo explica y enlaza al contrato vigente", async () => {
      mockCrearContrato.mockRejectedValueOnce(ocupada());
      const onOpenContract = vi.fn();
      await irALaRevision({ onOpenContract });
      await crear();

      expect(await screen.findByText(/Esa propiedad ya tiene un contrato vigente/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Ver ese contrato" }));
      // Lo cargado ya es un borrador: se guarda y se sale sin preguntar.
      await waitFor(() => expect(onOpenContract).toHaveBeenCalledWith(55));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("sin el id del contrato no ofrece el enlace, pero sí elegir otra propiedad", async () => {
      mockCrearContrato.mockRejectedValueOnce(new ApiError(409, "x", ERROR.PROPERTY_HAS_ACTIVE_CONTRACT));
      await irALaRevision({ onOpenContract: vi.fn() });
      await crear();

      expect(await screen.findByText(/Esa propiedad ya tiene un contrato vigente/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ver ese contrato" })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Elegir otra propiedad" }));
      expect(screen.getByText("Paso 1 de 7")).toBeInTheDocument();
    });
  });

  describe("salir del asistente", () => {
    it("sin nada cargado sale directo", async () => {
      renderContratoAMano();
      await screen.findByRole("radio", { name: /Mitre 78/ });
      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("con el contrato ya como borrador sale sin preguntar, guarda lo último y avisa que lo conservó", async () => {
      const onDraftKept = vi.fn();
      await irALaRevisionConBorradores({ onDraftKept });
      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(onDraftKept).toHaveBeenCalledTimes(1);
      expect(mockBorradores.remove).not.toHaveBeenCalled();
      expect(mockCrearPropiedad).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockCrearContrato).not.toHaveBeenCalled();
    });

    it("antes de salir del primer paso todavía no es un borrador: pide confirmación y dice que no se guardó nada", async () => {
      mockPropiedades.mockResolvedValue([]);
      renderContratoAMano();
      await userEvent.click(await screen.findByRole("radio", { name: /Una propiedad nueva/ }));
      await userEvent.type(screen.getByLabelText("Buscar la dirección"), "Lavalle");
      await userEvent.click(await screen.findByText(/Lavalle 950/));
      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));

      const dialogo = await screen.findByRole("dialog");
      expect(within(dialogo).getByText(/No se guardó nada/)).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      await userEvent.click(within(dialogo).getByRole("button", { name: "Seguir cargando" }));
      expect(onClose).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));
      await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Salir" }));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockBorradores.create).not.toHaveBeenCalled();
      expect(mockCrearPropiedad).not.toHaveBeenCalled();
    });

    it("si no se pudo guardar lo último avisa antes de salir, y deja elegir", async () => {
      const onDraftKept = vi.fn();
      await irALaRevisionConBorradores({ onDraftKept });
      await userEvent.click(screen.getByRole("button", { name: "Cambiar alquiler inicial" }));
      mockBorradores.update.mockRejectedValue(new TypeError("Failed to fetch"));
      await userEvent.type(screen.getByLabelText("Alquiler mensual"), "0");

      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));

      const dialogo = await screen.findByRole("dialog");
      expect(within(dialogo).getByText("No pudimos guardar los últimos cambios")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(onDraftKept).not.toHaveBeenCalled();

      await userEvent.click(within(dialogo).getByRole("button", { name: "Seguir cargando" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));
      await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Salir igual" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("el asistente suelto de inquilino sigue saliendo directo", async () => {
      render(<CreationWizard kind="tenant" onClose={onClose} onComplete={onComplete} />);
      await userEvent.type(screen.getByLabelText("Nombre"), "Jorge");
      await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

// --- «Completar después»: el contrato se puede seguir cargando con un dato que falta ---

describe("asistente de contrato · pasos para completar después", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));
  const completarDespues = () => screen.queryByRole("button", { name: "Completar después" });

  /** Elige propiedad e inquilino y carga el alquiler y la fecha; deja la actualización sin definir. */
  async function llegarAActualizacion() {
    renderContratoAMano();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
  }

  it("no se ofrece mientras el paso está completo", async () => {
    renderContratoAMano();
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));

    expect(completarDespues()).not.toBeInTheDocument();
  });

  it("se ofrece cuando falta un dato y lleva al paso siguiente sin perder lo cargado", async () => {
    renderContratoAMano();
    await screen.findByRole("radio", { name: /Mitre 78/ });

    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
    await userEvent.click(completarDespues()!);

    expect(screen.getByRole("heading", { name: "¿A quién se la alquila?" })).toBeInTheDocument();
  });

  it("la revisión lista lo pendiente con un acceso a cada paso y no deja crear el contrato", async () => {
    await llegarAActualizacion();
    await userEvent.click(completarDespues()!);
    await seguir();

    expect(screen.getByRole("heading", { name: "Revise que esté todo bien" })).toBeInTheDocument();
    const faltante = screen.getByText("Para crear el contrato falta completar:").closest("aside")!;
    expect(within(faltante).getAllByRole("button")).toHaveLength(1);
    expect(within(faltante).getByRole("button", { name: "Actualización" })).toBeInTheDocument();
    expect(screen.getByText("Falta completar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear contrato" })).toBeDisabled();
    expect(mockCrearContrato).not.toHaveBeenCalled();
  });

  it("completar el paso desde el acceso de la revisión habilita «Crear contrato»", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await llegarAActualizacion();
    await userEvent.click(completarDespues()!);
    await seguir();

    await userEvent.click(screen.getByRole("button", { name: "Actualización" }));
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();

    expect(screen.queryByText("Para crear el contrato falta completar:")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));
    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalledTimes(1));
  });

  it("varios pasos pendientes se listan todos, en orden", async () => {
    renderContratoAMano();
    await screen.findByRole("radio", { name: /Mitre 78/ });
    for (let paso = 1; paso <= 3; paso += 1) await userEvent.click(completarDespues()!);
    // El paso 4 trae la fecha de hoy, así que está completo; el 5 sin porcentaje no.
    await seguir();
    await userEvent.click(completarDespues()!);
    await seguir();

    const faltante = screen.getByText("Para crear el contrato falta completar:").closest("aside")!;
    expect(within(faltante).getAllByRole("button").map((boton) => boton.textContent)).toEqual([
      "Propiedad", "Inquilino", "Alquiler inicial", "Actualización",
    ]);
  });

  it("en «Otras condiciones» con algo incompleto también se puede dejar para después", async () => {
    await llegarAActualizacion();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: /Comisión/ }));
    await userEvent.type(screen.getByLabelText("Porcentaje de comisión"), "150");
    expect(completarDespues()).toBeInTheDocument();

    await userEvent.click(completarDespues()!);

    const faltante = screen.getByText("Para crear el contrato falta completar:").closest("aside")!;
    expect(within(faltante).getByRole("button", { name: "Otras condiciones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear contrato" })).toBeDisabled();
  });
});

// --- El contrato como borrador: nace al salir del primer paso y se guarda solo ---

describe("asistente de contrato · borrador que se guarda solo", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  const seguir = () => userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

  async function elegirMitreYDiego(props: Partial<React.ComponentProps<typeof CreationWizard>> = {}) {
    renderContratoAMano(props);
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
  }

  it("no crea nada mientras sigue en el primer paso, aunque haya elegido la propiedad", async () => {
    await elegirMitreYDiego();
    await new Promise((resolver) => setTimeout(resolver, 50));

    expect(mockBorradores.create).not.toHaveBeenCalled();
    expect(screen.queryByText("Guardando…")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Descartar borrador" })).not.toBeInTheDocument();
  });

  it("al pasar al segundo paso crea el borrador con la etiqueta de la propiedad y el paso en que va", async () => {
    await elegirMitreYDiego();
    await seguir();

    await waitFor(() => expect(mockBorradores.create).toHaveBeenCalledTimes(1));
    const [cuerpo] = mockBorradores.create.mock.calls[0];
    expect(cuerpo.label).toBe("Mitre 78");
    expect(cuerpo.payload).toMatchObject({ schemaVersion: 1, paso: 2, propiedad: { id: 10, nuevo: false, borrador: null } });
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar borrador" })).toBeInTheDocument();
  });

  it("«Completar después» en el primer paso también lo crea, sin propiedad ni inquilino", async () => {
    renderContratoAMano();
    await screen.findByRole("radio", { name: /Mitre 78/ });

    await userEvent.click(screen.getByRole("button", { name: "Completar después" }));

    await waitFor(() => expect(mockBorradores.create).toHaveBeenCalledTimes(1));
    expect(mockBorradores.create.mock.calls[0][0].label).toBe("Contrato sin propiedad ni inquilino");
  });

  it("guarda en cada cambio de paso y la etiqueta sigue a la propiedad y al inquilino", async () => {
    await elegirMitreYDiego();
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();

    await waitFor(() => expect(mockBorradores.update).toHaveBeenCalled());
    const [id, cuerpo] = mockBorradores.update.mock.calls.at(-1)!;
    expect(id).toBe(5);
    expect(cuerpo.label).toBe("Mitre 78 · Diego Ferrari");
    expect(cuerpo.payload).toMatchObject({ paso: 3, inquilino: { id: 20 } });
    expect(cuerpo.version).toBeGreaterThanOrEqual(0);
  });

  it("guardar el borrador no crea la propiedad, el inquilino ni el contrato", async () => {
    await elegirMitreYDiego();
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    await waitFor(() => expect(mockBorradores.update).toHaveBeenCalled());

    expect(mockCrearContrato).not.toHaveBeenCalled();
    expect(mockCrearPropiedad).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("un guardado exitoso no se anuncia a los lectores de pantalla", async () => {
    await elegirMitreYDiego();
    await seguir();

    await screen.findByText("Guardado");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("si falla, lo dice como alerta, deja lo escrito en pantalla y se recupera solo", async () => {
    await elegirMitreYDiego();
    mockBorradores.create.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await seguir();

    expect(await screen.findByText("No se pudo guardar. Reintentando…")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar");
    expect(screen.getByRole("heading", { name: "¿A quién se la alquila?" })).toBeInTheDocument();
  });

  it("con el máximo de borradores lo dice, sigue cargando y crea el contrato sin borrador", async () => {
    mockBorradores.create.mockRejectedValue(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_LIMIT_REACHED, null, { limit: 3 }));
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await elegirMitreYDiego();
    await seguir();

    expect(await screen.findByText(/No se guarda como borrador: ya tiene 3/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalledTimes(1));
    expect(mockCrearContrato.mock.calls[0][0]).not.toHaveProperty("draftId");
    expect(mockBorradores.create).toHaveBeenCalledTimes(1);
  });

  it("el prototipo (demo) no guarda ningún borrador", async () => {
    render(<CreationWizard kind="contract" demo onClose={onClose} onComplete={onComplete} />);
    await userEvent.click(await screen.findByRole("radio", { name: /Mitre 78/ }));
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();

    expect(mockBorradores.create).not.toHaveBeenCalled();
    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
  });

  it("los asistentes sueltos de propiedad e inquilino no guardan borradores", async () => {
    renderWizard();
    await userEvent.type(screen.getByLabelText("Nombre"), "Jorge");
    await new Promise((resolver) => setTimeout(resolver, 50));

    expect(mockBorradores.create).not.toHaveBeenCalled();
  });

  // --- descartar desde el asistente ---

  it("«Descartar borrador» pide confirmar, nombra el borrador y no borra si se vuelve", async () => {
    await elegirMitreYDiego();
    await seguir();
    await screen.findByText("Guardado");

    await userEvent.click(screen.getByRole("button", { name: "Descartar borrador" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("¿Descartar este borrador?")).toBeInTheDocument();
    expect(within(dialogo).getByText("Mitre 78")).toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockBorradores.remove).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("al confirmar borra el borrador, avisa y cierra el asistente", async () => {
    const onDraftDiscarded = vi.fn();
    mockBorradores.remove.mockResolvedValue(undefined);
    await elegirMitreYDiego({ onDraftDiscarded });
    await seguir();
    await screen.findByText("Guardado");

    await userEvent.click(screen.getByRole("button", { name: "Descartar borrador" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockBorradores.remove).toHaveBeenCalledWith(5);
    expect(onDraftDiscarded).toHaveBeenCalledTimes(1);
  });

  it("si no se pudo borrar, lo dice dentro del diálogo y el asistente sigue abierto", async () => {
    mockBorradores.remove.mockRejectedValue(new TypeError("Failed to fetch"));
    await elegirMitreYDiego();
    await seguir();
    await screen.findByText("Guardado");

    await userEvent.click(screen.getByRole("button", { name: "Descartar borrador" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Descartar" }));

    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent(/No pudimos descartar el borrador/);
    expect(onClose).not.toHaveBeenCalled();
  });

  // --- crear el contrato desde el borrador ---

  async function irALaRevisionDelBorrador(props: Partial<React.ComponentProps<typeof CreationWizard>> = {}) {
    await elegirMitreYDiego(props);
    await seguir();
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();
    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "450000");
    await seguir();
    fireEvent.change(screen.getByLabelText("Fecha de inicio"), { target: { value: "2026-09-01" } });
    await seguir();
    await userEvent.type(screen.getByLabelText("Porcentaje de aumento"), "8");
    await seguir();
    await seguir();
  }

  it("crear el contrato manda el id del borrador y no vuelve a guardarlo ni a borrarlo", async () => {
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await irALaRevisionDelBorrador();
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(mockCrearContrato.mock.calls[0][0]).toMatchObject({ draftId: 5 });
    expect(mockBorradores.remove).not.toHaveBeenCalled(); // lo borra el backend al crear el contrato
  });

  it("si el alta falla, el borrador sigue ahí y el asistente vuelve a guardar", async () => {
    mockCrearContrato.mockRejectedValueOnce(new ApiError(400, "x", null, { "contract.dueDay": "invalid" }));
    await irALaRevisionDelBorrador();
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(screen.getByText("Paso 3 de 7")).toBeInTheDocument());
    expect(mockBorradores.remove).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Alquiler mensual"), "0");
    await seguir();
    await waitFor(() => expect(mockBorradores.update.mock.calls.at(-1)![1].payload).toMatchObject({ alquiler: "4500000" }));
  });

  it("si el borrador ya no existe, crea el contrato igual y avisa que el PDF no llegó", async () => {
    mockCrearContrato
      .mockRejectedValueOnce(new ApiError(404, "x", ERROR.CONTRACT_DRAFT_NOT_FOUND))
      .mockResolvedValueOnce({ id: 9 } as never);
    mockBorradores.attachDocument.mockResolvedValueOnce({ ...borradorGuardado({ label: "x", payload: {} }), version: 1, document: { fileName: "contrato.pdf", sizeBytes: 100, pages: 2, uploadedAt: "2026-08-15T15:00:00Z" } });
    await irALaRevisionDelBorrador();
    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), new File(["%PDF-1.7"], "contrato.pdf", { type: "application/pdf" }));
    await screen.findByText("contrato.pdf");

    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ pdfPerdido: true }));
    expect(mockCrearContrato).toHaveBeenCalledTimes(2);
    expect(mockCrearContrato.mock.calls[0][0]).toHaveProperty("draftId", 5);
    expect(mockCrearContrato.mock.calls[1][0]).not.toHaveProperty("draftId");
  });

  // --- el PDF ---

  const archivo = () => new File(["%PDF-1.7"], "contrato firmado.pdf", { type: "application/pdf" });
  const resumenConPdf = (version: number) => ({
    ...borradorGuardado({ label: "Mitre 78 · Diego Ferrari", payload: {} }, 5, version),
    document: { fileName: "contrato firmado.pdf", sizeBytes: 8, pages: 3, uploadedAt: "2026-08-15T15:00:00Z" },
  });

  it("adjuntar el PDF lo sube enseguida al borrador y muestra su nombre", async () => {
    mockBorradores.attachDocument.mockResolvedValueOnce(resumenConPdf(7));
    await irALaRevisionDelBorrador();

    await userEvent.click(screen.getByRole("button", { name: "Adjuntar el PDF" }));
    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), archivo());

    expect(await screen.findByText("contrato firmado.pdf")).toBeInTheDocument();
    expect(mockBorradores.attachDocument).toHaveBeenCalledWith(5, expect.any(File));
    expect(screen.getByText(/no lo leemos automáticamente/)).toBeInTheDocument();
  });

  it("el guardado que sigue usa la versión que subió el PDF", async () => {
    mockBorradores.attachDocument.mockResolvedValueOnce(resumenConPdf(7));
    await irALaRevisionDelBorrador();
    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), archivo());
    await screen.findByText("contrato firmado.pdf");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar alquiler inicial" }));

    await waitFor(() => expect(mockBorradores.update.mock.calls.at(-1)![1].version).toBe(7));
  });

  it("un PDF con contraseña se rechaza con el mensaje de siempre y el borrador no se toca", async () => {
    mockBorradores.attachDocument.mockRejectedValueOnce(new ApiError(400, "x", ERROR.IMPORT_FILE_ENCRYPTED));
    await irALaRevisionDelBorrador();

    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), archivo());

    expect(await screen.findByText(/El PDF tiene contraseña/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adjuntar el PDF" })).toBeInTheDocument();
    expect(mockBorradores.remove).not.toHaveBeenCalled();
  });

  it("un archivo que no es PDF ni siquiera sale del navegador", async () => {
    await irALaRevisionDelBorrador();

    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), new File(["x"], "foto.png", { type: "image/png" }), { applyAccept: false });

    expect(await screen.findByText(/no es un PDF/)).toBeInTheDocument();
    expect(mockBorradores.attachDocument).not.toHaveBeenCalled();
  });

  it("quitar el PDF lo borra del borrador y vuelve a leer la versión", async () => {
    mockBorradores.attachDocument.mockResolvedValueOnce(resumenConPdf(7));
    mockBorradores.removeDocument.mockResolvedValueOnce(undefined);
    mockBorradores.get.mockResolvedValueOnce({ ...borradorGuardado({ label: "x", payload: {} }, 5, 8), document: null });
    await irALaRevisionDelBorrador();
    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), archivo());
    await screen.findByText("contrato firmado.pdf");

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(await screen.findByRole("button", { name: "Adjuntar el PDF" })).toBeInTheDocument();
    expect(mockBorradores.removeDocument).toHaveBeenCalledWith(5);
    await userEvent.click(screen.getByRole("button", { name: "Cambiar alquiler inicial" }));
    await waitFor(() => expect(mockBorradores.update.mock.calls.at(-1)![1].version).toBe(8));
  });

  it("sin borrador (tope alcanzado) el PDF espera en pantalla y se adjunta al contrato ya creado", async () => {
    mockBorradores.create.mockRejectedValue(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_LIMIT_REACHED, null, { limit: 3 }));
    mockCrearContrato.mockResolvedValueOnce({ id: 33 } as never);
    vi.mocked(AlquiaBackendClient.contracts.attachDocument).mockResolvedValueOnce({ id: 33 } as never);
    await irALaRevisionDelBorrador();
    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), archivo());
    expect(await screen.findByText("contrato firmado.pdf")).toBeInTheDocument();
    expect(mockBorradores.attachDocument).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(undefined));
    expect(AlquiaBackendClient.contracts.attachDocument).toHaveBeenCalledWith(33, expect.any(File));
  });

  it("si el PDF no se pudo adjuntar al contrato creado, el contrato queda y se avisa", async () => {
    mockBorradores.create.mockRejectedValue(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_LIMIT_REACHED, null, { limit: 3 }));
    mockCrearContrato.mockResolvedValueOnce({ id: 33 } as never);
    vi.mocked(AlquiaBackendClient.contracts.attachDocument).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await irALaRevisionDelBorrador();
    await userEvent.upload(screen.getByLabelText("Archivo del contrato firmado"), archivo());
    await screen.findByText("contrato firmado.pdf");

    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ pdfSinAdjuntar: true }));
  });

  // --- conflicto entre dispositivos ---

  it("si otro dispositivo guardó antes, deja elegir y «guardar esta versión» pisa la otra", async () => {
    await elegirMitreYDiego();
    await seguir();
    await screen.findByText("Guardado");
    mockBorradores.update.mockRejectedValueOnce(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_VERSION_CONFLICT, null, { currentVersion: 4 }));
    await userEvent.click(screen.getByRole("radio", { name: /Diego Ferrari/ }));
    await seguir();

    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("Este borrador cambió en otro dispositivo")).toBeInTheDocument();
    expect(within(dialogo).queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();

    await userEvent.click(within(dialogo).getByRole("button", { name: "Guardar esta versión" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockBorradores.update.mock.calls.at(-1)![1].version).toBe(4);
  });
});

// --- Retomar un borrador ---

describe("asistente de contrato · retomar un borrador", () => {
  beforeEach(() => fijarHoy("2026-08-15T15:00:00Z"));
  afterEach(() => vi.useRealTimers());

  function estado(cambios: Partial<EstadoDelBorrador> = {}): EstadoDelBorrador {
    return {
      paso: 5,
      propiedad: { id: 10, nuevo: false, borrador: null },
      inquilino: { id: 20, nuevo: false, borrador: null },
      alquiler: "450000", diaVencimiento: 10, plazo: 24, inicio: "2026-09-01",
      metodo: "FIXED_PERCENTAGE", porcentaje: "8", frecuencia: 4,
      otras: SIN_OTRAS_CONDICIONES, pagadoHasta: "",
      ...cambios,
    };
  }

  function retomar(cambios: Partial<EstadoDelBorrador> = {}, extra: Partial<React.ComponentProps<typeof CreationWizard>> = {}) {
    mockBorradores.get.mockResolvedValue(borradorGuardado({ label: "Mitre 78 · Diego Ferrari", payload: serializar(estado(cambios)) }, 7, 3));
    render(<CreationWizard kind="contract" draftId={7} onClose={onClose} onComplete={onComplete} {...extra} />);
  }

  it("trae el borrador, salta la elección PDF o a mano y abre en el paso donde quedó", async () => {
    retomar();

    expect(await screen.findByRole("heading", { name: "¿Cómo se actualiza el alquiler?" })).toBeInTheDocument();
    expect(screen.getByText("Paso 5 de 7")).toBeInTheDocument();
    expect(screen.getByLabelText("Porcentaje de aumento")).toHaveValue("8");
    expect(mockBorradores.get).toHaveBeenCalledWith(7);
    expect(screen.queryByRole("radio", { name: /Cargarlo a mano/ })).not.toBeInTheDocument();
  });

  it("vuelve a tener lo cargado en cada paso", async () => {
    retomar();
    await screen.findByRole("heading", { name: "¿Cómo se actualiza el alquiler?" });

    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    expect(screen.getByLabelText("Alquiler mensual")).toHaveValue("450.000");
    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    expect(screen.getByRole("radio", { name: /Diego Ferrari/ })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: /Atrás/ }));
    expect(screen.getByRole("radio", { name: /Mitre 78/ })).toBeChecked();
  });

  it("no guarda nada al abrirlo, y sí lo que cambie después, con la versión con que se abrió", async () => {
    retomar();
    await screen.findByRole("heading", { name: "¿Cómo se actualiza el alquiler?" });
    await new Promise((resolver) => setTimeout(resolver, 100));
    expect(mockBorradores.update).not.toHaveBeenCalled();
    expect(mockBorradores.create).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

    await waitFor(() => expect(mockBorradores.update).toHaveBeenCalled());
    expect(mockBorradores.update.mock.calls[0][0]).toBe(7);
    expect(mockBorradores.update.mock.calls[0][1].version).toBe(3);
  });

  it("una propiedad y un inquilino nuevos del borrador vuelven como borradores, con sus datos para cambiar", async () => {
    retomar({
      paso: 7,
      propiedad: { id: null, nuevo: true, borrador: { pedido: { street: "Lavalle", number: "950", city: "CABA", province: "Buenos Aires", category: "HOUSE" }, etiqueta: "Lavalle 950" } },
      inquilino: { id: null, nuevo: true, borrador: { pedido: { firstName: "Ana", lastName: "Gómez", taxId: CUIT_VALIDO, email: "ana@ejemplo.com", phoneNumber: "1144552210" }, etiqueta: "Ana Gómez" } },
    });

    expect(await screen.findByText("Propiedad nueva: Lavalle 950")).toBeInTheDocument();
    expect(screen.getByText("Inquilino nuevo: Ana Gómez")).toBeInTheDocument();
    mockCrearContrato.mockResolvedValueOnce({ id: 1 } as never);
    await userEvent.click(screen.getByRole("button", { name: "Crear contrato" }));
    await waitFor(() => expect(mockCrearContrato).toHaveBeenCalled());
    expect(mockCrearContrato.mock.calls[0][0]).toMatchObject({
      property: { new: expect.objectContaining({ street: "Lavalle", category: "HOUSE" }) },
      tenant: { new: expect.objectContaining({ firstName: "Ana", taxId: CUIT_VALIDO }) },
      draftId: 7,
    });
  });

  it("un inquilino que ya no está disponible deja ese paso pendiente y lo explica", async () => {
    mockInquilinos.mockResolvedValue([]);
    retomar({ paso: 7 });

    expect(await screen.findByText("Falta completar")).toBeInTheDocument();
    const faltante = screen.getByText("Para crear el contrato falta completar:").closest("aside")!;
    expect(within(faltante).getByRole("button", { name: "Inquilino" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear contrato" })).toBeDisabled();

    await userEvent.click(within(faltante).getByRole("button", { name: "Inquilino" }));
    expect(await screen.findByText(/El inquilino que había elegido ya no está disponible/)).toBeInTheDocument();
  });

  it("una propiedad que ahora tiene un contrato vigente deja de estar elegida", async () => {
    mockContratos.mockResolvedValue([{ id: 99, status: "ACTIVE", property: { id: 10 } } as never]);
    retomar({ paso: 1 });

    expect(await screen.findByText(/La propiedad que había elegido ya no está disponible/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Seguir/ })).toBeDisabled();
  });

  it("si ya pasó el mes de la respuesta guardada, vuelve a preguntar", async () => {
    fijarHoy("2026-10-10T15:00:00Z");
    retomar({ paso: 7, inicio: "2026-08-01", pagadoHasta: "2026-01" });

    expect(await screen.findByRole("radiogroup", { name: "¿Hasta qué mes le pagaron?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear contrato" })).toBeDisabled();
  });

  it("si el borrador no se puede abrir lo dice y deja reintentar", async () => {
    mockBorradores.get.mockRejectedValueOnce(new ApiError(404, "x", ERROR.CONTRACT_DRAFT_NOT_FOUND));
    render(<CreationWizard kind="contract" draftId={7} onClose={onClose} onComplete={onComplete} />);

    expect(await screen.findByText(/Ese borrador ya no existe/)).toBeInTheDocument();
    mockBorradores.get.mockResolvedValue(borradorGuardado({ label: "x", payload: serializar(estado()) }, 7, 3));
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "¿Cómo se actualiza el alquiler?" })).toBeInTheDocument();
  });

  it("un borrador que no se puede leer ofrece descartarlo y no rompe", async () => {
    const onDraftDiscarded = vi.fn();
    mockBorradores.get.mockResolvedValue(borradorGuardado({ label: "Mitre 78", payload: { schemaVersion: 99 } }, 7, 3));
    mockBorradores.remove.mockResolvedValue(undefined);
    render(<CreationWizard kind="contract" draftId={7} onClose={onClose} onComplete={onComplete} onDraftDiscarded={onDraftDiscarded} />);

    expect(await screen.findByRole("heading", { name: "No pudimos leer este borrador" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Descartar el borrador" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockBorradores.remove).toHaveBeenCalledWith(7);
    expect(onDraftDiscarded).toHaveBeenCalledTimes(1);
  });

  it("el PDF que ya tenía el borrador figura adjunto", async () => {
    mockBorradores.get.mockResolvedValue({
      ...borradorGuardado({ label: "x", payload: serializar(estado({ paso: 7 })) }, 7, 3),
      document: { fileName: "contrato firmado.pdf", sizeBytes: 2048, pages: 5, uploadedAt: "2026-08-15T15:00:00Z" },
    });
    render(<CreationWizard kind="contract" draftId={7} onClose={onClose} onComplete={onComplete} />);

    expect(await screen.findByText("contrato firmado.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar" })).toBeInTheDocument();
  });

  it("«cargar la otra versión» vuelve a armar el asistente con lo que guardó el otro dispositivo", async () => {
    retomar({ paso: 5 });
    await screen.findByRole("heading", { name: "¿Cómo se actualiza el alquiler?" });
    mockBorradores.update.mockRejectedValueOnce(new ApiError(409, "x", ERROR.CONTRACT_DRAFT_VERSION_CONFLICT, null, { currentVersion: 4 }));
    mockBorradores.get.mockResolvedValue(borradorGuardado({ label: "Mitre 78 · Diego Ferrari", payload: serializar(estado({ paso: 3, alquiler: "999000" })) }, 7, 4));
    await userEvent.click(screen.getByRole("button", { name: /Seguir/ }));

    await userEvent.click(await screen.findByRole("button", { name: "Cargar la otra versión" }));

    expect(await screen.findByLabelText("Alquiler mensual")).toHaveValue("999.000");
    expect(screen.getByText("Paso 3 de 7")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("salir de un borrador retomado lo conserva sin preguntar", async () => {
    const onDraftKept = vi.fn();
    retomar({}, { onDraftKept });
    await screen.findByRole("heading", { name: "¿Cómo se actualiza el alquiler?" });

    await userEvent.click(screen.getByRole("button", { name: "Salir del asistente" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onDraftKept).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockBorradores.remove).not.toHaveBeenCalled();
  });
});
