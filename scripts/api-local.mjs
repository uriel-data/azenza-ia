// Plugin de Vite: atiende /api/* en `npm run dev` y `npm run preview` con la misma
// función que corre en Netlify, sin netlify-cli.
//
// - Variables de entorno: las de .env (ver .env.example).
// - Base: si hay DATABASE_URL, esa (por ejemplo, la rama de desarrollo de Neon). Si no,
//   un Postgres local en .dev-db/ (PGlite), con las migraciones aplicadas al arrancar.
// - En preview además aplica las cabeceras de public/_headers (CSP incluida), para
//   probar el build tal como queda publicado. En dev no: Vite usa scripts en línea.
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnv } from "vite";
import { aplicarMigraciones } from "./migraciones.mjs";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ENTRADA = "/netlify/functions/api.mjs";

async function prepararBase() {
    const { usarAdaptador } = await import("../servidor/db.js");

    if (process.env.DATABASE_URL) {
        console.log(`  Base: ${new URL(process.env.DATABASE_URL).hostname}`);
        return;
    }

    const { PGlite } = await import("@electric-sql/pglite");
    const pg = await PGlite.create(path.join(RAIZ, ".dev-db"));

    await aplicarMigraciones({
        ejecutar: (sql) => pg.exec(sql),
        consulta: async (sql, parametros) => (await pg.query(sql, parametros)).rows,
        log: (linea) => console.log(`  [db]${linea}`),
    });

    usarAdaptador({
        consulta: async (texto, parametros = []) => (await pg.query(texto, parametros)).rows,
        transaccion: (consultas) =>
            pg.transaction(async (tx) => {
                const resultados = [];
                for (const [texto, parametros = []] of consultas) resultados.push((await tx.query(texto, parametros)).rows);
                return resultados;
            }),
    });

    console.log("  Base: PGlite local en .dev-db/ (borrá la carpeta para empezar de cero)");
}

/** Cabeceras de public/_headers para una ruta (solo los bloques que aplican). */
async function cabecerasPara(ruta) {
    const texto = await fs.readFile(path.join(RAIZ, "public", "_headers"), "utf8");
    const cabeceras = {};
    let aplica = false;

    for (const linea of texto.split(/\r?\n/)) {
        if (!linea.trim() || linea.trim().startsWith("#")) continue;

        if (!/^\s/.test(linea)) {
            const patron = new RegExp("^" + linea.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
            aplica = patron.test(ruta);
        } else if (aplica) {
            const i = linea.indexOf(":");
            cabeceras[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
        }
    }

    // En local no hay HTTPS: upgrade-insecure-requests rompería las llamadas a la API.
    if (cabeceras["Content-Security-Policy"]) {
        cabeceras["Content-Security-Policy"] = cabeceras["Content-Security-Policy"].replace(/;\s*upgrade-insecure-requests/, "");
    }
    delete cabeceras["Strict-Transport-Security"];

    return cabeceras;
}

/** Pasa un pedido de Node a un Request, llama a la función y escribe la respuesta. */
function middleware(cargarFuncion) {
    return async (req, res, next) => {
        if (!req.url.startsWith("/api/") && req.url !== "/api") return next();

        try {
            const partes = [];
            for await (const parte of req) partes.push(parte);
            const cuerpo = Buffer.concat(partes);

            const request = new Request(`http://${req.headers.host}${req.url}`, {
                method: req.method,
                headers: Object.entries(req.headers).filter(([, v]) => typeof v === "string"),
                body: ["GET", "HEAD"].includes(req.method) ? undefined : cuerpo,
            });

            const { default: funcion } = await cargarFuncion();
            const respuesta = await funcion(request, { ip: req.socket.remoteAddress ?? "" });

            res.statusCode = respuesta.status;
            respuesta.headers.forEach((valor, clave) => {
                if (clave !== "set-cookie") res.setHeader(clave, valor);
            });
            const cookies = respuesta.headers.getSetCookie();
            if (cookies.length) res.setHeader("set-cookie", cookies);
            res.end(Buffer.from(await respuesta.arrayBuffer()));
        } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end("Error en la API local");
        }
    };
}

export function apiLocal() {
    let listo;

    const preparar = (mode) => {
        Object.assign(process.env, { ...loadEnv(mode, RAIZ, ""), ...process.env });
        listo ??= prepararBase();
        return listo;
    };

    return {
        name: "azenza-api-local",

        async configureServer(server) {
            await preparar(server.config.mode);
            server.middlewares.use(middleware(() => server.ssrLoadModule(ENTRADA)));
        },

        async configurePreviewServer(server) {
            await preparar(server.config.mode);
            server.middlewares.use(async (req, res, next) => {
                const ruta = req.url.split("?")[0];
                if (!ruta.startsWith("/api/")) {
                    for (const [clave, valor] of Object.entries(await cabecerasPara(ruta))) res.setHeader(clave, valor);
                }
                next();
            });
            server.middlewares.use(middleware(() => import(pathToFileURL(path.join(RAIZ, ENTRADA)).href)));
        },
    };
}
