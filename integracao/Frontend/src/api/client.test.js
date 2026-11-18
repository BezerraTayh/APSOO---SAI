import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  cancelarAgendamento,
  criarAgendamento,
  criarBloqueio,
  listarProcedimentos,
  listarTodosAgendamentos,
  removerDisponibilidade,
  removerProcedimento,
  reagendarAgendamento,
  salvarConfiguracao,
  substituirDisponibilidades,
  buscarLinkPublico,
} from "./client";

function resposta(status, dados, texto) {
  return {
    status,
    ok: status < 400,
    text: () =>
      Promise.resolve(texto === undefined ? JSON.stringify(dados) : texto),
  };
}

describe("cliente HTTP", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(resposta(200, [])))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("faz GET e devolve JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      resposta(200, [{ id: 1, nome: "Corte" }])
    );

    const dados = await listarProcedimentos();

    expect(dados).toEqual([{ id: 1, nome: "Corte" }]);
    expect(fetch).toHaveBeenCalledWith(
      "/api/procedimentos",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("envia corpo JSON no POST", async () => {
    await criarAgendamento({ nomeCliente: "Ana" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/agendamentos",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: JSON.stringify({ nomeCliente: "Ana" }),
      })
    );
  });

  it("cancela com DELETE na rota do backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(200, { id: 7 }));
    await cancelarAgendamento(7);
    expect(fetch).toHaveBeenCalledWith(
      "/api/agendamentos/7",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("reagenda com PUT e corpo { inicio }", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(200, { id: 7 }));
    await reagendarAgendamento(7, "2026-12-01T09:00");

    expect(fetch).toHaveBeenCalledWith(
      "/api/agendamentos/7",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ inicio: "2026-12-01T09:00" }),
      })
    );
  });

  it("envia confirmar ao remover disponibilidade com agendamentos", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(204, null, ""));
    await removerDisponibilidade(3, true);
    expect(fetch).toHaveBeenCalledWith(
      "/api/disponibilidades/3?confirmar=true",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("repassa cancelarAgendamentos ao criar bloqueio", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(201, { id: 1 }));
    await criarBloqueio({ inicio: "2026-12-01T09:00", fim: "2026-12-01T10:00", cancelarAgendamentos: true });
    const corpo = JSON.parse(vi.mocked(fetch).mock.calls[0][1].body);
    expect(corpo.cancelarAgendamentos).toBe(true);
  });

  it("carrega a agenda completa do ano corrente e do seguinte", async () => {
    const ano = new Date().getFullYear();
    await listarTodosAgendamentos();
    expect(fetch).toHaveBeenCalledWith(
      `/api/agendamentos?de=${ano}-01-01&ate=${ano + 1}-12-31`,
      expect.anything()
    );
  });

  it("salva perfil em /perfil", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(200, { id: 1 }));
    await salvarConfiguracao({ nome: "Ana" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/perfil",
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("codifica o link público na URL", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(200, { tipo: "EMPRESA" }));
    await buscarLinkPublico("minha empresa/1");
    expect(fetch).toHaveBeenCalledWith(
      "/api/publico/minha%20empresa%2F1",
      expect.anything()
    );
  });

  it("trata 204 sem corpo", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(204, null, ""));
    await expect(removerProcedimento(1)).resolves.toBeNull();
  });

  it("normaliza erro 409 com mensagem do backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      resposta(409, { status: 409, mensagem: "Horário ocupado" })
    );

    await expect(listarProcedimentos()).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      message: "Horário ocupado",
    });
  });

  it("usa mensagem genérica em resposta de erro sem JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      resposta(500, null, "<html>erro</html>")
    );

    await expect(listarProcedimentos()).rejects.toMatchObject({
      status: 500,
      message: "Erro 500",
    });
    expect(ApiError).toBeDefined();
  });

  it("rejeita resposta 200 com JSON inválido", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(resposta(200, null, "nao-json"));
    await expect(listarProcedimentos()).rejects.toMatchObject({
      status: 200,
      message: "Resposta inválida do servidor.",
    });
  });

  it("transforma falha de rede em ApiError sem quebrar o fluxo", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(listarProcedimentos()).rejects.toMatchObject({
      status: 0,
      message: "Não foi possível conectar ao servidor.",
    });
  });

  it("transforma timeout em ApiError", async () => {
    const erro = new Error("abortado");
    erro.name = "AbortError";
    vi.mocked(fetch).mockRejectedValueOnce(erro);
    await expect(listarProcedimentos()).rejects.toMatchObject({
      status: 0,
      message: "Tempo limite excedido. Tente novamente.",
    });
  });
});

describe("substituirDisponibilidades", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("remove o que saiu e cria o que entrou", async () => {
    const atual = [
      { id: 1, diaSemana: "MONDAY", horaInicio: "08:00:00", horaFim: "12:00:00" },
      { id: 2, diaSemana: "TUESDAY", horaInicio: "08:00:00", horaFim: "12:00:00" },
    ];
    const chamadas = [];

    vi.stubGlobal(
      "fetch",
      vi.fn((url, opcoes) => {
        chamadas.push({ url, metodo: opcoes.method });
        if (opcoes.method === "GET") return Promise.resolve(resposta(200, atual));
        return Promise.resolve(resposta(opcoes.method === "POST" ? 201 : 204, null, ""));
      })
    );

    const desejados = [
      { diaSemana: "MONDAY", horaInicio: "08:00", horaFim: "12:00" },
      { diaSemana: "WEDNESDAY", horaInicio: "09:00", horaFim: "18:00" },
    ];

    await substituirDisponibilidades(desejados);

    expect(chamadas).toEqual(
      expect.arrayContaining([
        { url: "/api/disponibilidades/2?confirmar=true", metodo: "DELETE" },
        {
          url: "/api/disponibilidades",
          metodo: "POST",
        },
      ])
    );
    const post = vi
      .mocked(fetch)
      .mock.calls.find(([, opcoes]) => opcoes.method === "POST")[1];
    expect(JSON.parse(post.body)).toEqual({
      diaSemana: "WEDNESDAY",
      horaInicio: "09:00",
      horaFim: "18:00",
    });
  });

  it("não apaga nada quando a leitura atual falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(resposta(500, null, "erro")))
    );

    await expect(
      substituirDisponibilidades([
        { diaSemana: "MONDAY", horaInicio: "09:00", horaFim: "18:00" },
      ])
    ).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
