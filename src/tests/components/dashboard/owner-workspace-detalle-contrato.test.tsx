import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import type { ContractResponse, RentIncrementResponse } from "@/lib/backend-types";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    properties: { list: vi.fn(), archive: vi.fn() },
    invoices: { list: vi.fn() },
    contracts: {
      list: vi.fn(),
      get: vi.fn(),
      rentIncrements: vi.fn(),
      getTenantAccess: vi.fn(),
      resendTenantAccess: vi.fn(),
      getDocument: vi.fn(),
      attachDocument: vi.fn(),
      removeDocument: vi.fn(),
      terminate: vi.fn(),
    },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockList = vi.mocked(AlquiaBackendClient.contracts.list);
const mockGet = vi.mocked(AlquiaBackendClient.contracts.get);
const mockIncrements = vi.mocked(AlquiaBackendClient.contracts.rentIncrements);
const mockAccess = vi.mocked(AlquiaBackendClient.contracts.getTenantAccess);
const mockResend = vi.mocked(AlquiaBackendClient.contracts.resendTenantAccess);
const mockRemoveDoc = vi.mocked(AlquiaBackendClient.contracts.removeDocument);
const mockTerminate = vi.mocked(AlquiaBackendClient.contracts.terminate);

function contrato(over: Partial<ContractResponse> = {}): ContractResponse {
  return {
    id: 100,
    property: {
      id: 10,
      street: "Av. Rivadavia",
      number: "2340",
      floorUnit: "5.º A",
      city: "CABA",
      province: "CABA",
      category: "APARTMENT",
    },
    tenant: {
      id: 1,
      firstName: "Jorge",
      lastName: "Paletta",
      taxId: "20224567899",
      email: "jorge@ejemplo.com",
      phoneNumber: "+5491144552210",
    },
    initialRentAmount: 400000,
    startDate: "2025-03-01",
    termMonths: 36,
    dueDay: 10,
    endDate: "2028-02-29",
    status: "ACTIVE",
    incrementMethod: "FIXED_PERCENTAGE",
    incrementFrequencyMonths: 3,
    incrementValue: 8,
    currentRent: 478691,
    ...over,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

/**
 * Abre el detalle desde la lista, que es como llega el propietario. La lista
 * arranca filtrando por vigentes, así que para un contrato que ya no rige hay
 * que pasar antes por el filtro de finalizados.
 */
async function abrir(c = contrato(), incrementos: RentIncrementResponse[] = []) {
  mockList.mockResolvedValue([c]);
  mockGet.mockResolvedValue(c);
  mockIncrements.mockResolvedValue(incrementos);
  render(<OwnerWorkspace initialView="contratos" />);
  if (c.status !== "ACTIVE") {
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    await userEvent.click(screen.getByRole("button", { name: /Finalizados/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  }
  await userEvent.click(await screen.findByRole("button", { name: /Av\. Rivadavia/ }));
  await screen.findByText(/Contrato con Jorge Paletta/);
}

// --- Carga ---

describe("carga", () => {
  it("avisa que está cargando", async () => {
    mockList.mockResolvedValue([contrato()]);
    mockGet.mockReturnValue(new Promise(() => {}));
    mockIncrements.mockReturnValue(new Promise(() => {}));
    render(<OwnerWorkspace initialView="contratos" />);
    await userEvent.click(await screen.findByRole("button", { name: /Av\. Rivadavia/ }));

    expect(screen.getByText("Cargando el contrato…")).toBeInTheDocument();
  });

  it("avisa si el contrato no se pudo cargar", async () => {
    mockList.mockResolvedValue([contrato()]);
    mockGet.mockRejectedValue(new ApiError(500, "Boom"));
    mockIncrements.mockResolvedValue([]);
    render(<OwnerWorkspace initialView="contratos" />);
    await userEvent.click(await screen.findByRole("button", { name: /Av\. Rivadavia/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar este contrato");
  });

  it("si falla el historial, el resto del detalle se muestra igual", async () => {
    mockList.mockResolvedValue([contrato()]);
    mockGet.mockResolvedValue(contrato());
    mockIncrements.mockRejectedValue(new ApiError(500, "Boom"));
    render(<OwnerWorkspace initialView="contratos" />);
    await userEvent.click(await screen.findByRole("button", { name: /Av\. Rivadavia/ }));

    expect(await screen.findByText("$ 478.691")).toBeInTheDocument();
    expect(screen.queryByText("Historial de aumentos")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// --- Datos ---

describe("datos del contrato", () => {
  // En fechas y no en meses: `termMonths` queda corto tras una renegociación.
  it("dice la vigencia en fechas", async () => {
    await abrir();
    expect(screen.getByText(/del 01\/03\/2025 al 29\/02\/2028/)).toBeInTheDocument();
  });

  it("muestra el alquiler vigente y su día de vencimiento", async () => {
    await abrir();
    expect(screen.getByText("$ 478.691")).toBeInTheDocument();
    expect(screen.getByText(/vence el día 10/)).toBeInTheDocument();
  });

  it("un contrato terminado antes muestra la fecha real", async () => {
    await abrir(contrato({ status: "TERMINATED", actualEndDate: "2027-06-30" }));
    expect(screen.getByText("Terminó el")).toBeInTheDocument();
    expect(screen.getByText("30/06/2027")).toBeInTheDocument();
  });

  it("un contrato reemplazado lleva a su sucesor", async () => {
    await abrir(contrato({ status: "SUPERSEDED", successorContractId: 200 }));
    expect(screen.getByText("Este contrato fue reemplazado")).toBeInTheDocument();
  });
});

describe("próxima actualización", () => {
  it("usa la fecha y el importe del backend", async () => {
    await abrir(contrato({ nextIncrementDate: "2026-11-01", nextIncrementRent: 517000 }));
    expect(screen.getByText("Próxima actualización")).toBeInTheDocument();
    expect(screen.getByText("01/11/2026 · $ 517.000")).toBeInTheDocument();
  });

  it("sin importe muestra cómo se actualiza, sin inventar el monto", async () => {
    await abrir(contrato({ nextIncrementDate: "2026-11-01" }));
    expect(screen.getByText("01/11/2026 · Sube 8 % cada 3 meses")).toBeInTheDocument();
  });

  it("sin fecha, el hito no aparece", async () => {
    await abrir();
    expect(screen.queryByText("Próxima actualización")).not.toBeInTheDocument();
  });
});

// --- Condiciones ---

describe("condiciones pactadas", () => {
  it("las muestra cuando el contrato las tiene", async () => {
    await abrir(
      contrato({ depositAmount: 478691, depositType: "CASH", commissionPercent: 5, commissionPayer: "TENANT" })
    );
    expect(screen.getByText("Condiciones pactadas")).toBeInTheDocument();
    expect(screen.getByText("$ 478.691 · Depósito en efectivo")).toBeInTheDocument();
    expect(screen.getByText("5 % · la paga el inquilino")).toBeInTheDocument();
  });

  it("sin ninguna condición, la tarjeta no aparece", async () => {
    await abrir();
    expect(screen.queryByText("Condiciones pactadas")).not.toBeInTheDocument();
  });

  it("un contrato en dólares muestra sus importes en esa moneda", async () => {
    await abrir(contrato({ currency: "USD", currentRent: 1200 }));
    expect(screen.getByText("US$ 1.200")).toBeInTheDocument();
  });
});

// --- Historial ---

describe("historial de aumentos", () => {
  it("lista los aumentos aplicados", async () => {
    await abrir(contrato(), [
      { periodNumber: 1, appliedAt: "2025-06-01", sourceValue: 8, resultingRent: 432000 },
    ]);
    expect(screen.getByText("01/06/2025")).toBeInTheDocument();
    expect(screen.getByText("$ 432.000")).toBeInTheDocument();
  });

  it("sin aumentos lo dice y explica cómo va a subir", async () => {
    await abrir();
    expect(
      screen.getByText(/Todavía no se aplicó ningún aumento. Sube 8 % cada 3 meses/)
    ).toBeInTheDocument();
  });
});

// --- Acceso del inquilino ---

describe("acceso del inquilino", () => {
  it("copia el enlace real, sin reenviar el correo", async () => {
    mockAccess.mockResolvedValue({ url: "http://localhost:3000/tenant-portal?token=abc" });
    await abrir();

    await userEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));

    expect(await screen.findByText(/Enlace copiado/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copiar enlace/ })).toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "http://localhost:3000/tenant-portal?token=abc"
    );
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("avisa si no pudo obtener el enlace, sin decir que copió algo", async () => {
    mockAccess.mockRejectedValue(new ApiError(500, "Boom"));
    await abrir();

    await userEvent.click(screen.getByRole("button", { name: /Copiar enlace/ }));

    expect(await screen.findByText(/No pudimos obtener el enlace/)).toBeInTheDocument();
    expect(screen.queryByText(/Enlace copiado/)).not.toBeInTheDocument();
  });

  it("reenviar el correo es otra acción", async () => {
    mockResend.mockResolvedValue(undefined);
    await abrir();

    await userEvent.click(screen.getByRole("button", { name: /Reenviar por correo/ }));

    expect(mockResend).toHaveBeenCalledWith(100);
    expect(mockAccess).not.toHaveBeenCalled();
    // Es un éxito: no sale con estilo ni rol de error.
    expect(await screen.findByText(/Le reenviamos el enlace por correo/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reenviar el correo queda ocupado mientras espera al servidor", async () => {
    let terminar: () => void = () => {};
    mockResend.mockReturnValue(new Promise<void>((resolver) => { terminar = resolver; }));
    await abrir();

    await userEvent.click(screen.getByRole("button", { name: /Reenviar por correo/ }));

    const ocupado = screen.getByRole("button", { name: /Reenviar por correo/ });
    expect(ocupado).toBeDisabled();
    expect(ocupado).toHaveAttribute("aria-busy", "true");
    terminar();
    await waitFor(() => expect(screen.getByRole("button", { name: /Reenviar por correo/ })).toBeEnabled());
  });

  // Hoy el token vence a fin de mes (S-1), así que afirmar una vigencia sería falso.
  it("no afirma hasta cuándo vale el enlace", async () => {
    await abrir();
    expect(screen.queryByText(/Activo hasta que finalice/)).not.toBeInTheDocument();
  });
});

// --- Documento ---

describe("documento firmado", () => {
  const conDocumento = contrato({
    documentFileName: "Contrato-Rivadavia.pdf",
    documentContentType: "application/pdf",
    documentSizeBytes: 2_516_582,
    documentUploadedAt: "2025-03-01T10:00:00Z",
  });

  it("muestra nombre, tamaño y fecha de carga", async () => {
    await abrir(conDocumento);
    expect(screen.getByText("Contrato-Rivadavia.pdf")).toBeInTheDocument();
    expect(screen.getByText("PDF · 2,4 MB · cargado el 01/03/2025")).toBeInTheDocument();
  });

  it("sin fecha de carga omite esa parte", async () => {
    await abrir(contrato({ ...conDocumento, documentUploadedAt: undefined }));
    expect(screen.getByText("PDF · 2,4 MB")).toBeInTheDocument();
  });

  it("sin documento ofrece adjuntarlo", async () => {
    await abrir();
    expect(screen.getByText("Todavía no cargó el contrato")).toBeInTheDocument();
    expect(screen.getByLabelText("Adjuntar el documento firmado")).toBeInTheDocument();
  });

  it("quitar el documento vuelve a ofrecer adjuntar", async () => {
    mockRemoveDoc.mockResolvedValue(undefined);
    await abrir(conDocumento);
    mockGet.mockResolvedValue(contrato());

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(await screen.findByText("Todavía no cargó el contrato")).toBeInTheDocument();
    expect(mockRemoveDoc).toHaveBeenCalledWith(100);
    expect(await screen.findByText(/Documento quitado/)).toBeInTheDocument();
  });

  it("quitar el documento queda ocupado mientras espera al servidor", async () => {
    let terminar: () => void = () => {};
    mockRemoveDoc.mockReturnValue(new Promise<void>((resolver) => { terminar = resolver; }));
    await abrir(conDocumento);

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(screen.getByRole("button", { name: "Quitar" })).toHaveAttribute("aria-busy", "true");
    terminar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Quitar" })).toBeEnabled());
  });

  it("avisa si quitar falla", async () => {
    mockRemoveDoc.mockRejectedValue(new ApiError(500, "Boom"));
    await abrir(conDocumento);

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));

    expect(await screen.findByText(/No pudimos quitar el documento/)).toBeInTheDocument();
  });
});

// --- Finalizar ---

describe("finalizar el contrato", () => {
  it("advierte que las cuotas futuras impagas se eliminan", async () => {
    await abrir();

    await userEvent.click(screen.getByRole("button", { name: "Finalizar contrato" }));

    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText(/no estén pagas se eliminan/)).toBeInTheDocument();
    expect(mockTerminate).not.toHaveBeenCalled();
  });

  it("finaliza con la fecha indicada", async () => {
    mockTerminate.mockResolvedValue(contrato({ status: "TERMINATED" }));
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Finalizar contrato" }));

    const dialogo = screen.getByRole("dialog");
    await userEvent.clear(within(dialogo).getByLabelText(/FECHA DE TERMINACIÓN/));
    await userEvent.type(within(dialogo).getByLabelText(/FECHA DE TERMINACIÓN/), "2026-10-31");
    mockGet.mockResolvedValue(contrato({ status: "TERMINATED", actualEndDate: "2026-10-31" }));
    await userEvent.click(within(dialogo).getByRole("button", { name: "Finalizar contrato" }));

    await waitFor(() =>
      expect(mockTerminate).toHaveBeenCalledWith(100, { terminationDate: "2026-10-31" })
    );
    expect(await screen.findByText(/Contrato finalizado/)).toBeInTheDocument();
  });

  it("explica el rechazo y el contrato sigue vigente", async () => {
    mockTerminate.mockRejectedValue(new ApiError(400, "Invalid date"));
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Finalizar contrato" }));

    const dialogo = screen.getByRole("dialog");
    await userEvent.click(within(dialogo).getByRole("button", { name: "Finalizar contrato" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo finalizar con esa fecha");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("no se ofrece sobre un contrato que ya terminó", async () => {
    await abrir(contrato({ status: "TERMINATED", actualEndDate: "2027-06-30" }));
    expect(screen.queryByRole("button", { name: "Finalizar contrato" })).not.toBeInTheDocument();
  });
});
