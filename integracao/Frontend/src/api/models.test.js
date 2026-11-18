import { describe, expect, it } from "vitest";

import {
  corProcedimento,
  dataLocalAtual,
  deBloqueioForm,
  deConfiguracao,
  deDias,
  paraAgendamentos,
  paraBloqueio,
  paraClientes,
  paraConfiguracao,
  paraDias,
  paraVinculo,
} from "./models";

describe("dias", () => {
  it("converte lista da API em grade com intervalos ordenados", () => {
    const dias = paraDias([
      { diaSemana: "MONDAY", horaInicio: "14:00:00", horaFim: "18:00:00" },
      { diaSemana: "MONDAY", horaInicio: "08:00:00", horaFim: "12:00:00" },
      { diaSemana: "DIA_INVALIDO", horaInicio: "08:00", horaFim: "12:00" },
    ]);

    const segunda = dias[1];
    expect(segunda.on).toBe(true);
    expect(segunda.intervals).toEqual([
      { start: "08:00", end: "12:00" },
      { start: "14:00", end: "18:00" },
    ]);

    const terca = dias[2];
    expect(terca.on).toBe(false);
    expect(terca.intervals).toEqual([{ start: "09:00", end: "18:00" }]);
  });

  it("converte grade ligada de volta para API", () => {
    const dias = paraDias([
      { diaSemana: "FRIDAY", horaInicio: "08:00", horaFim: "12:00" },
    ]);

    dias[0].on = true;
    dias[0].intervals = [{ start: "10:00", end: "16:00" }];

    expect(deDias(dias)).toEqual([
      { diaSemana: "SUNDAY", horaInicio: "10:00", horaFim: "16:00" },
      { diaSemana: "FRIDAY", horaInicio: "08:00", horaFim: "12:00" },
    ]);
  });
});

describe("bloqueios", () => {
  it("detecta dia inteiro", () => {
    const bloqueio = paraBloqueio({
      id: 7,
      inicio: "2026-11-20T00:00:00",
      fim: "2026-11-20T23:59:00",
      motivo: "Feriado",
    });

    expect(bloqueio).toEqual({
      id: 7,
      date: "2026-11-20",
      allDay: true,
      start: "",
      end: "",
      reason: "Feriado",
    });
  });

  it("mantém intervalo parcial", () => {
    const bloqueio = paraBloqueio({
      id: 8,
      inicio: "2026-11-20T13:00:00",
      fim: "2026-11-20T15:30:00",
      motivo: "Almoço",
    });

    expect(bloqueio.allDay).toBe(false);
    expect(bloqueio.start).toBe("13:00");
    expect(bloqueio.end).toBe("15:30");
  });

  it("converte formulário em payload", () => {
    expect(
      deBloqueioForm({
        date: "2026-11-21",
        allDay: false,
        start: "09:00",
        end: "11:00",
        reason: "Consulta",
      })
    ).toEqual({
      inicio: "2026-11-21T09:00",
      fim: "2026-11-21T11:00",
      motivo: "Consulta",
    });
  });
});

describe("agendamentos", () => {
  it("ignora cancelados e calcula duração a partir de início/fim", () => {
    const agendamentos = paraAgendamentos([
      {
        id: 1,
        estado: "CANCELADO",
        inicio: "2026-11-20T09:00:00",
        fim: "2026-11-20T10:00:00",
      },
      {
        id: 2,
        estado: "AGENDADO",
        inicio: "2026-11-20T09:00:00",
        fim: "2026-11-20T10:30:00",
        nomeCliente: "Ana",
        procedimento: "Corte",
        telefoneCliente: "11999999999",
      },
    ]);

    expect(agendamentos).toHaveLength(1);
    expect(agendamentos[0]).toMatchObject({
      id: 2,
      date: "2026-11-20",
      start: 9,
      duration: 2,
      end: "10:30",
      name: "Ana",
      procedure: "Corte",
      telefone: "11999999999",
      inicio: "2026-11-20T09:00:00",
    });
    expect(typeof corProcedimento("Corte")).toBe("string");
  });

  it("não quebra com lista ausente", () => {
    expect(paraAgendamentos(null)).toEqual([]);
  });
});

describe("clientes", () => {
  it("agrupa por telefone e aponta próximo agendamento", () => {
    const hoje = dataLocalAtual();
    const ano = Number(hoje.slice(0, 4));

    const clientes = paraClientes([
      {
        estado: "AGENDADO",
        inicio: `${ano + 1}-01-10T10:00:00`,
        nomeCliente: "Ana",
        telefoneCliente: "11",
        origem: "PROFISSIONAL",
      },
      {
        estado: "AGENDADO",
        inicio: `${ano + 1}-01-05T09:00:00`,
        nomeCliente: "Ana",
        telefoneCliente: "11",
        origem: "CLIENTE",
      },
      {
        estado: "AGENDADO",
        inicio: `${ano + 1}-01-01T09:00:00`,
        nomeCliente: "Bruno",
        telefoneCliente: "22",
        origem: "EMPRESA",
      },
    ]);

    expect(clientes).toHaveLength(2);
    expect(clientes[0]).toMatchObject({ name: "Bruno", origin: "empresa" });
    expect(clientes[1]).toMatchObject({ name: "Ana", origin: "link" });
    expect(clientes[1].next).toContain("05 jan");
  });
});

describe("configuração", () => {
  it("aplica padrões do backend e converte de volta para API", () => {
    const configuracao = paraConfiguracao({});
    expect(configuracao).toMatchObject({
      antecedenciaLembreteMin: 1440,
      prazoMinCancelamentoMin: 120,
      linkAtivo: true,
    });
    expect(configuracao.link).toContain("sai.com.br/agendar/seu-perfil");

    const perfil = paraConfiguracao({
      nome: "Marina",
      telefone: "11999999999",
      linkPublico: "abc-123",
      antecedenciaLembreteMinutos: 60,
      prazoCancelamentoHoras: 24,
    });
    expect(perfil.link).toBe("sai.com.br/agendar/abc-123");
    expect(perfil.perfil.nomeCompleto).toBe("Marina");
    expect(perfil.prazoMinCancelamentoMin).toBe(1440);

    expect(
      deConfiguracao({
        antecedenciaLembreteMin: 60,
        prazoMinCancelamentoMin: 2880,
        link: "sai.com.br/agendar/abc-123",
        linkAtivo: true,
        perfil: {
          nomeCompleto: "Marina",
          telefone: "11",
          profissionalidades: "Designer",
          biografia: "bio",
          foto: "data:image/png;base64,abc",
        },
      })
    ).toEqual({
      nome: "Marina",
      telefone: "11",
      antecedenciaLembreteMinutos: 60,
      prazoCancelamentoHoras: 48,
    });
  });
});

describe("vínculo", () => {
  it("mapeia estado pendente", () => {
    const vinculo = paraVinculo({
      estado: "pendente",
      convite: {
        id: 3,
        empresa: "Studio Bela",
        recebidoEm: "2026-11-01T10:00:00",
      },
    });

    expect(vinculo.estado).toBe("pendente");
    expect(vinculo.convite).toEqual({
      id: 3,
      empresa: "Studio Bela",
      recebidoEm: "01/11/2026",
    });
  });

  it("mapeia estado vinculado", () => {
    const vinculo = paraVinculo({
      estado: "vinculado",
      nome: "Studio Bela",
      vinculadaDesde: "2026-10-10",
      procedimentos: ["Corte"],
    });

    expect(vinculo.empresa).toEqual({
      nome: "Studio Bela",
      vinculadaDesde: "10/10/2026",
      procedimentos: ["Corte"],
    });
  });
});
