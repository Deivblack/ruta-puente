# Archivo Maestro vivo

Una sola fuente de verdad con tu información profesional. Sirve para llenar formularios, generar CVs, darle contexto a Claude y, más adelante, al modelo de datos de Ruta Puente.

**El JSON es la fuente de verdad.** Todo lo demás se genera desde `data/perfil.json`. No edites a mano los archivos de `salidas/`.

> **Privacidad:** este repo (`ruta-puente`) es **público**. Aquí solo va la plantilla vacía y el esquema del producto.  
> **Tus datos reales van en un repo PRIVADO** (`archivo-maestro`). Mientras tanto, en este entorno pueden existir `data/perfil.local.json` (gitignore) solo como copia de trabajo. Nunca guardes SSN, pasaporte, cuentas bancarias ni contraseñas.

## Requisitos

- Node.js 18 o superior (gratis)
- En la terminal, desde esta carpeta

## Instalación (una vez)

```bash
cd archivo-maestro
npm install
```

## Comandos (estado actual)

| Comando | Qué hace | Fase |
|---------|----------|------|
| `npm run validar` | Valida el perfil (usa `perfil.local.json` si existe; si no, la plantilla), revisa fechas y campos prohibidos, lista pendientes | 1–2 ✅ |
| `npm run importar -- ruta.json` | Importa un JSON de Archivo Maestro a los archivos `.local.json` (sin subirlos a git) | 2 ✅ |
| `npm run cv -- hr` | Genera CV `.docx` por familia (`hr`, `ld`, `ta`, `warehouse` o `all`) | 3 ✅ |
| `npm run espanso` | Genera `salidas/espanso/ruta-puente.yml` (atajos; incluye `;dir`) | 4 ✅ |
| `npm run hoja` | Genera `salidas/respuestas-rapidas.html` (buscable + botón Copiar) | 4 ✅ |
| `npm run simplify` | Genera `salidas/simplify-checklist.md` para pegar en Simplify | 4 ✅ |
| `npm run claude` | Genera `salidas/archivo-maestro-claude.md` para tu proyecto Claude | 4 ✅ |
| `npm run aplicacion` | Registra o actualiza aplicaciones | 5 (pendiente) |
| `npm run embudo` | Resume métricas del embudo | 5 (pendiente) |
| `npm run todo` | validar + cv (todas) + espanso + hoja + simplify + claude | 4 ✅ |

## Cómo actualizar un dato

1. Edita `data/perfil.local.json` (tus datos reales).
2. Cambia `updated_at` a la fecha de hoy (`YYYY-MM-DD`).
3. Quita de `pending` lo que ya completaste.
4. Corre:

```bash
npm run todo
```

## Rutina semanal

1. Edita `perfil.local.json` si cambió algo → `npm run todo`.
2. Registra aplicaciones (Fase 5: `npm run aplicacion -- add`; mientras tanto puedes editar `aplicaciones.local.json`).
3. Corre `npm run claude` y sube `salidas/archivo-maestro-claude.md` a tu proyecto de Claude.
4. Cuando exista: `npm run embudo` para seguimiento (+10 días sin respuesta).

## Estructura

```
archivo-maestro/
  data/perfil.json           ← tú editas esto
  data/aplicaciones.json     ← historial de aplicaciones
  schema/perfil.schema.json  ← contrato de datos
  scripts/                   ← un archivo por comando
  plantillas/                ← plantillas de CV / exportación
  salidas/                   ← generado (ignorado por git, salvo .gitkeep)
```

## Fase 1 y 2 — criterio de listo

```bash
cd archivo-maestro
npm install
npm run validar
```

- **Fase 1:** plantilla vacía + pendientes → OK.
- **Fase 2:** con `perfil.local.json` importado → **OK** (puede avisar fechas que se cruzan si hubo doble empleo; eso no es error).

### Si importas de nuevo un JSON

```bash
npm run importar -- /ruta/a/tu-perfil.json
npm run validar
```

## Fase 3 — CVs

```bash
npm run cv -- all
# o uno: npm run cv -- hr
```

Salida: `salidas/CV_hr.docx`, `CV_ld.docx`, `CV_ta.docx`, `CV_warehouse.docx`.  
- Inglés, ATS (sin tablas ni columnas).  
- `ta` usa la base de empleos de `hr` (según `cv_version` en el perfil) y el resumen de TA del answer bank.  
- Ábrelos en Word y revisa 1–2 páginas.

## Fase 4 — Espanso, hoja, Simplify, Claude

```bash
npm run espanso
npm run hoja
npm run simplify
npm run claude
# o todo: npm run todo
```

### Instalar atajos Espanso en Windows (criterio: `;dir` en Chrome)

1. Instala Espanso gratis: https://espanso.org/install/
2. Genera el archivo: `npm run espanso`
3. Copia `salidas\espanso\ruta-puente.yml` a:

```text
%APPDATA%\espanso\match\ruta-puente.yml
```

Truco: pulsa `Win + R`, escribe `%APPDATA%\espanso\match` y Enter.
4. Reinicia Espanso (ícono en la bandeja → Restart), o en terminal: `espanso restart`
5. Abre Chrome, enfoca cualquier campo de texto y escribe: `;dir`  
   Debe expandir tu dirección completa.

Otros atajos útiles: `;email`, `;phone`, `;name`, `;salta`, `;sumta`, `;auth`, `;spons`.

### Hoja de respuestas

Abre `salidas/respuestas-rapidas.html` con doble clic (no necesita internet). Usa el buscador y el botón **Copiar**.

### Simplify

Abre `salidas/simplify-checklist.md` y pega los valores en tu perfil de Simplify una sola vez.

### Claude

Sube `salidas/archivo-maestro-claude.md` a tu proyecto de Claude (reemplaza el anterior cuando regeneres).

## Próxima fase

**Fase 5:** `aplicacion` y `embudo`.
