import assert from "node:assert/strict";
import { before, test } from "node:test";
import { baseDePrueba, cliente } from "./apoyo.js";
import { hashearPassword, verificarPassword } from "../servidor/seguridad.js";

let pg;
before(async () => {
    pg = await baseDePrueba();
});

const datos = (email) => ({ nombre: "Paula", email, password: "clave-segura-1", aceptaPrivacidad: true });

test("scrypt: verifica la contraseña correcta y rechaza otra", async () => {
    const hash = await hashearPassword("una clave larga");
    assert.match(hash, /^scrypt\$17\$8\$1\$/);
    assert.equal(await verificarPassword("una clave larga", hash), true);
    assert.equal(await verificarPassword("otra clave", hash), false);
});

test("registro: cookie __Host- httpOnly, Secure y SameSite=Lax; el token se guarda hasheado", async () => {
    const pedir = cliente();
    const { status, cookies } = await pedir("/cuenta/registro", { method: "POST", body: datos("a@example.com") });

    assert.equal(status, 201);
    assert.match(cookies[0], /^__Host-azia=[\w-]{43}; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=\d+$/);

    const token = cookies[0].split(";")[0].split("=")[1];
    const { rows } = await pg.query("SELECT token_hash FROM sesiones");
    assert.ok(rows.every((fila) => fila.token_hash !== token));

    const { datos: sesion } = await pedir("/cuenta");
    assert.equal(sesion.usuario.email, "a@example.com");
});

test("registro: exige aceptar la política y no repite emails", async () => {
    const pedir = cliente({ ip: "10.0.0.2" });
    assert.equal((await pedir("/cuenta/registro", { method: "POST", body: { ...datos("b@example.com"), aceptaPrivacidad: false } })).status, 400);
    assert.equal((await pedir("/cuenta/registro", { method: "POST", body: datos("b@example.com") })).status, 201);
    assert.equal((await pedir("/cuenta/registro", { method: "POST", body: datos("B@Example.com") })).status, 409);
});

test("entrar: 5 fallos por email bloquean, aunque después la contraseña sea la correcta", async () => {
    const pedir = cliente({ ip: "10.0.0.3" });
    await pedir("/cuenta/registro", { method: "POST", body: datos("c@example.com") });
    await pedir("/cuenta/salir", { method: "POST", body: {} });

    for (let i = 0; i < 5; i++) {
        assert.equal((await pedir("/cuenta/entrar", { method: "POST", body: { email: "c@example.com", password: `mal-${i}` } })).status, 401);
    }
    const bloqueado = await pedir("/cuenta/entrar", { method: "POST", body: { email: "c@example.com", password: "clave-segura-1" } });
    assert.equal(bloqueado.status, 429);
});

test("CSRF: sin Origin, con otro Origin o sin JSON, no cambia nada", async () => {
    const pedir = cliente({ ip: "10.0.0.4" });
    assert.equal((await pedir("/cuenta/registro", { method: "POST", body: datos("d@example.com"), origen: null })).status, 403);
    assert.equal((await pedir("/cuenta/registro", { method: "POST", body: datos("d@example.com"), origen: "https://otro.example" })).status, 403);
    assert.equal((await pedir("/cuenta/registro", { method: "POST", body: datos("d@example.com"), tipo: "text/plain" })).status, 415);
});

test("borrar la cuenta: pide la contraseña y borra todo", async () => {
    const pedir = cliente({ ip: "10.0.0.5" });
    const { datos: { usuario } } = await pedir("/cuenta/registro", { method: "POST", body: datos("e@example.com") });

    assert.equal((await pedir("/cuenta/borrar", { method: "POST", body: { password: "otra-cosa" } })).status, 401);
    assert.equal((await pedir("/cuenta/borrar", { method: "POST", body: { password: "clave-segura-1" } })).status, 200);

    const { rows } = await pg.query("SELECT count(*)::int AS n FROM sesiones WHERE usuario_id = $1", [usuario.id]);
    assert.equal(rows[0].n, 0);
    assert.equal((await pedir("/cuenta")).datos.usuario, null);
});
