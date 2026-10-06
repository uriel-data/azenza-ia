# CLAUDE.md — Azenza IA

App gratuita para emprendedores (`ia.azenza.com.ar`): un cuestionario inicial ("Tu punto de partida"), una ruta de
15 módulos en 3 etapas, "Tu negocio" (descargable en PDF), un Consultor IA y un Diagnóstico 360°. Fuente de verdad del
producto: el prototipo de Claude Design "Azenza IA App - V1".

- Puesta en producción, variables de entorno, Neon, Gemini y DNS: `docs/DEPLOY.md`.
- Es un proyecto **aparte** de la web institucional (`C:\Proyectos\AzenzaWeb`, repo `uriel-data/AzenzaWeb`): otro
  repo, otro sitio de Netlify (en la misma cuenta) y otras reglas. La web solo enlaza a la app, y la política de
  privacidad de la app vive en la web: `azenza.com.ar/privacidad/#azenza-ia`.
- La versión vieja (repo `AzenzaIA-v2`, backend en Render, Neon y OpenAI de un ex socio) quedó abandonada: no se usa
  ni se le pide nada.

## Principio rector

Lo más simple que funcione: SPA estática + una sola Netlify Function. Dependencias de runtime: React, React Router y
el driver HTTP de Neon. Nada más sin una razón fuerte.

## Estructura

```
src/                    la SPA (React 19 + Vite + React Router)
  data/                 conceptos, módulos, recorrido, punto de partida: sin React, los importa también el servidor
  pages/ components/ context/ hooks/ utils/
  azenza.css            sistema visual (clases ui-*), base.css (fuente y body)
servidor/               la API: app.js (router), db.js, http.js, sesion.js, seguridad.js, limites.js,
                        validar.js, gemini.js, rutas/{cuenta,datos,consultor}.js
netlify/functions/api.mjs  única función: atiende /api/* (config.path)
db/migraciones/         NNN_nombre.sql, se aplican una vez y en orden (npm run db:migrate)
scripts/                api-local.mjs (plugin de Vite: /api en dev y preview) · check.mjs · migrar.mjs
test/                   pruebas del servidor con PGlite en memoria y Gemini simulado
public/                 _headers (CSP...), _redirects (SPA), fuentes, imágenes, íconos
```

## Comandos

```bash
npm install
npm run dev          # http://localhost:5174 — app + API; base PGlite local en .dev-db/ si no hay DATABASE_URL
npm run build && npm run preview   # http://localhost:4174 — el build con las cabeceras de _headers (CSP real)
npm test             # pruebas del servidor
npm run lint
npm run check        # verificaciones de seguridad sobre dist/ y el código (Netlify lo corre en cada build)
npm run db:migrate   # migraciones pendientes en DATABASE_URL (primero la rama dev de Neon)
```

Antes de cada commit: `npm run lint`, `npm test` y, si toca `src/` o `public/`, `npm run build && npm run check`.

## Reglas de seguridad (no romper)

- **CSP estricta** (`public/_headers`): `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`. Nada de
  `<script>` ni `<style>` en línea, ni recursos externos. `style={{...}}` de React sí funciona (va por CSSOM).
  Nada de `eval`, `document.write`, `innerHTML` ni `dangerouslySetInnerHTML`: `npm run check` lo verifica.
- **Validar todo de nuevo en el servidor** (`servidor/validar.js`): el frontend es comodidad.
- **Sesión**: cookie `__Host-azia` httpOnly, Secure, SameSite=Lax; en la base solo el SHA-256 del token. Contraseñas
  con scrypt. Los POST/PUT exigen `Origin` propio y `Content-Type: application/json`.
- **Límites en la base**, nunca en memoria (serverless): intentos de login, registros, consultas al Consultor.
- **IA**: las instrucciones de `servidor/gemini.js` son fijas y nunca llevan texto del usuario. Lo del usuario va como
  JSON dentro de `<datos>`, leído de lo guardado en la base (limpio, sin `<` ni `>`, con tope). A Gemini nunca le
  llegan nombre, email ni datos de la cuenta. La revisión usa `responseSchema`. La key nunca llega al frontend.
- **Privacidad**: si cambia lo que se guarda o lo que se le manda a la IA, actualizar la sección `#azenza-ia` de la
  política (repo de la web) y el aviso de la pantalla del Consultor.
- No pedir ni recibir credenciales (Netlify, Neon, Google, NIC Argentina): las configura Uriel.

## Reglas de producto (no negociables)

- Voseo rioplatense, sin jerga; si aparece un término técnico, se explica antes.
- **El resultado nunca se lee como una nota**: el nivel (1, 2, 3) solo define la profundidad de cada módulo
  (A completo, B corto, C mejorar lo que tenés) y nunca se muestra. "Lo tengo" con texto genérico se trata como B.
- El Consultor nunca pone notas ni reescribe por el usuario, dice que es una IA y tiene límite diario.
- Instagram queda "Muy pronto" (`pronto: true` en `src/data/modulos.js`).

## Convenciones

- Código, comentarios y textos en castellano rioplatense. Indentación de 4 espacios.
- Los archivos de `src/data/` y `src/utils/texto.js` importan con extensión `.js` (los lee Node en el servidor).
- Migraciones nuevas: un archivo `db/migraciones/NNN_nombre.sql`; nunca editar una ya aplicada.
- Commits con Conventional Commits (tipo en inglés, descripción en castellano imperativo). No hacer `push` sin
  que lo pida el equipo.
