# Diagnóstico Ruta Puente — 30 oct 2026

Parte 1 de la Tarea G. Pruebas en el código de `main` y en local (parche Alta del cargo).  
No se envió el formulario a la hoja real. No se usó la clave de la Bitácora. No se tocó Apps Script en Google.

**Parche ya aplicado en esta rama (espera tu ok para fusionar):** nadie se queda trabado en “Tu cargo”. “Maestría” se trata como grado; la persona escribe el cargo (ej. docente) y sigue. El resto de G2–G6 **no** se hizo.

## Cómo se probó
- Sitio publicado: https://deivblack.github.io/ruta-puente/ (landing, app, bitácora) — carga HTTP 200.
- App local: `http://127.0.0.1:4173/app/` a 390 px y ~1200 px, consola abierta.
- Diccionario: las 9 profesiones tal como las escribió la gente (script + pantalla).
- `doGet` en vivo con un código inventado: `{ok:false}` (correcto; no filtra datos).
- Triggers, registros de 7 días y correos reales: **no se pueden ver desde aquí** (hace falta tu editor de Apps Script).

## Tabla

| Pieza | Qué probaste | Resultado | Severidad | Arreglo propuesto |
| --- | --- | --- | --- | --- |
| Landing → formulario → gracias → agenda | Recorrido a 390 px y escritorio, consola limpia. ZIP 12 dígitos incompletos. **No se envió** (evitar fila real). | Ciudad y ZIP separados. Botones grandes. Si falta país/fuente, el aviso es genérico (“Te falta una pregunta”) y el de “ZIP de 5 dígitos” solo sale cuando lo demás está lleno. La pantalla de gracias + “Agenda tu llamada” está en el código (prioridad ≠ Fuera de perfil). | Baja | En Parte 2, validar ZIP antes o dar el mensaje de ZIP aunque falte otro campo. |
| App `?c=` (6 pasos, ✓, CV, agenda) | Código de ejemplo (sin `?c=` válido). Flujo nivelación → ruta → pasos. CV en ejemplo. | Nivelación pide 6 de 8 antes de la ruta. ✓ exige confirmar **y** el requisito (logros, ZIP, copiar mensaje, 1 aplicación). Agenda se muestra si `estado` es Nuevo o Contactado. Subir CV en el ejemplo está desactivado (aviso correcto). Con código real, `subir_cv` pide PDF/DOCX ≤5 MB. | Media | En G2: decir para qué sirve cada paso. El candado de nivelación puede sentirse como “no avanzo”. |
| App ejemplo María | `/app/` sin código, 390 y escritorio. | Etiqueta “Ejemplo”, datos de María, agenda visible, consola sin errores. | Baja | Nada urgente. |
| Bitácora | Login 390 y escritorio. **Sin clave.** Código de filtros, guardar, estado, “Revisar agenda”. | Login claro, `noindex`. Filtros y panel de estado están en el código. No pude probar guardar ni listar sin la clave. | Media | Tú: entra con PRUEBA y prueba filtros + Revisar agenda. Yo no lo hice para no usar la clave. |
| Diccionario `TITLES` — 9 profesiones | Antes del parche, en código. Después, en local a 390 px. | **Antes:** `Maestría ` → “Todavía no tenemos tu cargo” (bug de usuario). `Ing Electromecánico`, `Ingeniero en Sistemas / Máster…`, `Ingeniería en Turismo` → sin match. `Contadora`, `Docente`, `INGENIERO INDUSTRIAL`, `MAESTRA` → bien. `Psicologo organizacional` → Case Manager (genérico). **Después del parche:** ver tabla de cargos abajo. Nadie se queda sin salida. | Alta | **Hecho (mínimo).** G1 completo (avisar en la ficha, buscador de cargos) espera tu ok. |
| Contratos AGENTS.md vs código | Comparé columnas `COLUMNAS`, `COL_ENT`, `COL_CVS` con `doGet` y `listarBitacora`. | Coinciden con AGENTS.md actual. `doGet` solo: nombre (primero), pais, profesion, anios_exp, ciudad, zip, barrera, estado. Bitácora `listar` incluye whatsapp (solo con clave). `titulo_evaluado` vive en **Entrevistas**, no en Respuestas. No existen `apps_semana` ni `respuestas_semana`. En `main`, AGENTS.md aún dice “producción v5” aunque v6 ya se pegó en Google (30 oct). | Media | Actualizar AGENTS.md a v6 al fusionar. G3/G4 deben aclarar si `titulo_evaluado` / conteos van a Entrevistas o Respuestas. |
| Triggers | Código de `activar*` + lo que corriste el 30 oct (`configurarTodo`). No puedo llamar `getProjectTriggers()`. | Cada `activar*` borra el trigger de esa función y crea uno. No debería haber duplicados si solo usaste esos botones. Esperados: `resumenSemanal` (lunes 8), `correoDiario` (~7:30), `seguimientoEmpleo` (8), `onEditEstado` (al editar), `revisarAgenda` (cada hora). | Media | En el editor: Reloj → Triggers. Si ves dos del mismo nombre, borra el viejo. Ejecuta `pruebaCorreoDiario()` y `resumenSemanal()` con PRUEBA y pégame el registro. |
| Correo diario y resumen | No ejecutados desde aquí. | El código manda solo a tu Gmail, con plantillas de WhatsApp. No escribe a las personas. `pruebaCorreoDiario` usa la hoja real. | Media | Tú lo corres con PRUEBA. No lo hice yo. |
| Rendimiento | `curl` a Pages y a `doGet`. No pude simular 4G en este entorno de forma fiel. | Landing 31 KB, app 43 KB, bitácora 35 KB; TTFB ~0,18 s aquí. `doGet` ~2,6 s. En 4G el cuello es el script, no GitHub Pages. | Media | Avisar “Cargando…” en la app mientras llega `doGet`. No cachear datos sensibles. |
| Errores 4xx/5xx y logs 7 días | GET script con código falso: 200 + `{ok:false}`. POST desde servidor a veces cae en HTML de Google (no es el navegador). | No tengo acceso a “Ejecuciones” de Apps Script. | Media | En el editor, Ejecuciones de los últimos 7 días. Si hay fallos de `revisarAgenda` o `subirCv`, mándame el texto. |
| Privacidad `doGet` y URLs | Leí `doGet`, landing, app. Llamé `doGet` con código inventado. | No devuelve teléfono, correo, visa ni archivos. Sí `estado` y primer nombre (documentado). La app/landing no pintan WhatsApp de la persona. | Baja | No agregar campos a `doGet`. |
| Carpeta CVs Drive | Código de `carpetaCvs` / `subirCv`. | Crea “Ruta Puente - CVs” y el archivo; **no** llama `setSharing`. Por defecto queda solo para tu cuenta. No pude abrir Drive desde aquí. | Baja | En Drive: clic derecho → Compartir. Debe decir solo tú. No pongas “cualquiera con el enlace”. |
| Tabla Aplicaciones en celular | Paso 6 a 390 px. | El CSS tiene `min-width: 520px` con scroll interno (`.tablewrap`). En la prueba no se vio barra fea; en un teléfono real puede deslizarse de lado. | Media | En G4: lista de 1 toque (sin tabla ancha). |
| Agenda por correo (Calendar) | Código `buscarPersonaAgenda`. | Empareja por WhatsApp (10 dígitos). Busca columna `correo`, que **no está** en Respuestas. Una reserva solo con email no se junta a la fila. | Media | G posterior: no inventar correo en la hoja (privacidad). Emparejar solo por teléfono, o pedir el mismo WhatsApp en la agenda. |
| Formulario `no-cors` | Código landing. | El envío no puede saber si el script falló. La persona ve “gracias” igual. | Media | Dejarlo (CORS). Tú revisas si llegó la fila PRUEBA. |
| innerHTML | App y Bitácora. | Textos de usuario van con `esc` o `textContent`. Bitácora arma botones y luego `textContent`. | Baja | Seguir igual. |

