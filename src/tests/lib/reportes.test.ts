import { ERROR_CAPTURA_PESADA, ERROR_CAPTURA_TIPO, MAXIMO_CAPTURA_BYTES, validarCaptura } from "@/lib/reportes";

const archivo = (nombre: string, type: string) => new File(["x"], nombre, { type });

describe("validarCaptura", () => {
  it("acepta un PNG con type application/octet-stream", () => {
    expect(validarCaptura(archivo("captura.png", "application/octet-stream"))).toBeNull();
  });

  it("valida la extensión sin distinguir mayúsculas con octet-stream", () => {
    expect(validarCaptura(archivo("FOTO.JPEG", "application/octet-stream"))).toBeNull();
    expect(validarCaptura(archivo("foto.WebP", "application/octet-stream"))).toBeNull();
  });

  it("rechaza un .txt con type application/octet-stream", () => {
    expect(validarCaptura(archivo("notas.txt", "application/octet-stream"))).toBe(ERROR_CAPTURA_TIPO);
  });

  it("acepta un PNG con type vacío", () => {
    expect(validarCaptura(archivo("captura.png", ""))).toBeNull();
  });

  it("rechaza un type no soportado aunque el nombre termine en .png", () => {
    expect(validarCaptura(archivo("captura.png", "image/gif"))).toBe(ERROR_CAPTURA_TIPO);
  });

  it("rechaza una captura de más de 5 MB", () => {
    const grande = new File([new Uint8Array(MAXIMO_CAPTURA_BYTES + 1)], "a.png", { type: "application/octet-stream" });
    expect(validarCaptura(grande)).toBe(ERROR_CAPTURA_PESADA);
  });
});
