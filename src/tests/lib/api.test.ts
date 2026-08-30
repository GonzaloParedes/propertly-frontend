import {
  ApiError,
  AuthExpiredError,
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  apiDelete,
  apiGetBlob,
} from "@/lib/api";

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

  it("retorna texto plano cuando el content-type no es JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("test@test.com", {
        status: 200,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
      })
    );
    const result = await apiGet<string>("/test");
    expect(result).toBe("test@test.com");
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

// --- apiPostForm ---

describe("apiPostForm", () => {
  it("envía POST con el FormData como body y sin pisar el Content-Type", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    const form = new FormData();
    form.append("file", new File(["hello"], "test.txt"));
    await apiPostForm("/test", form);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call[0]).toBe("/test");
    const init = call[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(form);
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string> | undefined)?.["Content-Type"]).toBeUndefined();
  });

  it("retorna JSON parseado en respuesta 200", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({ id: "1" }));
    const form = new FormData();
    const result = await apiPostForm<{ id: string }>("/test", form);
    expect(result).toEqual({ id: "1" });
  });
});

// --- apiPut ---

describe("apiPut", () => {
  it("envía PUT con body serializado en JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiPut("/test", { name: "test" });
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ name: "test" }),
        credentials: "include",
      })
    );
  });

  it("envía PUT sin body cuando no se pasa ninguno", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiPut("/test");
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({ method: "PUT", body: undefined })
    );
  });
});

// --- apiDelete ---

describe("apiDelete", () => {
  it("envía DELETE con credentials: include", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiDelete("/test");
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({ method: "DELETE", credentials: "include" })
    );
  });

  it("retorna objeto vacío cuando el body es vacío", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const result = await apiDelete("/test");
    expect(result).toEqual({});
  });
});

// --- apiGetBlob ---

describe("apiGetBlob", () => {
  it("retorna un Blob en respuesta 200", async () => {
    // El Response de jsdom no preserva fielmente un body Blob, así que se stubea
    // el .blob() del mock directamente en vez de pasar por un Response real.
    const blob = new Blob(["file contents"], { type: "application/pdf" });
    const fakeResponse = { status: 200, ok: true, blob: () => Promise.resolve(blob) };
    vi.mocked(fetch).mockResolvedValueOnce(fakeResponse as unknown as Response);
    const result = await apiGetBlob("/test");
    expect(result).toBe(blob);
  });

  it("envía GET con credentials: include", async () => {
    const fakeResponse = { status: 200, ok: true, blob: () => Promise.resolve(new Blob([])) };
    vi.mocked(fetch).mockResolvedValueOnce(fakeResponse as unknown as Response);
    await apiGetBlob("/test");
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({ method: "GET", credentials: "include" })
    );
  });

  it("lanza ApiError con el status correcto en respuesta no-OK", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not found" }), { status: 404 })
    );
    const error = (await apiGetBlob("/test", { retry: false }).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
  });

  it("reintenta una vez en 401 y retorna el Blob del reintento", async () => {
    const fetchMock = vi.mocked(fetch);
    const blob = new Blob(["ok"]);
    const fakeResponse = { status: 200, ok: true, blob: () => Promise.resolve(blob) };
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // request original
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 })); // refresh ok
    fetchMock.mockResolvedValueOnce(fakeResponse as unknown as Response); // reintento

    const result = await apiGetBlob("/test");
    expect(result).toBe(blob);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("lanza AuthExpiredError cuando el refresh falla", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // el refresh falla

    const error = await apiGetBlob("/test").catch((e) => e);
    expect(error).toBeInstanceOf(AuthExpiredError);
  });
});

// --- Manejo de errores ---

describe("manejo de errores HTTP", () => {
  it("lanza ApiError con el status correcto en respuesta 4xx", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 400, statusText: "Bad Request" })
    );
    const error = (await apiGet("/test", { retry: false }).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
  });

  it("lanza ApiError en respuesta 5xx", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("", { status: 500, statusText: "Internal Server Error" })
    );
    const error = (await apiGet("/test", { retry: false }).catch((e) => e)) as ApiError;
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
    const error = (await apiGet("/test", { retry: false }).catch((e) => e)) as ApiError;
    expect(error.message).toBe("Error personalizado");
  });

  it("usa statusText cuando el body no tiene message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 400, statusText: "Bad Request" })
    );
    const error = (await apiGet("/test", { retry: false }).catch((e) => e)) as ApiError;
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
    const error = (await apiGet("/test", { retry: false }).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("no reintenta más de una vez aunque el refresh sea exitoso", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // original: 401
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 })); // refresh: ok
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 })); // reintento: 401 de nuevo

    const error = (await apiGet("/test").catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

// --- header anti-CSRF ---

describe("header X-Requested-With", () => {
  it("lo envía en requests con body JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    await apiPost("/test", { name: "test" });
    expect(fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Requested-With": "XMLHttpRequest" }),
      })
    );
  });

  it("lo envía en requests con FormData, sin agregar Content-Type", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(ok({}));
    const form = new FormData();
    form.append("file", new File(["hello"], "test.txt"));
    await apiPostForm("/test", form);
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("lo envía también en el POST a /auth/refresh", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(new Response("", { status: 401 }));
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    fetchMock.mockResolvedValueOnce(ok({ ok: true }));

    await apiGet("/test");
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/auth/refresh",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Requested-With": "XMLHttpRequest" }),
      })
    );
  });
});
