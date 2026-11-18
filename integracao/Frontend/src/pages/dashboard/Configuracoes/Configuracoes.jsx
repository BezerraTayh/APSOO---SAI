
import { useEffect, useRef, useState } from "react";

import {
  buscarConfiguracao,
  salvarConfiguracao,
} from "../../../api/client";
import { deConfiguracao, paraConfiguracao } from "../../../api/models";
import "./style.css";

// Opções de lembrete em minutos
const OPCOES_LEMBRETE = [
  { value: 1440, label: "1 dia antes" },
  { value: 240, label: "4 horas antes" },
  { value: 120, label: "2 horas antes" },
  { value: 60, label: "1 hora antes" },
];

const OPCOES_PRAZO = [
  { value: 120, label: "2 horas" },
  { value: 1440, label: "24 horas" },
  { value: 2880, label: "48 horas" },
];

const DADOS_INICIAIS = {
  antecedenciaLembreteMin: 1440,
  prazoMinCancelamentoMin: 1440,
  link: "sai.com.br/agendar/seu-perfil",
  linkAtivo: true,
  perfil: {
    nomeCompleto: "",
    telefone: "",
    profissionalidades: "",
    biografia: "",
    foto: "",
  },
};

function Icone({ nome, tamanho = 20 }) {
  const caminhos = {
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
    alerta: <><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1l1.7-1.7" /></>,
    camera: <><path d="M14 5h-4l-2 3H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-3l-2-3Z" /><circle cx="12" cy="13" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    whatsapp: <><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20l1.2-5.3A8.4 8.4 0 1 1 21 11.5Z" /><path d="M9 9c.5 2 2 3.5 4 4l1-1 2 1c-.5 2-2 2-3 2-3-1-5-3-6-6 0-1 0-2 2-3l1 2-1 1Z" /></>,
  };

  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {caminhos[nome]}
    </svg>
  );
}

