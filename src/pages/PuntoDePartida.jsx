import { useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { Loader } from "../components/Loader";
import { useAppData } from "../context/AppDataContext";
import { esRespuestaValida } from "../data/puntoDePartida";
import { fechaCorta } from "../utils/fechas";

// Bienvenida al punto de partida. Con cuenta y una medición anterior, es la re-medición.
export function PuntoDePartida() {
    const { catalogo, listo, esInvitado, borrador, historial } = useAppData();
    const navigate = useNavigate();

    if (!listo) return <Loader />;

    const { conceptos } = catalogo;
    const remedicion = !esInvitado && historial.length > 0;
    const primeraSinResponder = conceptos.findIndex((concepto) => !esRespuestaValida(borrador[concepto.clave]));
    const retoma = conceptos.some((concepto) => esRespuestaValida(borrador[concepto.clave]));
    // Si respondió todo pero no llegó a cerrar, vuelve a la última.
    const numero = primeraSinResponder === -1 ? conceptos.length : primeraSinResponder + 1;

    const salir = () => navigate(remedicion ? "/diagnostico" : "/ruta");

    return (
        <div className="ui-screen ui-in">
            <div className="ui-topbar">
                <BackButton onClick={() => (remedicion ? salir() : navigate("/empezar", { state: { slide: 2 } }))} />
            </div>

            <div className="ui-body ui-body--wide">
                {remedicion ? (
                    <div className="ui-stack ui-stack--lg">
                        <span className="ui-eyebrow">Re-medición</span>
                        <h1 className="ui-title ui-title--lg">Volvé a tu punto de partida</h1>
                        <p className="ui-lead ui-lead--strong">
                            Son las mismas {conceptos.length} preguntas que respondiste el {fechaCorta(historial[0].fecha)}.
                            Respondé según dónde estás hoy: después vas a ver las dos versiones, una al lado de la otra.
                        </p>
                    </div>
                ) : (
                    <div className="ui-stack ui-stack--lg">
                        <span className="ui-eyebrow">Antes de empezar</span>
                        <h1 className="ui-title ui-title--lg">Tu punto de partida</h1>
                        <p className="ui-lead ui-lead--strong">
                            Son {conceptos.length} preguntas cortas sobre tu negocio. No hay respuestas buenas ni malas:
                            sirve para que Azenza te acompañe según <b>lo que sabés</b> hoy. Podés dejarlo y seguir después.
                        </p>
                    </div>
                )}

                <div className="ui-chips">
                    <span className="ui-chip">{conceptos.length} preguntas</span>
                    <span className="ui-chip">Unos 5 minutos</span>
                    {esInvitado && <span className="ui-chip">Sin cuenta</span>}
                </div>

                <div className="ui-list">
                    <span className="ui-list__head">Lo que vamos a recorrer</span>
                    {conceptos.map((concepto) => (
                        <span key={concepto.clave} className="ui-list__item">{concepto.titulo}</span>
                    ))}
                </div>
            </div>

            <div className="ui-footer ui-footer--wide">
                <button type="button" className="ui-btn" onClick={() => navigate(`/punto-de-partida/pregunta/${numero}`)}>
                    {retoma ? `Seguir · pregunta ${numero} de ${conceptos.length}` : "Empezar"}
                </button>
                <button type="button" className="ui-link-btn" onClick={salir}>Ahora no</button>
            </div>
        </div>
    );
}
