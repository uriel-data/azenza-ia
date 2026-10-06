// Los 15 módulos de la ruta, en 3 etapas. Cada uno construye una "base" del negocio
// que queda guardada en Tu negocio como una tarjeta. Contenido del prototipo
// "Azenza IA App - V1". El backend tiene la lista de ids y los criterios de revisión
// en backend/src/data/modulos.js: si se agrega un módulo, va en los dos lados.
//
// Campos de cada módulo:
// - concepto: clave del punto de partida que mide ese tema. Define la profundidad
//   con la que se recorre (ver profundidadPara en data/recorrido.js).
// - requisitos: módulos cuyo resultado este precarga. Se recomienda hacerlos antes,
//   pero nunca bloquean.
// - integra: se arma casi entero con lo que ya construyó (se muestra "Precargado").
// - pronto: todavía no está disponible. Se muestra "Muy pronto" con su aviso y no
//   cuenta para el próximo paso.
// - problema / explicacion: las dos pantallas de la versión completa.
// - pasos: las preguntas del ejercicio. Cada campo tiene clave y, opcionalmente,
//   etiqueta, ejemplo, largo, tipo (dinero | numero | porcentaje), opcional, max,
//   ctx (dato de Tu negocio que lo precarga) y precarga(ctx, valores).
// - criterios: con qué se revisa el resultado (versión "mejorar lo que tenés").
// - clavePrincipal: el campo que se mejora en esa versión.
// - desdePuntoDePartida(respuestas): valores que se precargan desde el punto de partida.
// - armarFilas(valores): la tarjeta que queda en Tu negocio.
// - siguiente: el módulo que sigue naturalmente y por qué.

import { textoPrincipal, entradasConTexto } from "./puntoDePartida";
import { capitalizar, decimal, enMinuscula, entero, pesos, sinPuntoFinal } from "../utils/texto";

// Para revisar los módulos que no tienen criterios propios (igual que en el backend).
export const CRITERIOS_GENERICOS = [
    { criterio: "Es concreto y propio de tu negocio" },
    { criterio: "Se entiende en una sola lectura" },
    { criterio: "Se puede usar tal cual: en tus redes, con un cliente o con un socio" },
];

export const ETAPAS = [
    { numero: 1, nombre: "Identidad y Comunicación" },
    { numero: 2, nombre: "Estrategia y Finanzas" },
    { numero: 3, nombre: "Procesos y Escalabilidad" },
];

/** Precio = (materiales + tiempo + otros) × (1 + margen), redondeado a la centena. */
export function calcularPrecio(valores) {
    const materiales = entero(valores.ingredientes) + entero(valores.packaging);
    const tiempo = Math.round(decimal(valores.horas) * entero(valores.hora));
    const otros = entero(valores.otros);
    const costo = materiales + tiempo + otros;
    const margen = Number(valores.margen ?? 30);
    const precio = Math.round((costo * (1 + margen / 100)) / 100) * 100;

    return { materiales, tiempo, otros, costo, ganancia: precio - costo, precio, margen };
}

/** Filas de la tarjeta a partir de pares [clave, etiqueta], salteando las vacías. */
const filasDe = (valores, pares) =>
    pares
        .map(([clave, etiqueta]) => ({ etiqueta, texto: valores[clave], clave }))
        .filter((fila) => fila.texto);

