// Contraseñas, tokens de sesión y hashes. Solo node:crypto: sin dependencias.

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Parámetros de scrypt recomendados por OWASP (N = 2^17, r = 8, p = 1): unos 128 MB de
// memoria por cálculo, lo que hace muy cara una prueba masiva de contraseñas.
const LOG_N = 17;
const R = 8;
const P = 1;
const LARGO = 64;
const MAX_MEMORIA = 256 * 1024 * 1024;

const derivar = (password, sal, logN, r, p) =>
    scryptAsync(password.normalize("NFKC"), sal, LARGO, { N: 2 ** logN, r, p, maxmem: MAX_MEMORIA });

/** "scrypt$17$8$1$<sal>$<hash>", con sal y hash en base64url. */
export async function hashearPassword(password) {
    const sal = randomBytes(16);
    const hash = await derivar(password, sal, LOG_N, R, P);
    return ["scrypt", LOG_N, R, P, sal.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verificarPassword(password, guardado) {
    const [algoritmo, logN, r, p, sal, hash] = String(guardado).split("$");
    if (algoritmo !== "scrypt") return false;

    const esperado = Buffer.from(hash, "base64url");
    const calculado = await derivar(password, Buffer.from(sal, "base64url"), Number(logN), Number(r), Number(p));

    return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

// Hash de una contraseña que nadie tiene. Cuando el email no existe se verifica contra
// este, para que la respuesta tarde lo mismo y no delate qué emails tienen cuenta.
let hashDeRelleno;
export async function verificarContraNada(password) {
    hashDeRelleno ??= await hashearPassword(randomBytes(18).toString("base64url"));
    await verificarPassword(password, hashDeRelleno);
    return false;
}

/** Token de sesión: 256 bits aleatorios. Va en la cookie; en la base, solo su sha256. */
export const nuevoToken = () => randomBytes(32).toString("base64url");

export const sha256 = (texto) => createHash("sha256").update(String(texto)).digest("hex");
