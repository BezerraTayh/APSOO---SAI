const DIAS_ORDEM = [
  { label: "Domingo", api: "SUNDAY" },
  { label: "Segunda-feira", api: "MONDAY" },
  { label: "Terça-feira", api: "TUESDAY" },
  { label: "Quarta-feira", api: "WEDNESDAY" },
  { label: "Quinta-feira", api: "THURSDAY" },
  { label: "Sexta-feira", api: "FRIDAY" },
  { label: "Sábado", api: "SATURDAY" },
];

const HORARIO_PADRAO = { start: "09:00", end: "18:00" };
const CORES = ["purple", "green", "orange", "blue"];

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const ORIGEM_VISUAL = {
  CLIENTE: "link",
  LINK: "link",
  PROFISSIONAL: "manual",
  MANUAL: "manual",
  SISTEMA: "manual",
  EMPRESA: "empresa",
};

function horaCurta(valor) {
  return String(valor || "").slice(0, 5);
}

function dataDeTexto(valor) {
  return new Date(`${valor}T12:00:00`);
}

function origemVisual(origem) {
  return ORIGEM_VISUAL[String(origem || "").toUpperCase()] || "manual";
}

function duracaoEmHoras(inicio, fim) {
  const inicioMs = Date.parse(String(inicio || "").replace(" ", "T"));
  const fimMs = Date.parse(String(fim || "").replace(" ", "T"));
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs) || fimMs <= inicioMs) return 1;
  return Math.max(1, Math.ceil((fimMs - inicioMs) / 3600000));
}

export function diasPadrao() {
  return DIAS_ORDEM.map((dia) => ({
    label: dia.label,
    on: false,
    intervals: [{ ...HORARIO_PADRAO }],
  }));
}

export function paraDias(lista) {
  const dias = diasPadrao();

  (lista || []).forEach((item) => {
    const indice = DIAS_ORDEM.findIndex((dia) => dia.api === item.diaSemana);
    if (indice < 0) return;
    dias[indice].intervals.push({
      start: horaCurta(item.horaInicio),
      end: horaCurta(item.horaFim),
    });
  });

  return dias.map((dia) => {
    if (dia.intervals.length <= 1) return dia;
    return {
      ...dia,
      on: true,
      intervals: dia.intervals
        .slice(1)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 2),
    };
  });
}

export function deDias(days) {
  return days.flatMap((day, indice) => {
    if (!day.on) return [];
    return day.intervals.map((interval) => ({
      diaSemana: DIAS_ORDEM[indice].api,
      horaInicio: interval.start,
      horaFim: interval.end,
    }));
  });
}

export function paraBloqueio(item) {
  const inicio = String(item.inicio || "");
  const fim = String(item.fim || "");
  const start = horaCurta(inicio.slice(11));
  const end = horaCurta(fim.slice(11));
  const diaInteiro = start === "00:00" && end === "23:59";

  return {
    id: item.id,
    date: inicio.slice(0, 10),
    allDay: diaInteiro,
    start: diaInteiro ? "" : start,
    end: diaInteiro ? "" : end,
    reason: item.motivo || "",
  };
}

export function deBloqueioForm(form) {
  return {
    inicio: `${form.date}T${form.allDay ? "00:00" : form.start}`,
    fim: `${form.date}T${form.allDay ? "23:59" : form.end}`,
    motivo: form.reason,
  };
}

export function corProcedimento(nome) {
  let soma = 0;
  for (const letra of String(nome || "")) soma += letra.charCodeAt(0);
  return CORES[soma % CORES.length];
}

export function paraAgendamentos(lista) {
  return (lista || [])
    .filter((item) => item.estado === "AGENDADO")
    .map((item) => {
      const inicio = String(item.inicio || "");
      return {
        id: item.id,
        date: inicio.slice(0, 10),
        start: Number(inicio.slice(11, 13)),
        duration: duracaoEmHoras(inicio, item.fim),
        end: horaCurta(String(item.fim || "").slice(11)),
        name: item.nomeCliente,
        procedure: item.procedimento,
        color: corProcedimento(item.procedimento),
        telefone: item.telefoneCliente,
        origem: item.origem,
        token: item.tokenCliente,
        inicio,
      };
    });
}

export function formatarRotuloData(inicio) {
  const texto = String(inicio || "");
  if (texto.length < 16) return "";
  const date = dataDeTexto(texto.slice(0, 10));
  return `${SEMANA[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${MESES[date.getMonth()]} · ${texto.slice(11, 16)}`;
}

export function dataLocalAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function paraClientes(agendamentos) {
  const hoje = dataLocalAtual();
  const grupos = new Map();

  (agendamentos || [])
    .filter((item) => item.estado === "AGENDADO")
    .forEach((item) => {
      const chave = item.telefoneCliente;
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          id: chave,
          name: item.nomeCliente,
          phone: item.telefoneCliente,
          origem: item.origem,
          proximo: null,
        });
      }

      const grupo = grupos.get(chave);
      const data = item.inicio.slice(0, 10);
      if (data >= hoje && (!grupo.proximo || item.inicio < grupo.proximo.inicio)) {
        grupo.proximo = item;
      }
      if (item.origem === "EMPRESA") grupo.origem = "EMPRESA";
      if (item.origem === "CLIENTE" || item.origem === "LINK") grupo.origem = "LINK";
    });

  return [...grupos.values()]
    .map((grupo) => ({
      id: grupo.id,
      name: grupo.name,
      phone: grupo.phone,
      next: grupo.proximo ? formatarRotuloData(grupo.proximo.inicio) : null,
      origin: origemVisual(grupo.origem),
    }))
    .sort((a, b) => (a.next || "9999").localeCompare(b.next || "9999"));
}

export function paraConfiguracao(dados) {
  const item = dados || {};
  const linkPublico = item.linkPublico || "seu-perfil";
  return {
    antecedenciaLembreteMin: item.antecedenciaLembreteMinutos ?? 1440,
    prazoMinCancelamentoMin: (item.prazoCancelamentoHoras ?? 2) * 60,
    link: `sai.com.br/agendar/${linkPublico}`,
    linkAtivo: true,
    perfil: {
      nomeCompleto: item.nome || "",
      telefone: item.telefone || "",
      profissionalidades: "",
      biografia: "",
      foto: "",
    },
  };
}

export function deConfiguracao(dados) {
  return {
    nome: dados.perfil.nomeCompleto,
    telefone: dados.perfil.telefone,
    antecedenciaLembreteMinutos: dados.antecedenciaLembreteMin,
    prazoCancelamentoHoras: Math.round(dados.prazoMinCancelamentoMin / 60),
  };
}

export function paraVinculo(dados) {
  const item = dados || {};
  const estado = item.estado || "semVinculo";
  return {
    estado,
    convite:
      estado === "pendente"
        ? {
            id: item.convite?.id,
            empresa: item.convite?.empresa,
            recebidoEm: formatarDataISO(item.convite?.recebidoEm),
          }
        : undefined,
    empresa:
      estado === "vinculado"
        ? {
            nome: item.nome,
            vinculadaDesde: formatarDataISO(item.vinculadaDesde),
            procedimentos: item.procedimentos || [],
          }
        : undefined,
  };
}

function formatarDataISO(valor) {
  if (!valor) return "";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}
