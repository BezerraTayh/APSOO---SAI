
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  atualizarProcedimento,
  criarProcedimento,
  listarProcedimentos,
  removerProcedimento,
} from "../../../api/client";
import "./style.css";

/* ==========================================================================
   SAI · Tela Procedimentos
   ========================================================================== */

/* ---------- Utilitários de valor e duração ---------- */

export function parseBRL(texto) {
  let limpo = String(texto ?? "").replace(/[^\d,.-]/g, "");

  if (!limpo) return NaN;

  if (limpo.includes(",")) {
    limpo = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(limpo)) {
    limpo = limpo.replace(/\./g, "");
  }

  return Number(limpo);
}

export function formatBRL(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarDuracao(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;

  if (!h) return `${m} min`;
  if (!m) return `${h}h`;

  return `${h}h ${m} min`;
}

export function rotuloDuracao(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;

  if (!h) return `${m} minutos`;

  const horas = `${h} ${h === 1 ? "hora" : "horas"}`;

  return m ? `${horas} e ${m} minutos` : horas;
}

const DURACOES_BASE = Array.from(
  { length: 16 },
  (_, i) => (i + 1) * 15
);

/* ---------- Ícones ---------- */

const ICONES = {
  brilho: (
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
  ),
  mais: <path d="M12 5v14M5 12h14" />,
  lapis: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  lixeira: (
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  ),
  fechar: <path d="M18 6 6 18M6 6l12 12" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  cadeado: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
};

function Icone({ nome, tamanho = 18 }) {
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
      focusable="false"
    >
      {ICONES[nome]}
    </svg>
  );
}

/* ---------- Modal acessível ---------- */

