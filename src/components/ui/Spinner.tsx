/** Anillo de espera: hereda el color del texto que lo rodea (`currentColor`). */
export function Spinner({ size = "sm" }: Readonly<{ size?: "sm" | "md" }>) {
  return <span aria-hidden="true" className={`alquia-spinner alquia-spinner--${size}`} />;
}

/**
 * Carga de un bloque o pantalla: anillo grande, sin texto a la vista. El rótulo
 * va oculto (`sr-only`) para que el lector de pantalla diga qué se espera.
 * Aparece con retardo (en CSS) para no parpadear cuando los datos llegan rápido.
 */
export function Cargando({ children, centered = false }: Readonly<{ children: React.ReactNode; centered?: boolean }>) {
  return (
    <output className={`alquia-cargando${centered ? " alquia-cargando--centrado" : ""}`}>
      <Spinner size="md" />
      <span className="sr-only">{children}</span>
    </output>
  );
}

/**
 * El aro grande de una espera larga (la lectura de un contrato): un trazo que crece y se achica
 * mientras gira, en vez del cuarto de círculo fijo del anillo chico. Es decorativo: el texto de al
 * lado dice qué se espera.
 */
export function ArcoDeEspera() {
  return (
    <svg className="alquia-arco" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle className="alquia-arco__pista" cx="50" cy="50" r="40" />
      <circle className="alquia-arco__trazo" cx="50" cy="50" r="40" />
    </svg>
  );
}
