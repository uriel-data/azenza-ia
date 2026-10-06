import { useState } from "react";

export function PasswordInput({ id, value, onChange, autoComplete, placeholder }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="password-field">
            <input
                id={id}
                type={visible ? "text" : "password"}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
            />
            <button
                type="button"
                className="password-field__toggle"
                onClick={() => setVisible((v) => !v)}
                tabIndex={-1}
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
                <i className={`fas ${visible ? "fa-eye-slash" : "fa-eye"}`}></i>
            </button>
        </div>
    );
}