function Modal({
  titulo,
  idTitulo,
  eyebrow,
  onFechar,
  largura = 520,
  children,
}) {
  const caixa = useRef(null);
  const fecharRef = useRef(onFechar);

  fecharRef.current = onFechar;

  useEffect(() => {
    const anterior = document.activeElement;
    const el = caixa.current;

    const focaveis = () =>
      [
        ...el.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((n) => !n.disabled);

    (el.querySelector("[data-autofocus]") || focaveis()[0])?.focus();

    function aoTeclar(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        fecharRef.current();
        return;
      }

      if (e.key !== "Tab") return;

      const lista = focaveis();

      if (!lista.length) return;

      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return () => {
      document.removeEventListener("keydown", aoTeclar);

      if (anterior && anterior.focus) {
        anterior.focus();
      }
    };
  }, []);

  return (
    <div
      className="proc-fundo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={caixa}
        className="proc-modal"
        style={{ width: largura }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <header className="proc-modal__cabecalho">
          <div>
            {eyebrow ? (
              <p className="proc-modal__eyebrow">{eyebrow}</p>
            ) : null}

            <h2 id={idTitulo} className="proc-modal__titulo">
              {titulo}
            </h2>
          </div>

          <button
            type="button"
            className="proc-icone-botao"
            aria-label="Fechar"
            onClick={onFechar}
          >
            <Icone nome="fechar" />
          </button>
        </header>

        {children}
      </div>
    </div>
  );
}

/* ---------- Formulário de procedimento ---------- */

function FormularioProcedimento({
  inicial,
  existentes,
  onSalvar,
  onCancelar,
}) {
  const editando = Boolean(inicial);

  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [valorTexto, setValorTexto] = useState(
    inicial ? formatBRL(inicial.valor) : ""
  );
  const [duracao, setDuracao] = useState(inicial?.duracao ?? 45);
  const [erros, setErros] = useState({});

  const opcoesDuracao = useMemo(
    () =>
      DURACOES_BASE.includes(duracao)
        ? DURACOES_BASE
        : [...DURACOES_BASE, duracao].sort((a, b) => a - b),
    [duracao]
  );

  function validar() {
    const e = {};
    const nomeLimpo = nome.trim();

    if (nomeLimpo.length < 2) {
      e.nome = "Informe o nome do procedimento (mínimo de 2 letras).";
    } else if (
      existentes.some(
        (p) =>
          p.id !== inicial?.id &&
          p.nome.trim().toLowerCase() === nomeLimpo.toLowerCase()
      )
    ) {
      e.nome =
        "Você já tem um procedimento com esse nome. Use outro nome ou edite o existente.";
    }

    const valor = parseBRL(valorTexto);

    if (Number.isNaN(valor) || valor <= 0) {
      e.valor = "Informe um valor maior que zero. Exemplo: 65,00.";
    }

    if (!duracao) {
      e.duracao = "Escolha a duração do atendimento.";
    }

    return { e, valor, nomeLimpo };
  }

  function aoEnviar(evento) {
    evento.preventDefault();

    const { e, valor, nomeLimpo } = validar();

    setErros(e);

    if (Object.keys(e).length) return;

    onSalvar({
      nome: nomeLimpo,
      valor,
      duracao: Number(duracao),
    });
  }

  function aoSairDoValor() {
    const v = parseBRL(valorTexto);

    if (!Number.isNaN(v) && v > 0) {
      setValorTexto(formatBRL(v));
    }
  }

  return (
    <form className="proc-form" onSubmit={aoEnviar} noValidate>
      <div className="proc-form__corpo">
        <div className="proc-form__linha">
          <div className="proc-campo">
            <label htmlFor="proc-nome">Nome do procedimento</label>

            <input
              id="proc-nome"
              data-autofocus
              type="text"
              value={nome}
              placeholder="Ex.: Massagem relaxante"
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={Boolean(erros.nome)}
              aria-describedby={
                erros.nome ? "proc-nome-erro" : undefined
              }
            />

            {erros.nome ? (
              <p
                id="proc-nome-erro"
                className="proc-campo__erro"
                role="alert"
              >
                {erros.nome}
              </p>
            ) : null}
          </div>

          <div className="proc-campo">
            <label htmlFor="proc-valor">Valor</label>

            <input
              id="proc-valor"
              type="text"
              inputMode="decimal"
              value={valorTexto}
              placeholder="R$ 0,00"
              onChange={(e) => setValorTexto(e.target.value)}
              onBlur={aoSairDoValor}
              aria-invalid={Boolean(erros.valor)}
              aria-describedby={
                erros.valor ? "proc-valor-erro" : undefined
              }
            />

            {erros.valor ? (
              <p
                id="proc-valor-erro"
                className="proc-campo__erro"
                role="alert"
              >
                {erros.valor}
              </p>
            ) : null}
          </div>
        </div>

        <div className="proc-campo">
          <label htmlFor="proc-duracao">Duração</label>

          <select
            id="proc-duracao"
            value={duracao}
            onChange={(e) => setDuracao(Number(e.target.value))}
            aria-invalid={Boolean(erros.duracao)}
          >
            {opcoesDuracao.map((min) => (
              <option key={min} value={min}>
                {rotuloDuracao(min)}
              </option>
            ))}
          </select>

          {erros.duracao ? (
            <p className="proc-campo__erro" role="alert">
              {erros.duracao}
            </p>
          ) : null}
        </div>

        {editando ? (
          <p className="proc-form__nota">
            Agendamentos já realizados não mudam. A alteração vale para
            novos agendamentos pelo seu link.
          </p>
        ) : null}
      </div>

      <footer className="proc-modal__rodape">
        <button
          type="button"
          className="sai-btn sai-btn--secundario"
          onClick={onCancelar}
        >
          Cancelar
        </button>

        <button type="submit" className="sai-btn sai-btn--primario">
          {editando ? "Salvar alterações" : "Salvar procedimento"}
        </button>
      </footer>
    </form>
  );
}

/* ---------- Tela principal ---------- */

export default function Procedimentos({ onNavegar = () => {} }) {
  const [procedimentos, setProcedimentos] = useState([]);
  const [modal, setModal] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const fecharModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    if (!aviso) return undefined;

    const t = setTimeout(() => setAviso(null), 3200);

    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    let ativo = true;

    listarProcedimentos()
      .then((dados) => {
        if (ativo) {
          setProcedimentos(
            dados.map((p) => ({
              id: p.id,
              nome: p.nome,
              duracao: p.duracaoMinutos,
              valor: Number(p.preco),
              compartilhado: false,
            }))
          );
          setCarregando(false);
        }
      })
      .catch((e) => {
        if (ativo) {
          setErro(e.message || "Não foi possível carregar os procedimentos.");
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  /* Salvar ou editar procedimento */

  async function salvar(dados) {
    const editado = modal?.procedimento;

    if (ocupado) return;
    setOcupado(true);

    try {
      const corpo = {
        nome: dados.nome,
        duracaoMinutos: dados.duracao,
        preco: dados.valor,
      };

      const salvo = editado
        ? await atualizarProcedimento(editado.id, corpo)
        : await criarProcedimento(corpo);

      const convertido = {
        id: salvo.id,
        nome: salvo.nome,
        duracao: salvo.duracaoMinutos,
        valor: Number(salvo.preco),
        compartilhado: false,
      };

      setProcedimentos((lista) =>
        editado
          ? lista.map((p) => (p.id === editado.id ? convertido : p))
          : [...lista, convertido]
      );

      setAviso(
        editado
          ? "Alterações salvas. O seu link já foi atualizado."
          : "Procedimento salvo e publicado no seu link."
      );
      setModal(null);
    } catch (e) {
      setAviso(e.message || "Não foi possível salvar o procedimento.");
    } finally {
      setOcupado(false);
    }
  }

  /* Remoção de procedimento */

  function pedirRemocao(p) {
    setModal({
      tipo: p.compartilhado ? "bloqueado" : "remover",
      procedimento: p,
    });
  }

  async function confirmarRemocao() {
    const alvo = modal.procedimento;

    if (ocupado) return;
    setOcupado(true);

    try {
      await removerProcedimento(alvo.id);
      setProcedimentos((lista) => lista.filter((p) => p.id !== alvo.id));
      setModal(null);
      setAviso("Procedimento removido do seu link.");
    } catch (e) {
      setModal(null);
      setAviso(e.message || "Não foi possível remover o procedimento.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="proc-pagina">
      <header className="proc-cabecalho">
        <div>
          <h1 className="proc-titulo">Procedimentos</h1>

          <p className="proc-subtitulo">
            Cadastre os serviços, duração e valores oferecidos.
          </p>
        </div>

        <button
          type="button"
          className="sai-btn sai-btn--primario"
          onClick={() => setModal({ tipo: "form" })}
        >
          <Icone nome="mais" tamanho={18} />
          Novo procedimento
        </button>
      </header>

      <section
        className="proc-aviso"
        aria-label="Como os procedimentos são publicados"
      >
        <span className="proc-aviso__icone">
          <Icone nome="info" tamanho={18} />
        </span>

        <div>
          <strong>Publicação automática</strong>

          <p>
            Seus procedimentos aparecem automaticamente no seu link. Em
            empresas, a empresa decide quais liberar.
          </p>
        </div>
      </section>

      {erro ? (
        <section className="proc-aviso" aria-label="Erro ao carregar">
          <span className="proc-aviso__icone">
            <Icone nome="info" tamanho={18} />
          </span>

          <div>
            <strong>Erro ao carregar</strong>
            <p>{erro}</p>
          </div>
        </section>
      ) : null}

      <section
        className="proc-cartao"
        aria-label="Lista de procedimentos"
      >
        {procedimentos.length === 0 ? (
          <div className="proc-vazio">
            <span className="proc-vazio__icone">
              <Icone nome="brilho" tamanho={26} />
            </span>

            <h2>
              {carregando
                ? "Carregando procedimentos..."
                : "Você ainda não tem procedimentos"}
            </h2>

            {!carregando && (
              <p>
                Cadastre o primeiro serviço com nome, valor e duração para
                que as clientes possam agendar pelo seu link.
              </p>
            )}

            <button
              type="button"
              className="sai-btn sai-btn--primario"
              onClick={() => setModal({ tipo: "form" })}
            >
              Novo procedimento
            </button>
          </div>
        ) : (
          <table className="proc-tabela">
            <thead>
              <tr>
                <th scope="col">Procedimento</th>
                <th scope="col">Duração</th>
                <th scope="col">Valor</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {procedimentos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="proc-item">
                      <span className="proc-item__icone">
                        <Icone nome="brilho" tamanho={17} />
                      </span>

                      <span className="proc-item__texto">
                        <strong>{p.nome}</strong>

                        <small>
                          Criado por você
                          {p.compartilhado
                            ? " · Compartilhado com a equipe"
                            : ""}
                        </small>
                      </span>
                    </div>
                  </td>

                  <td className="proc-tabela__duracao">
                    {formatarDuracao(p.duracao)}
                  </td>

                  <td className="proc-tabela__valor">
                    {formatBRL(p.valor)}
                  </td>

                  <td>
                    <span className="sai-etiqueta sai-etiqueta--verde">
                      Publicado
                    </span>
                  </td>

                  <td>
                    <div className="proc-acoes">
                      <button
                        type="button"
                        className="proc-icone-botao"
                        aria-label={`Editar ${p.nome}`}
                        onClick={() =>
                          setModal({
                            tipo: "form",
                            procedimento: p,
                          })
                        }
                      >
                        <Icone nome="lapis" />
                      </button>

                      <button
                        type="button"
                        className="proc-icone-botao proc-icone-botao--perigo"
                        aria-label={`Remover ${p.nome}`}
                        onClick={() => pedirRemocao(p)}
                      >
                        <Icone nome="lixeira" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Novo ou editar procedimento */}

      {modal?.tipo === "form" ? (
        <Modal
          idTitulo="proc-titulo-form"
          eyebrow="SAI · Ação segura"
          titulo={
            modal.procedimento
              ? "Editar procedimento"
              : "Novo procedimento"
          }
          onFechar={fecharModal}
          largura={540}
        >
          <FormularioProcedimento
            inicial={modal.procedimento}
            existentes={procedimentos}
            onSalvar={salvar}
            onCancelar={fecharModal}
          />
        </Modal>
      ) : null}

      {/* Confirmar remoção */}

      {modal?.tipo === "remover" ? (
        <Modal
          idTitulo="proc-titulo-remover"
          titulo={`Remover "${modal.procedimento.nome}"?`}
          onFechar={fecharModal}
          largura={480}
        >
          <div className="proc-confirma">
            <span className="proc-confirma__icone proc-confirma__icone--perigo">
              <Icone nome="lixeira" tamanho={24} />
            </span>

            <p>
              O procedimento sai do seu link de agendamento. Os
              agendamentos já realizados continuam na sua agenda.
            </p>
          </div>

          <footer className="proc-modal__rodape">
            <button
              type="button"
              className="sai-btn sai-btn--secundario"
              data-autofocus
              onClick={fecharModal}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="sai-btn sai-btn--perigo-cheio"
              onClick={confirmarRemocao}
            >
              Remover procedimento
            </button>
          </footer>
        </Modal>
      ) : null}

      {/* Remoção bloqueada */}

      {modal?.tipo === "bloqueado" ? (
        <Modal
          idTitulo="proc-titulo-bloqueado"
          titulo="Não é possível remover"
          onFechar={fecharModal}
          largura={500}
        >
          <div className="proc-confirma">
            <span className="proc-confirma__icone proc-confirma__icone--alerta">
              <Icone nome="cadeado" tamanho={24} />
            </span>

            <p>
              “{modal.procedimento.nome}” também está vinculado a outras
              profissionais da empresa. Peça para a empresa desvincular
              as colegas, ou transfira a propriedade do procedimento,
              antes de remover.
            </p>
          </div>

          <footer className="proc-modal__rodape">
            <button
              type="button"
              className="sai-btn sai-btn--secundario"
              data-autofocus
              onClick={fecharModal}
            >
              Entendi
            </button>

            <button
              type="button"
              className="sai-btn sai-btn--primario"
              onClick={() => {
                fecharModal();
                onNavegar("Minha empresa");
              }}
            >
              Ver Minha empresa
            </button>
          </footer>
        </Modal>
      ) : null}

      {/* Mensagem de confirmação */}

      {aviso ? (
        <div
          className="proc-aviso-flutuante"
          role="status"
          aria-live="polite"
        >
          <span className="proc-aviso-flutuante__ok">
            <Icone nome="check" tamanho={13} />
          </span>

          {aviso}
        </div>
      ) : null}
    </main>
  );
}
