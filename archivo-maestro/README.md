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
| `npm run aplicacion -- add` | Pregunta empresa/puesto/portal/… y agrega a `aplicaciones.local.json` | 5 ✅ |
| `npm run aplicacion -- estado <id> <estado>` | Cambia estado (`enviada\|vista\|entrevista\|rechazada\|cerrada\|oferta`) | 5 ✅ |
| `npm run embudo` | Totales, % respuesta, familia/portal/bilingüe, +10 días sin respuesta | 5 ✅ |
| `npm run panel` | Genera `salidas/panel.html` — pantalla visual para revisar y actualizar | panel ✅ |
| `npm run editor` | Genera `salidas/editor.html` — formularios para editar todo el perfil | 6 ✅ |
| `npm run todo` | validar + exports + panel + editor | ✅ |

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
2. Registra cada aplicación: `npm run aplicacion -- add`.
3. Actualiza estados: `npm run aplicacion -- estado 12 vista` (ejemplo).
4. Corre `npm run claude` y sube `salidas/archivo-maestro-claude.md` a Claude.
5. Corre `npm run embudo` y da seguimiento a las de +10 días sin respuesta.

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

## Fase 5 — Aplicaciones y embudo

```bash
# Registrar (interactivo)
npm run aplicacion -- add

# O con flags (útil para scripts)
npm run aplicacion -- add --empresa "Acme" --puesto "Recruiter" --portal LinkedIn --familia ta --salario 70000

# Cambiar estado
npm run aplicacion -- estado 3 entrevista

# Ver embudo
npm run embudo
```

Estados válidos: `enviada` · `vista` · `entrevista` · `rechazada` · `cerrada` · `oferta`.

### Prueba sin tocar el historial real

```bash
npm run aplicacion -- add --prueba --empresa "Demo" --puesto "Bilingual Recruiter" --portal LinkedIn --familia ta --salario 70000
npm run embudo -- --prueba
```

Eso usa `data/aplicaciones.prueba.json` (gitignore), no tu lista real.

## Panel visual (revisar y actualizar)

```bash
npm run panel
```

Abre `salidas/panel.html` con doble clic. Ahí ves:

- KPIs y aplicaciones con +10 días sin respuesta  
- Embudo (estado, familia, portal, bilingüe)  
- Tabla de aplicaciones (cambiar estado y descargar JSON)  
- Pendientes (marcar resueltos)  
- Datos personales y salarios (editar y descargar)

**Flujo de actualización:** editas en el panel → **Descargar perfil.json** o **aplicaciones.json** → reemplazas el archivo en `data/` (p. ej. `perfil.local.json`) → `npm run todo` si quieres regenerar CVs/exports.

## Fase 6 — Editor completo

```bash
npm run editor
```

Abre `salidas/editor.html` con **doble clic en Chrome** (no lo leas como código en Cursor).

1. Edita por pestañas (Personal, Experiencia, Pendientes…).
2. **Revisar campos vacíos** resalta en rojo lo que falta (no guarda nada).
3. Opcional: **Abrir archivo JSON** si quieres cargar otro perfil.
4. Pulsa **Descargar perfil.json** (esto sí “guarda”: baja el archivo).
5. Reemplaza `data/perfil.local.json` (o `perfil.json` en el repo privado).
6. En la terminal: `npm run validar` (y `npm run todo` si quieres regenerar todo).

### ¿Se guarda solo?
**No.** El editor vive en el navegador. Si cierras la pestaña sin descargar, pierdes los cambios de esa sesión.

### ¿Y si lo quiero desde la nube / GitHub?
El proyecto “vivo” con tus datos debe estar en el **repo privado** `https://github.com/Deivblack/archivo-maestro` (no en `ruta-puente`, que es público).

En cualquier PC:

```bash
git clone https://github.com/Deivblack/archivo-maestro.git
cd archivo-maestro
npm install
npm run editor
```

Abres `salidas/editor.html`, editas, descargas, reemplazas `data/perfil.json`, haces `git add` + `git commit` + `git push`.

Si solo abres el HTML desde Cursor Agent Store, es una **copia de esa sesión**. La fuente de verdad a largo plazo es el JSON en el repo privado + `git push`.
