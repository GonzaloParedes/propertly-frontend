import { useState } from "react";
import { render, screen, within } from "@/tests/render";
import userEvent from "@testing-library/user-event";
import GarantiasSection from "@/components/dashboard/GarantiasSection";
import { armarGarantias, type GarantiaBorrador } from "@/lib/garantias";

let ultima: GarantiaBorrador[] = [];

function Anfitrion({ inicial = [], mostrarErrores = false, erroresDelBackend }: Readonly<{ inicial?: GarantiaBorrador[]; mostrarErrores?: boolean; erroresDelBackend?: Record<string, string> }>) {
  const [valor, setValor] = useState<GarantiaBorrador[]>(inicial);
  return <GarantiasSection value={valor} onChange={(nuevo) => { ultima = nuevo; setValor(nuevo); }} mostrarErrores={mostrarErrores} erroresDelBackend={erroresDelBackend} />;
}

const agregar = async (titulo: RegExp) => {
  const boton = screen.queryByRole("button", { name: "Agregar una garantía" });
  if (boton) await userEvent.click(boton);
  await userEvent.click(screen.getByRole("radio", { name: titulo }));
};

beforeEach(() => {
  ultima = [];
});

describe("agregar una garantía", () => {
  it("al principio sólo ofrece agregar, y pregunta primero el tipo en palabras simples", async () => {
    render(<Anfitrion />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Agregar una garantía" }));
    const tipos = within(screen.getByRole("radiogroup", { name: "Tipo de garantía" })).getAllByRole("radio");
    expect(tipos.map((t) => t.textContent)).toEqual([
      expect.stringContaining("Un garante con recibo de sueldo"),
      expect.stringContaining("Un garante con propiedad (garantía propietaria)"),
      expect.stringContaining("Un seguro de caución"),
    ]);
  });

  it("una garantía propietaria muestra primero nombre y dirección, y el resto detrás de «Agregar más datos»", async () => {
    render(<Anfitrion />);
    await agregar(/garantía propietaria/);

    expect(screen.getByLabelText("Nombre y apellido")).toBeInTheDocument();
    expect(screen.getByLabelText("Dirección de la propiedad en garantía")).toBeInTheDocument();
    expect(screen.queryByLabelText("Matrícula")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Empleador")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Agregar más datos" }));
    expect(screen.getByLabelText("Matrícula")).toBeInTheDocument();
    expect(screen.queryByLabelText("Empleador")).not.toBeInTheDocument();
  });

  it("el pedido de una garantía propietaria lleva nombre y dirección de la propiedad", async () => {
    render(<Anfitrion />);
    await agregar(/garantía propietaria/);
    await userEvent.type(screen.getByLabelText("Nombre y apellido"), "Ana Gómez");
    await userEvent.type(screen.getByLabelText("Dirección de la propiedad en garantía"), "Av. Rivadavia 1234");

    expect(armarGarantias(ultima)).toEqual([{ type: "PROPERTY", fullName: "Ana Gómez", propertyAddress: "Av. Rivadavia 1234" }]);
  });

  it("un garante con recibo de sueldo y un seguro muestran cada uno sus campos", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await userEvent.click(screen.getByRole("button", { name: "Agregar más datos" }));
    expect(screen.getByLabelText("Empleador")).toBeInTheDocument();

    await agregar(/seguro de caución/);
    const seguro = screen.getByRole("group", { name: /Garantía 2/ });
    expect(within(seguro).getByLabelText("Aseguradora")).toBeInTheDocument();
    expect(within(seguro).queryByLabelText("Empleador")).not.toBeInTheDocument();
  });

  it("con tres, esconde «Agregar una garantía» y dice que tres es el máximo", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await agregar(/garantía propietaria/);
    await agregar(/seguro de caución/);

    expect(screen.queryByRole("button", { name: "Agregar una garantía" })).not.toBeInTheDocument();
    expect(screen.getByText("Un contrato admite hasta 3 garantías.")).toBeInTheDocument();
  });
});

