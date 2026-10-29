# AGENTS.md — Ruta Puente

Instrucciones para cualquier agente de código (Cursor, Claude Code, etc.) que trabaje en este repositorio. Léelas completas antes de cada tarea.

## 1. Qué es Ruta Puente
Servicio de empleabilidad para **profesionales latinoamericanos que viven en EE. UU., tienen título universitario, pueden trabajar legalmente y hoy trabajan por debajo de su nivel** (almacén, limpieza, restaurantes, delivery). Objetivo: que vuelvan a trabajar en su campo.
- Dueño del producto: David (Houston, TX). Habla español; inglés intermedio. Es implementador de software, **no programador**: explícale los cambios en español, en lenguaje simple, y pídele confirmación antes de cualquier paso que no se pueda deshacer.
- Etapa actual: **Sprint 0 (validación)**. Regla de paso al Sprint 1: 5 entrevistas dentro del perfil y 3 que confirmen el problema. Piloto continuo del 12 oct al 15 nov 2026.
- Las cuentas con contraseña para usuarios llegan **después de 25 usuarios activos**. Hasta entonces, cada persona entra a su app con un enlace personal.

## 2. Reglas que no se rompen
1. **Costo cero.** Nada de servicios de pago, licencias, servidores ni bases de datos nuevas. El stack es: GitHub Pages + Google Apps Script + Google Sheets + Google Drive. Si algo requiere pagar, detente y pregunta.
2. **Sin dependencias ni build.** HTML, CSS y JavaScript puros. Cada página es **un solo archivo** `index.html` con su CSS y JS dentro. Lo único externo permitido: Google Fonts. Nada de npm en el sitio, ni React, ni Tailwind, ni bundlers.
3. **Nunca subas secretos al repo.** El repo es **público**. La clave de la Bitácora vive en Script Properties (`BITACORA_CLAVE`) y no se escribe en ningún archivo. Tampoco correos personales, números de teléfono reales ni datos de personas.
4. **Privacidad por diseño.** Nunca crees campos ni preguntes por: estatus migratorio, visas, SSN, pasaporte, cédula, cuentas bancarias, antecedentes penales o información médica. Para elegibilidad solo existe "¿Puedes trabajar legalmente en EE. UU.? (Sí/No)".
5. **No rompas lo que ya está en uso:**
   - La URL del Apps Script (`SCRIPT_URL`) no cambia: siempre se despliega como **nueva versión de la misma implementación**, nunca como implementación nueva.
   - Los enlaces personales `https://deivblack.github.io/ruta-puente/app/?c=<codigo>` deben seguir funcionando.
   - Los nombres de columnas de la hoja y los nombres de campos del formulario son un contrato: si cambias uno, cambia todos los lugares que lo usan y avísale a David.
6. **Textos para usuarios en español** (latino neutro, tono cercano, frases cortas). Código, comentarios y nombres de variables: sigue lo existente, que está en español (`codigo`, `nombre`, `barrera`).
7. **Móvil primero.** Casi todos los usuarios usan el celular. Todo debe verse bien a 360–400 px de ancho, sin scroll horizontal, con botones grandes.
8. **Seguridad básica:** todo texto que vaya a la hoja pasa por `limpiar()` (evita inyección de fórmulas). Todo texto que se pinte en HTML usa `textContent` o escape, nunca `innerHTML` con datos del usuario.
9. **Antes de borrar archivos, columnas o datos, pregunta.**

## 3. Estructura del repositorio
```
/                     → GitHub Pages publica la rama main desde la raíz
├── index.html        → Landing + formulario de 4 pasos (pre-entrevista)
├── app/index.html    → App personal (6 pasos) que se abre con ?c=<codigo>
├── app/app-body.html → Copia de la app sin <head> (vista previa; mantener igual que app/index.html o borrar si David lo aprueba)
├── bitacora/index.html → Página privada de David para registrar entrevistas (requiere clave; noindex)
├── apps-script.gs    → Copia del código del Apps Script (la fuente real está en Google; ver sección 6)
├── logo.svg, logo-mark.svg, logo-icon.svg
└── README.md
```
URLs públicas:
- Landing: https://deivblack.github.io/ruta-puente/
- App (ejemplo, sin código): https://deivblack.github.io/ruta-puente/app/
- Bitácora: https://deivblack.github.io/ruta-puente/bitacora/

