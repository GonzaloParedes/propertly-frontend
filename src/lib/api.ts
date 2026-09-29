const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// El backend rechaza con 403 todo POST/PUT/PATCH/DELETE que no traiga este header
// (CsrfHeaderFilter). Es su defensa anti-CSRF: un <form> cross-site no puede setear
// headers propios, y hacerlo por fetch fuerza un preflight que allowed-origins corta.
// Va en todas las requests, no solo en las mutantes: el filtro solo mira los métodos
// que cambian estado, pero mandarlo siempre evita tener que decidirlo acá.
const CSRF_HEADER = { "X-Requested-With": "XMLHttpRequest" } as const;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "AuthExpiredError";
  }
}

async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<Response> {
  // Un body FormData no lleva Content-Type propio: fetch calcula el boundary
  // multipart solo cuando arma el header él mismo.
  const isFormData = init.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: isFormData
      ? { ...CSRF_HEADER, ...init.headers }
      : {
          "Content-Type": "application/json",
          ...CSRF_HEADER,
          ...init.headers,
        },
  });

  if (res.status === 401 && retry) {
    // Un solo reintento: si el access token expiró, /auth/refresh emite uno nuevo
    // y repetimos la request una vez con retry=false. Si esa segunda vuelta
    // también da 401, es que la sesión ya no es recuperable (evita loop infinito).
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { ...CSRF_HEADER },
    });
    if (refreshRes.ok) {
      return fetchWithAuth(path, init, false);
    }
    throw new AuthExpiredError();
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // use statusText as fallback
    }
    throw new ApiError(res.status, message);
  }

  return res;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const res = await fetchWithAuth(path, init, retry);
  const text = await res.text();
  if (!text) return {} as T;
  // Algunos endpoints (ej. /auth/me) responden texto plano en vez de JSON.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return text as unknown as T;
  return JSON.parse(text) as T;
}

export function apiGet<T>(path: string, options?: { retry?: boolean }): Promise<T> {
  return request<T>(path, { method: "GET" }, options?.retry ?? true);
}

export function apiPost<T>(
  path: string,
  body?: unknown,
  options?: { retry?: boolean }
): Promise<T> {
  return request<T>(
    path,
    {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    options?.retry ?? true
  );
}

export function apiPostForm<T>(
  path: string,
  formData: FormData,
  options?: { retry?: boolean }
): Promise<T> {
  return request<T>(path, { method: "POST", body: formData }, options?.retry ?? true);
}

export function apiPut<T>(
  path: string,
  body?: unknown,
  options?: { retry?: boolean }
): Promise<T> {
  return request<T>(
    path,
    {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    },
    options?.retry ?? true
  );
}

export function apiDelete<T>(path: string, options?: { retry?: boolean }): Promise<T> {
  return request<T>(path, { method: "DELETE" }, options?.retry ?? true);
}

export async function apiGetBlob(path: string, options?: { retry?: boolean }): Promise<Blob> {
  const res = await fetchWithAuth(path, { method: "GET" }, options?.retry ?? true);
  return res.blob();
}
