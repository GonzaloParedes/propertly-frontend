/**
 * Validación de teléfono, calcada de `PhoneNumberNormalizer` del backend
 * (`codex/frontend-integration-lots`, `c791aeb`) — no del regex viejo
 * (`@ValidPhoneNumber`) que reemplazó, y que tenía dos bugs que este archivo
 * llegó a parchear del lado del cliente:
 *
 * 1. Un teléfono con el 0 de la característica («01144552210») pasaba el
 *    patrón viejo y se guardaba mal: `+54901144552210`, con el 0 metido
 *    adentro. Acá lo rechazábamos nosotros, porque el backend no lo hacía.
 * 2. El patrón viejo admitía un solo separador entre característica y número:
 *    «11 4455-2210» —la forma en que se escribe un teléfono en Argentina— lo
 *    rechazaba.
 *
 * Verificado en vivo el 28/09/2026 contra la instancia: los dos casos ya
 * entran bien. `0221155667788` guarda `+5492215667788` (0 y 15 fuera, como
 * corresponde); `11 4477-8899` guarda `+5491144778899`. El parche ya no hace
 * falta — lo que queda es *decir que sí* a lo que antes decíamos que no.
 *
 * El backend ya no valida con un regex: reconstruye el número probando, en
 * orden, si tiene código de país, marcador de móvil (9), 0 de característica y
 * el 15 del celular, hasta encontrar un número nacional de exactamente 10
 * dígitos. Portarlo tal cual en vez de escribir un patrón propio es lo que
 * evita que las dos validaciones vuelvan a divergir.
 */
const LARGO_NACIONAL = 10;

function soloDigitosDesde(texto: string, inicio: number): string | null {
  let digitos = "";
  let ultimoFueDigito = false;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (/\d/.test(c)) {
      digitos += c;
      ultimoFueDigito = true;
    } else if ((c === " " || c === "-") && ultimoFueDigito) {
      // Un separador vale sólo pegado a un dígito de cada lado: ni al
      // principio, ni al final, ni dos seguidos.
      ultimoFueDigito = false;
    } else {
      return null;
    }
  }
  return ultimoFueDigito ? digitos : null;
}

/** Los dígitos del número, validando la posición de separadores y del «+». */
function digitosValidos(crudo: string): string | null {
  const recortado = crudo.trim();
  if (recortado.length === 0) return null;
  const tieneMas = recortado.startsWith("+");
  const inicio = tieneMas ? 1 : 0;
  if (inicio === recortado.length) return null;

  const digitos = soloDigitosDesde(recortado, inicio);
  if (digitos === null) return null;
  if (tieneMas && !digitos.startsWith("54")) return null;
  return digitos;
}

function variantesSinPais(digitos: string, teniaMas: boolean): string[] {
  if (teniaMas) return digitos.startsWith("54") ? [digitos.slice(2)] : [];
  const variantes = [digitos];
  if (digitos.startsWith("54")) variantes.push(digitos.slice(2));
  return variantes;
}

/** Prueba con y sin un prefijo opcional al inicio («9» o «0»), si está. */
function variantesSinPrefijo(digitos: string, prefijo: string): string[] {
  if (!digitos.startsWith(prefijo)) return [digitos];
  return [digitos, digitos.slice(prefijo.length)];
}

/** El «15» del celular puede estar pegado a una característica de 2 a 4 dígitos. */
function variantesSinQuince(digitos: string): string[] {
  const variantes = [digitos];
  for (let largoCaracteristica = 2; largoCaracteristica <= 4; largoCaracteristica++) {
    if (digitos.slice(largoCaracteristica, largoCaracteristica + 2) === "15") {
      variantes.push(digitos.slice(0, largoCaracteristica) + digitos.slice(largoCaracteristica + 2));
    }
  }
  return variantes;
}

function candidatosNacionales(digitos: string, teniaMas: boolean): string[] {
  return variantesSinPais(digitos, teniaMas)
    .flatMap((sinPais) => variantesSinPrefijo(sinPais, "9"))
    .flatMap((sinMovil) => variantesSinPrefijo(sinMovil, "0"))
    .flatMap(variantesSinQuince);
}

/** El número nacional de 10 dígitos que el backend terminaría guardando, o `null`. */
function numeroNacional(crudo: string): string | null {
  const digitos = digitosValidos(crudo);
  if (digitos === null) return null;
  const teniaMas = crudo.trim().startsWith("+");
  return candidatosNacionales(digitos, teniaMas).find(
    (candidato) => candidato.length === LARGO_NACIONAL
  ) ?? null;
}

export function soloDigitosTelefono(valor: string) {
  return valor.replace(/\D/g, "");
}

export function telefonoValido(valor: string): boolean {
  return numeroNacional(valor) !== null;
}

export function errorDeTelefono(valor: string): string {
  // `soloDigitosTelefono` ya saca el «+»: no hace falta contemplarlo acá.
  const digitos = soloDigitosTelefono(valor);
  if (digitos.length === 0) return "Ingrese un teléfono de contacto.";
  if (digitos.replace(/^54?9?0?/, "").length < 8) {
    return "Faltan dígitos: son 10 entre la característica y el número, sin contar el país.";
  }
  return "Revise el número. No pudimos reconocerlo como un teléfono argentino.";
}
