// Ayudas para armar frases y montos a partir de lo que escribe el usuario.

/** Primera letra en mayúscula. */
export const capitalizar = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : "");

/** Primera letra en minúscula (para meter una respuesta en medio de una frase). */
export const enMinuscula = (texto) => (texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : "");

/** Saca el punto y los espacios del final. */
export const sinPuntoFinal = (texto) => String(texto ?? "").trim().replace(/[.\s]+$/, "");

export const recortar = (texto, largo) => (texto.length > largo ? `${texto.slice(0, largo - 1).trim()}…` : texto);

/** "9.800" o "$ 9800" → 9800. Vacío o inválido → 0. */
export const entero = (valor) => {
    const numero = parseInt(String(valor ?? "").replace(/[^\d]/g, ""), 10);
    return Number.isNaN(numero) ? 0 : numero;
};

/** "2,5" o "2.5" → 2.5. Vacío o inválido → 0. */
export const decimal = (valor) => {
    const numero = parseFloat(String(valor ?? "").replace(",", "."));
    return Number.isNaN(numero) ? 0 : numero;
};

/** 31100 → "$31.100". */
export const pesos = (numero) => `$${Math.round(numero || 0).toLocaleString("es-AR")}`;

/** Lo que se muestra en un campo de plata mientras se escribe: "9800" → "9.800". */
export const montoEnCampo = (valor) =>
    valor === "" || valor === null || valor === undefined ? "" : entero(valor).toLocaleString("es-AR");

/** Respuestas que no sirven para revisar con criterios: muy cortas o para "todos". */
export const esGenerico = (texto) =>
    !texto || texto.trim().length < 18 || /\b(todos|todo el mundo|cualquiera|de todo|cualquier persona)\b/i.test(texto);
