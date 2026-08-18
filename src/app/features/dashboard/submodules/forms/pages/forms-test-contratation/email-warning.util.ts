/**
 * Detección de "parece que escribió un dominio en el campo Usuario del correo".
 *
 * Es una ADVERTENCIA preventiva, nunca una validación: el llamador no debe usar
 * esto para invalidar el control ni para frenar el guardado. Por eso vive como
 * función pura separada del componente: se prueba en aislamiento y no toca
 * Angular ni el FormGroup.
 *
 * Señales que se consideran FUERTES (advierten):
 *  1. Contiene `@` → casi seguro pegó/escribió el correo completo. (En el flujo
 *     normal el sanitizador ya quita el `@` al teclear; esta señal cubre los
 *     valores que entran por precarga/borrador sin pasar por el input.)
 *  2. Contiene un dominio COMPLETO del catálogo del sistema (GMAIL.COM,
 *     OUTLOOK.ES, …), en cualquier posición: "ivvangmail.com",
 *     "ivvangmail.comgmail.com", "ivvan..gmail.com".
 *  3. Termina en un TLD presente en el catálogo (.COM, .CO, .ES, …): cubre
 *     dominios que NO están en el catálogo ("ivvanlatinmail.com").
 *
 * Señales que deliberadamente NO advierten (evitar falsos positivos):
 *  - Nombres que contienen una marca sin puntos: "ivvangmail", "anahotmail".
 *  - Puntos normales de usuario: "juan.perez", "ana.maria".
 */

/** Sufijos TLD únicos del catálogo (p. ej. GMAIL.COM → "COM"). */
function tldsDelCatalogo(dominios: readonly string[]): string[] {
  const tlds = new Set<string>();
  for (const d of dominios) {
    const seg = String(d ?? '').trim().toUpperCase().split('.').pop() ?? '';
    if (seg.length >= 2) tlds.add(seg);
  }
  return [...tlds];
}

export function detectarDominioEnUsuario(
  usuario: string | null | undefined,
  dominios: readonly string[],
): boolean {
  const bruto = String(usuario ?? '').trim();
  if (!bruto) return false;

  // Señal 1: un @ en el usuario es un correo completo (o un intento).
  if (bruto.includes('@')) return true;

  // Para las señales por dominio se comparan mayúsculas y sin espacios:
  // "ivvan gmail.com" es el mismo error que "ivvangmail.com".
  const limpio = bruto.toUpperCase().replace(/\s+/g, '');

  // Señal 2: dominio completo del catálogo en cualquier posición.
  for (const d of dominios) {
    const dom = String(d ?? '').trim().toUpperCase();
    if (dom && limpio.includes(dom)) return true;
  }

  // Señal 3: termina en ".TLD" conocido por el catálogo (.COM, .CO, .ES, …).
  const tlds = tldsDelCatalogo(dominios);
  if (tlds.length && new RegExp(`\\.(?:${tlds.join('|')})$`).test(limpio)) return true;

  return false;
}
