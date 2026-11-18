import { useMemo, useState } from "react";

import "./style.css";

const PERGUNTAS = [
  {
    categoria: "Agenda",
    pergunta: "Como adicionar um novo agendamento?",
    resposta:
      "Abra Minha agenda e clique em Adicionar agendamento. Informe o nome da cliente, o procedimento, a data e o horário. O sistema confere a disponibilidade antes de salvar.",
  },
  {
    categoria: "Agenda",
    pergunta: "Como reagendar ou cancelar um atendimento?",
    resposta:
      "Na Minha agenda, clique sobre o atendimento. Use Editar / Reagendar para escolher outro horário ou Cancelar agendamento para liberar o horário.",
  },
  {
    categoria: "Disponibilidade",
    pergunta: "Como definir os horários em que eu atendo?",
    resposta:
      "Em Disponibilidade, ative os dias da semana e ajuste a entrada e a saída. É possível cadastrar dois intervalos por dia, por exemplo manhã e tarde.",
  },
  {
    categoria: "Disponibilidade",
    pergunta: "Como bloquear férias ou compromissos?",
    resposta:
      "Em Disponibilidade, clique em Bloquear horário. Escolha o dia inteiro ou um período específico e informe o motivo. Se houver atendimentos no período, o sistema avisa antes de concluir.",
  },
  {
    categoria: "Procedimentos",
    pergunta: "Como cadastrar um procedimento?",
    resposta:
      "Em Procedimentos, clique em Novo procedimento e informe nome, valor e duração. O serviço passa a aparecer no seu link de agendamento.",
  },
  {
    categoria: "Procedimentos",
    pergunta: "Posso alterar o valor de um procedimento já usado?",
    resposta:
      "Sim. A alteração vale para os próximos agendamentos; os atendimentos já realizados mantêm o valor registrado no momento da criação.",
  },
  {
    categoria: "Clientes",
    pergunta: "Quem consegue ver os dados das minhas clientes?",
    resposta:
      "Apenas você e a empresa à qual estiver vinculada. Nome e WhatsApp são usados para contato e para o envio de lembretes.",
  },
  {
    categoria: "Configurações",
    pergunta: "Como funciona o link de agendamento?",
    resposta:
      "O link público permite que a cliente escolha um procedimento e um horário livre. Você pode copiá-lo ou enviá-lo pelo WhatsApp em Configurações.",
  },
  {
    categoria: "Configurações",
    pergunta: "Com quanto tempo de antecedência o lembrete é enviado?",
    resposta:
      "A antecedência é definida em Configurações. A cliente recebe a mensagem pelo WhatsApp e pode confirmar ou recusar o atendimento.",
  },
];

const CATEGORIAS = ["Todas", ...new Set(PERGUNTAS.map((item) => item.categoria))];

function Icone({ nome }) {
  const caminhos = {
    busca: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    ajuda: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7v.5" />
        <path d="M12 17h.01" />
      </>
    ),
    seta: <path d="m6 9 6 6 6-6" />,
    whatsapp: (
      <>
        <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20l1.2-5.3A8.4 8.4 0 1 1 21 11.5Z" />
        <path d="M9 9c.5 2 2 3.5 4 4l1-1 2 1c-.5 2-2 2-3 2-3-1-5-3-6-6 0-1 0-2 2-3l1 2-1 1Z" />
      </>
    ),
  };

  return (
    <svg
      width="20"
      height="20"
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

export default function Ajuda() {
  const [categoria, setCategoria] = useState("Todas");
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState(PERGUNTAS[0].pergunta);
  const [contato, setContato] = useState("");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return PERGUNTAS.filter((item) => {
      const combinaCategoria =
        categoria === "Todas" || item.categoria === categoria;
      const combinaBusca =
        !termo ||
        item.pergunta.toLowerCase().includes(termo) ||
        item.resposta.toLowerCase().includes(termo);

      return combinaCategoria && combinaBusca;
    });
  }, [busca, categoria]);

  return (
    <main className="ajuda-page">
      <header className="ajuda-header">
        <div>
          <span className="ajuda-header__eyebrow">
            <Icone nome="ajuda" />
            Central de ajuda
          </span>

          <h1>Ajuda e FAQ</h1>
          <p>Tire dúvidas rápidas sobre a agenda, os procedimentos e o seu link.</p>
        </div>

        <button
          className="ajuda-contact"
          type="button"
          onClick={() =>
            setContato(
              "O canal de suporte é informado pela empresa responsável pelo SAI."
            )
          }
        >
          <Icone nome="whatsapp" />
          Falar com o suporte
        </button>
      </header>

      {contato && (
        <div className="ajuda-aviso" role="status">
          <span>{contato}</span>
          <button type="button" onClick={() => setContato("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}

      <section className="ajuda-busca" aria-label="Buscar na ajuda">
        <span className="ajuda-busca__icone">
          <Icone nome="busca" />
        </span>

        <input
          type="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Busque por uma dúvida, por exemplo: bloqueio, lembrete..."
          aria-label="Buscar dúvidas"
        />
      </section>

      <div className="ajuda-filtros" role="tablist" aria-label="Categorias">
        {CATEGORIAS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={categoria === item}
            className={`ajuda-filtro${
              categoria === item ? " ajuda-filtro--ativo" : ""
            }`}
            onClick={() => setCategoria(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="ajuda-lista" aria-label="Perguntas frequentes">
        {filtradas.map((item, indice) => {
          const expandida = aberta === item.pergunta;

          return (
            <article
              key={item.pergunta}
              className={`ajuda-item${expandida ? " ajuda-item--aberta" : ""}`}
              style={{ animationDelay: `${indice * 45}ms` }}
            >
              <button
                type="button"
                className="ajuda-pergunta"
                aria-expanded={expandida}
                onClick={() => setAberta(expandida ? "" : item.pergunta)}
              >
                <span className="ajuda-pergunta__texto">
                  <small>{item.categoria}</small>
                  <strong>{item.pergunta}</strong>
                </span>

                <span className="ajuda-pergunta__seta">
                  <Icone nome="seta" />
                </span>
              </button>

              <div className="ajuda-resposta" hidden={!expandida}>
                <p>{item.resposta}</p>
              </div>
            </article>
          );
        })}

        {!filtradas.length && (
          <div className="ajuda-vazia">
            <strong>Nenhuma dúvida encontrada</strong>
            <p>Tente outro termo ou selecione Todas as categorias.</p>
          </div>
        )}
      </section>

      <aside className="ajuda-info">
        <div>
          <strong>Ainda precisa de ajuda?</strong>
          <p>
            A equipe do SAI responde em horário comercial. Nenhum dado de
            cliente é solicitado por aqui.
          </p>
        </div>

        <button
          className="ajuda-info__link"
          type="button"
          onClick={() =>
            setContato(
              "O canal de suporte é informado pela empresa responsável pelo SAI."
            )
          }
        >
          Enviar mensagem
        </button>
      </aside>
    </main>
  );
}
