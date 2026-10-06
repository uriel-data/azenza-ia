import "./azenza.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { Inicio } from "./pages/Inicio";

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <div className="app">
                    <Routes>
                        <Route path="/" element={<Inicio />} />
                    </Routes>
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
