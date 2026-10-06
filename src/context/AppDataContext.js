import { createContext, useContext } from "react";

export const AppDataContext = createContext(null);

export function useAppData() {
    const contexto = useContext(AppDataContext);

    if (!contexto) {
        throw new Error("useAppData debe usarse dentro de un <AppDataProvider>");
    }

    return contexto;
}
