
import { useEffect, useState } from "react";

import {
  aceitarConvite as aceitarConviteApi,
  buscarVinculo,
  recusarConvite as recusarConviteApi,
  sairEmpresa as sairEmpresaApi,
} from "../../../api/client";
import { paraVinculo } from "../../../api/models";
import "./Style.css";

function Icone({ nome, tamanho = 24 }) {
  const propriedades = {
    width: tamanho,
    height: tamanho,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (nome === "building") {
    return (
      <svg {...propriedades}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 21v-4h6v4M8 7h2m4 0h2M8 11h2m4 0h2" />
      </svg>
    );
  }

  if (nome === "shield") {
    return (
      <svg {...propriedades}>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (nome === "eye") {
    return (
      <svg {...propriedades}>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (nome === "door") {
    return (
      <svg {...propriedades}>
        <path d="M5 21V3h14v18M9 21V7l10-2" />
        <path d="M15 13h.01" />
      </svg>
    );
  }

  if (nome === "logout") {
    return (
      <svg {...propriedades}>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </svg>
    );
  }

  return null;
}

function Tag({ children, tipo = "roxo" }) {
  return <span className={`emp-tag emp-tag--${tipo}`}>{children}</span>;
}

function Botao({ children, tipo = "primario", disabled, onClick }) {
  return (
    <button
      type="button"
      className={`emp-button emp-button--${tipo}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ComoFunciona() {
  const itens = [
    {
      icon: "shield",
      texto:
        "A empresa não cria, edita nem bloqueia seus horários, dias ou procedimentos.",
    },
    {
      icon: "eye",
      texto:
        "Ela vê sua agenda somente em modo de leitura e pode agendar dentro dos horários que você abriu.",
    },
    {
      icon: "door",
      texto:
        "Ao sair, você mantém sua conta, agenda e procedimentos. Só deixa de aparecer no link da empresa.",
    },
  ];

  return (
    <section className="emp-card emp-how">
      <h2 className="emp-how__title">Como funciona o vínculo</h2>

      <div className="emp-how__list">
        {itens.map((item) => (
          <div className="emp-how__item" key={item.icon}>
            <div className="emp-how__item-icon">
              <Icone nome={item.icon} tamanho={19} />
            </div>
            <p>{item.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SemVinculo() {
  return (
    <section className="emp-card emp-empty">
      <div className="emp-empty__icon">
        <Icone nome="building" tamanho={30} />
      </div>

      <h2>Você não está em nenhuma empresa</h2>

      <p>
        Quando uma empresa convidar você, o convite aparecerá aqui.
        Enquanto isso, sua agenda e seu link continuam funcionando
        normalmente.
      </p>

      <Tag tipo="neutro">Nenhum vínculo ativo</Tag>
    </section>
  );
}

function ConvitePendente({ convite, ocupado, onAceitar, onRecusar }) {
  return (
    <section className="emp-card">
      <div className="emp-top">
        <div className="emp-top__icon emp-top__icon--lilac">
          <Icone nome="building" tamanho={26} />
        </div>

        <div className="emp-top__text">
          <h2>{convite.empresa} convidou você</h2>
          <p>
            Convite recebido em {convite.recebidoEm || "data não informada"}
          </p>
        </div>

        <Tag tipo="laranja">Pendente</Tag>
      </div>

      <p className="emp-paragraph">
        Ao aceitar, você passará a aparecer no link de agendamento da empresa,
        de acordo com os procedimentos vinculados a você.
      </p>

      <div className="emp-actions emp-actions--end">
        <Botao tipo="secundario" disabled={ocupado} onClick={onRecusar}>
          Recusar
        </Botao>

        <Botao disabled={ocupado} onClick={onAceitar}>
          Aceitar convite
        </Botao>
      </div>
    </section>
  );
}

function Vinculado({ empresa, ocupado, onSair }) {
  return (
    <section className="emp-card">
      <div className="emp-top">
        <div className="emp-top__icon emp-top__icon--green">
          <Icone nome="building" tamanho={26} />
        </div>

        <div className="emp-top__text">
          <h2>{empresa.nome}</h2>
          <p>Vinculada desde {empresa.vinculadaDesde || "data não informada"}</p>
        </div>

        <Tag tipo="verde">Vinculada</Tag>
      </div>

      <div className="emp-divider" />

      <h3 className="emp-subtitle">Seus procedimentos no link da empresa</h3>

      <div className="emp-tags">
        {empresa.procedimentos?.length ? (
          empresa.procedimentos.map((procedimento) => (
            <Tag key={procedimento}>{procedimento}</Tag>
          ))
        ) : (
          <p className="emp-paragraph">
            Nenhum procedimento vinculado no momento.
          </p>
        )}
      </div>

      <div className="emp-divider" />

      <div className="emp-actions">
        <p className="emp-actions__hint">
          Você pode sair a qualquer momento sem perder seus dados.
        </p>

        <Botao tipo="perigo" disabled={ocupado} onClick={onSair}>
          Sair da empresa
        </Botao>
      </div>
    </section>
  );
}

export default function MinhaEmpresa({ vinculoInicial }) {
  const [vinculo, setVinculo] = useState(vinculoInicial || { estado: "semVinculo" });
  const [modalSair, setModalSair] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(!vinculoInicial);

  useEffect(() => {
    if (vinculoInicial) return undefined;

    let ativo = true;

    buscarVinculo()
      .then((dados) => {
        if (ativo) {
          setVinculo(paraVinculo(dados));
          setCarregando(false);
        }
      })
      .catch((e) => {
        if (ativo) {
          setMensagem(e.message || "Não foi possível carregar o vínculo.");
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, [vinculoInicial]);

  function recarregar() {
    return buscarVinculo().then((dados) => setVinculo(paraVinculo(dados)));
  }

  async function aceitarConvite() {
    if (!vinculo.convite || ocupado) return;

    setOcupado(true);

    try {
      await aceitarConviteApi(vinculo.convite.id);
      await recarregar();
      setMensagem("Convite aceito.");
    } catch (e) {
      setMensagem(e.message || "Não foi possível aceitar o convite.");
    } finally {
      setOcupado(false);
    }
  }

  async function recusarConvite() {
    if (!vinculo.convite || ocupado) return;

    setOcupado(true);

    try {
      await recusarConviteApi(vinculo.convite.id);
      await recarregar();
      setMensagem("Convite recusado.");
    } catch (e) {
      setMensagem(e.message || "Não foi possível recusar o convite.");
    } finally {
      setOcupado(false);
    }
  }

  async function sairDaEmpresa() {
    if (ocupado) return;
    setOcupado(true);

    try {
      await sairEmpresaApi();
      await recarregar();
      setModalSair(false);
      setMensagem("Você saiu da empresa.");
    } catch (e) {
      setMensagem(e.message || "Não foi possível sair da empresa.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="emp-page">
      <header className="emp-page__header">
        <div>
          <h1>Minha empresa</h1>
          <p>Gerencie seus convites e seu vínculo com empresas.</p>
        </div>
      </header>

      {mensagem && (
        <div className="emp-feedback" role="status">
          <span>{mensagem}</span>
          <button type="button" onClick={() => setMensagem("")}>
            ×
          </button>
        </div>
      )}

      {carregando && (
        <p className="emp-paragraph">Carregando vínculo...</p>
      )}

      {!carregando && (
        <div className="emp-body">
        {vinculo.estado === "pendente" && vinculo.convite && (
          <ConvitePendente
            convite={vinculo.convite}
            ocupado={ocupado}
            onAceitar={aceitarConvite}
            onRecusar={recusarConvite}
          />
        )}

        {vinculo.estado === "vinculado" && vinculo.empresa && (
          <Vinculado
            empresa={vinculo.empresa}
            ocupado={ocupado}
            onSair={() => setModalSair(true)}
          />
        )}

        {(!vinculo.estado || vinculo.estado === "semVinculo") && (
          <SemVinculo />
        )}

        <ComoFunciona />
      </div>
      )}

      {modalSair && (
        <div
          className="emp-modal-backdrop"
          onClick={() => setModalSair(false)}
        >
          <section
            className="emp-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emp-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="emp-modal__icon">
              <Icone nome="logout" tamanho={25} />
            </div>

            <h2 id="emp-modal-title">
              Sair de {vinculo.empresa?.nome}?
            </h2>

            <p>
              Você deixará de aparecer no link da empresa. Sua conta,
              agenda, agendamentos e procedimentos continuarão com você.
            </p>

            <div className="emp-modal__actions">
              <Botao
                tipo="secundario"
                onClick={() => setModalSair(false)}
              >
                Cancelar
              </Botao>

              <Botao tipo="perigo" onClick={sairDaEmpresa}>
                Sim, sair da empresa
              </Botao>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
