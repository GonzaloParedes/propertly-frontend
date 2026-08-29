import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyForm from "@/components/forms/PropertyForm";

async function selectExistingOwner(name = "Silvina Roldán") {
  await userEvent.type(screen.getByLabelText("Propietario/s"), name.split(" ")[0]);
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(name) }));
}

async function fillMinimalProperty() {
  await userEvent.type(screen.getByLabelText("Dirección"), "Sarmiento 2210, 4.º D");
  await userEvent.type(screen.getByLabelText("Ciudad"), "Rosario");
  await userEvent.selectOptions(screen.getByLabelText("Provincia"), "Santa Fe");
  await userEvent.type(screen.getByLabelText("Código postal"), "S2000");
  await userEvent.selectOptions(screen.getByLabelText("Tipo de inmueble"), "Departamento");
  await selectExistingOwner();
}

describe("renderizado", () => {
  it("muestra todos los campos del formulario completo, sin versión reducida", () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    expect(screen.getByLabelText("Dirección")).toBeInTheDocument();
    expect(screen.getByLabelText("Ciudad")).toBeInTheDocument();
    expect(screen.getByLabelText("Provincia")).toBeInTheDocument();
    expect(screen.getByLabelText("Código postal")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de inmueble")).toBeInTheDocument();
    expect(screen.getByLabelText("Propietario/s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar inmueble" })).toBeInTheDocument();
  });
});

describe("autocomplete de dirección", () => {
  it("sugiere direcciones y autocompleta ciudad, provincia y CP al seleccionar", async () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Dirección"), "Rivadavia");

    const option = await screen.findByText("Av. Rivadavia 2340, 5.º A");
    await userEvent.click(option);

    expect(screen.getByLabelText("Dirección")).toHaveValue("Av. Rivadavia 2340, 5.º A");
    expect(screen.getByLabelText("Ciudad")).toHaveValue("CABA");
    expect(screen.getByLabelText("Provincia")).toHaveValue("Ciudad Autónoma de Buenos Aires");
    expect(screen.getByLabelText("Código postal")).toHaveValue("C1033");
  });
});

describe("propietario/s — directorio compartido", () => {
  it("empieza sin propietarios seleccionados y sin campo de % participación", () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    expect(screen.queryByText("Silvina Roldán")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("% participación")).not.toBeInTheDocument();
  });

  it("busca y selecciona un propietario ya cargado en el directorio", async () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    await selectExistingOwner("Silvina Roldán");

    expect(screen.getByText("Silvina Roldán")).toBeInTheDocument();
    expect(screen.getByText(/silvina\.roldan@ejemplo\.com/)).toBeInTheDocument();
  });

  it("agrega un segundo propietario y muestra % participación para ambos", async () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    await selectExistingOwner("Silvina Roldán");
    await selectExistingOwner("Héctor Bruno");

    expect(screen.getByText("Silvina Roldán")).toBeInTheDocument();
    expect(screen.getByText("Héctor Bruno")).toBeInTheDocument();
    expect(screen.getAllByLabelText("% participación")).toHaveLength(2);
  });

  it("permite quitar un propietario agregado", async () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    await selectExistingOwner("Silvina Roldán");
    await selectExistingOwner("Héctor Bruno");

    await userEvent.click(screen.getByRole("button", { name: "Quitar a Héctor Bruno" }));
    expect(screen.queryByText("Héctor Bruno")).not.toBeInTheDocument();
    expect(screen.getByText("Silvina Roldán")).toBeInTheDocument();
  });

  it("crea un propietario nuevo la primera vez y lo deja seleccionado", async () => {
    render(<PropertyForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Crear propietario nuevo" }));

    await userEvent.type(screen.getByLabelText("Nombre completo"), "Nuevo Propietario");
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "nuevo.propietario@ejemplo.com");
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(screen.getByText("Nuevo Propietario")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre completo")).not.toBeInTheDocument();
  });
});

describe("validación", () => {
  it("no llama a onSuccess y muestra errores si se envía vacío", async () => {
    const onSuccess = vi.fn();
    render(<PropertyForm onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole("button", { name: "Guardar inmueble" }));

    expect(await screen.findByText("Revise los campos marcados antes de continuar.")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("envío exitoso", () => {
  it("llama a onSuccess con los datos cargados", async () => {
    const onSuccess = vi.fn();
    render(<PropertyForm mode="modal" onSuccess={onSuccess} />);
    await fillMinimalProperty();
    await userEvent.click(screen.getByRole("button", { name: "Guardar inmueble" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const property = onSuccess.mock.calls[0][0];
    expect(property.address).toBe("Sarmiento 2210, 4.º D");
    expect(property.owners[0].owner.name).toBe("Silvina Roldán");
  });

  it("en modo página muestra la confirmación de inmueble creado", async () => {
    render(<PropertyForm mode="page" onSuccess={vi.fn()} />);
    await fillMinimalProperty();
    await userEvent.click(screen.getByRole("button", { name: "Guardar inmueble" }));

    expect(await screen.findByText("Inmueble creado")).toBeInTheDocument();
  });

  it("el botón Cancelar solo aparece cuando se provee onCancel", () => {
    const { rerender } = render(<PropertyForm onSuccess={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();

    rerender(<PropertyForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
