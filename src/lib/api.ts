const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

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

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
    });
    if (refreshRes.ok) {
      return request<T>(path, init, false);
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

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
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
