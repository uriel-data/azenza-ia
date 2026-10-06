import { MODULOS } from "../data/modulos";

/** Las 15 bases del negocio, una celda por módulo, agrupadas de a 5 (una por etapa). */
export function BaseCells({ construidos }) {
    return (
        <div className="ui-cells" aria-hidden="true">
            {MODULOS.map((modulo, i) => (
                <span
                    key={modulo.id}
                    className={[
                        "ui-cells__cell",
                        construidos[modulo.id] && "ui-cells__cell--done",
                        i > 0 && i % 5 === 0 && "ui-cells__cell--gap",
                    ].filter(Boolean).join(" ")}
                />
            ))}
        </div>
    );
}
