import type { ReminderSettingsResponse } from "@/lib/backend-types";

/**
 * El backend acota los dos valores a 0–30 (`@Min`/`@Max` en
 * `ReminderSettingsRequest`). Vive acá para que el formulario no ofrezca un
 * número que termina en un 400 recién al guardar.
 */
export const DIAS_MIN = 0;
export const DIAS_MAX = 30;

const dias = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;

export interface LineaRecordatorio {
  etiqueta: string;
  valor: string;
}

/**
 * Los tres recordatorios configurables, en texto. Un valor en cero no es «cero
 * días»: es que ese aviso no se manda, y decirlo así evita que parezca que llega
 * el mismo día.
 */
export function describirRecordatorios(
  settings: ReminderSettingsResponse
): LineaRecordatorio[] {
  return [
    {
      etiqueta: "Antes del vencimiento",
      valor: settings.daysBeforeDue > 0 ? dias(settings.daysBeforeDue) : "No se avisa",
    },
    {
      etiqueta: "El día del vencimiento",
      valor: settings.dueDateReminderEnabled ? "Se avisa" : "No se avisa",
    },
    {
      etiqueta: "Después del vencimiento",
      valor: settings.daysAfterDue > 0 ? dias(settings.daysAfterDue) : "No se avisa",
    },
  ];
}

/**
 * La bajada de la tarjeta. El interruptor general apaga los tres de arriba, así
 * que cuando está en cero lo que corresponde es decirlo y no listar días que no
 * se usan.
 */
export function resumenRecordatorios(settings: ReminderSettingsResponse): string {
  if (!settings.enabled) {
    return "Los recordatorios están desactivados: no se le envía ninguno al inquilino.";
  }
  return "El inquilino recibe estos avisos por correo sobre sus cuotas.";
}
