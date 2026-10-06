import "./azenza.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { AppDataProvider } from "./context/AppDataProvider";
import { AppLayout } from "./components/AppLayout";
import { Inicio } from "./pages/Inicio";
import { Empezar } from "./pages/Empezar";
import { PuntoDePartida } from "./pages/PuntoDePartida";
import { Pregunta } from "./pages/Pregunta";
import { ElegirPrincipal } from "./pages/ElegirPrincipal";
import { ResultadoPuntoDePartida } from "./pages/ResultadoPuntoDePartida";
import { Ruta } from "./pages/Ruta";
import { Negocio } from "./pages/Negocio";
import { Imprimir } from "./pages/Imprimir";
import { Diagnostico } from "./pages/Diagnostico";
import { Modulo } from "./pages/Modulo";
import { Consultor } from "./pages/Consultor";
import { Login } from "./pages/Login";
import { Registro } from "./pages/Registro";
import { Cuenta } from "./pages/Cuenta";

// Todo se puede usar sin cuenta, salvo el Consultor IA (tiene un límite diario por usuario).
function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppDataProvider>
                    <Routes>
                        <Route element={<AppLayout />}>
                            <Route path="/" element={<Inicio />} />
                            <Route path="/empezar" element={<Empezar />} />
                            <Route path="/punto-de-partida" element={<PuntoDePartida />} />
                            <Route path="/punto-de-partida/pregunta/:numero" element={<Pregunta />} />
                            <Route path="/punto-de-partida/pregunta/:numero/principal" element={<ElegirPrincipal />} />
                            <Route path="/punto-de-partida/resultado" element={<ResultadoPuntoDePartida />} />
                            <Route path="/ruta" element={<Ruta />} />
                            <Route path="/negocio" element={<Negocio />} />
                            <Route path="/negocio/imprimir" element={<Imprimir />} />
                            <Route path="/diagnostico" element={<Diagnostico />} />
                            <Route path="/modulo/:id" element={<Modulo />} />
                            <Route path="/consultor" element={<Consultor />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/registro" element={<Registro />} />
                            <Route path="/cuenta" element={<Cuenta />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                </AppDataProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
