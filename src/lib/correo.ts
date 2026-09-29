/**
 * El mismo criterio en los tres lugares donde se pide un correo: el alta de
 * inquilino, la edición de sus datos y el registro. Es lo que el backend valida
 * con `@Email`, que es deliberadamente laxo —no verifica que el dominio exista—,
 * así que acá tampoco se pretende más que eso.
 */
export function correoValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim());
}
