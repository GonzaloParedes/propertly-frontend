import { render, screen, waitFor, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AblSection } from "@/components/dashboard/AblSection";
import { AlquiaBackendClient } from "@/lib/backend-client";
import type { AblPeriodResponse, AblResponse } from "@/lib/backend-types";

const ablVacio: AblResponse = { jurisdiction: null, partida: null, verificationDigit: null, unpaidAbl: false };
const ablCaba: AblResponse = { jurisdiction: "CABA_AGIP", partida: "1234567", verificationDigit: "5", unpaidAbl: false };
const ablArba: AblResponse = { jurisdiction: "PBA_ARBA", partida: "123456789", verificationDigit: null, unpaidAbl: false };

const periodoBase: AblPeriodResponse = {
  period: "2026-11",
  status: "UNPAID",
  payer: "TENANT",
  hasReceipt: false,
  receiptFileName: null,
  receiptContentType: null,
  receiptSize: null,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

function mockAbl(abl: AblResponse, periods: AblPeriodResponse[] = []) {
  vi.spyOn(AlquiaBackendClient.abl, "get").mockResolvedValue(abl);
  vi.spyOn(AlquiaBackendClient.abl, "listPeriods").mockResolvedValue(periods);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(AlquiaBackendClient.abl, "save").mockResolvedValue(ablCaba);
  vi.spyOn(AlquiaBackendClient.abl, "remove").mockResolvedValue(undefined);
  vi.spyOn(AlquiaBackendClient.abl, "savePeriod").mockResolvedValue(periodoBase);
  vi.spyOn(AlquiaBackendClient.abl, "deletePeriod").mockResolvedValue(undefined);
  vi.spyOn(AlquiaBackendClient.abl, "uploadReceipt").mockResolvedValue({ ...periodoBase, hasReceipt: true, receiptFileName: "comprobante.pdf" });
  vi.spyOn(AlquiaBackendClient.abl, "downloadReceipt").mockResolvedValue(new Blob());
  vi.spyOn(AlquiaBackendClient.abl, "deleteReceipt").mockResolvedValue(undefined);
});

// ── Partida ───────────────────────────────────────────────────────────────

describe("carga la partida al montar", () => {
  it("muestra partida CABA guardada", async () => {
    mockAbl(ablCaba);
    render(<AblSection propertyId={1} />);
    await screen.findByText("CABA / AGIP");
    expect(screen.getByText(/1234567/)).toBeInTheDocument();
  });

  it("muestra partida ARBA formateada como PPP-CCCCCC", async () => {
    mockAbl(ablArba);
    render(<AblSection propertyId={2} />);
    await screen.findByText("PBA / ARBA");
    expect(screen.getByText(/123-456789/)).toBeInTheDocument();
  });

  it("muestra «no hay partida cargada» cuando el ABL no tiene partida", async () => {
    mockAbl(ablVacio);
    render(<AblSection propertyId={3} />);
    expect(await screen.findByText(/No hay partida cargada/)).toBeInTheDocument();
  });
});

describe("validación de partida", () => {
  it("el botón Guardar está deshabilitado cuando no se seleccionó jurisdicción ni se escribió partida", async () => {
    mockAbl(ablVacio);
    render(<AblSection propertyId={4} />);
    await screen.findByText(/No hay partida cargada/);
    await userEvent.click(screen.getByRole("button", { name: /Cargar partida/ }));
    expect(screen.getByRole("button", { name: /Guardar/ })).toBeDisabled();
  });

  it("rechaza partida CABA con más de 7 dígitos", async () => {
    mockAbl(ablVacio);
    render(<AblSection propertyId={5} />);
    await screen.findByText(/No hay partida cargada/);
    await userEvent.click(screen.getByRole("button", { name: /Cargar partida/ }));
    const jGroup = screen.getByRole("radiogroup", { name: "Jurisdicción" });
    await userEvent.click(within(jGroup).getByRole("radio", { name: "CABA / AGIP" }));
    await userEvent.type(screen.getByPlaceholderText(/Ej: 1234567/), "12345678");
    await userEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/1 y 7 dígitos/i);
  });

  it("rechaza partida ARBA con menos de 9 dígitos", async () => {
    mockAbl(ablVacio);
    render(<AblSection propertyId={6} />);
    await screen.findByText(/No hay partida cargada/);
    await userEvent.click(screen.getByRole("button", { name: /Cargar partida/ }));
    const jGroup = screen.getByRole("radiogroup", { name: "Jurisdicción" });
    await userEvent.click(within(jGroup).getByRole("radio", { name: "PBA / ARBA" }));
    await userEvent.type(screen.getByPlaceholderText(/Ej: 123-456789/), "12345");
    await userEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(/9 dígitos/i);
  });

  it("manda el dígito verificador como verificationDigit, el nombre que espera el backend", async () => {
    mockAbl(ablVacio);
    render(<AblSection propertyId={7} />);
    await screen.findByText(/No hay partida cargada/);
    await userEvent.click(screen.getByRole("button", { name: /Cargar partida/ }));
    const jGroup = screen.getByRole("radiogroup", { name: "Jurisdicción" });
    await userEvent.click(within(jGroup).getByRole("radio", { name: "CABA / AGIP" }));
    await userEvent.type(screen.getByPlaceholderText(/Ej: 1234567/), "0064400");
    await userEvent.type(screen.getByPlaceholderText(/Ej: 5/), "1");
    await userEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() =>
      expect(AlquiaBackendClient.abl.save).toHaveBeenCalledWith(7, {
        jurisdiction: "CABA_AGIP",
        partida: "0064400",
        verificationDigit: "1",
      })
    );
  });

  it("guarda una partida CABA válida y llama al backend", async () => {
    mockAbl(ablVacio);
    render(<AblSection propertyId={7} />);
    await screen.findByText(/No hay partida cargada/);
    await userEvent.click(screen.getByRole("button", { name: /Cargar partida/ }));
    const jGroup = screen.getByRole("radiogroup", { name: "Jurisdicción" });
    await userEvent.click(within(jGroup).getByRole("radio", { name: "CABA / AGIP" }));
    await userEvent.type(screen.getByPlaceholderText(/Ej: 1234567/), "1234567");
    await userEvent.click(screen.getByRole("button", { name: /Guardar/ }));
    await waitFor(() => expect(AlquiaBackendClient.abl.save).toHaveBeenCalledWith(7, expect.objectContaining({ partida: "1234567", jurisdiction: "CABA_AGIP" })));
  });
});

