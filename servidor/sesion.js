// Sesiones: un token aleatorio en una cookie httpOnly; en la base, solo su hash.
//
// Cookie con prefijo __Host-: el navegador solo la acepta con Secure, Path=/ y sin
// Domain, así que queda atada a este host (ia.azenza.com.ar) y ningún subdominio la
// puede pisar. SameSite=Lax: no viaja en pedidos POST que vengan de otros sitios.

import { consulta, una } from "./db.js";
import { ErrorHttp } from "./http.js";
import { nuevoToken, sha256 } from "./seguridad.js";

const COOKIE = "__Host-azia";
const DURACION_DIAS = 30;
const DIA_MS = 24 * 60 * 60 * 1000;

const cookie = (valor, maxAge) =>
    `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

const cookieDeSesion = (token) => cookie(token, DURACION_DIAS * 24 * 60 * 60);

export const cookieVacia = () => cookie("", 0);

function tokenDe(req) {
    for (const parte of (req.headers.get("cookie") ?? "").split(";")) {
        const [nombre, ...resto] = parte.trim().split("=");
        if (nombre === COOKIE) return resto.join("=") || null;
    }
    return null;
}

/** Abre una sesión nueva y devuelve el Set-Cookie. */
export async function abrirSesion(usuarioId) {
    const token = nuevoToken();
    const vence = new Date(Date.now() + DURACION_DIAS * DIA_MS);

    await consulta("INSERT INTO sesiones (token_hash, usuario_id, vence_at) VALUES ($1, $2, $3)", [sha256(token), usuarioId, vence]);

    // De paso, limpia las sesiones vencidas de esa persona.
    await consulta("DELETE FROM sesiones WHERE usuario_id = $1 AND vence_at < now()", [usuarioId]);

    return cookieDeSesion(token);
}

export async function cerrarSesion(req) {
    const token = tokenDe(req);
    if (token) await consulta("DELETE FROM sesiones WHERE token_hash = $1", [sha256(token)]);
}

/**
 * El usuario de la sesión, o null. Si a la sesión le queda menos de la mitad, se
 * renueva (por eso devuelve también el Set-Cookie a mandar, si hace falta).
 */
export async function usuarioDe(req) {
    const token = tokenDe(req);
    if (!token || token.length > 100) return { usuario: null };

    const hash = sha256(token);
    const fila = await una(
        `SELECT u.id, u.nombre, u.email, s.vence_at
           FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
          WHERE s.token_hash = $1 AND s.vence_at > now()`,
        [hash]
    );

    if (!fila) return { usuario: null };

    const usuario = { id: fila.id, nombre: fila.nombre, email: fila.email };
    const quedan = new Date(fila.vence_at).getTime() - Date.now();

    if (quedan < (DURACION_DIAS / 2) * DIA_MS) {
        await consulta("UPDATE sesiones SET vence_at = $2 WHERE token_hash = $1", [hash, new Date(Date.now() + DURACION_DIAS * DIA_MS)]);
        return { usuario, setCookie: cookieDeSesion(token) };
    }

    return { usuario };
}

/** Para las rutas que necesitan cuenta: el usuario, o un 401. */
export async function exigirUsuario(req) {
    const sesion = await usuarioDe(req);
    if (!sesion.usuario) throw new ErrorHttp(401, "Tu sesión se cerró. Volvé a entrar.");
    return sesion;
}
