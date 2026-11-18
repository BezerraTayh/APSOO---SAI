
import { useEffect, useState } from "react";

import { listarAgendamentos } from "../../../api/client";
import { paraClientes } from "../../../api/models";
import "./Style.css";

const ORIGIN_LABEL = {
  link: "Link",
  manual: "Manual",
  empresa: "Empresa",
};

const initials = (name) =>
  name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

const whatsappUrl = (phone) =>
  `https://wa.me/55${phone.replace(/\D/g, "")}`;

export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let ativo = true;

    listarAgendamentos()
      .then((dados) => {
        if (ativo) {
          setClients(paraClientes(dados));
          setCarregando(false);
        }
      })
      .catch((e) => {
        if (ativo) {
          setErro(e.message || "Não foi possível carregar os clientes.");
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const onKey = (event) => {
      if (event.key === "Escape") setSearchOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const selected = clients.find((client) => client.id === selectedId) || null;
  const visible = selected ? [selected] : clients;

  function choose(id) {
    setSelectedId(id);
    setSearchOpen(false);
  }

  return (
    <section className="clientes-page">
      <header className="clientes-header">
        <div>
          <h1>Clientes</h1>
          <p>Quem agendou com você. Só você enxerga estes dados.</p>
        </div>

        <button
          className="clientes-search"
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-haspopup="dialog"
        >
          <span className="clientes-search__icon" aria-hidden="true">⌕</span>
          <span className={selected ? "clientes-search__value" : ""}>
            {selected ? selected.name : "Selecionar cliente"}
          </span>
        </button>
      </header>

      <div className="clientes-subhead">
        <h2>Todos os clientes</h2>
        <span>Mais próximos primeiro · data e horário</span>
      </div>

      <div className="clientes-table" role="table" aria-label="Lista de clientes">
        <div className="clientes-table__row clientes-table__row--head" role="row">
          <span role="columnheader">Cliente</span>
          <span role="columnheader">WhatsApp</span>
          <span role="columnheader">Próximo agendamento</span>
          <span role="columnheader">Origem</span>
          <span role="columnheader">Mensagem</span>
        </div>

        {(carregando || erro || !visible.length) && (
          <div className="clientes-table__row" role="row">
            <span role="cell">
              {carregando
                ? "Carregando clientes..."
                : erro || "Nenhum cliente encontrado."}
            </span>
          </div>
        )}

        {visible.map((client) => (
          <div className="clientes-table__row" role="row" key={client.id}>
            <div className="clientes-table__client" role="cell">
              <span className="clientes-avatar">{initials(client.name)}</span>
              <strong>{client.name}</strong>
            </div>

            <span className="clientes-table__phone" role="cell">
              {client.phone}
            </span>

            <span
              className={`clientes-table__next${client.next ? "" : " is-empty"}`}
              role="cell"
            >
              {client.next || "Sem horário marcado"}
            </span>

            <span role="cell">
              <span className={`clientes-tag clientes-tag--${client.origin}`}>
                {ORIGIN_LABEL[client.origin]}
              </span>
            </span>

            <a
              className="clientes-message"
              role="cell"
              href={whatsappUrl(client.phone)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span aria-hidden="true">◉</span>
              Mensagem
            </a>
          </div>
        ))}
      </div>

      <aside className="clientes-alert">
        <span className="clientes-alert__icon" aria-hidden="true">i</span>
        <div>
          <strong>Privacidade dos dados</strong>
          <p>
            Nome e telefone das clientes ficam visíveis apenas para você e,
            se estiver vinculada a uma empresa, para ela.
          </p>
        </div>
      </aside>

      {searchOpen && (
        <div
          className="clientes-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSearchOpen(false);
          }}
        >
          <div
            className="clientes-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clientes-pick-title"
          >
            <h2 id="clientes-pick-title">Selecionar cliente</h2>
            <p className="clientes-modal__sub">
              Escolha pelo nome e telefone cadastrados.
            </p>

            <div className="clientes-modal__list">
              <button
                className="clientes-pick"
                type="button"
                onClick={() => choose(null)}
              >
                Mostrar todos os clientes
              </button>

              {clients.map((client) => (
                <button
                  key={client.id}
                  className={`clientes-pick${client.id === selectedId ? " is-on" : ""}`}
                  type="button"
                  onClick={() => choose(client.id)}
                >
                  {client.name} · {client.phone}
                </button>
              ))}
            </div>

            <footer className="clientes-modal__foot">
              <button
                className="clientes-btn"
                type="button"
                onClick={() => setSearchOpen(false)}
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
