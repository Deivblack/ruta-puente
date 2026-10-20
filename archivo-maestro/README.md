# Archivo Maestro vivo

Una sola fuente de verdad con tu información profesional. Sirve para llenar formularios, generar CVs, darle contexto a Claude y, más adelante, al modelo de datos de Ruta Puente.

**El JSON es la fuente de verdad.** Todo lo demás se genera desde `data/perfil.json`. No edites a mano los archivos de `salidas/`.

> **Privacidad:** este repo de Ruta Puente es **público**. Tus datos reales viven en `data/perfil.local.json` y `data/aplicaciones.local.json` (están en `.gitignore` y **no se suben a GitHub**). El `perfil.json` del repo es solo la plantilla vacía. Nunca guardes SSN, pasaporte, cuentas bancarias ni contraseñas.

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
| `npm run cv -- hr` | Genera CV `.docx` por familia (`hr`, `ld`, `ta`, `warehouse`) | 3 (pendiente) |
| `npm run espanso` | Genera atajos de Espanso | 4 (pendiente) |
| `npm run hoja` | Genera página HTML de respuestas rápidas | 4 (pendiente) |
| `npm run simplify` | Genera checklist para Simplify Copilot | 4 (pendiente) |
| `npm run claude` | Genera resumen Markdown para Claude | 4 (pendiente) |
| `npm run aplicacion` | Registra o actualiza aplicaciones | 5 (pendiente) |
| `npm run embudo` | Resume métricas del embudo | 5 (pendiente) |
| `npm run todo` | Por ahora solo corre `validar`. Más adelante: todo junto | 1–2 ✅ |

## Cómo actualizar un dato

1. Edita `data/perfil.local.json` (tus datos reales).
2. Cambia `updated_at` a la fecha de hoy (`YYYY-MM-DD`).
3. Quita de `pending` lo que ya completaste.
4. Corre:

```bash
npm run todo
```

## Rutina semanal (cuando existan los demás comandos)

1. Registra cada aplicación (`npm run aplicacion -- add`).
2. Corre `npm run claude`.
3. Sube `salidas/archivo-maestro-claude.md` a tu proyecto de Claude.
4. Revisa el embudo (`npm run embudo`) y da seguimiento a las que llevan más de 10 días sin respuesta.

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

## Próxima fase

**Fase 3:** `npm run cv -- hr` (también `ld`, `ta`, `warehouse`) → abre los `.docx` en Word y revisa que se vean bien.
