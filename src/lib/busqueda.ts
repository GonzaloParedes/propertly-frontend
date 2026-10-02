/** Sin tildes ni mayúsculas: «Perez» tiene que encontrar «Pérez». */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Un texto vacío no filtra nada; si no, tiene que estar en alguna de las partes. */
export function coincideTexto(partes: readonly string[], texto: string): boolean {
  const buscado = normalizar(texto.trim());
  return buscado === "" || normalizar(partes.join(" ")).includes(buscado);
}
