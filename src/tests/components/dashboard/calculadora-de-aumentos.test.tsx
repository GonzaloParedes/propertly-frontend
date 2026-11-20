import { render, screen, fireEvent, waitFor } from "@/tests/render";
import CalculadoraDeAumentos from "@/components/dashboard/CalculadoraDeAumentos";
import Herramientas from "@/components/dashboard/Herramientas";
import { NAV_RESET_EVENT } from "@/components/dashboard/DashboardNav";
import type { RentIncreaseResponse } from "@/lib/backend-types";
import { ApiError } from "@/lib/api";
import { ERROR } from "@/lib/error-codes";

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tools: { rentIncrease: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockRentIncrease = vi.mocked(AlquiaBackendClient.tools.rentIncrease);

const RESULTADO: RentIncreaseResponse = {
  index: "ICL",
  amount: 500000,
  lastAdjustment: "2026-08",
  frequencyMonths: 3,
  effectiveFrom: "2026-11",
  increasePercentage: 6.12,
  increaseAmount: 30600,
  newAmount: 530600,
  lastMonthEstimated: true,
  months: [
    { period: "2026-08", rate: 2, estimated: false },
    { period: "2026-09", rate: 2, estimated: false },
    { period: "2026-10", rate: 2, estimated: true },
  ],
};

function ingresarMonto(valor: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Alquiler actual" }), { target: { value: valor } });
}

function calcular() {
  fireEvent.click(screen.getByRole("button", { name: /Calcular aumento/ }));
}

describe("CalculadoraDeAumentos", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T15:00:00Z"));
    mockRentIncrease.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("propone por defecto el último aumento que ya rige este mes", () => {
    render(<CalculadoraDeAumentos />);
    expect(screen.getByText("agosto 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mes siguiente" })).toBeDisabled();
  });

  it("pide el alquiler antes de llamar al backend", () => {
    render(<CalculadoraDeAumentos />);
    calcular();
    expect(screen.getByRole("alert")).toHaveTextContent("Ingrese el alquiler actual.");
    expect(mockRentIncrease).not.toHaveBeenCalled();
  });

  it("calcula con lo elegido y muestra el nuevo alquiler y el detalle por mes", async () => {
    mockRentIncrease.mockResolvedValue({ ...RESULTADO, index: "IPC" });
    render(<CalculadoraDeAumentos />);

    fireEvent.click(screen.getByRole("button", { name: "IPC" }));
    ingresarMonto("500.000");
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    calcular();

    expect(mockRentIncrease).toHaveBeenCalledWith({
      index: "IPC",
      amount: 500000,
      lastAdjustment: "2026-07",
      frequencyMonths: 3,
    });
    expect(await screen.findByText("$ 530.600,00")).toBeInTheDocument();
    expect(screen.getByText("NUEVO ALQUILER DESDE NOVIEMBRE 2026")).toBeInTheDocument();
    expect(screen.getByText("6,12 %")).toBeInTheDocument();
    expect(screen.getByText("IPC de octubre 2026 (estimado)")).toBeInTheDocument();
    expect(screen.getByText(/todavía no se publicó/)).toBeInTheDocument();
  });

  it("al subir la frecuencia, lleva el mes al último que se puede calcular", () => {
    render(<CalculadoraDeAumentos />);
    fireEvent.click(screen.getByRole("button", { name: /Sumar se actualiza cada/ }));
    expect(screen.getByText("julio 2026")).toBeInTheDocument();
  });

  it("borra el resultado cuando cambian los datos", async () => {
    mockRentIncrease.mockResolvedValue(RESULTADO);
    render(<CalculadoraDeAumentos />);
    ingresarMonto("500000");
    calcular();
    await screen.findByText("$ 530.600,00");

    ingresarMonto("600000");
    expect(screen.queryByText("$ 530.600,00")).not.toBeInTheDocument();
  });

  it("explica en castellano cuando el índice no está publicado", async () => {
    mockRentIncrease.mockRejectedValue(new ApiError(422, "x", ERROR.INDEX_DATA_NOT_PUBLISHED));
    render(<CalculadoraDeAumentos />);
    ingresarMonto("500000");
    calcular();
    expect(await screen.findByRole("alert")).toHaveTextContent(/no están publicados los valores del índice/);
  });

  it("muestra un aviso genérico si el error no se reconoce", async () => {
    mockRentIncrease.mockRejectedValue(new Error("red"));
    render(<CalculadoraDeAumentos />);
    ingresarMonto("500000");
    calcular();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/No pudimos calcular el aumento/));
  });
});

describe("Herramientas", () => {
  it("abre la calculadora desde el listado y vuelve con la miga o la barra", () => {
    render(<Herramientas />);
    fireEvent.click(screen.getByRole("button", { name: /Calculadora de aumentos/ }));
    expect(screen.getByRole("heading", { name: "Calculadora de aumentos" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Herramientas" }));
    expect(screen.getByRole("heading", { name: "Herramientas" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Calculadora de aumentos/ }));
    fireEvent(window, new Event(NAV_RESET_EVENT));
    expect(screen.getByRole("heading", { name: "Herramientas" })).toBeInTheDocument();
  });
});