## Diccionario — las 9 profesiones

| Texto del formulario | Antes (producción / `main` viejo) | Después del parche (esta rama) |
| --- | --- | --- |
| Contadora | Staff Accountant | Staff Accountant |
| `Maestría ` | Sin cargo. Parecía trabada. | “Eso suena a un grado…” + campo para escribir el cargo. Con “docente” → Teacher. |
| Ing Electromecánico | Sin cargo | Electromechanical Engineer |
| Ingeniero en Sistemas / Máster en Ciberseguridad | Sin cargo | IT Support Specialist (toma la primera parte útil; el máster no se trata como cargo) |
| Docente | Teacher | Teacher |
| INGENIERO INDUSTRIAL | Industrial Engineer | Industrial Engineer |
| Psicologo organizacional | Case Manager | People Operations Specialist |
| MAESTRA | Teacher | Teacher |
| Ingeniería en Turismo | Sin cargo | Guest Services Coordinator |

## Qué no pude hacer (tú)

1. Reloj → Triggers: confirma que no hay dos iguales.
2. Ejecutar `pruebaCorreoDiario()` y `resumenSemanal()` (solo te llegan a ti).
3. Ejecuciones de 7 días.
4. Bitácora con clave y fila PRUEBA.
5. Drive: que la carpeta CVs no sea pública.
6. Enviar el formulario (crearía una fila). Si ya existe PRUEBA, no lo vuelvas a llenar.

## Parche Alta (ya en el código de esta rama)

Archivo: `app/index.html` solamente. **No hay que desplegar Apps Script.**

- Normaliza tildes, mayúsculas, `ing` → ingeniero, parte textos con `/`.
- Cargos nuevos: electromecánica, ciberseguridad, turismo/hotelería, marketing de destinos, psicología organizacional.
- Si es un grado (maestría, etc.) o no hay match: campo “Escribe tu cargo en español” (`localStorage` `rp-cargo-…`).
- No avisa aún en la ficha de correo (eso es G1 completo, Parte 2).

Hasta que fusiones y GitHub Pages publique, el sitio **público** sigue con el bug de Maestría.

## Parte 2 (no empezada)

Espera tu **ok**: G1 resto (ficha), G2 para qué / bienvenida, G3 título, G4 meta y empresas, G5 WhatsApp, G6 Bitácora 48 h.
