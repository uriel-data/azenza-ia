// Cuenta: registrarse, entrar, salir, ver la sesión y borrar la cuenta.

import { consulta, una } from "../db.js";
import { DATOS_INVALIDOS, ErrorHttp, json, leerJson } from "../http.js";
import { anotarIntento, limpiarIntentos, verificarLimite } from "../limites.js";
import { abrirSesion, cerrarSesion, cookieVacia, exigirUsuario, usuarioDe } from "../sesion.js";
import { hashearPassword, verificarContraNada, verificarPassword } from "../seguridad.js";

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MIN_PASSWORD = 8;
// Tope para no gastar CPU hasheando textos enormes.
const MAX_PASSWORD = 200;

const texto = (valor) => (typeof valor === "string" ? valor.trim() : "");

const publico = (usuario) => ({ id: usuario.id, nombre: usuario.nombre, email: usuario.email });

/** El nombre visible: sin caracteres de control ni < >, espacios colapsados. */
const limpiarNombre = (valor) =>
    texto(valor).normalize("NFKC").replace(/[\p{Cc}\p{Cf}<>]/gu, "").replace(/\s+/g, " ");

function validarPassword(password) {
    if (typeof password !== "string" || password.length < MIN_PASSWORD) {
        throw new ErrorHttp(400, `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    }
    if (password.length > MAX_PASSWORD) {
        throw new ErrorHttp(400, `La contraseña puede tener hasta ${MAX_PASSWORD} caracteres.`);
    }
}

export async function sesion(req) {
    const { usuario, setCookie } = await usuarioDe(req);
    return json(200, { usuario: usuario ? publico(usuario) : null }, setCookie ? { "Set-Cookie": setCookie } : {});
}

export async function registro(req, { ip }) {
    const cuerpo = await leerJson(req);
    const nombre = limpiarNombre(cuerpo.nombre);
    const email = texto(cuerpo.email).toLowerCase();

    if (!nombre) throw new ErrorHttp(400, "Escribí tu nombre.");
    if (nombre.length > 80) throw new ErrorHttp(400, "El nombre puede tener hasta 80 caracteres.");
    if (!EMAIL.test(email) || email.length > 160) throw new ErrorHttp(400, "Revisá el email: parece que falta algo.");
    validarPassword(cuerpo.password);
    if (cuerpo.aceptaPrivacidad !== true) {
        throw new ErrorHttp(400, "Para crear tu cuenta tenés que aceptar la política de privacidad.");
    }

    await verificarLimite("registro_ip", ip);

    const passwordHash = await hashearPassword(cuerpo.password);
    const [usuario] = await consulta(
        `INSERT INTO usuarios (nombre, email, password_hash, acepto_privacidad_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (email) DO NOTHING
         RETURNING id, nombre, email`,
        [nombre, email, passwordHash]
    );

    if (!usuario) throw new ErrorHttp(409, "Ya hay una cuenta con ese email. Probá entrar.");

    await anotarIntento("registro_ip", ip);
    const setCookie = await abrirSesion(usuario.id);

    return json(201, { usuario: publico(usuario) }, { "Set-Cookie": setCookie });
}

export async function entrar(req, { ip }) {
    const cuerpo = await leerJson(req);
    const email = texto(cuerpo.email).toLowerCase();
    const password = cuerpo.password;

    if (!email || typeof password !== "string" || !password) throw new ErrorHttp(400, "Completá tu email y contraseña.");
    if (email.length > 160 || password.length > MAX_PASSWORD) throw new ErrorHttp(400, DATOS_INVALIDOS);

    await verificarLimite("login_email", email);
    await verificarLimite("login_ip", ip);

    const usuario = await una("SELECT id, nombre, email, password_hash FROM usuarios WHERE email = $1", [email]);
    const ok = usuario ? await verificarPassword(password, usuario.password_hash) : await verificarContraNada(password);

    if (!ok) {
        await anotarIntento("login_email", email);
        await anotarIntento("login_ip", ip);
        // El mismo mensaje exista o no el email.
        throw new ErrorHttp(401, "El email o la contraseña no coinciden.");
    }

    await limpiarIntentos("login_email", email);
    const setCookie = await abrirSesion(usuario.id);

    return json(200, { usuario: publico(usuario) }, { "Set-Cookie": setCookie });
}

export async function salir(req) {
    await cerrarSesion(req);
    return json(200, { ok: true }, { "Set-Cookie": cookieVacia() });
}

/** Borra la cuenta y todo lo suyo (Ley 25.326: derecho de supresión). Pide la contraseña. */
export async function borrar(req, { ip }) {
    const { usuario } = await exigirUsuario(req);
    const { password } = await leerJson(req);

    if (typeof password !== "string" || !password || password.length > MAX_PASSWORD) {
        throw new ErrorHttp(400, "Escribí tu contraseña para confirmar.");
    }

    await verificarLimite("login_email", usuario.email);

    const { password_hash: hash } = await una("SELECT password_hash FROM usuarios WHERE id = $1", [usuario.id]);

    if (!(await verificarPassword(password, hash))) {
        await anotarIntento("login_email", usuario.email);
        await anotarIntento("login_ip", ip);
        throw new ErrorHttp(401, "La contraseña no coincide.");
    }

    // ON DELETE CASCADE borra sesiones, mediciones y módulos. Las consultas al Consultor
    // quedan sin usuario (solo cuentan para el tope global del día).
    await consulta("DELETE FROM usuarios WHERE id = $1", [usuario.id]);

    return json(200, { ok: true }, { "Set-Cookie": cookieVacia() });
}
