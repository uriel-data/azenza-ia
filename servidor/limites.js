// Límites de intentos (entrar, registrarse), guardados en la base: en serverless la
// memoria no dura entre invocaciones. Emails e IPs se guardan como SHA-256.

import { consulta, una } from "./db.js";
import { ErrorHttp } from "./http.js";
import { sha256 } from "./seguridad.js";

export const LIMITES = {
    // Contraseñas equivocadas para un mismo email.
    login_email: { maximo: 5, minutos: 15 },
    // Contraseñas equivocadas desde una misma IP (varios emails).
    login_ip: { maximo: 20, minutos: 15 },
    // Cuentas nuevas desde una misma IP.
    registro_ip: { maximo: 5, minutos: 60 },
};

const MENSAJE = {
    login_email: "Hubo varios intentos con este email. Por seguridad, esperá 15 minutos y probá de nuevo.",
    login_ip: "Hubo muchos intentos desde esta conexión. Esperá 15 minutos y probá de nuevo.",
    registro_ip: "Se crearon varias cuentas desde esta conexión. Probá de nuevo en una hora.",
};

const claveDe = (valor) => sha256(String(valor ?? "").toLowerCase());

/** Lanza un 429 si ya se llegó al límite. */
export async function verificarLimite(tipo, valor) {
    const { maximo, minutos } = LIMITES[tipo];
    const { cantidad } = await una(
        `SELECT count(*)::int AS cantidad FROM intentos
          WHERE tipo = $1 AND clave = $2 AND creado_at > now() - make_interval(mins => $3)`,
        [tipo, claveDe(valor), minutos]
    );

    if (cantidad >= maximo) throw new ErrorHttp(429, MENSAJE[tipo]);
}

export async function anotarIntento(tipo, valor) {
    await consulta("INSERT INTO intentos (tipo, clave) VALUES ($1, $2)", [tipo, claveDe(valor)]);

    // De vez en cuando se borran los viejos (más de un día): la tabla no crece sin fin.
    if (Math.random() < 0.05) {
        await consulta("DELETE FROM intentos WHERE creado_at < now() - interval '1 day'");
        await consulta("DELETE FROM sesiones WHERE vence_at < now()");
    }
}

/** Después de entrar bien, se olvidan los fallos de ese email. */
export const limpiarIntentos = (tipo, valor) =>
    consulta("DELETE FROM intentos WHERE tipo = $1 AND clave = $2", [tipo, claveDe(valor)]);
