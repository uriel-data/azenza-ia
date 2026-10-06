// Router de la API. Todas las rutas /api/* entran por acá (netlify/functions/api.mjs).

import { ErrorHttp, json, verificarOrigen } from "./http.js";

// [método, patrón, manejador]. Los grupos del patrón llegan como parámetros.
// Cada manejador recibe (req, { params, ip }) y devuelve un Response.
const RUTAS = [
    ["GET", /^\/api\/salud$/, async () => json(200, { ok: true })],
];

const MUTAN = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function atender(req, { ip = "" } = {}) {
    const { pathname } = new URL(req.url);

    try {
        let rutaDelPath = false;

        for (const [metodo, patron, manejador] of RUTAS) {
            const coincide = pathname.match(patron);
            if (!coincide) continue;

            rutaDelPath = true;
            if (metodo !== req.method) continue;

            if (MUTAN.has(req.method)) verificarOrigen(req);
            return await manejador(req, { params: coincide.slice(1), ip });
        }

        return rutaDelPath
            ? json(405, { error: "Método no permitido." })
            : json(404, { error: "No existe esa ruta." });
    } catch (error) {
        if (error instanceof ErrorHttp) return json(error.status, { error: error.message, ...error.extra });

        // El detalle queda en el log; al usuario nunca le llega un mensaje interno.
        console.error("Error en la API:", error);
        return json(500, { error: "Algo falló de nuestro lado. Probá de nuevo en un rato." });
    }
}
