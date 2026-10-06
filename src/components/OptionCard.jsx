/** Opción de selección única, con forma de tarjeta. Va dentro de un role="radiogroup". */
export function OptionCard({ selected, onSelect, children, compact = false }) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            className={`ui-option${compact ? " ui-option--compact" : ""}`}
            onClick={onSelect}
        >
            <span className="ui-option__ring" aria-hidden="true" />
            <span>{children}</span>
        </button>
    );
}
