
import React, { useState } from "react";
import ReactDOM from "react-dom/client";

import "./styles/global.css";

import { Acesso } from "./pages/auth/Acesso/Acesso";
import { ElementVisoGeral } from "./pages/dashboard/VisaoGeral/VisaoGeral";

function App() {
  const [logado, setLogado] = useState(false);

  return logado ? (
    <ElementVisoGeral onLogout={() => setLogado(false)} />
  ) : (
    <Acesso onLogin={() => setLogado(true)} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
