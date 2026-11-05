# Diagnóstico de inglés para el trabajo

Página pública: https://deivblack.github.io/ruta-puente/ingles/

No es un examen. Es un mapa de 10–12 minutos: 5 escenas de una búsqueda de empleo real, con retroalimentación y un plan de 7 días.

## Archivos
- `index.html` — la experiencia (identidad de Ruta Puente, celular primero).
- `banco.json` — ítems. Todos salen con `"revisar": true` hasta que David los apruebe.
- `recursos.json` — recursos gratuitos del resultado. Hoy hay 2 ejemplos vacíos; David pega nombre, URL y quita o deja `"revisar"`.

## Cómo editar un ítem
Abre `banco.json`. Cada objeto tiene:

| Campo | Qué es |
|---|---|
| `id` | único, ej. `l1-b1` |
| `escena` | `1` leer vacante, `2` llamada, `3` vocabulario, `4` correo |
| `habilidad` | `lectura`, `escucha`, `vocabulario`, `escritura` |
| `nivel` | `basico`, `intermedio`, `avanzado` |
| `carril_o_general` | `general` o un carril: `contabilidad`, `ingenieria`, `sistemas`, `hoteleria`, `educacion`, `salud`, `administracion` |
| `enunciado` | pregunta (y la vacante, si es lectura) |
| `opciones` | 3 o 4 respuestas |
| `correcta` | el texto **exacto** de la opción buena |
| `por_que` | una línea, en español |
| `frase_util` | frase de trabajo en inglés |
| `revisar` | `true` hasta que lo apruebes; luego `false` |
| `audio` | (solo escena 2) texto que lee el navegador en inglés |
| `pregunta` | (opcional) pregunta corta |
| `tipo` | (escena 4) `correo` o `frase` |

No copies ítems de TOEFL, IELTS, Cambridge ni Duolingo. Inglés americano de trabajo, original.

Al agregar: respeta el JSON (comas, comillas). Prueba en local con `python3 -m http.server` y abre `/ingles/`.

## Carriles de vocabulario
Si la profesión coincide (contador, ingeniero, sistemas, hotel, docente, salud, administración), la escena 3 usa  ítems de ese carril. Si no, usa `general` (oficina y servicio al cliente).

## Resultado
Escala: **Empezando · Funcional · Seguro · Profesional** (orientativo A1–A2 / B1 / B2 / C1). No es certificación.

Con `?c=` de la app, al terminar se guarda en la pestaña **Ingles** (hace falta desplegar el Apps Script). Sin código no se envía nada. El audio nunca se sube.

## Marca de revisión
Mientras un ítem o recurso tenga `"revisar": true`, David debe leerlo antes de usarlo con personas reales.
