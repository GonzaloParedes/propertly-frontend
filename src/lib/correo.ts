/**
 * El mismo criterio en los tres lugares donde se pide un correo: el alta de
 * inquilino, la edición de sus datos y el registro. Es lo que el backend valida
 * con `@Email`, que es deliberadamente laxo —no verifica que el dominio exista—,
 * así que acá tampoco se pretende más que eso.
 */
function tieneEspacio(texto: string): boolean {
  return [...texto].some((c) => /\s/.test(c));
}

export function correoValido(valor: string): boolean {
  const recortado = valor.trim();
  const partes = recortado.split("@");
  if (partes.length !== 2) return false;
  const [local, dominio] = partes;
  if (local.length === 0 || tieneEspacio(local) || tieneEspacio(dominio)) return false;
  const puntoFinal = dominio.lastIndexOf(".");
  if (puntoFinal <= 0) return false;
  return dominio.length - puntoFinal - 1 >= 2;
}
