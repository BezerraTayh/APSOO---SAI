
import { useState } from "react";
import acessoImagem from "./1-acesso.svg";
import "./style.css";

export const Acesso = ({ onLogin }) => {
  const [tipo, setTipo] = useState("profissional");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  function entrar(event) {
    event.preventDefault();

    if (!email.trim() || !senha.trim()) {
      setErro("Preencha seu e-mail e sua senha.");
      return;
    }

    setErro("");
    setAviso("");

    // O backend integrado roda sem autenticação (perfil noauth);
    // esta tela apenas libera o acesso ao painel.
    onLogin();
  }

  return (
    <main className="acesso">
      <img
        className="acesso__image"
        src={acessoImagem}
        alt="Apresentação do Sistema de Agenda Inteligente"
      />

      <section className="login-panel">
        <form className="login-form" onSubmit={entrar}>
          <span className="login-welcome">
            Bem-vindo de volta
          </span>

          <h1>Acesse a sua agenda</h1>

          <p className="login-description">
            Use seus dados para entrar na área administrativa
          </p>

          <div className="login-tabs">
            <button
              type="button"
              className={tipo === "profissional" ? "selected" : ""}
              onClick={() => setTipo("profissional")}
            >
              Profissional
            </button>

            <button
              type="button"
              className={tipo === "empresa" ? "selected" : ""}
              onClick={() => setTipo("empresa")}
            >
              Empresa
            </button>
          </div>

          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="Digite o seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            placeholder="Digite a sua senha"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            autoComplete="current-password"
            required
          />

          {erro && (
            <div className="login-error" role="alert">
              {erro}
            </div>
          )}

          {aviso && (
            <div className="login-info" role="status">
              {aviso}
            </div>
          )}

          <button
            type="button"
            className="forgot-password"
            onClick={() =>
              setAviso(
                "A recuperação de senha é feita pela equipe de suporte do SAI."
              )
            }
          >
            Esqueci a minha senha
          </button>

          <button type="submit" className="login-button">
            Entrar na minha conta
          </button>

          <div className="login-divider">
            <span></span>
            ou
            <span></span>
          </div>

          <p className="login-register">
            Ainda não usa o SAI?{" "}
            <button
              type="button"
              onClick={() =>
                setAviso(
                  "O cadastro de novos profissionais é realizado pela equipe do SAI."
                )
              }
            >
              Criar conta
            </button>
          </p>
        </form>
      </section>
    </main>
  );
};
