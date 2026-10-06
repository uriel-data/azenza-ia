import { BackButton } from "./BackButton";

/** Barra de las preguntas del punto de partida: volver, "3 de 8" con progreso y salida opcional. */
export function QuestionTopBar({ numero, total, onBack, onLater }) {
    return (
        <div className="ui-topbar">
            <BackButton onClick={onBack} />
            <div className="ui-topbar__middle">
                <span className="ui-topbar__label">{numero} de {total}</span>
                <div
                    className="ui-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-valuenow={numero}
                    aria-label="Avance del punto de partida"
                >
                    <div className="ui-progress__fill" style={{ width: `${(numero / total) * 100}%` }} />
                </div>
            </div>
            {onLater && (
                <button type="button" className="ui-link-btn ui-link-btn--sm" onClick={onLater}>
                    Seguir después
                </button>
            )}
        </div>
    );
}
