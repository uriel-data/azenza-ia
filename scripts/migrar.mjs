// Aplica las migraciones pendientes en una base de Neon.
//
//   npm run db:migrate                  → la base de DATABASE_URL (en .env: la rama dev)
//   npm run db:migrate -- --produccion  → pide la connection string de producción (rama main)
//                                         por pantalla: no queda guardada en ningún archivo.
//
// Siempre primero contra la rama de desarrollo; recién después, producción.
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Pool } from "@neondatabase/serverless";
import { aplicarMigraciones } from "./migraciones.mjs";

try {
    process.loadEnvFile();
} catch {
    // Sin .env: se usa el entorno tal cual.
}

const produccion = process.argv.includes("--produccion");
let url = process.env.DATABASE_URL;

if (produccion) {
    const consola = createInterface({ input: stdin, output: stdout });
    url = (await consola.question("Pegá la connection string de PRODUCCIÓN (rama main de Neon) y apretá Enter:\n> ")).trim();

    const host = safeHost(url);
    if (!host || !/^postgres(ql)?:\/\//.test(url)) {
        console.error("✗ Eso no parece una connection string (empieza con postgresql://).");
        process.exit(1);
    }
    if (host === safeHost(process.env.DATABASE_URL)) {
        console.error("✗ Es la misma base que la de .env (dev). Para producción usá la de la rama main.");
        process.exit(1);
    }

    const ok = (await consola.question(`Se va a migrar ${host}. Escribí SI para seguir: `)).trim();
    consola.close();
    if (ok !== "SI") {
        console.log("Cancelado.");
        process.exit(0);
    }
}

function safeHost(valor) {
    try {
        return new URL(valor).hostname;
    } catch {
        return "";
    }
}

if (!url || !/^postgres(ql)?:\/\//.test(url)) {
    console.error(produccion
        ? "✗ Eso no parece una connection string (empieza con postgresql://)."
        : "✗ Falta DATABASE_URL en .env (copiá .env.example y pegá la connection string de la rama dev).");
    process.exit(1);
}

const pool = new Pool({ connectionString: url });
// Los errores de conexión llegan también como evento: sin esto, cortan el proceso con un volcado ilegible.
pool.on("error", () => {});
console.log(`Migrando ${safeHost(url)}…`);

// Una sola conexión para todo: BEGIN, COMMIT y ROLLBACK tienen que ir por la misma.
let cliente;

try {
    cliente = await pool.connect();
    await aplicarMigraciones({
        // Protocolo simple (sin parámetros): admite varias sentencias por script.
        ejecutar: (sql) => cliente.query(sql),
        consulta: async (sql, parametros) => (await cliente.query(sql, parametros)).rows,
    });
    console.log("✓ Listo.");
} catch (error) {
    // Cada migración corre en su transacción: si algo falla, no queda nada a medias.
    console.error("✗ No se pudo migrar:", error.message);
    process.exitCode = 1;
} finally {
    cliente?.release();
    await pool.end();
}
