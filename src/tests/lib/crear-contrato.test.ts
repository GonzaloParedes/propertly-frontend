import { AlquiaBackendClient } from "@/lib/backend-client";
import type { ContractOnboardingRequest } from "@/lib/backend-types";
import { crearContratoDesdeBorrador, mensajeExitoDelContrato } from "@/lib/crear-contrato";

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

    await expect(crearContratoDesdeBorrador(pedido, null, sinPdf, true)).resolves.toEqual({ avisosActivados: true });

    expect(avisos).toHaveBeenCalledWith(7, true);
    expect(onboard.mock.invocationCallOrder[0]).toBeLessThan(avisos.mock.invocationCallOrder[0]);
  });

  it("si el PUT falla, el contrato queda creado y se avisa", async () => {
    avisos.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(crearContratoDesdeBorrador(pedido, null, sinPdf, true)).resolves.toEqual({ avisosSinActivar: true });
    expect(onboard).toHaveBeenCalledTimes(1);
  });
});

const SIN_ENVIO = "Contrato creado. Podés activar los avisos al inquilino desde su detalle.";
const CON_ENLACE = "Contrato creado. Le enviamos al inquilino su enlace por correo.";

describe("toast del alta de contrato", () => {
  it("con los avisos apagados no menciona ningún envío", async () => {
    const resultado = await crearContratoDesdeBorrador(pedido, null, sinPdf, false);

    expect(avisos).not.toHaveBeenCalled();
    expect(mensajeExitoDelContrato(resultado)).toBe(SIN_ENVIO);
  });

  it("si el propietario los prende y el PUT responde bien, dice que le enviamos el enlace", async () => {
    avisos.mockResolvedValue({ id: 7 } as never);

    const resultado = await crearContratoDesdeBorrador(pedido, null, sinPdf, true);

    expect(avisos).toHaveBeenCalledWith(7, true);
    expect(mensajeExitoDelContrato(resultado)).toBe(CON_ENLACE);
  });

  it("si el PUT de avisos falla, no menciona ningún envío", async () => {
    avisos.mockRejectedValue(new TypeError("Failed to fetch"));

    const resultado = await crearContratoDesdeBorrador(pedido, null, sinPdf, true);

    expect(resultado?.avisosSinActivar).toBe(true);
    expect(mensajeExitoDelContrato(resultado)).toBe(SIN_ENVIO);
  });
});