describe("campos", () => {
  it("da formato al CUIT mientras se escribe y valida lo escrito al salir del campo", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await userEvent.click(screen.getByRole("button", { name: "Agregar más datos" }));

    const cuit = screen.getByLabelText("CUIT o CUIL");
    await userEvent.type(cuit, "20123456780");
    expect(cuit).toHaveValue("20-12345678-0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("El número no es válido");
  });

  it("al intentar guardar muestra lo obligatorio que falta, aunque no se haya tocado", async () => {
    render(<Anfitrion mostrarErrores />);
    await agregar(/seguro de caución/);
    expect(screen.getByRole("alert")).toHaveTextContent("Ingrese la aseguradora.");
  });

  it("muestra el error que puso el backend junto al campo, en español", async () => {
    render(<Anfitrion inicial={[{ ...({} as GarantiaBorrador), type: "PERSONAL", fullName: "Ana", taxId: "", phoneNumber: "", email: "", address: "", employer: "", propertyAddress: "", propertyRegistry: "", insurerName: "", policyNumber: "" }]} erroresDelBackend={{ "0.fullName": "Revise este dato." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Revise este dato.");
  });
});

describe("quitar, ordenar y cambiar de tipo", () => {
  it("quitar todas deja la lista vacía, que al actualizar borra las del contrato", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await userEvent.click(screen.getByRole("button", { name: "Quitar la garantía 1" }));

    expect(armarGarantias(ultima)).toEqual([]);
    expect(screen.getByRole("button", { name: "Agregar una garantía" })).toBeInTheDocument();
  });

  it("se pueden reordenar", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await agregar(/seguro de caución/);

    expect(screen.getByRole("button", { name: "Subir la garantía 1" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Subir la garantía 2" }));
    expect(ultima.map((g) => g.type)).toEqual(["SURETY_INSURANCE", "PERSONAL"]);
  });

  it("cambiar de tipo sin datos cargados es inmediato", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await userEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await userEvent.click(within(screen.getByRole("radiogroup", { name: "Nuevo tipo de garantía" })).getByRole("radio", { name: /seguro de caución/ }));

    expect(ultima[0].type).toBe("SURETY_INSURANCE");
  });

  it("cambiar de tipo con datos que se pierden avisa cuáles y deja volver atrás", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await userEvent.type(screen.getByLabelText("Nombre y apellido"), "Ana Gómez");

    await userEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await userEvent.click(within(screen.getByRole("radiogroup", { name: "Nuevo tipo de garantía" })).getByRole("radio", { name: /seguro de caución/ }));
    expect(screen.getByRole("alert")).toHaveTextContent("se borra: nombre y apellido");
    expect(ultima[0].type).toBe("PERSONAL");

    await userEvent.click(screen.getByRole("button", { name: "Volver" }));
    expect(ultima[0]).toMatchObject({ type: "PERSONAL", fullName: "Ana Gómez" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await userEvent.click(within(screen.getByRole("radiogroup", { name: "Nuevo tipo de garantía" })).getByRole("radio", { name: /seguro de caución/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cambiar igual" }));
    expect(ultima[0]).toMatchObject({ type: "SURETY_INSURANCE", fullName: "" });
  });

  it("cambiar entre garante y propiedad conserva lo que comparten, sin avisar", async () => {
    render(<Anfitrion />);
    await agregar(/recibo de sueldo/);
    await userEvent.type(screen.getByLabelText("Nombre y apellido"), "Ana Gómez");
    await userEvent.click(screen.getByRole("button", { name: "Cambiar tipo" }));
    await userEvent.click(within(screen.getByRole("radiogroup", { name: "Nuevo tipo de garantía" })).getByRole("radio", { name: /garantía propietaria/ }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(ultima[0]).toMatchObject({ type: "PROPERTY", fullName: "Ana Gómez" });
  });
});