// ── Consultar AGIP/ARBA ───────────────────────────────────────────────────

describe("botón consultar", () => {
  it("copia al portapapeles solo los dígitos (sin DV) y abre AGIP", async () => {
    mockAbl(ablCaba);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AblSection propertyId={8} />);
    await screen.findByRole("button", { name: /Consultar en AGIP/ });
    await userEvent.click(screen.getByRole("button", { name: /Consultar en AGIP/ }));
    expect(writeText).toHaveBeenCalledWith("1234567");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("agip"), "_blank", expect.any(String));
  });

  it("copia al portapapeles los dígitos de ARBA y abre ARBA", async () => {
    mockAbl(ablArba);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AblSection propertyId={9} />);
    await screen.findByRole("button", { name: /Consultar en ARBA/ });
    await userEvent.click(screen.getByRole("button", { name: /Consultar en ARBA/ }));
    expect(writeText).toHaveBeenCalledWith("123456789");
    expect(open).toHaveBeenCalledWith(expect.stringContaining("arba"), "_blank", expect.any(String));
  });

  it("muestra fallback con la partida cuando el portapapeles falla", async () => {
    mockAbl(ablCaba);
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AblSection propertyId={10} />);
    await screen.findByRole("button", { name: /Consultar en AGIP/ });
    await userEvent.click(screen.getByRole("button", { name: /Consultar en AGIP/ }));
    await screen.findByLabelText(/Partida para copiar/);
    expect(screen.getByLabelText(/Partida para copiar/)).toHaveValue("1234567");
  });
});

// ── Períodos ─────────────────────────────────────────────────────────────

describe("períodos", () => {
  it("muestra empty state cuando no hay períodos", async () => {
    mockAbl(ablVacio, []);
    render(<AblSection propertyId={11} />);
    expect(await screen.findByText(/No hay períodos registrados/)).toBeInTheDocument();
  });

  it("muestra un período existente con su formato MM/AAAA", async () => {
    mockAbl(ablVacio, [periodoBase]);
    render(<AblSection propertyId={12} />);
    await waitFor(() => expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0));
  });

  it("agrega un período y lo muestra en la lista", async () => {
    mockAbl(ablVacio, []);
    render(<AblSection propertyId={13} />);
    await screen.findByText(/No hay períodos registrados/);
    await userEvent.click(screen.getByRole("button", { name: /Agregar período/ }));
    await userEvent.click(screen.getByRole("button", { name: /Guardar período/ }));
    await waitFor(() => expect(AlquiaBackendClient.abl.savePeriod).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0));
  });

  it("solicita confirmación antes de borrar y no borra si se cancela", async () => {
    mockAbl(ablVacio, [periodoBase]);
    render(<AblSection propertyId={14} />);
    await waitFor(() => expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: /Eliminar período 11\/2026/ }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(AlquiaBackendClient.abl.deletePeriod).not.toHaveBeenCalled();
    expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0);
  });

  it("borra el período al confirmar", async () => {
    mockAbl(ablVacio, [periodoBase]);
    render(<AblSection propertyId={15} />);
    await waitFor(() => expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole("button", { name: /Eliminar período 11\/2026/ }));
    await userEvent.click(screen.getByRole("button", { name: "Borrar período" }));
    await waitFor(() => expect(AlquiaBackendClient.abl.deletePeriod).toHaveBeenCalledWith(15, "2026-11"));
    await waitFor(() => expect(screen.queryByText("11/2026")).not.toBeInTheDocument());
  });
});

// ── Comprobante ───────────────────────────────────────────────────────────

describe("comprobante", () => {
  it("rechaza archivos con tipo no permitido antes de enviar al backend", async () => {
    mockAbl(ablVacio, [periodoBase]);
    render(<AblSection propertyId={16} />);
    await waitFor(() => expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0));
    const file = new File(["data"], "archivo.exe", { type: "application/octet-stream" });
    const inputs = document.querySelectorAll<HTMLInputElement>("input[type=file]");
    expect(inputs.length).toBeGreaterThan(0);
    // applyAccept:false para que el archivo llegue al handler aunque no coincida con accept=
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(inputs[0], file);
    expect(AlquiaBackendClient.abl.uploadReceipt).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/no compatible/i);
  });

  it("rechaza archivos de más de 10 MB antes de enviar al backend", async () => {
    mockAbl(ablVacio, [periodoBase]);
    render(<AblSection propertyId={17} />);
    await waitFor(() => expect(screen.getAllByText("11/2026").length).toBeGreaterThan(0));
    const bigFile = new File(["x".repeat(11 * 1024 * 1024)], "grande.pdf", { type: "application/pdf" });
    const uploadInput = document.querySelector<HTMLInputElement>("input[type=file]");
    expect(uploadInput).not.toBeNull();
    await userEvent.upload(uploadInput!, bigFile);
    expect(AlquiaBackendClient.abl.uploadReceipt).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 MB/i);
  });
});
