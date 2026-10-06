import { useEffect } from "react";

/** Hoja que sube desde abajo, sobre un fondo oscurecido. Se cierra con Escape o tocando afuera. */
export function BottomSheet({ onClose, labelledBy, children }) {
    useEffect(() => {
        const alTeclear = (e) => {
            if (e.key === "Escape") onClose();
        };

        document.addEventListener("keydown", alTeclear);
        return () => document.removeEventListener("keydown", alTeclear);
    }, [onClose]);

    return (
        <>
            <div className="ui-sheet-backdrop" onClick={onClose} />
            <div className="ui-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
                <span className="ui-sheet__grip" aria-hidden="true" />
                {children}
            </div>
        </>
    );
}
