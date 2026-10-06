export function Loader({ label = "Cargando" }) {
    return (
        <div className="ui-loading" role="status" aria-label={label}>
            <span />
            <span />
            <span />
        </div>
    );
}
