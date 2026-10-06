// Aplica en orden las migraciones de db/migraciones/ que todavía no se corrieron.
// Cada archivo corre una sola vez y queda anotado en la tabla migraciones.
// Lo usan scripts/migrar.mjs (Neon) y el servidor de desarrollo (PGlite).
import fs from "node:fs/promises";
import path from "node:path";

const DIR = path.resolve(import.meta.dirname, "..", "db", "migraciones");

/**
 * ejecutar(sql): corre un script con varias sentencias, dentro de una transacción.
 * consulta(sql, parametros): devuelve filas.
 */
export async function aplicarMigraciones({ ejecutar, consulta, log = console.log }) {
    await ejecutar(`CREATE TABLE IF NOT EXISTS migraciones (
        nombre varchar(120) PRIMARY KEY,
        aplicada_at timestamptz NOT NULL DEFAULT now()
    )`);

    const hechas = new Set((await consulta("SELECT nombre FROM migraciones")).map((fila) => fila.nombre));
    const archivos = (await fs.readdir(DIR)).filter((nombre) => /^\d{3}_[a-z0-9_]+\.sql$/.test(nombre)).sort();
    let aplicadas = 0;

    for (const nombre of archivos) {
        if (hechas.has(nombre)) continue;

        const sql = await fs.readFile(path.join(DIR, nombre), "utf8");
        const literal = nombre.replaceAll("'", "''");
        try {
            await ejecutar(`BEGIN;\n${sql}\nINSERT INTO migraciones (nombre) VALUES ('${literal}');\nCOMMIT;`);
        } catch (error) {
            await ejecutar("ROLLBACK").catch(() => {});
            throw new Error(`${nombre}: ${error.message}`, { cause: error });
        }
        log(`  ✓ ${nombre}`);
        aplicadas++;
    }

    if (!aplicadas) log("  Sin migraciones pendientes.");
    return aplicadas;
}
