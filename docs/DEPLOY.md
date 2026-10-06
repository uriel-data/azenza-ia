# Puesta en producción — ia.azenza.com.ar

Todo lo que requiere cuentas o credenciales lo hace Uriel: GitHub, Neon, Google AI Studio, Netlify y DNS. Nadie más
pide ni recibe esas credenciales. Las connection strings y la key van **solo** en `.env` local (que no se commitea)
y en las variables de entorno de Netlify.

Orden: **1) GitHub → 2) Neon → 3) Gemini → 4) Netlify (deploy de prueba) → 5) Dominio → 6) Link desde la web**.

> **Créditos de Netlify.** El plan gratuito trae 300 créditos por mes **para toda la cuenta**: la web institucional y
> la app los comparten. Si se acaban, Netlify pausa **todos** los sitios, también `azenza.com.ar`. Cada deploy a
> producción cuesta 15 créditos; los deploy previews son gratis. Juntá los cambios antes de publicar y mirá el uso en
> **Team → Usage & billing** cada tanto. Si la app crece, el paso siguiente es el plan Personal.

---

## 1. GitHub

1. Creá el repo **privado** `uriel-data/azenza-ia`, vacío (sin README ni .gitignore).
2. Subí el código (desde `C:\Proyectos\azenza-ia`):

   ```bash
   git remote add origin https://github.com/uriel-data/azenza-ia.git
   git push -u origin main
   ```

## 2. Base de datos: Neon (plan gratuito)

