/**
 * Validación y formato de CUIT/CUIL con dígito verificador (módulo 11).
 *
 * El backend lo exige con @ValidTaxId en dos lugares distintos: TenantRequest
 * (el CUIT del inquilino, que pide el asistente) y RegisterRequest (el CUIT
 * propio de la cuenta, que pide el registro). Si acá no se valida, el alta
 * falla recién al guardar y con un 400 que no dice qué campo está mal.
 */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function soloDigitos(s: string) {
  return s.replace(/\D/g, "").slice(0, 11);
}

export function formatearCuit(s: string) {
  const d = soloDigitos(s);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

export function cuitValido(s: string) {
  const d = soloDigitos(s);
  if (d.length !== 11) return false;
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(d[i]), 0);
  const resto = suma % 11;
  let esperado: number;
  if (resto === 0) {
    esperado = 0;
  } else if (resto === 1) {
    esperado = 9;
  } else {
    esperado = 11 - resto;
  }
  return esperado === Number(d[10]);
}
