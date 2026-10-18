import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("con NEXT_PUBLIC_SITE_URL configurada", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://alquia.example/"));
  afterEach(() => vi.unstubAllEnvs());

  it("el sitemap lista las páginas públicas con URL absoluta", () => {
    expect(sitemap().map((p) => p.url)).toEqual([
      "https://alquia.example",
      "https://alquia.example/registro",
      "https://alquia.example/login",
    ]);
  });

  it("robots deja rastrear lo público, excluye lo privado y apunta al sitemap", () => {
    const resultado = robots();
    expect(resultado.sitemap).toBe("https://alquia.example/sitemap.xml");
    const reglas = Array.isArray(resultado.rules) ? resultado.rules[0] : resultado.rules;
    expect(reglas.allow).toBe("/");
    expect(reglas.disallow).toEqual(expect.arrayContaining(["/dashboard", "/tenant-portal", "/restablecer-contrasena"]));
  });
});

describe("sin NEXT_PUBLIC_SITE_URL (preview o local)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", ""));
  afterEach(() => vi.unstubAllEnvs());

  it("el sitemap queda vacío", () => {
    expect(sitemap()).toEqual([]);
  });

  it("robots no deja indexar nada", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});