function Opcoes({ opcoes, valor, onChange }) {
  return (
    <div className="cfg-options" role="radiogroup">
      {opcoes.map((opcao) => (
        <button
          key={opcao.value}
          type="button"
          role="radio"
          aria-checked={valor === opcao.value}
          className={`cfg-chip ${valor === opcao.value ? "cfg-chip--on" : ""}`}
          onClick={() => onChange(opcao.value)}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}

function Aviso({ tom, icone, children }) {
  return (
    <div className={`cfg-notice cfg-notice--${tom}`}>
      <Icone nome={icone} tamanho={18} />
      <p>{children}</p>
    </div>
  );
}

function iniciais(nome = "") {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

export default function Configuracoes() {
  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [carregando, setCarregando] = useState(true);
  const [toast, setToast] = useState("");
  const [fotoPreview, setFotoPreview] = useState("");
  const [modalLink, setModalLink] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const inputFoto = useRef(null);

  useEffect(() => {
    let ativo = true;

    buscarConfiguracao()
      .then((resposta) => {
        if (!ativo) return;

        const convertido = paraConfiguracao(resposta);
        setDados(convertido);
        setFotoPreview(convertido.perfil.foto);
        setCarregando(false);
      })
      .catch((e) => {
        if (ativo) {
          setToast(e.message || "Não foi possível carregar as configurações.");
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  function set(campo, valor) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
  }

  function setPerfil(campo, valor) {
    setDados((atual) => ({
      ...atual,
      perfil: { ...atual.perfil, [campo]: valor },
    }));
  }

  async function salvar() {
    setSalvando(true);

    try {
      const resposta = await salvarConfiguracao(deConfiguracao(dados));
      const convertido = paraConfiguracao(resposta);
      setDados(convertido);
      setFotoPreview(convertido.perfil.foto);
      setToast("Configurações salvas com sucesso!");
    } catch (e) {
      setToast(e.message || "Não foi possível salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  }

  function trocarFoto(evento) {
    const arquivo = evento.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setToast("Selecione um arquivo de imagem.");
      return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
      const imagem = leitor.result;

      if (String(imagem).length > 900000) {
        setToast("Selecione uma imagem menor.");
        return;
      }

      setFotoPreview(imagem);
      setPerfil("foto", imagem);
    };

    leitor.readAsDataURL(arquivo);
    evento.target.value = "";
  }

  function enviarWhatsApp() {
    const link = `https://${dados.link}`;
    const texto = encodeURIComponent(`Agende seu horário: ${link}`);

    window.open(`https://wa.me/?text=${texto}`, "_blank", "noopener,noreferrer");
  }

  const foto = fotoPreview || dados.perfil.foto;

  return (
    <main className="cfg-page">
      <header className="cfg-header">
        <div>
          <h1>Configurações</h1>
          <p>Ajuste lembretes, prazos, link e seu perfil.</p>
        </div>

        <button
          type="button"
          className="cfg-button cfg-button--primary cfg-save"
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </header>

      <div className="cfg-body">
        <div className="cfg-col cfg-col--left">
          <section className="card cfg-card">
            <h2 className="card__title">Lembrete automático</h2>

            <p className="card__text">
              Com quanto tempo de antecedência a cliente recebe o lembrete pelo WhatsApp.
            </p>

            <Opcoes
              opcoes={OPCOES_LEMBRETE}
              valor={dados.antecedenciaLembreteMin}
              onChange={(valor) => set("antecedenciaLembreteMin", valor)}
            />

            <Aviso tom="info" icone="info">
              A cliente responde Sim ou Não. Sem resposta até 20 minutos antes
              do horário, o agendamento é cancelado e o horário é liberado.
            </Aviso>
          </section>

          <section className="card cfg-card">
            <h2 className="card__title">Prazo para cancelar ou remarcar</h2>

            <p className="card__text">
              Antecedência mínima para a cliente ou a empresa cancelarem ou remarcarem.
            </p>

            <Opcoes
              opcoes={OPCOES_PRAZO}
              valor={dados.prazoMinCancelamentoMin}
              onChange={(valor) => set("prazoMinCancelamentoMin", valor)}
            />

            <Aviso tom="alerta" icone="alerta">
              Dentro desse prazo, só você pode cancelar ou remarcar o atendimento.
            </Aviso>
          </section>
        </div>

        <div className="cfg-col cfg-col--right">
          <section className="card cfg-card cfg-card--link">
            <h2 className="card__title">Seu link de agendamento</h2>

            <div className="cfg-link">
              <Icone nome="link" tamanho={17} />
              <span>{dados.link}</span>
            </div>

            <div className="cfg-buttons">
              <button
                type="button"
                className="cfg-button cfg-button--secondary"
                onClick={() => setModalLink(true)}
              >
                Ver link
              </button>

              <button
                type="button"
                className="cfg-button cfg-button--primary"
                onClick={enviarWhatsApp}
              >
                <Icone nome="whatsapp" tamanho={17} />
                Enviar no WhatsApp
              </button>
            </div>

            <label className="cfg-switch">
              <span>Link ativo para novas clientes</span>
              <input
                type="checkbox"
                checked={dados.linkAtivo}
                onChange={(evento) => set("linkAtivo", evento.target.checked)}
              />
              <span className="cfg-switch__slider" />
            </label>
          </section>

          <section className="card cfg-card cfg-card--perfil">
            <h2 className="card__title">Perfil profissional</h2>

            <p className="card__text">
              Foto, biografia e especialidades aparecem para a cliente ao escolher o profissional.
            </p>

            <div className="cfg-foto">
              <div className="cfg-avatar">
                {foto ? (
                  <img src={foto} alt="Foto do perfil profissional" />
                ) : (
                  <span>{iniciais(dados.perfil.nomeCompleto) || "?"}</span>
                )}
              </div>

              <button
                type="button"
                className="cfg-button cfg-button--secondary"
                onClick={() => inputFoto.current?.click()}
              >
                <Icone nome="camera" tamanho={16} />
                Alterar foto
              </button>

              <input
                ref={inputFoto}
                type="file"
                accept="image/*"
                hidden
                onChange={trocarFoto}
              />
            </div>

            <label className="cfg-field">
              <span>Nome completo</span>
              <input
                type="text"
                value={dados.perfil.nomeCompleto}
                onChange={(evento) => setPerfil("nomeCompleto", evento.target.value)}
                placeholder="Seu nome completo"
              />
            </label>

            <label className="cfg-field">
              <span>WhatsApp</span>
              <input
                type="tel"
                value={dados.perfil.telefone}
                onChange={(evento) => setPerfil("telefone", evento.target.value)}
                placeholder="(00) 00000-0000"
              />
            </label>

            <label className="cfg-field">
              <span>Especialidades</span>
              <input
                type="text"
                value={dados.perfil.profissionalidades}
                onChange={(evento) => setPerfil("profissionalidades", evento.target.value)}
                placeholder="Ex.: Manicure, pedicure..."
              />
            </label>

            <label className="cfg-field">
              <span>Biografia</span>
              <textarea
                rows="4"
                placeholder="Conte um pouco sobre você e sua experiência."
                value={dados.perfil.biografia}
                onChange={(evento) => setPerfil("biografia", evento.target.value)}
              />
            </label>
          </section>
        </div>
      </div>

      {modalLink && (
        <div className="cfg-modal-overlay" onClick={() => setModalLink(false)}>
          <div
            className="cfg-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cfg-modal-title"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h2 id="cfg-modal-title">Seu link de agendamento</h2>
            <p>{`https://${dados.link}`}</p>

            <button
              type="button"
              className="cfg-button cfg-button--primary"
              onClick={() => {
                navigator.clipboard?.writeText(`https://${dados.link}`);
                setToast("Link copiado!");
                setModalLink(false);
              }}
            >
              Copiar link
            </button>

            <button
              type="button"
              className="cfg-modal__close"
              onClick={() => setModalLink(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="cfg-toast" role="status">
          <Icone nome="check" tamanho={18} />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
    </main>
  );
}
