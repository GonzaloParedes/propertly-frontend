import { AlquiaBackendClient } from "@/lib/backend-client";
import type { ContractOnboardingRequest } from "@/lib/backend-types";
import { crearContratoDesdeBorrador } from "@/lib/crear-contrato";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    contracts: {
      onboard: vi.fn(),
      attachDocument: vi.fn(),
      setTenantNotifications: vi.fn(),
    },
  },
}));

const onboard = vi.mocked(AlquiaBackendClient.contracts.onboard);
const avisos = vi.mocked(AlquiaBackendClient.contracts.setTenantNotifications);

const pedido: ContractOnboardingRequest = {
  property: { id: 1 },
  tenant: { id: 2 },
  contract: {
    initialRentAmount: 1000,
    startDate: "2026-01-01",
    termMonths: 12,
    dueDay: 1,
    incrementMethod: "FIXED_PERCENTAGE",
    incrementFrequencyMonths: 12,
    incrementValue: 1,
  },
};

const sinPdf = { enElBorrador: false, archivoLocal: null };

beforeEach(() => {
  vi.resetAllMocks();
  onboard.mockResolvedValue({ id: 7 } as never);
});

describe("crearContratoDesdeBorrador", () => {
  it("no prende los avisos si el propietario no los pidió", async () => {
    await crearContratoDesdeBorrador(pedido, null, sinPdf);

    expect(avisos).not.toHaveBeenCalled();
    expect(onboard.mock.calls[0][0]).not.toHaveProperty("tenantNotificationsEnabled");
  });

  it("después de crear, prende los avisos con el PUT", async () => {
    avisos.mockResolvedValue({ id: 7 } as never);

    await expect(crearContratoDesdeBorrador(pedido, null, sinPdf, true)).resolves.toBeUndefined();

    expect(avisos).toHaveBeenCalledWith(7, true);
    expect(onboard.mock.invocationCallOrder[0]).toBeLessThan(avisos.mock.invocationCallOrder[0]);
  });

  it("si el PUT falla, el contrato queda creado y se avisa", async () => {
    avisos.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(crearContratoDesdeBorrador(pedido, null, sinPdf, true)).resolves.toEqual({ avisosSinActivar: true });
    expect(onboard).toHaveBeenCalledTimes(1);
  });
});