## 4. Arquitectura
```
[Landing + formulario] --POST form-urlencoded--> [Apps Script doPost] --> Hoja "Respuestas"
                                                        └--> Correo a David con la ficha de entrevista
[App personal ?c=codigo] --GET ?codigo=--> [Apps Script doGet] --> datos mínimos de la persona
[Bitácora] --POST text/plain JSON {clave, accion}--> [Apps Script doPost → bitacora()] --> Hoja "Entrevistas"
[Trigger lunes 8 a. m.] --> resumenSemanal() --> correo a David
[Trigger diario 8 a. m.] --> seguimientoEmpleo() --> correo a David (hitos 7/30/60/90)
```
- `SCRIPT_URL` (igual en las 3 páginas): `https://script.google.com/macros/s/AKfycbwMKLgkkTPKJahu1wvk9TkTeuhYcnjElm7IIQ5jH8PqB51r_LCKzcrWrcLYG4shRt0w/exec`
- ID del proyecto Apps Script: `1mLZVH8IdSfyc2K1nPj3mF4LBEZHnw9rP9SNvHg2bXxYNSod4txkl1Wad`
- ID de la implementación (deployment) activa: el mismo que aparece en `SCRIPT_URL` (`AKfycbwMKLgk…`). Versión actual: 5 ("v5 - bitacora").
- El script está **vinculado a la hoja** "Ruta Puente - Respuestas" (`SpreadsheetApp.getActiveSpreadsheet()`).
- Nota técnica: Google reserva el parámetro `c` en `/exec`; por eso la app llama con `?codigo=` y `doGet` acepta `codigo` (y `c` por compatibilidad).
- La Bitácora manda `fetch(SCRIPT_URL, {method:'POST', body: JSON.stringify(...)})` sin cabeceras (queda `text/plain`, sin preflight CORS). El formulario manda `URLSearchParams` con `mode:'no-cors'`. `doPost` distingue los dos por `e.postData.type`.

## 5. Contratos de datos
### Hoja "Respuestas" (columnas, en orden)
`fecha, prioridad, nombre, whatsapp, ciudad, pais, fuente, profesion, titulo, anios_exp, tiempo_eeuu, autorizado, trabajo_actual, horas_trabajo, busco_12m, aplicaciones, respuestas, barrera, horas_disponibles, horario, comentario, consentimiento, estado, codigo, enlace, fecha_empleo, seguimiento_7, seguimiento_30, seguimiento_60, seguimiento_90, fecha_contacto, fecha_entrevista, cv_puntaje_antes, cv_puntaje_despues, plan_enviado, proximo_paso, proximo_fecha, notas_david`
- `prioridad` se calcula en el servidor: `autorizado = No` → "Fuera de perfil"; si no, 1 punto por título, 1 por buscar en 12 meses, 1 por autorizado → 3 = Alta, 2 = Media, menos = Baja.
- `estado` (lista desplegable, en orden): Nuevo → Contactado → Agendado → Entrevistado → CV recibido → CV revisado → Plan enviado → Aplicando → Entrevista laboral → Empleado; salidas: No responde, Descartado, Pausa.
- `codigo`: 10 caracteres hex (`Utilities.getUuid()` sin guiones, recortado). `enlace` = URL de la app + `?c=` + código.
- Campos con opción "Otro/Otra": se guardan como `"Otro: texto"`.
- `fecha_empleo`: la llena David cuando la persona empieza a trabajar (fase 7).
- `seguimiento_7` / `_30` / `_60` / `_90`: David pone `Sí` cuando ya contactó ese hito. El correo diario avisa si ya pasaron esos días y la celda sigue vacía (así no se pierde si se salta el día exacto).
- `proximo_paso` / `proximo_fecha`: se recalculan al cambiar `estado` (trigger instalable `onEditEstado` o API `guardar_estado`). David puede sobrescribirlas. Contactado +3 días, Entrevistado/CV recibido/CV revisado +1, Plan enviado/Aplicando +7, Agendado usa `fecha_entrevista` si existe, Empleado usa el próximo hito 7/30/60/90.
- `migrarEstados()` (por defecto simulación): propone `Entrevistado` a quien ya tenga fila en "Entrevistas". Ejecutar `migrarEstados(false)` solo a mano tras revisar el log.

### Hoja "Entrevistas" (una fila por persona, por `codigo`)
`actualizado, codigo, nombre, dentro_perfil, p1_ultima_busqueda, p2_desanimo, lo_intento, p3_ejemplo_barrera, p4_que_intento, gasto, monto_usd, barrera_clara, p5_una_cosa, p6_avance, p7_sirve_sobra, p8_falta, p9_usara, p10_referidos, compromiso, frase_clave, sorpresa, confirma`
- `compromiso` = Sí si `p9_usara = Sí` o `p10_referidos > 0`.
- `confirma` = Sí si `lo_intento`, `barrera_clara` y `compromiso` son Sí.
- Contador del Sprint 1: filas con `dentro_perfil = Sí` (meta 5) y de esas, `confirma = Sí` (meta 3).

