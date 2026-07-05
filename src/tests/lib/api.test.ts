import { ApiError, AuthExpiredError, apiGet, apiPost } from "@/lib/api";

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

// --- Clases de error ---

describe("ApiError", () => {
  it("almacena status y message", () => {
    const e = new ApiError(400, "Bad request");
    expect(e.status).toBe(400);
    expect(e.message).toBe("Bad request");
    expect(e.name).toBe("ApiError");
    expect(e).toBeInstanceOf(Error);
  });
});

describe("AuthExpiredError", () => {
  it("tiene el nombre y mensaje correctos", () => {
    const e = new AuthExpiredError();
    expect(e.message).toBe("Session expired");
    expect(e.name).toBe("AuthExpiredError");
    expect(e).toBeInstanceOf(Error);
  });
});

// --- apiGet ---

describe("apiGet", () => {
  it("retorna JSON parseado en respuesta 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: "1" }));
    const result = await apiGet<{ id: string }>("/test");
    expect(result).toEqual({ id: "1" });
  });

  it("envía GET con credentials: include y Content-Type", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiGet("/test");
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("retorna objeto vacío cuando el body es vacío", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const result = await apiGet("/test");
    expect(result).toEqual({});
  });
});

// --- apiPost ---

describe("apiPost", () => {
  it("envía POST con body serializado en JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiPost("/test", { name: "test" });
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "test" }),
        credentials: "include",
      })
    );
  });

  it("envía POST sin body cuando no se pasa ninguno", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiPost("/test");
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({ method: "POST", body: undefined })
    );
  });
});

// --- Manejo de errores ---

describe("manejo de errores HTTP", () => {
  it("lanza ApiError con el status correcto en respuesta 4xx", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 400, statusText: "Bad Request" })
    );
    const error = await apiGet("/test", { retry: false }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
  });

  it("lanza ApiError en respuesta 5xx", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("", { status: 500, statusText: "Internal Server Error" })
    );
    const error = await apiGet("/test", { retry: false }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(500);
  });

  it("usa body.message cuando el servidor lo incluye", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Error personalizado" }), {
        status: 422,
        statusText: "Unprocessable",
      })
    );
    const error = await apiGet("/test", { retry: false }).catch((e) => e);
    expect(error.message).toBe("Error personalizado");
  });

  it("usa statusText cuando el body no tiene message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 400, statusText: "Bad Request" })
    );
    const error = await apiGet("/test", { retry: false }).catch((e) => e);
    expect(error.message).toBe("Bad Request");
  });
});

// --- Lógica de reintento en 401 ---

describe("lógica de reintento en 401", () => {
  it("llama a /auth/refresh y reintenta cuando retry=true", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // request original
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 })); // refresh ok
    fetchMock.mockResolvedValueOnce(ok({ ok: true }));                  // reintento exitoso

    const result = await apiGet<{ ok: boolean }>("/test");
    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/auth/refresh",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("lanza AuthExpiredError cuando el refresh falla", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // refresh falla

    const error = await apiGet("/test").catch((e) => e);
    expect(error).toBeInstanceOf(AuthExpiredError);
  });

  it("no reintenta cuando retry=false, lanza ApiError directamente", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 401 }));
    const error = await apiGet("/test", { retry: false }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("no reintenta más de una vez aunque el refresh sea exitoso", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // original: 401
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 })); // refresh: ok
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // reintento: 401 de nuevo

    const error = await apiGet("/test").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
