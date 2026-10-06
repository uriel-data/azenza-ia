// Aplica las migraciones pendientes en la base de DATABASE_URL (Neon).
// Uso: npm run db:migrate  (con DATABASE_URL en el entorno o en .env)
//
// Siempre primero contra la rama de desarrollo de Neon; recién después, producción.
import { Pool } from "@neondatabase/serverless";
import { aplicarMigraciones } from "./migraciones.mjs";

try {
    process.loadEnvFile();
} catch {
    // Sin .env: se usa el entorno tal cual.
}

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("✗ Falta DATABASE_URL (en el entorno o en .env).");
    process.exit(1);
}

const pool = new Pool({ connectionString: url });
const host = new URL(url).hostname;
console.log(`Migrando ${host}…`);

try {
    await aplicarMigraciones({
        // Protocolo simple (sin parámetros): admite varias sentencias por script.
        ejecutar: (sql) => pool.query(sql),
        consulta: async (sql, parametros) => (await pool.query(sql, parametros)).rows,
    });
} catch (error) {
    console.error("✗ La migración falló y se revirtió:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
