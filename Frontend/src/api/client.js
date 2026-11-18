const BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const DEBUG = import.meta.env.VITE_DEBUG === "true";
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT || 15000);

export class ApiError extends Error {
  constructor(status, message, url = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

function log(...dados) {
  if (DEBUG) console.log("[sai]", ...dados);
}

async function request(caminho, opcoes = {}) {
  const url = `${BASE}${caminho}`;
  const metodo = opcoes.metodo || "GET";
  const corpo = opcoes.corpo;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  const inicio = DEBUG ? Date.now() : 0;

  const config = {
    method: metodo,
    headers: corpo === undefined ? undefined : { "Content-Type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: controlador.signal,
  };

  log("request", metodo, url, corpo ?? "");

  try {
    const resposta = await fetch(url, config);
    const texto = resposta.status === 204 ? "" : await resposta.text();
    let dados = null;

    if (texto) {
      try {
        dados = JSON.parse(texto);
      } catch {
        if (resposta.ok) {
          throw new ApiError(resposta.status, "Resposta inválida do servidor.", url);
        }
      }
    }

    if (!resposta.ok) {
      const mensagem = dados?.mensagem || dados?.message || `Erro ${resposta.status}`;
      log("error", metodo, url, resposta.status, mensagem);
      throw new ApiError(resposta.status, mensagem, url);
    }

    log("response", metodo, url, resposta.status, `${Date.now() - inicio}ms`, dados);
    return dados;
  } catch (erro) {
    if (erro instanceof ApiError) throw erro;
    if (erro.name === "AbortError") {
      log("timeout", metodo, url, `${TIMEOUT_MS}ms`);
      throw new ApiError(0, "Tempo limite excedido. Tente novamente.", url);
    }
    log("network", metodo, url, erro.message);
    throw new ApiError(0, "Não foi possível conectar ao servidor.", url);
  } finally {
    clearTimeout(temporizador);
  }
}

/* ---------- Procedimentos ---------- */

export function listarProcedimentos() {
  return request("/procedimentos");
}

export function criarProcedimento(dados) {
  return request("/procedimentos", { metodo: "POST", corpo: dados });
}

export function atualizarProcedimento(id, dados) {
  return request(`/procedimentos/${id}`, { metodo: "PUT", corpo: dados });
}

export function removerProcedimento(id) {
  return request(`/procedimentos/${id}`, { metodo: "DELETE" });
}

/* ---------- Disponibilidade e bloqueios ---------- */

export function listarDisponibilidades() {
  return request("/disponibilidades");
}

export function criarDisponibilidade(dados) {
  return request("/disponibilidades", { metodo: "POST", corpo: dados });
}

export function removerDisponibilidade(id) {
  return request(`/disponibilidades/${id}`, { metodo: "DELETE" });
}

function chaveIntervalo(item) {
  return `${item.diaSemana}|${String(item.horaInicio).slice(0, 5)}|${String(item.horaFim).slice(0, 5)}`;
}

/**
 * O backend expõe inclusão/remoção individual. A grade da tela é substituída
 * calculando a diferença entre o que existe e o que foi pedido.
 */
export async function substituirDisponibilidades(intervalos) {
  const atuais = (await listarDisponibilidades()) || [];
  const desejados = intervalos || [];
  const chavesAtuais = new Set(atuais.map(chaveIntervalo));
  const chavesDesejadas = new Set(desejados.map(chaveIntervalo));

  for (const item of atuais) {
    if (!chavesDesejadas.has(chaveIntervalo(item))) {
      await removerDisponibilidade(item.id);
    }
  }

  for (const item of desejados) {
    if (!chavesAtuais.has(chaveIntervalo(item))) {
      await criarDisponibilidade(item);
    }
  }

  return listarDisponibilidades();
}

export function listarBloqueios() {
  return request("/bloqueios");
}

export function criarBloqueio(dados) {
  return request("/bloqueios", { metodo: "POST", corpo: dados });
}

export function removerBloqueio(id) {
  return request(`/bloqueios/${id}`, { metodo: "DELETE" });
}

/* ---------- Agenda do profissional ---------- */

export function listarAgendamentos(de, ate) {
  const query = new URLSearchParams();
  if (de) query.set("de", de);
  if (ate) query.set("ate", ate);
  const sufixo = query.toString() ? `?${query.toString()}` : "";
  return request(`/agendamentos${sufixo}`);
}

export function criarAgendamento(dados) {
  return request("/agendamentos", { metodo: "POST", corpo: dados });
}

export function cancelarAgendamento(id) {
  return request(`/agendamentos/${id}`, { metodo: "DELETE" });
}

export function reagendarAgendamento(id, inicio) {
  return request(`/agendamentos/${id}`, { metodo: "PUT", corpo: { inicio } });
}

/* ---------- Perfil / configurações ---------- */

export function buscarConfiguracao() {
  return request("/perfil");
}

export function salvarConfiguracao(dados) {
  return request("/perfil", { metodo: "PUT", corpo: dados });
}

/* ---------- Vínculo com empresa ---------- */

function listarConvites() {
  return request("/vinculos/convites");
}

export async function buscarVinculo() {
  const convites = (await listarConvites()) || [];
  const pendente = convites.find((item) => item.status === "PENDENTE");
  const atual = await request("/vinculos/atual").catch((erro) => {
    if (erro.status === 404) return null;
    throw erro;
  });

  return {
    estado: atual ? "vinculado" : pendente ? "pendente" : "semVinculo",
    convite: pendente
      ? {
          id: pendente.id,
          empresa: pendente.empresa,
          recebidoEm: pendente.criadoEm,
        }
      : undefined,
    nome: atual?.empresa,
    vinculadaDesde: atual?.criadoEm,
    procedimentos: [],
  };
}

export function aceitarConvite(conviteId) {
  return request(`/vinculos/convites/${conviteId}/aceitar`, { metodo: "POST" });
}

export function recusarConvite(conviteId) {
  return request(`/vinculos/convites/${conviteId}/recusar`, { metodo: "POST" });
}

export function sairEmpresa() {
  return request("/vinculos/sair", { metodo: "POST" });
}

/* ---------- Links públicos (sem login) ---------- */

export function buscarLinkPublico(link) {
  return request(`/publico/${encodeURIComponent(link)}`);
}

export function buscarHorariosPublicos(link, { procedimentoId, chave, data }) {
  const query = new URLSearchParams();
  if (procedimentoId != null) query.set("procedimentoId", String(procedimentoId));
  if (chave) query.set("chave", chave);
  if (data) query.set("data", data);
  return request(`/publico/${encodeURIComponent(link)}/horarios?${query.toString()}`);
}

export function criarAgendamentoPublico(link, dados) {
  return request(`/publico/${encodeURIComponent(link)}/agendamentos`, {
    metodo: "POST",
    corpo: dados,
  });
}

export function consultarAgendamentoPublico(token) {
  return request(`/publico/agendamentos/${encodeURIComponent(token)}`);
}

export function reagendarAgendamentoPublico(token, inicio) {
  return request(`/publico/agendamentos/${encodeURIComponent(token)}`, {
    metodo: "PUT",
    corpo: { inicio },
  });
}

export function cancelarAgendamentoPublico(token) {
  return request(`/publico/agendamentos/${encodeURIComponent(token)}`, {
    metodo: "DELETE",
  });
}
