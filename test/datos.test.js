import assert from "node:assert/strict";
import { before, test } from "node:test";
import { baseDePrueba, cliente } from "./apoyo.js";
import { CONCEPTOS } from "../src/data/conceptos.js";

before(async () => {
    await baseDePrueba();
});

let numero = 0;
async function nuevaCuenta() {
    const pedir = cliente({ ip: `10.1.0.${++numero}` });
    const r = await pedir("/cuenta/registro", {
        method: "POST",
        body: { nombre: "Paula", email: `p${numero}@example.com`, password: "clave-segura-1", aceptaPrivacidad: true },
    });
    assert.equal(r.status, 201);
    return pedir;
}

const todas = () => Object.fromEntries(CONCEPTOS.map((c) => [c.clave, { opcion: 1 }]));

test("sin sesión, los datos piden cuenta", async () => {
    const pedir = cliente();
    assert.equal((await pedir("/datos")).status, 401);
    assert.equal((await pedir("/modulos/cliente", { method: "PUT", body: { valores: {}, filas: [] } })).status, 401);
});

test("punto de partida: borrador parcial, no se cierra incompleto, y se cierra con las 8", async () => {
    const pedir = await nuevaCuenta();

    const parcial = await pedir("/mediciones/borrador", { method: "PUT", body: { respuestas: { cliente_ideal: { opcion: 2 } } } });
    assert.equal(parcial.status, 200);
    assert.equal((await pedir("/mediciones/borrador/completar", { method: "POST", body: {} })).status, 400);

    await pedir("/mediciones/borrador", { method: "PUT", body: { respuestas: todas() } });
    const cerrada = await pedir("/mediciones/borrador/completar", { method: "POST", body: {} });
    assert.equal(cerrada.status, 200);
    assert.ok(cerrada.datos.medicion.completadaAt);

    const { datos } = await pedir("/datos");
    assert.equal(datos.completadas.length, 1);
    assert.equal(datos.abierta, null);
});

test("punto de partida: varias respuestas sin elegir principal queda en nivel 2; con una elegida, en 3", async () => {
    const pedir = await nuevaCuenta();
    const varias = ["Mamás que trabajan", "Oficinas del barrio"];

    const sinElegir = await pedir("/mediciones/borrador", {
        method: "PUT",
        body: { respuestas: { cliente_ideal: { opcion: 3, respuestas: varias, principal: null } } },
    });
    assert.deepEqual(sinElegir.datos.medicion.respuestas.cliente_ideal, { opcion: 3, nivel: 2, texto: null, secundarios: varias });

    const elegida = await pedir("/mediciones/borrador", {
        method: "PUT",
        body: { respuestas: { cliente_ideal: { opcion: 3, respuestas: varias, principal: 1 } } },
    });
    assert.deepEqual(elegida.datos.medicion.respuestas.cliente_ideal, { opcion: 3, nivel: 3, texto: "Oficinas del barrio", secundarios: ["Mamás que trabajan"] });
});

test("punto de partida: rechaza conceptos inventados, opciones fuera de rango y textos largos", async () => {
    const pedir = await nuevaCuenta();
    const mal = [
        { inventado: { opcion: 1 } },
        { precios: { opcion: 4 } },
        { precios: { opcion: 3, respuestas: ["x".repeat(151)] } },
        { precios: { opcion: 3, respuestas: ["una", "dos"] } },
        { cliente_ideal: { opcion: 3, respuestas: ["a", "b", "c", "d", "e"] } },
        { cliente_ideal: { opcion: 3, respuestas: ["a", "b"], principal: 7 } },
    ];
    for (const respuestas of mal) {
        assert.equal((await pedir("/mediciones/borrador", { method: "PUT", body: { respuestas } })).status, 400, JSON.stringify(respuestas));
    }
});

test("módulos: guarda, limpia el texto, pausa sin pisar lo construido y rechaza ids inválidos", async () => {
    const pedir = await nuevaCuenta();

    const guardado = await pedir("/modulos/cliente", {
        method: "PUT",
        body: {
            valores: { frase: "  Mamás <script>que</script>​ trabajan  " },
            filas: [{ etiqueta: "Tu cliente principal", texto: "Mamás que trabajan", clave: "frase" }],
        },
    });
    assert.equal(guardado.status, 200);
    assert.equal(guardado.datos.valores.frase, "Mamás scriptque/script trabajan");

    await pedir("/modulos/cliente/pausa", { method: "PUT", body: { paso: 2, profundidad: "B", valores: { quien: "otra" } } });
    const { datos } = await pedir("/datos");
    assert.ok(datos.construidos.cliente);
    assert.equal(datos.pausados.cliente.paso, 2);

    assert.equal((await pedir("/modulos/inexistente", { method: "PUT", body: { valores: {}, filas: [{ etiqueta: "a", texto: "b" }] } })).status, 404);
    assert.equal((await pedir("/modulos/instagram", { method: "PUT", body: { valores: {}, filas: [{ etiqueta: "a", texto: "b" }] } })).status, 404);
    assert.equal((await pedir("/modulos/cliente", { method: "PUT", body: { valores: { "a b": "x" }, filas: [{ etiqueta: "a", texto: "b" }] } })).status, 400);
    assert.equal((await pedir("/modulos/cliente/pausa", { method: "PUT", body: { paso: 1, profundidad: "Z", valores: {} } })).status, 400);
});

test("importar: pasa lo del invitado a una cuenta vacía, y si la cuenta ya tenía, gana la cuenta", async () => {
    const pedir = await nuevaCuenta();
    const invitado = {
        medicion: { respuestas: todas(), completa: true, fecha: "2026-09-01T12:00:00Z" },
        modulos: {
            construidos: { perfil: { valores: { nombre: "Paula Pastelería" }, filas: [{ etiqueta: "Tu negocio", texto: "Paula Pastelería" }], guardadoAt: "2026-09-02T12:00:00Z" } },
            pausados: { cliente: { paso: 1, profundidad: "A", valores: {} } },
        },
    };

    const primera = await pedir("/importar", { method: "POST", body: invitado });
    assert.deepEqual(primera.datos, { medicion: true, modulos: true });

    const { datos } = await pedir("/datos");
    assert.equal(datos.completadas.length, 1);
    assert.equal(new Date(datos.completadas[0].completadaAt).toISOString(), "2026-09-01T12:00:00.000Z");
    assert.equal(datos.construidos.perfil.valores.nombre, "Paula Pastelería");
    assert.ok(datos.pausados.cliente);

    // Otro invitado entra a la misma cuenta: no pisa nada.
    const segunda = await pedir("/importar", {
        method: "POST",
        body: { ...invitado, modulos: { construidos: { perfil: { valores: { nombre: "Otro" }, filas: [{ etiqueta: "x", texto: "Otro" }] } }, pausados: {} } },
    });
    assert.deepEqual(segunda.datos, { medicion: false, modulos: false });
    assert.equal((await pedir("/datos")).datos.construidos.perfil.valores.nombre, "Paula Pastelería");
});

test("importar: una medición marcada completa pero incompleta queda como borrador", async () => {
    const pedir = await nuevaCuenta();
    await pedir("/importar", { method: "POST", body: { medicion: { respuestas: { precios: { opcion: 2 } }, completa: true } } });

    const { datos } = await pedir("/datos");
    assert.equal(datos.completadas.length, 0);
    assert.ok(datos.abierta);
});
