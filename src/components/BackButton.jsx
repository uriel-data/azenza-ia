export function BackButton({ onClick, label = "Volver" }) {
    return <button type="button" className="ui-back" onClick={onClick} aria-label={label} />;
}
