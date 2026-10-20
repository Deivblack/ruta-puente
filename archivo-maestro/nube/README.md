# Archivo Maestro en la nube (sin descargar ni subir)

Editas desde el navegador. Lo que guardas queda en **tu Google Drive**, en una carpeta privada. Costo cero. Solo tú lo ves.

## Qué vas a tener

1. Un enlace (como una página web) que abres cuando quieras.
2. Botón **Guardar en Drive** (también guarda solo ~2.5 s después de escribir).
3. En Drive: carpeta `Archivo Maestro (privado)` con `perfil.json` y `aplicaciones.json`.

## Publicar (una sola vez, ~5 minutos)

Hazlo con la misma cuenta de Google donde quieres guardar tus datos.

### 1. Crear el proyecto

1. Abre https://script.google.com
2. **Nuevo proyecto**
3. Arriba, cambia el nombre a: `Archivo Maestro`

### 2. Pegar el código del servidor

1. Borra todo lo que haya en el archivo `Código.gs` (o `Code.gs`).
2. Abre en este repo el archivo `archivo-maestro/nube/Code.gs`, copia **todo** y pégalo ahí.
3. Guarda (disquete o Ctrl+S).

### 3. Pegar la página web

1. A la izquierda: **+** junto a Archivos → **HTML** → nombre exacto: `Index` (con I mayúscula).
2. Abre en este repo `archivo-maestro/nube/Index.html`, copia **todo** y pégalo en ese archivo HTML.
3. Guarda.

### 4. Publicar como aplicación web

1. Arriba a la derecha: **Implementar** → **Nueva implementación**
2. Tipo: **Aplicación web**
3. Descripción: `v1`
4. **Ejecutar como:** Yo (tu correo)
5. **Quién tiene acceso:** **Solo yo**
6. **Implementar**
7. La primera vez Google pide permisos: acepta (es tu Drive).
8. Copia la **URL** que te da (termina en `/exec`).

Esa URL es tu Archivo Maestro. Guárdala en favoritos o en el celular.

### 5. Primera vez: pegar tu perfil (solo una vez)

1. Abre la URL.
2. Verás el bloque **Primera vez**.
3. Abre tu `perfil.json` (el de tu PC o el del repo privado) con el Bloc de notas, copia **todo**.
4. Pégalo en la caja grande y pulsa **Importar y guardar en Drive**.
5. Listo: ya no vuelves a pegar. Solo editas y guardas.

Si también tienes `aplicaciones.json`, en la pestaña **Aplicaciones** puedes ir agregando nuevas; o más adelante pegamos una importación de apps si la necesitas.

## Uso diario

1. Abre el enlace.
2. Edita Personal, Búsqueda, Pendientes, Aplicaciones…
3. Pulsa **Guardar en Drive** (o espera unos segundos: se guarda solo).
4. Cierra la pestaña cuando quieras. La próxima vez se carga desde Drive.

## Si cambias el código después

1. Edita `Code.gs` / `Index` en script.google.com (o vuelve a pegar desde este repo).
2. **Implementar** → **Administrar implementaciones** → lápiz de la implementación activa → **Nueva versión** → Implementar.
3. Misma URL. No crees una implementación nueva.

## Privacidad

- Acceso **Solo yo** = nadie más abre el enlace (ni con la URL).
- Los JSON viven en **tu** Drive, no en GitHub público.
- No pongas SSN, pasaporte, cuentas bancarias ni contraseñas.

## Probar la pantalla sin publicar (opcional)

En tu PC, abre `Index.html` con doble clic en Chrome. Funciona en **modo prueba** (guarda en el navegador, no en Drive). Sirve para ver cómo se ve. Para datos reales, publica con los pasos de arriba.

## Relación con los comandos de Node (`npm run cv`, etc.)

La nube es para **ver y editar** sin trámites.  
Si quieres regenerar CVs o Espanso en la PC:

1. En Drive, abre `perfil.json` → Archivo → Descargar (cuando lo necesites).
2. En tu carpeta local: reemplaza `data/perfil.local.json`.
3. `npm run todo`.

Eso es opcional y solo cuando quieras esos archivos.
