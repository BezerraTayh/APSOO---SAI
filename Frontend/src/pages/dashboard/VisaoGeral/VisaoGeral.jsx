
import { useEffect, useState } from "react";

import {
  buscarConfiguracao,
  listarAgendamentos,
  listarProcedimentos,
} from "../../../api/client";
import {
  dataLocalAtual,
  paraAgendamentos,
} from "../../../api/models";

import MinhaEmpresa from "../MinhaEmpresa/MinhaEmpresa";
import MinhaAgenda from "../MinhaAgenda/MinhaAgenda";
import Procedimentos from "../Procedimentos/Procedimentos";
import Disponibilidade from "../5Disponibilidade/5Disponibilidade";
import Clientes from "../Clientes/Clientes";
import Configuracao from "../Configuracoes/Configuracoes";
import Ajuda from "../Ajuda/Ajuda";

import buttonSair from "./button-sair.svg";
import icon from "./icon.svg";
import icon2 from "./icon-2.svg";
import icon3 from "./icon-3.svg";
import icon4 from "./icon-4.svg";
import icon5 from "./icon-5.svg";
import icon6 from "./icon-6.svg";
import icon7 from "./icon-7.svg";
import icon8 from "./icon-8.svg";
import icon9 from "./icon-9.svg";
import icon10 from "./icon-10.svg";
import image from "./image.svg";
import stat from "./stat.svg";
import stat2 from "./stat-2.svg";
import stat3 from "./stat-3.svg";
import stat4 from "./stat-4.svg";
import text from "./text.svg";
import "./style.css";

const navigationItems = [
  { label: "Visão geral", icon: icon8 },
  { label: "Minha agenda", icon: icon10 },
  { label: "Procedimentos", icon: icon9 },
  { label: "Disponibilidade", icon: icon7 },
  { label: "Clientes", icon: icon5 },
  { label: "Minha empresa", icon },
  { label: "Configurações", icon: icon6 },
  { label: "Ajuda e FAQ", icon: icon4 },
];

function iniciais(nome) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join("");
}

function formatarDataDeHoje(date) {
  return date
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
    .toUpperCase();
}

function NavigationItem({ item, active, onClick }) {
  return (
    <button
      className={`sidebar-nav__item${
        active ? " sidebar-nav__item--active" : ""
      }`}
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <img
        className="sidebar-nav__icon"
        src={item.icon}
        alt=""
        aria-hidden="true"
      />

      <span>{item.label}</span>

      {item.notification && (
        <span
          className="sidebar-nav__notification"
          aria-label={`${item.notification} notificação`}
        >
          {item.notification}
        </span>
      )}
    </button>
  );
}

function StatusBadge({ children, type = "confirmed" }) {
  return (
    <span className={`status-badge status-badge--${type}`}>
      {children}
    </span>
  );
}

function AppointmentRow({ appointment, onClick }) {
  return (
    <li
      className="appointment-row"
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <time className="appointment-row__time">
        {appointment.time}
      </time>

      <span
        className={`appointment-row__indicator appointment-row__indicator--${appointment.statusType}`}
        aria-hidden="true"
      />

      <span className="appointment-row__avatar" aria-hidden="true">
        {appointment.initials}
      </span>

      <div className="appointment-row__details">
        <strong>{appointment.name}</strong>
        <span>{appointment.procedure}</span>
      </div>

      <StatusBadge type={appointment.statusType}>
        {appointment.status}
      </StatusBadge>

      <img
        className="appointment-row__arrow"
        src={icon3}
        alt=""
        aria-hidden="true"
      />
    </li>
  );
}

