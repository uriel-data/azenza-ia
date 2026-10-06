const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const inicioDelDia = (fecha) => {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Días completos entre la fecha y hoy, según el calendario local. */
export const diasDesde = (fecha) =>
    Math.round((inicioDelDia(new Date()) - inicioDelDia(fecha)) / 864e5);

/** "1 ago". */
export const fechaCorta = (fecha) => {
    const d = new Date(fecha);
    return `${d.getDate()} ${MESES[d.getMonth()]}`;
};

/** "hoy", "ayer", "hace 5 días" o "el 1 ago". */
export const fechaRelativa = (fecha) => {
    const dias = diasDesde(fecha);

    if (dias <= 0) return "hoy";
    if (dias === 1) return "ayer";
    if (dias < 21) return `hace ${dias} días`;
    return `el ${fechaCorta(fecha)}`;
};
