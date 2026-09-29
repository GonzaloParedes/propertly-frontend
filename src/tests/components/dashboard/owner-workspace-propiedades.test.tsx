import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OwnerWorkspace from "@/components/dashboard/OwnerWorkspace";
import type { InvoiceResponse, PropertyResponse } from "@/lib/backend-types";
import { ApiError } from "@/lib/api";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("@/lib/backend-client", () => ({
  AlquiaBackendClient: {
    tenants: { list: vi.fn() },
    contracts: { list: vi.fn() },
    properties: { list: vi.fn(), archive: vi.fn() },
    invoices: { list: vi.fn() },
  },
}));

import { AlquiaBackendClient } from "@/lib/backend-client";
const mockProperties = vi.mocked(AlquiaBackendClient.properties.list);
const mockInvoices = vi.mocked(AlquiaBackendClient.invoices.list);

const RIVADAVIA: PropertyResponse = {
  id: 1,
  street: "Av. Rivadavia",
  number: "2340",
  floorUnit: "5.º A",
  city: "CABA",
  province: "Ciudad Autónoma de Buenos Aires",
  category: "APARTMENT",
  bedrooms: 2,
  coveredArea: 68,
  activeContract: { id: 100, currentRent: 478691, status: "ACTIVE" },
};

const MITRE: PropertyResponse = {
  id: 2,
  street: "Mitre",
  number: "78",
  city: "San Isidro",
  province: "Buenos Aires",
  category: "COMMERCIAL_PREMISES",
  coveredArea: 52,
  activeContract: null,
};

const CUOTA_VENCIDA: InvoiceResponse = {
  id: 1000,
  contractId: 100,
  period: "2026-08-01",
  dueDate: "2026-08-10",
  baseAmount: 478691,
  total: 478691,
  status: "DUE",
  confirmed: true,
  adjustments: [],
  payments: [],
};

beforeEach(() => {
  vi.resetAllMocks();
});

function conDatos(properties = [RIVADAVIA, MITRE], invoices: InvoiceResponse[] = []) {
  mockProperties.mockResolvedValue(properties);
  mockInvoices.mockResolvedValue(invoices);
}

// --- Carga ---

describe("carga", () => {
  it("avisa que está cargando antes de tener los datos", () => {
    mockProperties.mockReturnValue(new Promise(() => {}));
    mockInvoices.mockReturnValue(new Promise(() => {}));
    render(<OwnerWorkspace initialView="propiedades" />);

    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("pide las dos listas, no una por propiedad", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(mockProperties).toHaveBeenCalledOnce();
    expect(mockInvoices).toHaveBeenCalledOnce();
  });

  it("acota las cuotas por período en vez de traer la historia entera", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(mockInvoices).toHaveBeenCalledWith(
      expect.objectContaining({ periodFrom: expect.stringMatching(/^\d{4}-\d{2}-01$/) })
    );
  });

  it("avisa cuando la carga falla, sin decir que no hay propiedades", async () => {
    mockProperties.mockRejectedValue(new Error("Network error"));
    mockInvoices.mockResolvedValue([]);
    render(<OwnerWorkspace initialView="propiedades" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos cargar sus propiedades"
    );
    expect(screen.queryByText("Todavía no cargó ninguna propiedad")).not.toBeInTheDocument();
  });

  it("invita a cargar la primera cuando no hay ninguna", async () => {
    conDatos([]);
    render(<OwnerWorkspace initialView="propiedades" />);

    expect(await screen.findByText("Todavía no cargó ninguna propiedad")).toBeInTheDocument();
    // Sin propiedades no hay nada que filtrar.
    expect(screen.queryByLabelText("Buscar propiedades")).not.toBeInTheDocument();
  });

  it("no pide propiedades si la pantalla es otra", () => {
    conDatos();
    render(<OwnerWorkspace initialView="inquilinos" />);

    expect(mockProperties).not.toHaveBeenCalled();
  });
});

// --- Filas ---