### API del Apps Script
- `GET ?codigo=<10 hex>` → `{ok, persona:{nombre (solo primer nombre), pais, profesion, anios_exp, ciudad, barrera}}`. Solo lectura y datos mínimos: **no agregues campos sensibles aquí** (la URL es pública).
- `POST` form-urlencoded (formulario) → guarda fila, envía ficha. Ignora envíos con `website` (honeypot) o sin `nombre`.
- `POST` text/plain JSON `{clave, accion:"listar"}` → `{ok, personas[], gate:{dentro, confirman}, estados[]}`. Incluye campos de flujo (`proximo_paso`, `proximo_fecha`, notas, puntajes, etc.).
- `POST` text/plain JSON `{clave, accion:"guardar", datos:{codigo, ...campos de Entrevistas}}` → crea o actualiza la fila y pone `estado = Entrevistado`.
- `POST` text/plain JSON `{clave, accion:"guardar_estado", datos:{codigo, estado, proximo_paso?, proximo_fecha?, notas_david?, ...}}` → cambia estado y recalcula próximo paso/fecha.
- Clave incorrecta → `{ok:false, error:"clave"}` con 800 ms de espera.

### App personal (app/index.html)
- 6 pasos: `Perfil, Tu cargo, Carril, Vacantes, Contacto, Aplicaciones`. Pantalla de inicio con la ruta y barra de progreso.
- Un paso tiene ✓ solo si la persona lo confirmó **y** cumple su requisito: paso 1 → escribió sus logros; paso 4 → ZIP de 5 dígitos; paso 5 → copió su mensaje; paso 6 → al menos 1 aplicación anotada.
- Sin código válido, muestra el ejemplo `EJEMPLO` (María) con la etiqueta "Ejemplo".
- Estado local (localStorage, siempre dentro de try/catch): `rp-wins`, `rp-apps`, `rp-ok-<codigo>`, `rp-ok-<codigo>-copy`.
- Diccionario `TITLES`: cargo en español → cargo en EE. UU., alternativas, palabras clave y "carriles".

### Bitácora (bitacora/index.html)
- Pide la clave una vez y la guarda en el celular (`rp-bit-clave`). Borradores por persona en `rp-bit-draft-<codigo>`.
- 6 bloques del guion + "Tus notas" + decisión calculada en vivo.
- Filtros: Para hoy (`proximo_fecha` ≤ hoy), Sin contactar (`estado` = Nuevo), Todos.
- Panel "Estado y próximo paso": selector de estado, próximo paso/fecha, notas; guarda con `guardar_estado`.

## 6. Cómo trabajar y publicar
### Sitio (GitHub Pages)
1. Edita los archivos en una rama o directo en `main` si David lo pide.
2. Prueba localmente abriendo el archivo en el navegador (o `npx serve .`) a 400 px de ancho.
3. `git commit` con mensaje en español que diga qué cambió y por qué; `git push`. GitHub Pages publica en 1–2 minutos.

### Apps Script (con clasp)
Configuración (una vez, con David presente):
1. David activa la API en https://script.google.com/home/usersettings ("API de Google Apps Script" → activada).
2. `npm install -g @google/clasp` y `clasp login` (David inicia sesión con su cuenta de Google; tú no escribes contraseñas).
3. En la carpeta `apps-script/` del repo: `clasp clone 1mLZVH8IdSfyc2K1nPj3mF4LBEZHnw9rP9SNvHg2bXxYNSod4txkl1Wad`.
4. Agrega `.clasp.json` y `.clasprc.json` al `.gitignore` (contienen IDs y credenciales).
5. Desde entonces la fuente del script es `apps-script/` (el archivo `apps-script.gs` de la raíz queda como copia histórica; pregunta a David si se borra).

Publicar un cambio del script:
1. `clasp push` (sube el código).
2. `clasp deploy -i <ID de la implementación activa> -d "vN - descripción"` → nueva versión **en la misma URL**. Para ver el ID: `clasp deployments`.
3. Si el cambio pide permisos nuevos (por ejemplo Drive), David debe autorizar ejecutando una función desde el editor.
4. Verifica: formulario de prueba (o `pruebaFicha()` desde el editor) y, para la Bitácora, una llamada `listar`.