1. Creá una cuenta en [neon.com](https://neon.com) (la tuya, nueva; no pide tarjeta).
2. **New project**: nombre `azenza-ia`, Postgres 17, región **AWS US East 2 (Ohio)**, la misma región en la que
   corren por defecto las funciones de Netlify. Así cada consulta a la base es más rápida.
3. Quedan dos ramas de la base:
   - `main`: **producción**.
   - **Branches → Create branch** `dev` a partir de `main`: es la base de **desarrollo y de los deploy previews**.
4. Copiá la connection string de cada rama (**Connect**, con el pooler activado). Es la `DATABASE_URL`.
5. Migraciones: **siempre primero en `dev`**.

   ```bash
   # En C:\Proyectos\azenza-ia, con .env (copiado de .env.example) y DATABASE_URL = la de dev:
   npm run db:migrate
   npm run dev          # probá registrarte, construir un módulo, cerrar sesión y volver a entrar
   ```

   Cuando todo anda en `dev`, aplicalas en producción una vez, sin guardar esa URL en `.env`:

   ```bash
   DATABASE_URL="(connection string de main)" npm run db:migrate
   ```

   Cada migración nueva (`db/migraciones/NNN_*.sql`) se aplica igual: primero `dev`, después `main`, **antes** del
   deploy que la necesita. Netlify no corre migraciones solo.

Límites del plan gratuito (octubre de 2026): 100 horas de cómputo por mes, 1 GB por proyecto y 10 ramas. La base
se duerme sola a los 5 minutos sin uso: la primera consulta después tarda un poco más.

## 3. Consultor IA: Gemini (plan gratuito)

1. Entrá a [Google AI Studio](https://aistudio.google.com) con la cuenta de Google de Azenza → **Get API key** →
   crear la key en un proyecto nuevo (por ejemplo `azenza-ia`). **No le actives facturación**: así queda en el plan
   gratuito y nunca cobra.
2. Mirá los límites de tu proyecto en [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit).
   Google ya no los publica y cambian seguido. Elegí el modelo Flash con **más consultas por día** (RPD):
   - `GEMINI_MODEL`: ese modelo (por ejemplo `gemini-3.5-flash` o `gemini-3.5-flash-lite`).
   - `CONSULTOR_TOPE_GLOBAL`: un número **por debajo** de ese RPD (por ejemplo, el 80 %). Por defecto es 20.
   El día de Google se reinicia a medianoche del Pacífico y el de la app a las 0 h de Argentina. Por eso conviene
   dejar ese margen.
3. **Privacidad:** en el plan gratuito Google puede usar lo que se le manda para mejorar sus productos. Por eso:
   - La app le manda solo lo que la persona escribió en sus módulos y su pregunta.
   - La pantalla del Consultor lo avisa.
   - La política de la web lo explica (`azenza.com.ar/privacidad/#azenza-ia`).
   Si algún día se activa facturación, actualizar esos dos textos.

## 4. Netlify: sitio nuevo y deploy de prueba

1. En Netlify (la misma cuenta que la web): **Add new project → Import an existing project → GitHub →
   `uriel-data/azenza-ia`**, rama `main`. La configuración sale de `netlify.toml`:
   - Comando: `npm run build && npm run check`.
   - Se publica `dist/`.
   - Funciones en `netlify/functions/`.
2. **Antes del primer deploy**, cargá las variables en **Project configuration → Environment variables**. A las que
   tienen secretos, marcales **Contains secret values**. Todas tienen que tener el scope **Functions**.

   | Variable | Producción | Deploy previews y branch deploys |
   |---|---|---|
   | `DATABASE_URL` (secreta) | connection string de `main` | connection string de `dev` |
   | `GEMINI_API_KEY` (secreta) | la key de AI Studio | la misma |
   | `GEMINI_MODEL` | el elegido en el paso 3 | el mismo |
   | `CONSULTOR_LIMITE_USUARIO` | `3` | `3` |
   | `CONSULTOR_TOPE_GLOBAL` | el del paso 3 | `5` |
   | `CONSULTOR_ACTIVO` | `true` | `true` |

   Para usar un valor distinto por contexto: **Add a variable → Different value for each deploy context**.
3. Si Netlify ya hizo un primer deploy sin variables, hacé **Deploys → Trigger deploy → Clear cache and deploy site**.
4. El deploy queda en `https://NOMBRE.netlify.app`. Mientras no tenga dominio, nadie lo conoce: sirve de prueba.
   Cambiale el nombre en **Project configuration → Change project name** (por ejemplo `azenza-ia`).
5. Verificá:

   ```bash
   curl -s https://NOMBRE.netlify.app/api/salud                  # {"ok":true}
   curl -sI https://NOMBRE.netlify.app | grep -i -E "content-security|strict-transport|x-frame|nosniff"
   ```

   Y desde el celular y la computadora:
   - [ ] Hacer el punto de partida sin cuenta y terminar un módulo.
   - [ ] Crear una cuenta: lo hecho sin cuenta tiene que aparecer en la cuenta.
   - [ ] Cerrar sesión y entrar desde otro dispositivo: está todo.
   - [ ] Pedir una revisión al Consultor y hacer una pregunta: responde y descuenta 1 de 3.
   - [ ] Descargar Tu negocio en PDF (se abre el diálogo de impresión → "Guardar como PDF").
   - [ ] Borrar una cuenta de prueba desde **Tu cuenta**.
   - [ ] Revisar los logs en **Logs → Functions → api**: no tiene que haber errores.

   Para probar cambios más adelante sin gastar créditos, abrí un pull request: Netlify arma un **deploy preview**
   gratis y usa la base `dev`.

## 5. Dominio `ia.azenza.com.ar`

No hay que comprar nada: es un subdominio de `azenza.com.ar` y se crea con un solo registro DNS. Dónde cargarlo
depende de dónde esté hoy el DNS de `azenza.com.ar`. Ver el paso 3 del `docs/DEPLOY.md` de la web.

**A) El dominio ya usa Netlify DNS** (es lo previsto: NIC Argentina delega a los servidores de Netlify). Es lo más
simple:

1. En el sitio de la app: **Domain management → Add a domain → `ia.azenza.com.ar`**.
2. Como la zona `azenza.com.ar` está en la misma cuenta, Netlify crea solo el registro del subdominio. Confirmá en
   **Domains → azenza.com.ar → DNS records** que aparece `ia` (tipo `NETLIFY`).
3. **HTTPS → Verify DNS configuration → Provision certificate** (Let's Encrypt, gratis). En NIC Argentina no se
   toca nada.

**B) El DNS está en otro proveedor**, por ejemplo un hosting anterior:

1. En ese proveedor, agregá un registro **CNAME**: nombre `ia`, valor `NOMBRE.netlify.app`.
2. En Netlify: **Add a domain → `ia.azenza.com.ar`** y después **HTTPS → Provision certificate**.

**Si `azenza.com.ar` todavía no está delegado a ningún lado**, primero hacé el paso 3 del `DEPLOY.md` de la web
(delegarlo a Netlify DNS en NIC Argentina) y después seguí la opción A.

Verificá: `curl -sI https://ia.azenza.com.ar | head -3`.

## 6. Link desde la web institucional

La tarjeta "Herramienta gratuita · Azenza IA" ya está en la sección Contacto de la web (repo `AzenzaWeb`). Se publica
con el próximo deploy de la web: hacelo **después** de que `https://ia.azenza.com.ar` funcione, para que el link
no lleve a un error.

---

## Operación

- **Apagar el Consultor** sin tocar código: `CONSULTOR_ACTIVO=false`. Netlify aplica los cambios de variables recién
  en el próximo deploy: hacé **Deploys → Trigger deploy → Deploy project**. Cuenta como deploy a producción
  (15 créditos). El resto de la app sigue igual.
- **Cambiar de modelo o de tope**: lo mismo, con `GEMINI_MODEL` o `CONSULTOR_TOPE_GLOBAL`.
- **Si Gemini se queda sin cuota**, el Consultor contesta "está con mucha demanda" y no descuenta la consulta.
- **Usos a mirar cada tanto**: créditos de Netlify, cómputo de Neon y uso de la API en AI Studio.
- **Copias de la base**: el plan gratuito de Neon guarda 6 horas de historia. Para una copia propia:
  `pg_dump "(connection string de main)" > copia.sql` (requiere las herramientas de Postgres instaladas).

## Pendientes que no son código

- [ ] Revisión legal de la política de privacidad de la app: transferencia internacional de datos (Netlify, Neon y
      Google están en el exterior) e inscripción de la base en el Registro Nacional de Bases de Datos (AAIP).
- [ ] Decidir si se mide el uso de la app (por ejemplo, Umami sin cookies, como la web). Hoy no mide nada.