describe("filas", () => {
  it("muestra dirección, detalle y alquiler vigente", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);

    const fila = (await screen.findByText("Av. Rivadavia 2340, 5.º A")).closest(
      ".owner-row"
    ) as HTMLElement;
    expect(within(fila).getByText("Departamento · CABA · 68 m²")).toBeInTheDocument();
    expect(within(fila).getByText("$ 478.691")).toBeInTheDocument();
    expect(within(fila).getByText("Al día")).toBeInTheDocument();
  });

  it("la propiedad sin contrato no muestra monto", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);

    const fila = (await screen.findByText("Mitre 78")).closest(".owner-row") as HTMLElement;
    expect(within(fila).getByText("Sin alquilar")).toBeInTheDocument();
    expect(within(fila).queryByText("por mes")).not.toBeInTheDocument();
  });

  it("una cuota vencida se ve en el estado de la propiedad", async () => {
    conDatos([RIVADAVIA, MITRE], [CUOTA_VENCIDA]);
    render(<OwnerWorkspace initialView="propiedades" />);

    const fila = (await screen.findByText("Av. Rivadavia 2340, 5.º A")).closest(
      ".owner-row"
    ) as HTMLElement;
    expect(within(fila).getByText("Vencida")).toBeInTheDocument();
  });

  it("un pago esperando confirmación gana sobre la cuota vencida", async () => {
    const conPago = {
      ...CUOTA_VENCIDA,
      payments: [
        {
          id: 9,
          invoiceId: 1000,
          status: "AWAITING_CONFIRMATION" as const,
          submittedByTenant: true,
        },
      ],
    };
    conDatos([RIVADAVIA], [conPago]);
    render(<OwnerWorkspace initialView="propiedades" />);

    const fila = (await screen.findByText("Av. Rivadavia 2340, 5.º A")).closest(
      ".owner-row"
    ) as HTMLElement;
    expect(within(fila).getByText("Pago a confirmar")).toBeInTheDocument();
  });

  // Contra un build anterior a la rama, `activeContract` no viene. Decir que
  // están todas sin alquilar sería un dato falso, no uno faltante.
  it("omite los chips cuando el backend no informa el contrato", async () => {
    const sinClave = [{ ...RIVADAVIA }, { ...MITRE }].map((p) => {
      const copia = { ...p };
      delete copia.activeContract;
      return copia;
    });
    conDatos(sinClave);
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    const fila = screen.getByText("Av. Rivadavia 2340, 5.º A").closest(".owner-row") as HTMLElement;
    expect(within(fila).queryByText("Sin alquilar")).not.toBeInTheDocument();
    expect(within(fila).queryByText("Al día")).not.toBeInTheDocument();
  });

  it("y tampoco ofrece el filtro por contrato, que contaría todo como libre", async () => {
    const sinClave = [{ ...RIVADAVIA }, { ...MITRE }].map((p) => {
      const copia = { ...p };
      delete copia.activeContract;
      return copia;
    });
    conDatos(sinClave);
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Av. Rivadavia 2340, 5.º A");

    expect(
      screen.queryByRole("group", { name: "Estado de la propiedad" })
    ).not.toBeInTheDocument();
  });
});

// --- Bajada y filtros ---

describe("bajada y filtros", () => {
  it("cuenta las propiedades y las que tienen contrato", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);

    expect(await screen.findByText("2 propiedades · 1 con contrato activo")).toBeInTheDocument();
  });

  it("busca por dirección", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Mitre 78");

    await userEvent.type(screen.getByLabelText("Buscar propiedades"), "Rivadavia");

    expect(screen.queryByText("Mitre 78")).not.toBeInTheDocument();
    expect(screen.getByText("Av. Rivadavia 2340, 5.º A")).toBeInTheDocument();
  });

  it("separa las alquiladas de las libres, con su conteo", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Mitre 78");

    await userEvent.click(screen.getByRole("button", { name: /Sin alquilar 1/ }));

    expect(screen.getByText("Mitre 78")).toBeInTheDocument();
    expect(screen.queryByText("Av. Rivadavia 2340, 5.º A")).not.toBeInTheDocument();
  });

  it("ofrece limpiar cuando ningún resultado coincide", async () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" />);
    await screen.findByText("Mitre 78");

    await userEvent.type(screen.getByLabelText("Buscar propiedades"), "zzzz");

    expect(screen.getByText("No hay propiedades que coincidan")).toBeInTheDocument();
  });
});