### Funciones de mantenimiento en el script
- `crearClaveBitacora()` → crea la clave si no existe y la muestra en el registro (no la copies a ningún archivo).
- `actualizarHoja()` → rellena códigos y enlaces faltantes, agrega columnas nuevas si faltan y regenera la pestaña "Enlaces".
- `activarResumenSemanal()` / `configurarTodo()` → trigger de los lunes y validación de estados (`configurarTodo` también activa seguimiento diario y `onEditEstado`).
- `activarOnEditEstado()` → trigger instalable al editar `estado` + lista desplegable ampliada.
- `migrarEstados()` / `migrarEstados(false)` → simulación (default) o aplica Entrevistado a quienes ya tienen fila en Entrevistas.
- `seguimientoEmpleo()` → correo diario a David con hitos 7/30/60/90 pendientes y mensaje sugerido de WhatsApp (no escribe a usuarios).
- `activarSeguimientoEmpleo()` → crea el trigger diario (8 a. m.) y asegura las columnas de empleo/seguimiento.
- `pruebaSeguimientoEmpleo()` → manda un correo de ejemplo sin usar filas reales.
- `reenviarFicha()` → reenvía la ficha de la fila `FILA`.
- `pruebaFicha()` → manda una ficha de prueba sin tocar la hoja.

## 7. Identidad visual
- Colores: verde `#2e7d5b` (principal), sol `#e8b04b` (acento), fondo claro `#f5f7f4`, texto `#1f2a26`, gris `#5d6c66`, línea `#dde5e0`, verde suave `#e1efe7`, sol suave `#fbf0d9`. Modo oscuro con `prefers-color-scheme`.
- Tipografía: **Bricolage Grotesque** (títulos) y **Nunito** (texto), desde Google Fonts.
- Logo: arco de puente + línea del tablero + sol naciente (`logo.svg`).
- Estilo: sobrio, amigable, con detalles alegres. Nada de emojis como íconos de sección.

## 8. Ciclo del servicio (para entender el porqué de cada función)
0 Atraer y filtrar · 1 Diagnóstico · 2 Nivelación (digital e inglés) · 3 Rumbo (rol meta) · 4 Marca (CV y LinkedIn) · 5 Mercado (aplicar y contactos) · 6 Entrevista y oferta · 7 Primeros 90 días · 8 Comunidad.
Hoy el producto cubre partes de 1, 3, 4 y 5. Lo siguiente: 2 y 7.

## 9. Backlog priorizado
1. **Configurar el repo para trabajar con Cursor** (clasp, .gitignore, borrar duplicados solo si David aprueba). Sin cambios funcionales.
2. **Checklist de nivelación (fase 2) en la app personal:** 8 puntos (correo profesional, Google Docs y PDF, subir archivo desde el celular, LinkedIn básico, Indeed, qué es un ATS, presentarse en 30 s en inglés, cómo funciona el mercado: recruiter, staffing agency, W-2 vs 1099, pago por hora vs anual). Cada punto con explicación de 3–5 líneas, enlace a un recurso gratuito y casilla "Ya lo hice" en localStorage. Se muestra antes de la ruta de 6 pasos si la persona no ha completado al menos 6 de 8.
3. **Seguimiento 7/30/60/90 días (fase 7):** columna `fecha_empleo` en Respuestas (la llena David) y un trigger diario que le manda a David un correo con las personas a contactar hoy y un mensaje sugerido para WhatsApp. No se envían mensajes automáticos a usuarios.
4. **Métricas en la Bitácora:** puntaje del CV antes/después, aplicaciones por semana, tasa de respuesta.
5. **Módulo de CV y LinkedIn (después de 25 usuarios activos):** la persona sube su PDF (CV o "Guardar en PDF" de LinkedIn) → carpeta privada en Drive → Apps Script lo envía a la API de Gemini **plan de pago** (el gratuito usa los datos para entrenar; no sirve para CVs) → JSON con el esquema del Archivo Maestro (`schema_version 1.0`) → pestaña "Perfiles" → David aprueba antes de que la persona vea el resultado. No hacer scraping de LinkedIn.

## 10. Forma de trabajo esperada
- Antes de programar: explica en 3–6 viñetas qué vas a cambiar, en qué archivos y cómo se va a probar. Espera el "ok" de David si toca datos, el script o algo publicado.
- Cambios pequeños: una tarea = un commit.
- Al terminar: resume en español qué cambió, cómo lo probaste, qué debe revisar David (con la URL exacta) y si hay que desplegar el Apps Script.
- Si algo falla, muestra el error tal cual y propón la solución; no la apliques a ciegas en producción.
