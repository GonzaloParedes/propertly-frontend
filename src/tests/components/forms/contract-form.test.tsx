import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContractForm from "@/components/forms/ContractForm";

async function selectExistingProperty() {
  await userEvent.type(screen.getByLabelText("Buscar inmueble"), "Rivadavia");
  await userEvent.click(await screen.findByRole("option", { name: /Av\. Rivadavia 2340, 5\.º A/ }));
}

async function addTenant(name = "Jorge Paletta") {
  await userEvent.type(screen.getByLabelText("Inquilino/s"), name.split(" ")[0]);
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(name) }));
}

async function fillMinimalContract() {
  await selectExistingProperty();
  await addTenant();

  await userEvent.type(screen.getByLabelText("Fecha de inicio"), "2026-08-01");
  await userEvent.type(screen.getByLabelText("Fecha de fin"), "2027-08-01");
  await userEvent.type(screen.getByLabelText("Monto inicial del alquiler"), "520000");
  await userEvent.type(screen.getByLabelText("Día de vencimiento del pago"), "10");
  await userEvent.type(screen.getByLabelText("Monto del depósito/garantía"), "520000");
  await userEvent.selectOptions(screen.getByLabelText("Tipo de garantía"), "Depósito en efectivo");
  await userEvent.type(screen.getByLabelText("% de comisión"), "5");
  await userEvent.selectOptions(screen.getByLabelText("Comisión a cargo de"), "PROPIETARIO");

  await userEvent.click(screen.getByRole("radio", { name: "IPC" }));
  await userEvent.selectOptions(screen.getByLabelText("Frecuencia de ajuste"), "MENSUAL");

  await userEvent.click(within(screen.getByRole("radiogroup", { name: "Renovación automática" })).getByRole("radio", { name: "No" }));
  await userEvent.type(screen.getByLabelText("Preaviso (meses)"), "1");
  await userEvent.type(screen.getByLabelText(/Porcentaje/), "2");
  await userEvent.type(screen.getByLabelText("Días de gracia"), "5");
}

describe("sección inmueble", () => {
  it("busca y selecciona un inmueble ya cargado, mostrando el resumen fijo", async () => {
    render(<ContractForm />);
    await selectExistingProperty();

    expect(screen.getAllByText("Av. Rivadavia 2340, 5.º A").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Cambiar inmueble" })).toBeInTheDocument();
  });

  it("crea un inmueble nuevo desde el modal y lo deja seleccionado automáticamente", async () => {
    render(<ContractForm />);
    await userEvent.click(screen.getByRole("button", { name: "Crear inmueble nuevo" }));

    const dialog = await screen.findByRole("dialog", { name: "Crear inmueble nuevo" });
    const withinDialog = within(dialog);

    await userEvent.type(withinDialog.getByLabelText("Dirección"), "Alem 480, 6.º B");
    await userEvent.type(withinDialog.getByLabelText("Ciudad"), "Mendoza");
    await userEvent.selectOptions(withinDialog.getByLabelText("Provincia"), "Mendoza");
    await userEvent.type(withinDialog.getByLabelText("Código postal"), "M5500");
    await userEvent.selectOptions(withinDialog.getByLabelText("Tipo de inmueble"), "Casa");
    await userEvent.click(withinDialog.getByRole("button", { name: "Crear propietario nuevo" }));
    await userEvent.type(withinDialog.getByLabelText("Nombre completo"), "Nuevo Propietario");
    await userEvent.type(withinDialog.getByLabelText("Correo electrónico"), "nuevo@ejemplo.com");
    await userEvent.click(withinDialog.getByRole("button", { name: "Agregar" }));
    await userEvent.click(withinDialog.getByRole("button", { name: "Guardar inmueble" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getAllByText(/Alem 480, 6\.º B/).length).toBeGreaterThan(0);
  });
});

describe("sección indexación — revelado progresivo", () => {
  it("muestra el % manual solo cuando el índice es Personalizado", async () => {
    render(<ContractForm />);
    expect(screen.queryByLabelText("% de ajuste manual")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Personalizado" }));
    expect(screen.getByLabelText("% de ajuste manual")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "IPC" }));
    expect(screen.queryByLabelText("% de ajuste manual")).not.toBeInTheDocument();
    expect(screen.getByText(/se calculará automáticamente según la variación del índice IPC/)).toBeInTheDocument();
  });
});

describe("sección reglas — revelado progresivo", () => {
  it("muestra el monto de la multa solo si se marca que aplica", async () => {
    render(<ContractForm />);
    expect(screen.queryByLabelText("Monto de la multa")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("¿Aplica multa por rescisión anticipada?"));
    expect(screen.getByLabelText("Monto de la multa")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("¿Aplica multa por rescisión anticipada?"));
    expect(screen.queryByLabelText("Monto de la multa")).not.toBeInTheDocument();
  });
});

describe("validación", () => {
  it("exige seleccionar un inmueble antes de guardar", async () => {
    render(<ContractForm />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar contrato" }));

    expect(await screen.findByText("Seleccione o cree un inmueble para el contrato.")).toBeInTheDocument();
  });
});

describe("envío exitoso", () => {
  it("guarda el contrato con estado inicial Vigente", async () => {
    render(<ContractForm />);
    await fillMinimalContract();
    await userEvent.click(screen.getByRole("button", { name: "Guardar contrato" }));

    expect(await screen.findByText("Contrato creado")).toBeInTheDocument();
    expect(screen.getByText("Vigente")).toBeInTheDocument();
  });
});
