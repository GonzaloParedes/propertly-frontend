import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";
import type { ContractResponse } from "@/lib/backend-types";

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
      scheduleSchemaChange: vi.fn(),
    },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockList = vi.mocked(AlquiaBackendClient.contracts.list);
const mockGet = vi.mocked(AlquiaBackendClient.contracts.get);
const mockIncrements = vi.mocked(AlquiaBackendClient.contracts.rentIncrements);
const mockSchedule = vi.mocked(AlquiaBackendClient.contracts.scheduleSchemaChange);

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
    endDate: "2099-12-31",
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
  mockIncrements.mockResolvedValue([]);
});

async function abrir(c: ContractResponse, sucesor?: ContractResponse) {
  mockList.mockResolvedValue(sucesor ? [c, sucesor] : [c]);
  mockGet.mockImplementation(async (id) => (sucesor && id === sucesor.id ? sucesor : c));
  render(<OwnerWorkspace initialView="contratos" />);
  await userEvent.click(await screen.findByRole("button", { name: /Av\. Rivadavia/ }));
  await screen.findByText(/Contrato con Jorge Paletta/);
}

describe("cambiar condiciones · acción", () => {
  it("se ofrece en un contrato vigente sin cambio programado", async () => {
    await abrir(contrato());
    expect(screen.getByRole("button", { name: "Cambiar condiciones" })).toBeInTheDocument();
  });

  it("no se ofrece en un contrato que ya no rige", async () => {
    mockList.mockResolvedValue([contrato({ status: "TERMINATED" })]);
    mockGet.mockResolvedValue(contrato({ status: "TERMINATED" }));
    render(<OwnerWorkspace initialView="contratos" />);
    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    await userEvent.click(screen.getByRole("button", { name: /Finalizados/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await userEvent.click(await screen.findByRole("button", { name: /Av\. Rivadavia/ }));
    await screen.findByText(/Contrato con Jorge Paletta/);
    expect(screen.queryByRole("button", { name: "Cambiar condiciones" })).not.toBeInTheDocument();
  });
});

describe("cambiar condiciones · programar", () => {
  async function hastaLaRevision() {
    await abrir(contrato());
    await userEvent.click(screen.getByRole("button", { name: "Cambiar condiciones" }));
    const alquiler = await screen.findByLabelText("Nuevo alquiler mensual");
    await userEvent.clear(alquiler);
    await userEvent.type(alquiler, "700000");
    await userEvent.click(screen.getByRole("button", { name: "Revisar cambio" }));
  }

  it("parte de las condiciones actuales", async () => {
    await abrir(contrato());
    await userEvent.click(screen.getByRole("button", { name: "Cambiar condiciones" }));
    expect(await screen.findByLabelText("Nuevo alquiler mensual")).toHaveValue("478.691");
    expect(screen.getByLabelText("Porcentaje de aumento")).toHaveValue("8");
  });

  it("revisa antes de mandar y aclara que lo anterior no cambia", async () => {
    await hastaLaRevision();
    expect(screen.getByText(/Las cuotas anteriores a ese mes no cambian/)).toBeInTheDocument();
    expect(screen.getByText(/Alquiler de \$ 700\.000 por mes/)).toBeInTheDocument();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("confirma contra el endpoint del contrato, con el mes como primer día", async () => {
    mockSchedule.mockResolvedValue(contrato({ id: 200, status: "SCHEDULED" }));
    await hastaLaRevision();
    await userEvent.click(screen.getByRole("button", { name: "Programar cambio" }));

    await waitFor(() => expect(mockSchedule).toHaveBeenCalledTimes(1));
    expect(mockSchedule).toHaveBeenCalledWith(100, {
      effectiveFrom: expect.stringMatching(/^\d{4}-\d{2}-01$/),
      rentBaseline: 700000,
      dueDay: 10,
      incrementMethod: "FIXED_PERCENTAGE",
      incrementFrequencyMonths: 3,
      incrementValue: 8,
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText(/Cambio programado desde/)).toBeInTheDocument();
  });

  it("no manda nada si falta el porcentaje y lo dice en el campo", async () => {
    await abrir(contrato());
    await userEvent.click(screen.getByRole("button", { name: "Cambiar condiciones" }));
    await userEvent.clear(await screen.findByLabelText("Porcentaje de aumento"));
    await userEvent.click(screen.getByRole("button", { name: "Revisar cambio" }));

    expect(screen.getByText("Escriba un porcentaje mayor a cero.")).toBeInTheDocument();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("si el backend rechaza por una cuota paga, dice el motivo y conserva lo escrito", async () => {
    mockSchedule.mockRejectedValue(
      new ApiError(
        409,
        "Cannot schedule a schema change over a paid predecessor invoice",
        ERROR.SCHEMA_CHANGE_OVER_PAID_INVOICE
      )
    );
    await hastaLaRevision();
    await userEvent.click(screen.getByRole("button", { name: "Programar cambio" }));

    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByText(/Hay una cuota ya paga desde ese mes/)).toBeInTheDocument();
    expect(within(dialogo).getByLabelText("Nuevo alquiler mensual")).toHaveValue("700.000");
  });
});

describe("cambio programado en el detalle", () => {
  const sucesor = () =>
    contrato({
      id: 200,
      status: "SCHEDULED",
      startDate: "2099-10-01",
      initialRentAmount: 700000,
      dueDay: 5,
      incrementFrequencyMonths: 6,
      incrementValue: 10,
      predecessorContractId: 100,
    });

  it("muestra desde cuándo rige y con qué condiciones, sin llamarlo reemplazado", async () => {
    await abrir(contrato({ successorContractId: 200 }), sucesor());

    expect(await screen.findByText("Cambio programado desde octubre 2099")).toBeInTheDocument();
    expect(screen.getByText(/Alquiler de \$ 700\.000/)).toBeInTheDocument();
    expect(screen.queryByText("Este contrato fue reemplazado")).not.toBeInTheDocument();
  });

  it("no ofrece programar otro cambio", async () => {
    await abrir(contrato({ successorContractId: 200 }), sucesor());
    await screen.findByText(/Cambio programado desde/);
    expect(screen.queryByRole("button", { name: "Cambiar condiciones" })).not.toBeInTheDocument();
  });
});

describe("lista de contratos", () => {
  it("un contrato programado aparece en su propia pestaña y no en vigentes", async () => {
    mockList.mockResolvedValue([
      contrato(),
      contrato({ id: 200, status: "SCHEDULED", startDate: "2099-10-01" }),
    ]);
    render(<OwnerWorkspace initialView="contratos" />);

    await userEvent.click(await screen.findByRole("button", { name: "Filtros" }));
    expect(screen.getByRole("button", { name: /Vigentes 1/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Programados 1/ }));
    expect(screen.getByText("Programado")).toBeInTheDocument();
  });
});
