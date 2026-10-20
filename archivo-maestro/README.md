# Archivo Maestro vivo

Una sola fuente de verdad con tu información profesional. Sirve para llenar formularios, generar CVs, darle contexto a Claude y, más adelante, al modelo de datos de Ruta Puente.

**El JSON es la fuente de verdad.** Todo lo demás se genera desde `data/perfil.json`. No edites a mano los archivos de `salidas/`.

> **Privacidad:** este repo de Ruta Puente es **público**. En la Fase 1 el perfil va vacío (solo estructura y pendientes). Cuando pegues tus datos reales (Fase 2), hablamos si conviene dejarlos solo en tu PC (gitignore) o en un repo privado. Nunca guardes SSN, pasaporte, cuentas bancarias ni contraseñas.

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
| `npm run validar` | Valida `perfil.json` contra el esquema, revisa fechas y campos prohibidos, lista pendientes | 1 ✅ |
| `npm run cv -- hr` | Genera CV `.docx` por familia (`hr`, `ld`, `ta`, `warehouse`) | 3 (pendiente) |
| `npm run espanso` | Genera atajos de Espanso | 4 (pendiente) |
| `npm run hoja` | Genera página HTML de respuestas rápidas | 4 (pendiente) |
| `npm run simplify` | Genera checklist para Simplify Copilot | 4 (pendiente) |
| `npm run claude` | Genera resumen Markdown para Claude | 4 (pendiente) |
| `npm run aplicacion` | Registra o actualiza aplicaciones | 5 (pendiente) |
| `npm run embudo` | Resume métricas del embudo | 5 (pendiente) |
| `npm run todo` | Por ahora solo corre `validar`. Más adelante: todo junto | 1 ✅ |

## Cómo actualizar un dato (cuando el perfil esté lleno)

1. Edita `data/perfil.json` (o usa el editor de la Fase 6).
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

## Fase 1 — criterio de listo

```bash
cd archivo-maestro
npm install
npm run validar
```

Debe terminar en **OK** (o OK con avisos) y mostrar la lista de **Pendientes**.

## Próxima fase

**Fase 2:** pegas el texto de tu Archivo Maestro actual. Lo paso a JSON sin inventar nada; lo dudoso va a `pending`. Criterio: `npm run validar` sin errores de esquema.
