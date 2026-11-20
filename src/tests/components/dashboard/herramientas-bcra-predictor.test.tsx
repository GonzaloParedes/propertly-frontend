import { render, screen, fireEvent, waitFor } from "@/tests/render";
import ConsultaBcra, { inquilinosConCuit } from "@/components/dashboard/ConsultaBcra";
import PredictorDeAlquiler, { faltanteDeLaCarga } from "@/components/dashboard/PredictorDeAlquiler";
import Herramientas from "@/components/dashboard/Herramientas";
import type { PropertyResponse, RentEstimate, TenantResponse } from "@/lib/backend-types";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    properties: { list: vi.fn(), getRentEstimate: vi.fn() },
    addressLookup: { autocomplete: vi.fn(), resolve: vi.fn() },
    tools: { creditCheck: vi.fn(), rentEstimate: vi.fn(), rentIncrease: vi.fn() },
  },
}));

// El mapa de comparables usa Leaflet, que jsdom no soporta: acá no importa.
vi.mock("@/components/dashboard/RentComparablesPanel", () => ({ default: () => null }));

import { AlquiaBackendClient } from "@/lib/backend-client";
const client = vi.mocked(AlquiaBackendClient, true);

const CUIT_VALIDO = "20123456786";

const TENANTS: TenantResponse[] = [
  { id: 1, firstName: "Ana", lastName: "Ferreyra", taxId: "20-12345678-6" },
  { id: 2, firstName: "Sin", lastName: "Cuit", taxId: null },
  { id: 3, firstName: "Solo", lastName: "Dni", taxId: "12345678" },
];

const ESTIMATE: RentEstimate = {
  estimatedMonthlyRent: 650000,
  currency: "ARS",
  range: { low: 580000, high: 720000 },
  listingsConsidered: 42,
  listings: [],
  subjectLocation: { latitude: -34.6, longitude: -58.42 },
  confidence: "HIGH",
  estimatedAt: "2026-11-19T15:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  client.tenants.list.mockResolvedValue(TENANTS);
  client.properties.list.mockResolvedValue([]);
});