// --- Modo demo ---

describe("modo demo", () => {
  it("no llama al backend y muestra las de ejemplo", () => {
    conDatos();
    render(<OwnerWorkspace initialView="propiedades" demo />);

    expect(mockProperties).not.toHaveBeenCalled();
    expect(screen.getByText("Av. Rivadavia 2340, 5.º A")).toBeInTheDocument();
    expect(screen.queryByText("Cargando…")).not.toBeInTheDocument();
  });
});

// --- Detalle ---

describe("detalle", () => {
  /** Abre el detalle de la primera propiedad de la lista que se le pase. */
  async function abrirDetalle(properties = [RIVADAVIA, MITRE]) {
    conDatos(properties);
    render(<OwnerWorkspace initialView="propiedades" />);
    const direccion = `${properties[0].street} ${properties[0].number}${properties[0].floorUnit ? `, ${properties[0].floorUnit}` : ""}`;
    await userEvent.click(await screen.findByText(direccion));
  }

  it("muestra la dirección completa con el código postal cuando está", async () => {
    await abrirDetalle([{ ...RIVADAVIA, postalCode: "C1033" }]);

    expect(await screen.findByText(/C1033/)).toBeInTheDocument();
  });

  it("nombra la categoría en castellano, incluidas las nuevas", async () => {
    await abrirDetalle([{ ...RIVADAVIA, category: "GARAGE" }]);

    // Aparece en la bajada del encabezado y en la ficha de características.
    expect(await screen.findAllByText(/Cochera/)).toHaveLength(2);
  });

  it("no muestra características que la propiedad no tiene", async () => {
    await abrirDetalle([MITRE]);

    expect(await screen.findByText("Características")).toBeInTheDocument();
    expect(screen.queryByText("Preferencias")).not.toBeInTheDocument();
  });

  it("lista sólo las preferencias marcadas", async () => {
    await abrirDetalle([{ ...RIVADAVIA, petsAllowed: true, furnished: false }]);

    expect(await screen.findByText("Acepta mascotas")).toBeInTheDocument();
  });

  it("la propiedad libre ofrece crear el contrato", async () => {
    await abrirDetalle([MITRE]);

    expect(await screen.findByText("Esta propiedad está disponible")).toBeInTheDocument();
  });
});

// --- Archivar ---

describe("archivar", () => {
  const mockArchive = vi.mocked(AlquiaBackendClient.properties.archive);

  async function abrirDialogo() {
    conDatos([MITRE]);
    render(<OwnerWorkspace initialView="propiedades" />);
    await userEvent.click(await screen.findByText("Mitre 78"));
    await userEvent.click(await screen.findByRole("button", { name: /Archivar/ }));
  }

  it("aclara que la propiedad sale de la lista y su historia se conserva", async () => {
    await abrirDialogo();

    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByText(/se conserva/)).toBeInTheDocument();
    expect(mockArchive).not.toHaveBeenCalled();
  });

  it("archiva y vuelve a pedir la lista sin la archivada", async () => {
    await abrirDialogo();
    mockArchive.mockResolvedValueOnce({} as never);
    mockProperties.mockResolvedValue([]);

    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Archivar" })
    );

    await screen.findByText("Todavía no cargó ninguna propiedad");
    expect(mockArchive).toHaveBeenCalledWith(2);
  });

  it("explica el 409 y deja la propiedad donde estaba", async () => {
    await abrirDialogo();
    mockArchive.mockRejectedValueOnce(new ApiError(409, "Request violates a data constraint"));

    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Archivar" })
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede archivar: la propiedad tiene datos asociados"
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("se puede cancelar sin archivar nada", async () => {
    await abrirDialogo();

    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" })
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockArchive).not.toHaveBeenCalled();
  });
});
