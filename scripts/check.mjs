// Verificaciones de seguridad antes de publicar. Corre después de `vite build`
// (Netlify lo hace en cada deploy: ver netlify.toml). Uso: npm run check
import fs from "node:fs/promises";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..");
const DIST = path.join(RAIZ, "dist");
const fallas = [];
const falla = (archivo, mensaje) => fallas.push(`${archivo}: ${mensaje}`);

async function listar(dir) {
    const salida = [];
    for (const entrada of await fs.readdir(dir, { withFileTypes: true })) {
        const ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) salida.push(...(await listar(ruta)));
        else salida.push(ruta);
    }
    return salida;
}

const relativa = (ruta) => path.relative(RAIZ, ruta).replaceAll("\\", "/");

try {
    await fs.access(path.join(DIST, "index.html"));
} catch {
    console.error("✗ No existe dist/index.html: corré `npm run build` antes.");
    process.exit(1);
}

// 1. Lo publicado: nada de secretos, ni HTML que la CSP vaya a bloquear.
for (const archivo of await listar(DIST)) {
    const nombre = relativa(archivo);
    if (!/\.(html|js|css|txt|svg|json|map)$|\/_(headers|redirects)$/.test(nombre)) continue;
    const texto = await fs.readFile(archivo, "utf8");

    if (/AIza[0-9A-Za-z_-]{20,}|postgres(ql)?:\/\/|GEMINI_API_KEY|DATABASE_URL/.test(texto)) {
        falla(nombre, "parece contener una credencial o una variable del servidor");
    }

    if (nombre.endsWith(".map")) falla(nombre, "no se publican sourcemaps");

    if (/\.svg$/.test(nombre) && /<script|\son\w+=/i.test(texto)) falla(nombre, "el SVG tiene scripts o manejadores de eventos");

    if (/\.html$/.test(nombre)) {
        if (/\sstyle\s*=/i.test(texto)) falla(nombre, "tiene estilos en línea (la CSP los bloquea)");
        if (/\son[a-z]+\s*=/i.test(texto)) falla(nombre, "tiene manejadores de eventos en línea (la CSP los bloquea)");
        if (/<style\b/i.test(texto)) falla(nombre, "tiene un <style> en línea (la CSP lo bloquea)");
        for (const m of texto.matchAll(/<script\b([^>]*)>/gi)) {
            if (!/\bsrc=/.test(m[1])) falla(nombre, "tiene un <script> en línea");
        }
        for (const m of texto.matchAll(/\b(?:src|href)="(https?:\/\/[^"]+)"/g)) {
            falla(nombre, `recurso externo: ${m[1]} (todo se sirve desde el propio sitio)`);
        }
    }
}

// 2. El código fuente: nada que ejecute o inyecte HTML a partir de texto.
for (const archivo of [...(await listar(path.join(RAIZ, "src"))), ...(await listar(path.join(RAIZ, "servidor")))]) {
    if (!/\.(js|jsx|mjs)$/.test(archivo)) continue;
    const texto = await fs.readFile(archivo, "utf8");

    if (/\beval\s*\(|new Function\s*\(|document\.write\s*\(|\.innerHTML\s*=|dangerouslySetInnerHTML/.test(texto)) {
        falla(relativa(archivo), "usa eval, Function, document.write, innerHTML o dangerouslySetInnerHTML");
    }
    if (archivo.includes(`${path.sep}src${path.sep}`) && /process\.env|GEMINI|DATABASE_URL/.test(texto)) {
        falla(relativa(archivo), "el frontend no puede leer variables del servidor");
    }
}

// 3. Cabeceras y redirecciones.
const cabeceras = await fs.readFile(path.join(DIST, "_headers"), "utf8").catch(() => "");
for (const cabecera of ["Content-Security-Policy", "Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options"]) {
    if (!cabeceras.includes(`${cabecera}:`)) falla("_headers", `falta ${cabecera}`);
}
if (/unsafe-inline|unsafe-eval/.test(cabeceras)) falla("_headers", "la CSP no puede permitir unsafe-inline ni unsafe-eval");
const csp = cabeceras.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? "";
if (!/script-src 'self';/.test(csp)) falla("_headers", "script-src tiene que ser solo 'self'");
if (!/connect-src 'self';/.test(csp)) falla("_headers", "connect-src tiene que ser solo 'self' (la IA se llama desde el servidor)");

const redirecciones = await fs.readFile(path.join(DIST, "_redirects"), "utf8").catch(() => "");
if (!/^\/\*\s+\/index\.html\s+200\s*$/m.test(redirecciones)) falla("_redirects", "falta la regla de la SPA: /* /index.html 200");

if (fallas.length) {
    console.error("✗ Verificación fallida:\n  - " + fallas.join("\n  - "));
    process.exit(1);
}

console.log("✓ Verificación de seguridad OK");