describe("Herramientas", () => {
  it("lista las tres herramientas y abre cada una", () => {
    render(<Herramientas />);
    expect(screen.getByRole("button", { name: /Calculadora de aumentos/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Consulta de deudores/ }));
    expect(screen.getByRole("heading", { name: "Consulta de deudores" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Herramientas" }));
    fireEvent.click(screen.getByRole("button", { name: /Predictor de alquiler/ }));
    expect(screen.getByRole("heading", { name: "Predictor de alquiler" })).toBeInTheDocument();
  });
});

describe("ConsultaBcra", () => {
  it("ofrece sólo los inquilinos con un CUIT completo", () => {
    expect(inquilinosConCuit(TENANTS)).toEqual([{ id: 1, nombre: "Ana Ferreyra", cuit: CUIT_VALIDO }]);
  });

  it("no consulta con un CUIT inválido", () => {
    render(<ConsultaBcra />);
    fireEvent.change(screen.getByRole("textbox", { name: "CUIT o CUIL" }), { target: { value: "20123456787" } });
    fireEvent.click(screen.getByRole("button", { name: /Consultar/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingrese un CUIT o CUIL válido");
    expect(client.tools.creditCheck).not.toHaveBeenCalled();
  });

  it("consulta el inquilino elegido y muestra el nombre informado", async () => {
    client.tools.creditCheck.mockResolvedValue({
      noDebtsReported: false,
      denominacion: "FERREYRA ANA",
      worstSituation: 3,
      entityCount: 2,
      totalAmountPesos: 850000,
      hasLegalSituation: false,
      hasJudicialProcess: false,
      latestPeriod: "2026-09",
    });
    render(<ConsultaBcra />);
    fireEvent.click(await screen.findByRole("button", { name: "Ana Ferreyra" }));
    expect(screen.getByRole("textbox", { name: "CUIT o CUIL" })).toHaveValue("20-12345678-6");
    fireEvent.click(screen.getByRole("button", { name: /Consultar/ }));

    expect(await screen.findByText("FERREYRA ANA")).toBeInTheDocument();
    expect(client.tools.creditCheck).toHaveBeenCalledWith(CUIT_VALIDO);
    expect(screen.getByText("Con problemas")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Volver a consultar" }));
    expect(screen.getByRole("textbox", { name: "CUIT o CUIL" })).toBeInTheDocument();
  });

  it("muestra sin deudas", async () => {
    client.tools.creditCheck.mockResolvedValue({
      noDebtsReported: true, denominacion: null, worstSituation: null, entityCount: null,
      totalAmountPesos: null, hasLegalSituation: false, hasJudicialProcess: false, latestPeriod: null,
    });
    render(<ConsultaBcra />);
    fireEvent.change(screen.getByRole("textbox", { name: "CUIT o CUIL" }), { target: { value: CUIT_VALIDO } });
    fireEvent.click(screen.getByRole("button", { name: /Consultar/ }));
    expect(await screen.findByText("Sin deudas informadas")).toBeInTheDocument();
  });

  it("explica cuando el BCRA no responde", async () => {
    client.tools.creditCheck.mockRejectedValue(new ApiError(503, "x", ERROR.BCRA_UNAVAILABLE));
    render(<ConsultaBcra />);
    fireEvent.change(screen.getByRole("textbox", { name: "CUIT o CUIL" }), { target: { value: CUIT_VALIDO } });
    fireEvent.click(screen.getByRole("button", { name: /Consultar/ }));
    expect(await screen.findByRole("link", { name: "el sitio del BCRA" })).toBeInTheDocument();
  });

  it("en el prototipo no pide la lista de inquilinos", () => {
    render(<ConsultaBcra demo />);
    expect(client.tenants.list).not.toHaveBeenCalled();
  });
});

describe("PredictorDeAlquiler", () => {
  const direccion = {
    street: "Lavalle", number: "950", city: "CABA", province: "Ciudad Autónoma de Buenos Aires",
    postalCode: "", latitude: -34.6, longitude: -58.4,
  };

  it("dice qué falta en la carga rápida", () => {
    const base = { direccion: null, dormitorios: 1, banos: 1, metros: "" };
    expect(faltanteDeLaCarga(base)).toMatch(/dirección/);
    expect(faltanteDeLaCarga({ ...base, direccion: { ...direccion, latitude: null, longitude: null } })).toMatch(/de la lista/);
    expect(faltanteDeLaCarga({ ...base, direccion })).toMatch(/metros/);
    expect(faltanteDeLaCarga({ ...base, direccion, metros: "55" })).toBeNull();
  });

  it("sin propiedades cargadas arranca por la carga rápida y estima con lo cargado", async () => {
    client.addressLookup.autocomplete.mockResolvedValue([{ reference: "r1", label: "Lavalle 950, CABA" }]);
    client.addressLookup.resolve.mockResolvedValue({ ...direccion, postalCode: null });
    client.tools.rentEstimate.mockResolvedValue(ESTIMATE);
    render(<PredictorDeAlquiler />);

    const sugerir = await screen.findByRole("button", { name: /Sugerir alquiler/ });
    expect(sugerir).toBeDisabled();

    fireEvent.change(screen.getByRole("combobox", { name: "Buscar la dirección" }), { target: { value: "Lavalle 950" } });
    fireEvent.click(await screen.findByRole("button", { name: "Lavalle 950, CABA" }));
    await screen.findByText("Lavalle 950");
    fireEvent.change(screen.getByRole("textbox", { name: "Metros cubiertos" }), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: /Sumar dormitorios/ }));

    fireEvent.click(screen.getByRole("button", { name: /Sugerir alquiler/ }));
    await waitFor(() => expect(client.tools.rentEstimate).toHaveBeenCalledWith({
      city: "CABA",
      province: "Ciudad Autónoma de Buenos Aires",
      latitude: -34.6,
      longitude: -58.4,
      bedrooms: 2,
      bathrooms: 1,
      coveredArea: 55,
      currency: "ARS",
    }));
  });

  it("con propiedades cargadas deja elegir una y usa su estimación", async () => {
    client.properties.list.mockResolvedValue([
      { id: 7, street: "Mitre", number: "78", city: "San Isidro" } as PropertyResponse,
    ]);
    client.properties.getRentEstimate.mockResolvedValue(ESTIMATE);
    render(<PredictorDeAlquiler />);

    fireEvent.click(await screen.findByRole("button", { name: "Mitre 78" }));
    fireEvent.click(screen.getByRole("button", { name: /Sugerir alquiler/ }));
    await waitFor(() => expect(client.properties.getRentEstimate).toHaveBeenCalledWith(7, "ARS"));

    fireEvent.click(screen.getByRole("button", { name: "Otra propiedad" }));
    expect(screen.getByRole("combobox", { name: "Buscar la dirección" })).toBeInTheDocument();
  });
});