export const ElementVisoGeral = ({ onLogout = () => {} }) => {
  const [activePage, setActivePage] = useState("Visão geral");
  const [agendamentos, setAgendamentos] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [novoPedido, setNovoPedido] = useState(0);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activePage]);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      listarAgendamentos(),
      listarProcedimentos(),
      buscarConfiguracao().catch(() => null),
    ])
      .then(([agendamentos, procedimentos, configuracao]) => {
        if (ativo) {
          setAgendamentos(agendamentos);
          setProcedimentos(procedimentos);
          setPerfil(configuracao);
        }
      })
      .catch(() => {
        if (ativo) {
          setAgendamentos([]);
          setProcedimentos([]);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const hoje = dataLocalAtual();
  const inicioDoDia = `${hoje}T00:00`;
  const agendamentosVisuais = paraAgendamentos(agendamentos);
  const agendamentosDeHoje = agendamentosVisuais
    .filter((agendamento) => agendamento.date === hoje)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const proximo = agendamentosVisuais
    .filter((agendamento) => agendamento.inicio >= inicioDoDia)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const nomePerfil = perfil?.nome?.trim() || "Profissional";
  const primeiroNome = nomePerfil.split(" ")[0];
  const perfilIniciais = iniciais(nomePerfil) || "SA";
  const resumo = [
    {
      label: "Atendimentos hoje",
      value: String(agendamentosDeHoje.length),
      description: "Agenda atualizada",
      icon: stat2,
    },
    {
      label: "Confirmados",
      value: String(agendamentosDeHoje.length),
      description: "Presença confirmada",
      icon: stat,
    },
    {
      label: "Aguardando",
      value: "0",
      description: "Lembrete enviado",
      icon: stat4,
    },
    {
      label: "Procedimentos ativos",
      value: String(procedimentos.length),
      description: "Todos publicados",
      icon: stat3,
    },
  ];

  return (
    <main className="element-viso-geral">
      <aside className="sidebar" aria-label="Menu principal">
        <header className="brand">
          <span className="brand__mark">S</span>

          <div>
            <strong>SAI</strong>
            <span>Agenda inteligente</span>
          </div>
        </header>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.label}
              item={item}
              active={activePage === item.label}
              onClick={() => setActivePage(item.label)}
            />
          ))}
        </nav>

        <footer className="sidebar-profile">
          <div className="sidebar-profile__avatar">{perfilIniciais}</div>

          <div className="sidebar-profile__details">
            <strong>{nomePerfil}</strong>
            <span>Profissional</span>
          </div>

          <button
            className="sidebar-profile__logout"
            type="button"
            aria-label="Sair"
            title="Sair"
            onClick={onLogout}
          >
            <img src={buttonSair} alt="" aria-hidden="true" />
          </button>
        </footer>
      </aside>

      {activePage === "Visão geral" ? (
        <section className="dashboard" aria-label="Visão geral">
          <header className="dashboard-header">
            <div>
              <p className="dashboard-header__date">
                {formatarDataDeHoje(new Date())}
              </p>

              <h1>Bom dia, {primeiroNome}!</h1>

              <p className="dashboard-header__subtitle">
                Sua agenda está organizada. Veja o que acontece hoje.
              </p>
            </div>

            <button
              className="new-appointment-button"
              type="button"
              onClick={() => {
                setActivePage("Minha agenda");
                setNovoPedido((pedido) => pedido + 1);
              }}
            >
              <img src={image} alt="" aria-hidden="true" />
              Novo agendamento
            </button>
          </header>

          <section className="summary-grid" aria-label="Resumo do dia">
            {resumo.map((item) => (
              <article className="summary-card" key={item.label}>
                <img
                  className="summary-card__icon"
                  src={item.icon}
                  alt=""
                  aria-hidden="true"
                />

                <div>
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                  <small>{item.description}</small>
                </div>
              </article>
            ))}
          </section>

          <section className="dashboard-content">
            <article className="schedule-card">
              <header className="schedule-card__header">
                <div>
                  <h2>Agenda de hoje</h2>
                  <p>Seus próximos atendimentos</p>
                </div>

                <button
                  className="schedule-card__link"
                  type="button"
                  onClick={() => setActivePage("Minha agenda")}
                >
                  Ver agenda completa
                  <img src={icon2} alt="" aria-hidden="true" />
                </button>
              </header>

              <ol className="appointment-list">
                {agendamentosDeHoje.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    onClick={() => setActivePage("Minha agenda")}
                    appointment={{
                      time: appointment.inicio.slice(11, 16),
                      initials: iniciais(appointment.name),
                      name: appointment.name,
                      procedure: appointment.procedure,
                      status: "Confirmado",
                      statusType: "confirmed",
                    }}
                  />
                ))}
              </ol>
            </article>

            <aside className="dashboard-sidebar">
              {proximo && (
                <article className="next-appointment-card">
                  <p className="next-appointment-card__eyebrow">
                    PRÓXIMO ATENDIMENTO
                  </p>

                  <div className="next-appointment-card__time">
                    <time>{proximo.inicio.slice(11, 16)}</time>
                    <StatusBadge>Próximo</StatusBadge>
                  </div>

                  <div className="next-appointment-card__client">
                    <span className="next-appointment-card__avatar">
                      {iniciais(proximo.name)}
                    </span>

                    <div>
                      <strong>{proximo.name}</strong>
                      <span>{proximo.procedure}</span>
                    </div>
                  </div>

                  <dl className="appointment-meta">
                    <div>
                      <dt>Duração</dt>
                      <dd>{proximo.duration * 60} minutos</dd>
                    </div>

                    <div>
                      <dt>WhatsApp</dt>
                      <dd>{proximo.telefone || "—"}</dd>
                    </div>
                  </dl>

                  <a
                    className="message-button"
                    href={`https://wa.me/55${String(proximo.telefone || "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Enviar mensagem
                  </a>
                </article>
              )}

              <section
                className="reminder-alert"
                aria-label="Lembretes automáticos"
              >
                <img src={text} alt="" aria-hidden="true" />

                <div>
                  <strong>Lembretes automáticos ativos</strong>
                  <p>
                    Os lembretes seguem a antecedência definida em
                    Configurações.
                  </p>
                </div>
              </section>
            </aside>
          </section>
        </section>
      ) : activePage === "Minha agenda" ? (
        <MinhaAgenda
          novoAgendamento={novoPedido}
          onNovoAgendamento={() => setNovoPedido(0)}
        />
      ) : activePage === "Procedimentos" ? (
        <Procedimentos onNavegar={setActivePage} />
      ) : activePage === "Disponibilidade" ? (
        <Disponibilidade />
      ) : activePage === "Clientes" ? (
        <Clientes />
      ) : activePage === "Minha empresa" ? (
        <MinhaEmpresa />
      ) : activePage === "Configurações" ? (
        <Configuracao />
      ) : (
        <Ajuda />
      )}
    </main>
  );
};
