// Catálogo del cuestionario de nivelación ("Tu punto de partida").
//
// Es la única fuente de verdad: lo importan el frontend (lo muestra) y el servidor
// (valida contra esto), y los módulos leen de acá el nivel por concepto. Si cambia el texto de una pregunta de forma que altere lo que mide, subir
// VERSION_CATALOGO: las respuestas guardan la versión con la que se respondieron.
//
// Los textos son los del prototipo "Azenza IA App - V1" (decisión del 2026-10-06).
//
// Reglas de redacción (salen del brief):
// - Lenguaje simple. Si aparece un término técnico, la explicación lo aclara antes.
// - El número de nivel NUNCA se le muestra al usuario.
// - Nada puede leerse como una nota ni como una lista de carencias.

export const VERSION_CATALOGO = 1;

export const MAX_CARACTERES_RESPUESTA = 150;
export const MAX_RESPUESTAS_LISTADAS = 4;

// Las tres opciones son iguales en todas las preguntas: así se entiende la escala
// desde la primera pantalla. La 1 va en pasado ("es nuevo para mí") para que nadie
// quede expuesto por elegirla justo después de leer la explicación.
export const OPCIONES = {
    1: "Es nuevo para mí, o no me queda del todo claro",
    2: "Entiendo la idea, pero todavía no lo tengo definido",
    3: "Sí, lo tengo",
};

// Versión corta, para las comparaciones de antes y después.
export const OPCIONES_CORTAS = {
    1: "Es nuevo para mí",
    2: "Lo entiendo, no lo tengo definido",
    3: "Lo tengo",
};

// Pantalla para elegir la respuesta principal (solo en conceptos con permiteVarias).
const ELECCION_SIN_ELEGIR = "Todavía no sabría cuál elegir";

// modulo: el módulo de la ruta que construye ese concepto. Los conceptos que el
// usuario todavía no tiene definidos ponen su módulo primero en la ruta.
export const CONCEPTOS = [
    {
        clave: "cliente_ideal",
        area: "marketing",
        titulo: "¿A quién le vendés?",
        nombreTecnico: "Cliente ideal",
        explicacion:
            "No es “todo el mundo”. Es la persona que más te compra y mejor te entiende: quién es, qué le pasa y qué necesita.",
        permiteVarias: true,
        modulo: "cliente",
        campo: {
            pregunta: "Quién es y qué necesita",
            ejemplo: "mamás que trabajan todo el día y quieren una torta casera para el cumple de sus hijos",
        },
        eleccion: {
            titulo: "¿A quién le hablás primero?",
            explicacion:
                "Es normal venderle a más de un tipo de persona. Pero en redes, un mensaje que le habla a todos no " +
                "le llega a nadie. Elegí el que más te compra hoy, o el que más querés atraer. Los otros no se " +
                "pierden: los tenemos en cuenta.",
            sinElegir: ELECCION_SIN_ELEGIR,
        },
    },
    {
        clave: "propuesta_valor",
        area: "marketing",
        titulo: "¿Qué problema le resolvés?",
        nombreTecnico: "Propuesta de valor",
        explicacion:
            "La gente no compra solo un producto: compra resolver algo. Es ese problema que resolvés, dicho en una frase.",
        permiteVarias: true,
        modulo: "propuesta",
        campo: {
            pregunta: "El problema, en una frase",
            ejemplo: "tener una torta casera para un festejo sin tener que cocinarla",
        },
        eleccion: {
            titulo: "¿Cuál querés que se entienda primero?",
            explicacion:
                "Tu negocio puede resolver varios problemas, pero quien entra a tu perfil decide en segundos. Elegí " +
                "el problema por el que querés que te reconozcan. Los demás no se pierden: los tenemos en cuenta.",
            sinElegir: ELECCION_SIN_ELEGIR,
        },
    },
    {
        clave: "diferenciacion",
        area: "marketing",
        titulo: "¿Por qué te eligen a vos?",
        nombreTecnico: "Diferenciación",
        explicacion:
            "Es lo que tenés vos y no tienen los demás que venden lo mismo. Si no hay nada, el cliente elige por precio.",
        permiteVarias: false,
        modulo: "propuesta",
        campo: {
            pregunta: "Qué tenés que los demás no",
            ejemplo: "entrego en el día y hago versiones sin TACC",
        },
    },
    {
        clave: "comunicacion",
        area: "marketing",
        titulo: "¿Qué contás en tus redes?",
        nombreTecnico: "Comunicación",
        explicacion:
            "Cada publicación tiene un para qué: que te conozcan, que confíen en vos o que te compren.",
        permiteVarias: false,
        modulo: "bio",
        campo: {
            pregunta: "Tus temas y para qué sirve cada uno",
            ejemplo: "muestro el proceso, para que confíen, y los pedidos de la semana, para vender",
        },
    },
    {
        clave: "precios",
        area: "management",
        titulo: "¿Cómo ponés tus precios?",
        nombreTecnico: "Precios",
        explicacion:
            "Un precio sano cubre lo que gastás, tu tiempo y una ganancia. Mirar solo a la competencia suele dejar algo afuera.",
        permiteVarias: false,
        modulo: "precios",
        campo: {
            pregunta: "Cómo los calculás, con tus palabras",
            ejemplo: "sumo ingredientes y caja, y le agrego la mitad",
        },
    },
    {
        clave: "costos",
        area: "management",
        titulo: "¿Cuánto te cuesta lo que vendés?",
        nombreTecnico: "Costos",
        explicacion:
            "Además de la materia prima hay gastos que no se ven: gas, luz, envíos, comisiones. Acá no hacen falta montos.",
        permiteVarias: false,
        modulo: "caja",
        campo: {
            pregunta: "Tus gastos principales, sin montos",
            ejemplo: "ingredientes, cajas, gas, envíos y la comisión del cobro",
        },
    },
    {
        clave: "procesos",
        area: "management",
        titulo: "¿Cómo se hace cada cosa en tu negocio?",
        nombreTecnico: "Procesos",
        explicacion:
            "Un proceso es una tarea que repetís siempre igual. Escribirla te deja delegarla y no olvidarte de nada.",
        permiteVarias: false,
        modulo: "procesos",
        campo: {
            pregunta: "Los pasos de una tarea que repetís",
            ejemplo: "tomar un pedido: confirmo fecha, pido seña, anoto el sabor y agendo la entrega",
        },
    },
    {
        clave: "objetivos",
        area: "management",
        titulo: "¿A dónde querés llegar?",
        nombreTecnico: "Objetivos",
        explicacion:
            "Un objetivo útil tiene un número y una fecha. “Crecer” no se puede medir; “40 tortas por mes en marzo”, sí.",
        permiteVarias: false,
        modulo: "objetivos",
        campo: {
            pregunta: "Una meta con número y fecha",
            ejemplo: "vender 40 tortas por mes antes de marzo de 2027",
        },
    },
];

export const CLAVES_CONCEPTOS = CONCEPTOS.map((concepto) => concepto.clave);

export const obtenerConcepto = (clave) =>
    CONCEPTOS.find((concepto) => concepto.clave === clave) ?? null;
