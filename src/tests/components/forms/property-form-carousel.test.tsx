import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyFormCarousel from "@/components/forms/PropertyFormCarousel";

async function fillStep1() {
  await userEvent.type(screen.getByLabelText("Dirección"), "Sarmiento 2210, 4.º D");
  await userEvent.type(screen.getByLabelText("Ciudad"), "Rosario");
  await userEvent.selectOptions(screen.getByLabelText("Provincia"), "Santa Fe");
  await userEvent.type(screen.getByLabelText("Código postal"), "S2000");
}

async function goToStep2() {
  await fillStep1();
  await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
}

async function goToStep3() {
  await goToStep2();
  await userEvent.selectOptions(screen.getByLabelText("Tipo de inmueble"), "Departamento");
  await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
}

async function selectExistingOwner(name = "Silvina Roldán") {
  await userEvent.type(screen.getByLabelText("Propietario/s"), name.split(" ")[0]);
  await userEvent.click(await screen.findByRole("option", { name: new RegExp(name) }));
}

describe("renderizado por pasos", () => {
  it("al montar solo muestra los campos del paso 1", () => {
    render(<PropertyFormCarousel onSuccess={vi.fn()} />);
    expect(screen.getByLabelText("Dirección")).toBeInTheDocument();
    expect(screen.getByLabelText("Ciudad")).toBeInTheDocument();
    expect(screen.getByLabelText("Provincia")).toBeInTheDocument();
    expect(screen.getByLabelText("Código postal")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tipo de inmueble")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Propietario/s")).not.toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 3")).toBeInTheDocument();
  });

  it("no hay botón Anterior en el primer paso", () => {
    render(<PropertyFormCarousel onSuccess={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
  });
});

describe("navegación", () => {
  it("bloquea el avance y muestra errores si el paso 1 está incompleto", async () => {
    render(<PropertyFormCarousel onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(await screen.findByText("Revise los campos marcados antes de continuar.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tipo de inmueble")).not.toBeInTheDocument();
  });

  it("avanza al paso 2 al completar el paso 1", async () => {
    render(<PropertyFormCarousel onSuccess={vi.fn()} />);
    await goToStep2();

    expect(screen.getByLabelText("Tipo de inmueble")).toBeInTheDocument();
    expect(screen.queryByLabelText("Dirección")).not.toBeInTheDocument();
    expect(screen.getByText("Paso 2 de 3")).toBeInTheDocument();
  });

  it("Anterior vuelve al paso previo conservando los datos cargados", async () => {
    render(<PropertyFormCarousel onSuccess={vi.fn()} />);
    await goToStep2();
    await userEvent.click(screen.getByRole("button", { name: "Anterior" }));

    expect(screen.getByLabelText("Dirección")).toHaveValue("Sarmiento 2210, 4.º D");
    expect(screen.getByLabelText("Ciudad")).toHaveValue("Rosario");
  });

  it("llega al paso 3 (Propietario/s) tras completar los dos primeros pasos", async () => {
    render(<PropertyFormCarousel onSuccess={vi.fn()} />);
    await goToStep3();

    expect(screen.getByLabelText("Propietario/s")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar inmueble" })).toBeInTheDocument();
    expect(screen.getByText("Paso 3 de 3")).toBeInTheDocument();
  });
});

describe("envío exitoso", () => {
  it("llama a onSuccess con los datos cargados en los 3 pasos", async () => {
    const onSuccess = vi.fn();
    render(<PropertyFormCarousel mode="modal" onSuccess={onSuccess} />);
    await goToStep3();
    await selectExistingOwner();
    await userEvent.click(screen.getByRole("button", { name: "Guardar inmueble" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    const property = onSuccess.mock.calls[0][0];
    expect(property.address).toBe("Sarmiento 2210, 4.º D");
    expect(property.propertyType).toBe("Departamento");
    expect(property.owners[0].owner.name).toBe("Silvina Roldán");
  });

  it("en modo página muestra la confirmación de inmueble creado", async () => {
    render(<PropertyFormCarousel mode="page" onSuccess={vi.fn()} />);
    await goToStep3();
    await selectExistingOwner();
    await userEvent.click(screen.getByRole("button", { name: "Guardar inmueble" }));

    expect(await screen.findByText("Inmueble creado")).toBeInTheDocument();
  });

  it("no avanza del último paso si falta el propietario", async () => {
    const onSuccess = vi.fn();
    render(<PropertyFormCarousel onSuccess={onSuccess} />);
    await goToStep3();
    await userEvent.click(screen.getByRole("button", { name: "Guardar inmueble" }));

    expect(await screen.findByText("Revise los campos marcados antes de continuar.")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