export const MODULOS = [
    {
        id: "perfil", etapa: 1, nombre: "Perfil del negocio", minutos: 10,
        construye: "Tu ficha: qué vendés, rubro, desde cuándo, canales",
        problema: {
            titulo: "Sin una ficha clara, cada respuesta empieza de cero",
            sin: "Cada vez que alguien le pregunta “¿qué hacés?”, contesta algo distinto.",
            con: "Tiene en cuatro líneas qué vende, su rubro, desde cuándo y por dónde vende.",
        },
        explicacion: {
            termino: "Perfil",
            titulo: "Tu perfil es la ficha de tu negocio.",
            texto: "Son los datos básicos que usa todo lo demás: tu propuesta, tu bio, tu canvas.",
            ejemploEtiqueta: "Ejemplo · una huerta orgánica",
            ejemplo: "Bolsones de verdura orgánica semanales · Agro · Desde 2021 · WhatsApp y feria de los sábados.",
        },
        pasos: [
            { pregunta: "¿Cómo se llama tu negocio y qué vendés?", corto: "Qué vendés", campos: [
                { clave: "nombre", etiqueta: "Nombre", ejemplo: "Paula Pastelería" },
                { clave: "vende", etiqueta: "Qué vendés", ejemplo: "tortas y mesas dulces por encargo", largo: true },
            ] },
            { pregunta: "¿En qué rubro estás y desde cuándo?", corto: "Rubro", campos: [
                { clave: "rubro", etiqueta: "Rubro", ejemplo: "gastronomía" },
                { clave: "desde", etiqueta: "Desde cuándo", ejemplo: "2023" },
            ] },
            { pregunta: "¿Por dónde vendés?", corto: "Canales", ayuda: "Redes, local, feria, boca en boca: todo cuenta.", campos: [
                { clave: "canales", ejemplo: "Instagram, WhatsApp y recomendaciones", largo: true },
            ] },
        ],
        armarFilas: (v) => [
            { etiqueta: "Tu negocio", texto: `${sinPuntoFinal(v.nombre)} · ${sinPuntoFinal(v.vende)}` },
            { etiqueta: "Rubro", texto: `${sinPuntoFinal(v.rubro)} · desde ${sinPuntoFinal(v.desde)}` },
            { etiqueta: "Canales", texto: v.canales, clave: "canales" },
        ],
        siguiente: { id: "cliente", porque: "Con tu ficha lista, el paso siguiente es saber a quién le vendés." },
    },
    {
        id: "cliente", etapa: 1, nombre: "Cliente ideal", minutos: 15, concepto: "cliente_ideal",
        construye: "Tu cliente principal y los secundarios",
        problema: {
            titulo: "Venderle a todos es no venderle a nadie",
            sin: "Publica para “todo el mundo”, y nadie siente que le está hablando a él.",
            con: "Cada foto, precio y mensaje le habla a una persona concreta, que se reconoce y compra.",
        },
        explicacion: {
            termino: "Cliente ideal",
            titulo: "Tu cliente ideal es la persona que más te compra y mejor te entiende.",
            texto: "No es todo el que podría comprarte. Es alguien concreto: quién es, qué le pasa en el día a día y qué necesita resolver.",
            ejemploEtiqueta: "Ejemplo · una verdulería de barrio",
            ejemplo: "Jubilados del barrio que compran poco y todos los días, y quieren que les elijan la fruta madura.",
        },
        pasos: [
            { pregunta: "Pensá en tu mejor cliente de los últimos meses. ¿Quién es?", corto: "Quién es",
                ayuda: "Una persona real, no un grupo: edad, a qué se dedica, dónde vive.",
                campos: [{ clave: "quien", largo: true, ejemplo: "una mamá de 35 que trabaja en una oficina" }] },
            { pregunta: "¿Qué le pasa en su día a día que la lleva a comprarte?", corto: "Qué le pasa",
                ayuda: "Pensá en la situación, no en tu producto.",
                campos: [{ clave: "pasa", largo: true, ejemplo: "no tiene tiempo de cocinar para los cumples de sus hijos" }] },
            { pregunta: "¿Qué necesita de vos para volver a elegirte?", corto: "Qué necesita",
                campos: [{ clave: "necesita", largo: true, ejemplo: "que la torta llegue a tiempo y se vea casera" }] },
            { pregunta: "Juntalo en una frase", corto: "Tu frase", ayuda: "La armamos con tus respuestas. Cambiá lo que quieras.",
                campos: [{ clave: "frase", largo: true, precarga: (ctx, v) => [
                    sinPuntoFinal(capitalizar(v.quien)),
                    v.pasa && `que ${sinPuntoFinal(enMinuscula(v.pasa))}`,
                    v.necesita && `y necesita ${sinPuntoFinal(enMinuscula(v.necesita))}`,
                ].filter(Boolean).join(", ") + "." }] },
            { pregunta: "¿Hay otros clientes que también te compran?", corto: "Otros", ayuda: "Opcional. Se guardan como secundarios.",
                campos: [{ clave: "secundarios", largo: true, opcional: true, ejemplo: "oficinas que festejan cumpleaños del equipo" }] },
        ],
        criterios: [
            { criterio: "Es una persona concreta, no un grupo amplio", ayuda: "Si dice “todos” o “cualquiera”, quedate con quien más te compra." },
            { criterio: "Dice qué le pasa en su día a día", ayuda: "¿En qué momento te necesita?" },
            { criterio: "Dice qué necesita de vos", ayuda: "¿Qué la haría volver a comprarte?" },
        ],
        clavePrincipal: "frase",
        tituloResultado: "Tu cliente ideal, por escrito.",
        tituloMejorar: "Mejorá la descripción de tu cliente",
        // Los clientes que anotó en el punto de partida, además del principal, pasan a secundarios.
        desdePuntoDePartida: (respuestas) => {
            const respuesta = respuestas.cliente_ideal;
            if (respuesta?.opcion !== 3) return {};

            const principal = textoPrincipal(respuesta);
            return { secundarios: entradasConTexto(respuesta).filter((texto) => texto !== principal).join(" · ") };
        },
        armarFilas: (v) => filasDe(v, [["frase", "Tu cliente principal"], ["secundarios", "Secundarios"]]),
        siguiente: { id: "propuesta", porque: "Ahora que sabés a quién le vendés, podés decir qué problema le resolvés." },
    },
    {
        id: "propuesta", etapa: 1, nombre: "Propuesta de valor", minutos: 15, concepto: "propuesta_valor", requisitos: ["cliente"],
        construye: "Tu propuesta en una frase y tu diferencial",
        problema: {
            titulo: "Si no se entiende qué resolvés, se compite por precio",
            sin: "“Productos artesanales hechos con amor.” Lo mismo que dicen otros cien.",
            con: "“Tortas caseras para tu festejo, listas para servir.” En tres segundos se entiende para quién y para qué.",
        },
        explicacion: {
            termino: "Propuesta de valor",
            titulo: "Tu propuesta de valor es el problema que le resolvés a tu cliente, dicho en una frase.",
            texto: "Junto con tu diferencial —lo que tenés vos y no los demás— es la razón por la que te eligen.",
            ejemploEtiqueta: "Ejemplo · un taller de bicicletas",
            ejemplo: "Arreglamos tu bici en el día, para que no pierdas ni un viaje al trabajo.",
        },
        tarjetaContexto: { clave: "cliente", etiqueta: "Tu cliente ideal · de Tu negocio" },
        pasos: [
            { pregunta: "¿Qué problema tiene tu cliente que vos le resolvés?", corto: "El problema",
                campos: [{ clave: "problema", largo: true, ejemplo: "quiere festejar con algo casero y no tiene tiempo de cocinar" }] },
            { pregunta: "¿Qué consigue gracias a vos?", corto: "Qué consigue", ayuda: "El resultado, no el producto.",
                campos: [{ clave: "consigue", largo: true, ejemplo: "una torta casera lista para servir" }] },
            { pregunta: "¿Qué tenés que no tengan los demás?", corto: "Tu diferencial", ayuda: "Algo que puedas cumplir siempre, no solo a veces.",
                campos: [{ clave: "diferencial", largo: true, ejemplo: "entrego en el día en el barrio y alrededores" }] },
            { pregunta: "Tu propuesta en una frase", corto: "Tu frase", ayuda: "La armamos con tus respuestas. Cambiá lo que quieras.",
                campos: [{ clave: "frase", largo: true, precarga: (ctx, v) =>
                    sinPuntoFinal(capitalizar(v.consigue)) + (v.problema ? `, para quien ${sinPuntoFinal(enMinuscula(v.problema))}` : "") + "." }] },
        ],
        criterios: [
            { criterio: "Dice qué problema resolvés", ayuda: "¿Se entiende qué le pasa a tu cliente antes de comprarte?" },
            { criterio: "Se entiende en una sola lectura", ayuda: "Si tiene más de una idea, quedate con la principal." },
            { criterio: "No depende de adjetivos", ayuda: "“De calidad” o “con amor” lo dicen todos. ¿Qué resultado concreto da?" },
        ],
        clavePrincipal: "frase",
        tituloResultado: "Tu propuesta de valor, en una frase.",
        tituloMejorar: "Mejorá tu propuesta",
        desdePuntoDePartida: (respuestas) => ({
            diferencial: respuestas.diferenciacion?.opcion === 3 ? textoPrincipal(respuestas.diferenciacion) : "",
        }),
        armarFilas: (v) => filasDe(v, [["frase", "Tu propuesta"], ["diferencial", "Tu diferencial"]]),
        siguiente: { id: "bio", porque: "Tu bio es tu propuesta en pocas palabras: ya tenés casi todo para escribirla." },
    },
    {
        id: "bio", etapa: 1, nombre: "Bio optimizada", minutos: 10, concepto: "comunicacion", requisitos: ["propuesta"],
        construye: "Tu bio de redes, reescrita a partir de lo anterior",
        problema: {
            titulo: "Una bio vaga hace que se vayan sin preguntar",
            sin: "“Bienvenidos. Hacemos de todo. Consultas por privado.”",
            con: "Dice para quién es, qué resuelve y cómo comprar. Quien entra sabe en segundos si es para él.",
        },
        explicacion: {
            termino: "Bio",
            titulo: "Tu bio es tu propuesta de valor en 150 caracteres.",
            texto: "Tiene tres partes: para quién es, qué resolvés y cómo se compra.",
            ejemploEtiqueta: "Ejemplo · una profe de yoga",
            ejemplo: "Yoga para espaldas cansadas de oficina · Clases de 30 minutos online · Reservá tu primera clase abajo",
        },
        pasos: [
            { pregunta: "Escribí tu bio", corto: "Tu bio", ayuda: "Partimos de tu propuesta de valor. Máximo 150 caracteres.",
                campos: [{ clave: "bio", largo: true, max: 150, ctx: "propuesta", ejemplo: "Para quién · qué resolvés · cómo comprar",
                    sinPrefijo: true, precarga: (ctx) => (ctx.propuesta || "").slice(0, 150) }] },
        ],
        armarFilas: (v) => filasDe(v, [["bio", "Tu bio"]]),
        siguiente: { id: "contenido", porque: "Con tu bio lista, el paso siguiente es decidir qué publicar y para qué." },
    },
    {
        id: "instagram", etapa: 1, nombre: "Análisis de Instagram", minutos: 10, concepto: "comunicacion", pronto: true,
        aviso: "Va a leer una captura real de tu perfil, junto con lo que escribiste en Cliente ideal y Propuesta de valor. Lo estamos terminando de preparar.",
        construye: "Un diagnóstico de tu perfil real, a partir de una captura",
    },
    {
        id: "precios", etapa: 2, nombre: "Calculadora de precios", minutos: 15, concepto: "precios", calculadora: true,
        construye: "El precio de cada producto, con costos y margen",
        problema: {
            titulo: "Precio a ojo: vendés más y ganás menos",
            sin: "Cobra $25.000 porque “es lo que cobran todos”. No sabe que cada torta le cuesta $23.900.",
            con: "Sabe cuánto le cuesta cada torta y cuánto vale su hora. Cobra $31.100, sin dudar.",
        },
        explicacion: {
            termino: "Costo + margen",
            titulo: "Un precio sano cubre tres cosas: lo que gastás, tu tiempo y una ganancia.",
            texto: "Si falta una, la estás pagando vos. El precio de la competencia sirve para comparar, no para calcular.",
            ejemploEtiqueta: "La cuenta",
            ejemplo: "Materiales + tu tiempo + otros gastos = lo que te cuesta. Lo que te cuesta + tu ganancia = tu precio.",
        },
        pasos: [
            { pregunta: "¿Qué producto calculamos?", corto: "Producto", ayuda: "Empezá por el que más vendés.",
                campos: [{ clave: "producto", ejemplo: "torta de chocolate, 8 porciones" }] },
            { pregunta: "¿Cuánto gastás en materiales para hacer uno?", corto: "Materiales", ayuda: "Solo lo que usás para esta unidad.", campos: [
                { clave: "ingredientes", etiqueta: "Ingredientes o materia prima", tipo: "dinero", ejemplo: "9.800" },
                { clave: "packaging", etiqueta: "Caja, envoltorio, etiqueta", tipo: "dinero", ejemplo: "1.200" },
            ] },
            { pregunta: "¿Cuánto tiempo te lleva y cuánto vale tu hora?", corto: "Tu tiempo",
                ayuda: "Si no sabés cuánto vale tu hora: lo que querés ganar por mes, dividido las horas que trabajás.", campos: [
                    { clave: "horas", etiqueta: "Horas por unidad", tipo: "numero", ejemplo: "3" },
                    { clave: "hora", etiqueta: "Valor de tu hora", tipo: "dinero", ejemplo: "4.000" },
                ] },
            { pregunta: "¿Qué otros gastos tiene cada unidad?", corto: "Otros", ayuda: "Gas, luz, envío, comisión del cobro. Una estimación alcanza.",
                campos: [{ clave: "otros", etiqueta: "Otros gastos por unidad", tipo: "dinero", ejemplo: "900" }] },
            { pregunta: "¿Qué ganancia querés sumarle?", corto: "Ganancia", ayuda: "Es lo que le queda al negocio para crecer, aparte de tu hora.",
                campos: [{ clave: "margen", tipo: "porcentaje" }] },
            { pregunta: "¿Cuánto lo cobrás hoy?", corto: "Hoy", ayuda: "Opcional. Sirve para comparar.",
                campos: [{ clave: "actual", etiqueta: "Precio actual", tipo: "dinero", ejemplo: "25.000", opcional: true }] },
        ],
        criterios: [
            { criterio: "Incluye tu tiempo", ayuda: "Tu hora de trabajo es un costo, aunque no se la pagues a nadie." },
            { criterio: "Incluye los gastos que no se ven", ayuda: "Gas, luz, envíos, comisiones." },
            { criterio: "Tiene una ganancia definida", ayuda: "Un porcentaje fijo, no “lo que dé”." },
        ],
        clavePrincipal: "metodo",
        tituloResultado: "Tu precio, calculado con tus números.",
        tituloMejorar: "Revisá cómo calculás tu precio",
        armarFilas: (v) => {
            const c = calcularPrecio(v);
            return [
                { etiqueta: "Producto", texto: v.producto, clave: "producto" },
                { etiqueta: "Lo que te cuesta", texto: `${pesos(c.costo)} por unidad` },
                { etiqueta: "Precio sugerido", texto: `${pesos(c.precio)}, con ${c.margen}% de ganancia` },
            ];
        },
        siguiente: { id: "caja", porque: "Ya sabés cuánto cobrar. El flujo de caja te muestra cuánto te queda a fin de mes." },
    },
    {
        id: "caja", etapa: 2, nombre: "Flujo de caja", minutos: 15, concepto: "costos",
        construye: "Tu planilla mensual de ingresos y egresos",
        problema: {
            titulo: "Sin flujo de caja, fin de mes es una sorpresa",
            sin: "Vende todo el mes y no entiende por qué no le alcanza.",
            con: "Sabe cuánto entró, cuánto salió y cuánto puede guardar o invertir.",
        },
        explicacion: {
            termino: "Flujo de caja",
            titulo: "El flujo de caja es anotar toda la plata que entra y sale, mes a mes.",
            texto: "No es contabilidad: es saber de dónde viene tu plata y a dónde va.",
            ejemploEtiqueta: "Ejemplo · un taller de costura",
            ejemplo: "Entraron $820.000 en arreglos. Salieron $610.000 en telas, alquiler y luz. Quedaron $210.000.",
        },
        pasos: [
            { pregunta: "¿Cuánto vendiste el último mes?", corto: "Entró",
                campos: [{ clave: "ingresos", etiqueta: "Ingresos del mes", tipo: "dinero", ejemplo: "1.240.000" }] },
            { pregunta: "¿Cuánto gastaste ese mes?", corto: "Salió",
                ayuda: "Materiales, alquiler, servicios, envíos, comisiones y tu sueldo, si te lo pagás.",
                campos: [{ clave: "egresos", etiqueta: "Egresos del mes", tipo: "dinero", ejemplo: "905.000" }] },
            { pregunta: "¿Cuál fue tu gasto más grande?", corto: "Mayor gasto",
                campos: [{ clave: "mayor", ejemplo: "ingredientes" }] },
        ],
        armarFilas: (v) => [
            { etiqueta: "Último mes", texto: `Entraron ${pesos(entero(v.ingresos))} y salieron ${pesos(entero(v.egresos))}` },
            { etiqueta: "Te quedó", texto: pesos(entero(v.ingresos) - entero(v.egresos)) },
            { etiqueta: "Tu mayor gasto", texto: v.mayor, clave: "mayor" },
        ],
        siguiente: { id: "finanzas", porque: "Con tus números del mes, ya podés calcular tu margen real y tu punto de equilibrio." },
    },
    {
        id: "finanzas", etapa: 2, nombre: "Diagnóstico financiero", minutos: 15, concepto: "costos", requisitos: ["precios", "caja"],
        construye: "Tu margen real y tu punto de equilibrio",
        problema: {
            titulo: "Vender mucho no siempre es ganar",
            sin: "Duplica las ventas en diciembre y termina el mes con menos plata.",
            con: "Sabe cuántas unidades necesita vender para cubrir sus gastos y cuánto le deja cada una de más.",
        },
        explicacion: {
            termino: "Punto de equilibrio",
            titulo: "El punto de equilibrio es cuánto tenés que vender para no perder plata.",
            texto: "Por debajo, perdés. Por encima, cada venta te deja ganancia. Lo calculamos con tus números.",
            ejemploEtiqueta: "La cuenta",
            ejemplo: "Gastos fijos del mes ÷ (precio − costo de cada unidad) = unidades que necesitás vender.",
        },
        pasos: [
            { pregunta: "¿Cuánto son tus gastos fijos por mes?", corto: "Fijos",
                ayuda: "Los que pagás vendas o no: alquiler, servicios, internet, tu sueldo.",
                campos: [{ clave: "fijos", etiqueta: "Gastos fijos mensuales", tipo: "dinero", ejemplo: "450.000" }] },
            { pregunta: "¿Cuál es tu precio y cuánto te cuesta cada unidad?", corto: "Por unidad",
                ayuda: "Lo tomamos de tu Calculadora de precios, si la hiciste.", campos: [
                    { clave: "precio", etiqueta: "Precio promedio", tipo: "dinero", ctx: "precio", precarga: (ctx) => ctx.precio },
                    { clave: "costoVar", etiqueta: "Materiales y otros gastos por unidad", tipo: "dinero", ctx: "costoVariable", precarga: (ctx) => ctx.costoVariable },
                ] },
        ],
        armarFilas: (v) => {
            const margen = entero(v.precio) - entero(v.costoVar);
            const equilibrio = margen > 0 ? Math.ceil(entero(v.fijos) / margen) : 0;
            const porcentaje = entero(v.precio) ? ` (${Math.round((margen / entero(v.precio)) * 100)}% del precio)` : "";

            return [
                { etiqueta: "Punto de equilibrio", texto: margen > 0 ? `${equilibrio} unidades por mes` : "Con este precio, cada unidad no cubre su costo" },
                { etiqueta: "Te deja cada unidad", texto: pesos(margen) + porcentaje },
            ];
        },
        siguiente: { id: "contenido", porque: "Con tus números claros, volvé a lo que contás: tu estrategia de contenido." },
    },
    {
        id: "contenido", etapa: 2, nombre: "Estrategia de contenido", minutos: 15, concepto: "comunicacion", requisitos: ["propuesta"],
        construye: "Tus temas, el objetivo de cada uno y la frecuencia",
        problema: {
            titulo: "Publicar por publicar cansa y no vende",
            sin: "Sube una foto cuando se acuerda, sin saber para qué.",
            con: "Tiene tres temas, sabe para qué sirve cada uno y cada cuánto publicarlo.",
        },
        explicacion: {
            termino: "Estrategia de contenido",
            titulo: "Una estrategia de contenido es decidir qué contás, para qué y cada cuánto.",
            texto: "Cada tema cumple una función: que te conozcan, que confíen en vos o que te compren.",
            ejemploEtiqueta: "Ejemplo · una librería de barrio",
            ejemplo: "Recomendaciones, para que confíen · novedades de la semana, para que compren · el detrás del mostrador, para que te conozcan.",
        },
        pasos: [
            { pregunta: "¿Sobre qué tres temas vas a publicar?", corto: "Temas",
                campos: [{ clave: "temas", largo: true, ejemplo: "el proceso de cada torta, pedidos entregados, sabores de temporada" }] },
            { pregunta: "¿Para qué sirve cada uno?", corto: "Para qué", ayuda: "Que te conozcan, que confíen o que te compren.",
                campos: [{ clave: "para", largo: true, ejemplo: "el proceso, para que confíen; los pedidos, para que compren" }] },
            { pregunta: "¿Cada cuánto vas a publicar?", corto: "Frecuencia", ayuda: "Mejor poco y siempre que mucho y a veces.",
                campos: [{ clave: "frecuencia", ejemplo: "martes y viernes" }] },
        ],
        armarFilas: (v) => filasDe(v, [["temas", "Tus temas"], ["para", "Para qué sirve cada uno"], ["frecuencia", "Frecuencia"]]),
        siguiente: { id: "canvas", porque: "Ya tenés casi todo tu modelo de negocio construido: el Lean Canvas lo junta en una página." },
    },
    {
        id: "canvas", etapa: 2, nombre: "Lean Canvas", minutos: 10, integra: true, requisitos: ["cliente", "propuesta", "precios"],
        construye: "Tu modelo de negocio en una página, precargado",
        problema: {
            titulo: "Si tu negocio no entra en una página, cuesta explicarlo",
            sin: "Para contarle su negocio a un socio necesita una hora, y se olvida la mitad.",
            con: "Lo muestra en una página: a quién le vende, qué resuelve, cómo cobra y cuánto le cuesta.",
        },
        explicacion: {
            termino: "Lean Canvas",
            titulo: "El Lean Canvas es tu modelo de negocio en una sola página.",
            texto: "Casi todo ya lo construiste: lo traemos de Tu negocio y completás lo que falta.",
            ejemploEtiqueta: "Sus partes",
            ejemplo: "Cliente · problema · propuesta · diferencial · canales · ingresos · costos · el número que mirás",
        },
        pasos: [
            { pregunta: "Tu canvas, casi completo", corto: "Canvas", unaPagina: true,
                ayuda: "Lo marcado “de Tu negocio” ya lo construiste. Completá lo que falta.", campos: [
                    { clave: "cliente", etiqueta: "Cliente", largo: true, ctx: "cliente", precarga: (ctx) => ctx.cliente },
                    { clave: "problema", etiqueta: "Problema que resolvés", largo: true, ctx: "problema", precarga: (ctx) => ctx.problema },
                    { clave: "propuesta", etiqueta: "Propuesta", largo: true, ctx: "propuesta", precarga: (ctx) => ctx.propuesta },
                    { clave: "diferencial", etiqueta: "Diferencial", ctx: "diferencial", precarga: (ctx) => ctx.diferencial },
                    { clave: "canales", etiqueta: "Canales", ctx: "canales", precarga: (ctx) => ctx.canales },
                    { clave: "ingresos", etiqueta: "Cómo ganás plata", ctx: "precioTexto", precarga: (ctx) => ctx.precioTexto },
                    { clave: "costos", etiqueta: "Costos principales", ctx: "costosTexto", precarga: (ctx) => ctx.costosTexto },
                    { clave: "metrica", etiqueta: "El número que mirás cada mes", ejemplo: "tortas vendidas por semana" },
                ] },
        ],
        armarFilas: (v) => filasDe(v, [
            ["cliente", "Cliente"], ["problema", "Problema"], ["propuesta", "Propuesta"], ["diferencial", "Diferencial"],
            ["canales", "Canales"], ["ingresos", "Ingresos"], ["costos", "Costos"], ["metrica", "Número clave"],
        ]),
        siguiente: { id: "procesos", porque: "Con tu modelo en una página, es momento de ordenar cómo se hace cada cosa." },
    },
    {
        id: "procesos", etapa: 3, nombre: "Mapa de procesos", minutos: 10, concepto: "procesos",
        construye: "Tus tareas clave y quién hace cada una",
        problema: {
            titulo: "Si todo está en tu cabeza, todo depende de vos",
            sin: "No puede tomarse un día: nadie más sabe cómo se hace nada.",
            con: "Tiene escritas sus tareas clave y sabe cuáles puede delegar.",
        },
        explicacion: {
            termino: "Procesos",
            titulo: "Un mapa de procesos es la lista de tareas clave de tu negocio y quién hace cada una.",
            texto: "Para delegar, primero hay que saber qué hay para delegar.",
            ejemploEtiqueta: "Ejemplo · una florería",
            ejemplo: "Comprar en el mercado: la dueña · armar ramos: la dueña y su ayudante · entregar: el cadete.",
        },
        pasos: [
            { pregunta: "¿Qué tareas repetís todas las semanas?", corto: "Tareas",
                campos: [{ clave: "tareas", largo: true, ejemplo: "tomar pedidos, comprar ingredientes, hornear, entregar" }] },
            { pregunta: "¿Quién hace cada una hoy?", corto: "Quién",
                campos: [{ clave: "quien", largo: true, ejemplo: "pedidos y horneado, yo; entregas, mi hermano" }] },
        ],
        armarFilas: (v) => filasDe(v, [["tareas", "Tus tareas clave"], ["quien", "Quién hace cada una"]]),
        siguiente: { id: "manual", porque: "Ya sabés cuáles son tus tareas. Ahora escribí el paso a paso de las más repetidas." },
    },
    {
        id: "manual", etapa: 3, nombre: "Manual de operaciones", minutos: 20, concepto: "procesos", requisitos: ["procesos"],
        construye: "El paso a paso de tus 3 tareas más repetidas",
        problema: {
            titulo: "Explicar lo mismo cada vez es tiempo perdido",
            sin: "Cada vez que alguien la ayuda, le explica todo de nuevo, y algo sale distinto.",
            con: "Tiene el paso a paso escrito: quien ayuda lo lee y lo hace igual.",
        },
        explicacion: {
            termino: "Manual de operaciones",
            titulo: "Un manual de operaciones es el paso a paso escrito de tus tareas más repetidas.",
            texto: "Empezá por tres. No hace falta que sea lindo: hace falta que se entienda.",
            ejemploEtiqueta: "Ejemplo · una lavandería",
            ejemplo: "Recibir ropa: 1. contar las prendas 2. anotarlas en el ticket 3. separar por color 4. avisar la fecha de retiro.",
        },
        pasos: [1, 2, 3].map((n) => ({
            pregunta: `Tarea ${n}: ¿cuáles son los pasos?`, corto: `Tarea ${n}`,
            ayuda: n === 1 ? "Empezá por la que más repetís. Numerá los pasos." : "",
            campos: [{
                clave: `t${n}`, largo: true, opcional: n === 3,
                ejemplo: n === 1 ? "Tomar un pedido: 1. confirmar fecha 2. pedir seña…" : "El nombre de la tarea y sus pasos",
                sinPrefijo: n !== 1,
            }],
        })),
        armarFilas: (v) => filasDe(v, [["t1", "Tarea 1"], ["t2", "Tarea 2"], ["t3", "Tarea 3"]]),
        siguiente: { id: "comercial", porque: "Con tu forma de trabajar por escrito, podés presentarte mejor a clientes nuevos." },
    },
    {
        id: "comercial", etapa: 3, nombre: "Propuesta comercial", minutos: 10, integra: true, requisitos: ["propuesta", "precios"],
        construye: "Tu plantilla para presentarte a un cliente, precargada",
        problema: {
            titulo: "Sin una propuesta escrita, cada venta grande se improvisa",
            sin: "Una empresa le pide presupuesto y responde con un audio de cuatro minutos.",
            con: "Manda una página clara: quién es, qué ofrece, cuánto sale y cómo seguir.",
        },
        explicacion: {
            termino: "Propuesta comercial",
            titulo: "Una propuesta comercial es tu presentación para un cliente, por escrito.",
            texto: "La armamos con lo que ya construiste. Solo falta a quién se la mandás.",
            ejemploEtiqueta: "Sus partes",
            ejemplo: "Quién sos · qué resolvés · qué incluye · cuánto sale · cómo seguir",
        },
        pasos: [
            { pregunta: "Tu propuesta comercial, casi lista", corto: "Propuesta", unaPagina: true,
                ayuda: "Lo marcado “de Tu negocio” ya lo construiste.", campos: [
                    { clave: "para", etiqueta: "¿Para quién es?", ejemplo: "oficinas que festejan cumpleaños" },
                    { clave: "quien", etiqueta: "Quién sos", largo: true, ctx: "perfil", precarga: (ctx) => ctx.perfil },
                    { clave: "resuelve", etiqueta: "Qué resolvés", largo: true, ctx: "propuesta", precarga: (ctx) => ctx.propuesta },
                    { clave: "incluye", etiqueta: "Qué incluye", largo: true, ejemplo: "torta para 20, velas y entrega en la oficina" },
                    { clave: "precio", etiqueta: "Cuánto sale", ctx: "precioTexto", precarga: (ctx) => ctx.precioTexto },
                    { clave: "pasos", etiqueta: "Cómo seguir", ejemplo: "confirmar la fecha con una seña del 30%" },
                ] },
        ],
        armarFilas: (v) => filasDe(v, [
            ["para", "Para"], ["quien", "Quién sos"], ["resuelve", "Qué resolvés"],
            ["incluye", "Qué incluye"], ["precio", "Cuánto sale"], ["pasos", "Cómo seguir"],
        ]),
        siguiente: { id: "objetivos", porque: "Ya sabés presentarte. Ahora definí a dónde querés llegar." },
    },
    {
        id: "objetivos", etapa: 3, nombre: "Objetivos", minutos: 10, concepto: "objetivos",
        construye: "Tres metas con número y fecha",
        problema: {
            titulo: "Sin una meta concreta, no sabés si vas bien",
            sin: "Quiere “crecer este año”, y en diciembre no sabe si lo logró.",
            con: "Quiere vender 40 tortas por mes en marzo. Cada semana sabe si se acerca.",
        },
        explicacion: {
            termino: "Objetivos",
            titulo: "Un objetivo útil tiene un número y una fecha.",
            texto: "Con tres alcanza: uno de ventas, uno de tiempo y uno tuyo.",
            ejemploEtiqueta: "Ejemplo · una peluquería",
            ejemplo: "Atender 15 clientas por semana antes de junio.",
        },
        pasos: [
            ["Tu primera meta", "vender 40 tortas por mes antes de marzo"],
            ["Tu segunda meta", "trabajar como máximo 45 horas por semana desde enero"],
            ["Tu tercera meta", "tomarme dos semanas de vacaciones en febrero"],
        ].map(([pregunta, ejemplo], i) => ({
            pregunta, corto: `Meta ${i + 1}`, ayuda: "Con un número y una fecha.",
            campos: [{ clave: `m${i + 1}`, largo: true, ejemplo }],
        })),
        armarFilas: (v) => filasDe(v, [["m1", "Meta 1"], ["m2", "Meta 2"], ["m3", "Meta 3"]]),
        siguiente: { id: "plan", porque: "Con tus metas escritas, el plan de acción ordena qué hacer en los próximos 90 días." },
    },
    {
        id: "plan", etapa: 3, nombre: "Plan de acción", minutos: 15, integra: true, requisitos: ["objetivos"],
        construye: "Tu plan de 90 días con lo que te falta, precargado",
        problema: {
            titulo: "Sabés lo que te falta, pero no por dónde empezar",
            sin: "Tiene diez pendientes y siempre hace el más urgente.",
            con: "Tiene un plan de 90 días: qué hace cada mes para llegar a sus metas.",
        },
        explicacion: {
            termino: "Plan de acción",
            titulo: "Tu plan de acción ordena lo que te falta en 90 días.",
            texto: "Lo armamos con tus metas y con las bases que todavía no construiste.",
            ejemploEtiqueta: "Ejemplo",
            ejemplo: "Mes 1: calcular precios · Mes 2: flujo de caja · Mes 3: escribir el manual.",
        },
        pasos: [
            { pregunta: "Tu plan de 90 días", corto: "Plan", unaPagina: true,
                ayuda: "Lo precargamos con tus metas y lo que te falta construir.", campos: [
                    { clave: "metas", etiqueta: "Tus metas", largo: true, ctx: "metas", precarga: (ctx) => ctx.metas },
                    { clave: "mes1", etiqueta: "Mes 1", ctx: "faltan", precarga: (ctx) => ctx.faltan.slice(0, 2).join(" y ") },
                    { clave: "mes2", etiqueta: "Mes 2", ctx: "faltan", precarga: (ctx) => ctx.faltan.slice(2, 4).join(" y ") },
                    { clave: "mes3", etiqueta: "Mes 3", ctx: "faltan", precarga: (ctx) => ctx.faltan.slice(4, 6).join(" y ") },
                    { clave: "horas", etiqueta: "Horas por semana que le podés dedicar", ejemplo: "3" },
                ] },
        ],
        armarFilas: (v) => filasDe(v, [["metas", "Metas"], ["mes1", "Mes 1"], ["mes2", "Mes 2"], ["mes3", "Mes 3"], ["horas", "Horas por semana"]]),
        siguiente: null,
    },
];

export const MODULO = Object.fromEntries(MODULOS.map((modulo) => [modulo.id, modulo]));

export const TOTAL_BASES = MODULOS.length;
