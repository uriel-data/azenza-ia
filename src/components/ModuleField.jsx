import { montoEnCampo } from "../utils/texto";

/**
 * Un campo del ejercicio de un módulo: texto corto o largo, plata, número o
 * porcentaje (deslizador). fromNegocio marca los que vienen precargados de Tu negocio.
 */
export function ModuleField({ campo, valor, onChange, fromNegocio, alto }) {
    const id = `campo-${campo.clave}`;
    const tipo = campo.tipo ?? (campo.largo ? "largo" : "corto");
    const crudo = valor ?? "";
    const ejemplo = campo.ejemplo
        ? (tipo === "dinero" || tipo === "numero" || campo.sinPrefijo ? campo.ejemplo : `Ej: ${campo.ejemplo}`)
        : undefined;

    const cambiar = (e) => {
        let texto = e.target.value;

        if (tipo === "dinero") texto = texto.replace(/[^\d]/g, "");
        if (tipo === "numero") texto = texto.replace(/[^\d.,]/g, "");
        if (tipo === "porcentaje") texto = Number(texto);
        if (campo.max) texto = String(texto).slice(0, campo.max);

        onChange(texto);
    };

    const etiqueta = campo.etiqueta && (
        <label className="ui-field__label" htmlFor={id}>{campo.etiqueta}</label>
    );

    return (
        <div className="ui-stack ui-stack--sm">
            {(campo.etiqueta || fromNegocio) && (
                <div className="ui-field__head">
                    {etiqueta || <span />}
                    {fromNegocio && <span className="ui-tag ui-tag--teal">de Tu negocio</span>}
                </div>
            )}

            {tipo === "largo" && (
                <textarea
                    id={id}
                    className="ui-textarea"
                    rows={4}
                    style={{ minHeight: alto, lineHeight: 1.45 }}
                    value={crudo}
                    placeholder={ejemplo}
                    maxLength={campo.max}
                    aria-label={campo.etiqueta ? undefined : "Tu respuesta"}
                    onChange={cambiar}
                />
            )}

            {tipo === "corto" && (
                <input
                    id={id}
                    className="ui-input"
                    value={crudo}
                    placeholder={ejemplo}
                    aria-label={campo.etiqueta ? undefined : "Tu respuesta"}
                    onChange={cambiar}
                />
            )}

            {tipo === "dinero" && (
                <div className="ui-money">
                    <span className="ui-money__sign" aria-hidden="true">$</span>
                    <input
                        id={id}
                        className="ui-input ui-input--number"
                        inputMode="numeric"
                        value={montoEnCampo(crudo)}
                        placeholder={ejemplo}
                        onChange={cambiar}
                    />
                </div>
            )}

            {tipo === "numero" && (
                <input
                    id={id}
                    className="ui-input ui-input--number"
                    inputMode="decimal"
                    value={crudo}
                    placeholder={ejemplo}
                    onChange={cambiar}
                />
            )}

            {tipo === "porcentaje" && (
                <div className="ui-card ui-pct">
                    <div className="ui-pct__value">
                        <span className="ui-pct__number">{crudo === "" ? 30 : crudo}%</span>
                        <span className="ui-small" style={{ fontSize: 15 }}>de ganancia</span>
                    </div>
                    <input
                        id={id}
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={crudo === "" ? 30 : crudo}
                        aria-label="Porcentaje de ganancia"
                        onChange={cambiar}
                        className="ui-range"
                    />
                    <div className="ui-pct__scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
                </div>
            )}

            {campo.opcional && <span className="ui-note" style={{ fontSize: 13.5 }}>Opcional</span>}
            {campo.max && <span className="ui-field__count">{String(crudo).length} / {campo.max}</span>}
        </div>
    );
}
