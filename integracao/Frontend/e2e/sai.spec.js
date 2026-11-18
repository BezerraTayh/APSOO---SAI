import { expect, test } from "@playwright/test";

const DIAS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function localISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function alvo() {
  const data = new Date();
  data.setDate(data.getDate() + 5);
  return data;
}

async function api(request, metodo, caminho, corpo) {
  const url = caminho.startsWith("/api/") ? caminho : `/api${caminho}`;
  const resposta = await request[metodo](url, corpo === undefined ? {} : { data: corpo });
  expect(resposta.ok(), `${metodo.toUpperCase()} ${caminho} -> ${resposta.status()}`).toBeTruthy();
  return resposta.status() === 204 ? null : resposta.json();
}

async function limpar(request) {
  const ano = new Date().getFullYear();
  const agendamentos = await api(request, "get", `/agendamentos?de=${ano}-01-01&ate=${ano + 1}-12-31`);
  for (const a of agendamentos) {
    if (a.estado === "AGENDADO") await api(request, "delete", `/agendamentos/${a.id}`);
  }

  for (const b of await api(request, "get", "/bloqueios")) {
    await api(request, "delete", `/bloqueios/${b.id}`);
  }

  const empresas = await api(request, "get", "/empresa/procedimentos");
  for (const grupo of empresas) {
    for (const p of grupo.procedimentos) {
      await request.delete(`/api/empresa/procedimentos/${p.procedimentoId}`);
    }
  }

  for (const d of await api(request, "get", "/disponibilidades")) {
    await api(request, "delete", `/disponibilidades/${d.id}?confirmar=true`);
  }

  for (const p of await api(request, "get", "/procedimentos")) {
    await api(request, "delete", `/procedimentos/${p.id}`);
  }
}

async function criarProcedimento(request, nome, minutos = 60, preco = "80.00") {
  return api(request, "post", "/procedimentos", {
    nome,
    duracaoMinutos: minutos,
    preco,
  });
}

async function entrar(page) {
  await page.goto("/");
  await page.getByLabel("E-mail").fill("integracao@profissional.local");
  await page.getByLabel("Senha").fill("nao-usar-login");
  await page.getByRole("button", { name: "Entrar na minha conta" }).click();
  await expect(page.getByRole("heading", { name: /Bom dia,/ })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await limpar(request);
});

test("painel carrega e cria procedimento pela interface", async ({ page, request }) => {
  await entrar(page);
  await page.getByRole("button", { name: "Procedimentos" }).click();
  await page.getByRole("button", { name: "Novo procedimento" }).first().click();

  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nome do procedimento").fill("Massagem E2E");
  await dialogo.getByLabel("Valor").fill("120,50");
  await dialogo.getByLabel("Duração").selectOption("60");
  await dialogo.getByRole("button", { name: "Salvar procedimento" }).click();

  await expect(page.getByRole("status")).toContainText("Procedimento salvo");
  const procedimentos = await api(request, "get", "/procedimentos");
  expect(procedimentos.some((p) => p.nome === "Massagem E2E" && p.duracaoMinutos === 60)).toBeTruthy();
});

test("agenda cria e cancela atendimento pela interface", async ({ page, request }) => {
  const data = alvo();
  const dia = localISO(data);
  await criarProcedimento(request, "Agenda E2E", 60, "70.00");

  await entrar(page);
  await page.getByRole("button", { name: "Minha agenda" }).click();
  await page.getByRole("button", { name: "Adicionar agendamento" }).click();

  const modal = page.locator(".agenda-modal");
  await modal.getByPlaceholder("Digite o nome do cliente").fill("Cliente E2E");
  await modal.getByPlaceholder("Ex.: Design de sobrancelhas").fill("Agenda E2E");
  await modal.getByPlaceholder("(00) 00000-0000").fill("99999999999");
  await modal.locator('input[type="date"]').fill(dia);
  await modal.locator('input[type="time"]').fill("09:00");
  await modal.getByRole("button", { name: "Salvar agendamento" }).click();

  let criado;
  await expect.poll(async () => {
    const agendamentos = await api(request, "get", `/agendamentos?de=${dia}&ate=${dia}`);
    criado = agendamentos.find((a) => a.nomeCliente === "Cliente E2E");
    return criado;
  }).toBeTruthy();

  await page.getByRole("button", { name: "Cliente E2E" }).first().click();
  await expect(page.locator(".agenda-modal")).toContainText("Cliente E2E");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancelar agendamento" }).click();
  await expect(page.locator(".agenda-modal")).toHaveCount(0);

  const cancelado = (await api(request, "get", `/agendamentos?de=${dia}&ate=${dia}`))
    .find((a) => a.id === criado.id);
  expect(cancelado.estado).toBe("CANCELADO");
});

test("disponibilidade é persistida pela interface", async ({ page, request }) => {
  const data = alvo();
  await entrar(page);
  await page.getByRole("button", { name: "Disponibilidade" }).click();

  await expect(page.getByRole("button", { name: /^(Ativar|Desativar) / }).first()).toBeVisible();
  const nome = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][data.getDay()];
  const botao = page.getByRole("button", { name: `Ativar ${nome}` });
  if (await botao.count()) await botao.click();

  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("Horários salvos com sucesso!")).toBeVisible();

  const disponibilidades = await api(request, "get", "/disponibilidades");
  expect(disponibilidades.some((d) => d.diaSemana === DIAS[data.getDay()])).toBeTruthy();
});

test("link público e link da empresa respeitam regras de agendamento", async ({ request }) => {
  const data = alvo();
  const dia = localISO(data);
  const diaSemana = DIAS[data.getDay()];
  const procedimento = await criarProcedimento(request, "Publico E2E", 60, "90.00");

  await api(request, "post", "/disponibilidades", {
    diaSemana,
    horaInicio: "08:00",
    horaFim: "18:00",
  });

  const perfil = await api(request, "get", "/perfil");
  const horarios = await api(request, "get", `/publico/${perfil.linkPublico}/horarios?procedimentoId=${procedimento.id}&data=${dia}`);
  expect(horarios).toContain(`${dia}T09:00:00`);

  const publico = await api(request, "post", `/publico/${perfil.linkPublico}/agendamentos`, {
    procedimentoId: procedimento.id,
    nomeCliente: "Cliente Público",
    telefoneCliente: "88888888888",
    inicio: `${dia}T09:00:00`,
  });
  expect(publico.estado).toBe("AGENDADO");
  expect(publico.token).toBeTruthy();

  const foraDoExpediente = await request.post(`/api/publico/${perfil.linkPublico}/agendamentos`, {
    data: {
      procedimentoId: procedimento.id,
      nomeCliente: "Cliente Público",
      telefoneCliente: "88888888888",
      inicio: `${dia}T19:00:00`,
    },
  });
  expect(foraDoExpediente.status()).toBe(409);

  const cancelado = await api(request, "delete", `/publico/agendamentos/${publico.token}`);
  expect(cancelado.estado).toBe("CANCELADO");

  const empresa = await api(request, "get", "/empresa");
  await api(request, "put", `/empresa/procedimentos/${procedimento.id}`, { nomeNoLink: "serviço e2e" });
  const linkEmpresa = await api(request, "get", `/publico/${empresa.linkPublico}`);
  expect(linkEmpresa.tipo).toBe("EMPRESA");
  expect(linkEmpresa.itens.some((i) => i.nome === "serviço e2e")).toBeTruthy();

  const profissional = await api(request, "get", `/perfil`);
  const agendaSomenteLeitura = await api(request, "get", `/empresa/profissionais/${profissional.id}/agendamentos?de=${dia}&ate=${dia}`);
  expect(Array.isArray(agendaSomenteLeitura)).toBeTruthy();
});

test("bloqueio cancela agendamento conflitante", async ({ request }) => {
  const data = alvo();
  const dia = localISO(data);
  const procedimento = await criarProcedimento(request, "Bloqueio E2E", 60, "60.00");
  const agendamento = await api(request, "post", "/agendamentos", {
    procedimentoId: procedimento.id,
    nomeCliente: "Ana E2E",
    telefoneCliente: "77777777777",
    inicio: `${dia}T09:00:00`,
  });

  await api(request, "post", "/bloqueios", {
    inicio: `${dia}T09:00:00`,
    fim: `${dia}T10:00:00`,
    motivo: "Bloqueio E2E",
    cancelarAgendamentos: true,
  });

  const atualizado = (await api(request, "get", `/agendamentos?de=${dia}&ate=${dia}`))
    .find((a) => a.id === agendamento.id);
  expect(atualizado.estado).toBe("CANCELADO");
});
