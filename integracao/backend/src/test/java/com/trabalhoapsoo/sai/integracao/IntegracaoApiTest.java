package com.trabalhoapsoo.sai.integracao;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.trabalhoapsoo.sai.config.DadosIntegracao;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/** Fluxos completos da API no perfil de integração (sem token). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integracao")
class IntegracaoApiTest {

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private DadosIntegracao dados;

    @BeforeEach
    void limpar() {
        jdbc.execute("TRUNCATE TABLE agendamento, procedimento_link, vinculo_empresa, bloqueio, "
            + "disponibilidade, procedimento, conta_cliente, empresa, profissional RESTART IDENTITY CASCADE");
        dados.garantir();
    }

    @Test
    void fluxoProfissionalSemToken() throws Exception {
        JsonNode perfil = json(perform(get("/perfil"), 200));
        org.junit.jupiter.api.Assertions.assertEquals("Profissional Integração", perfil.get("nome").asText());

        String link = perfil.get("linkPublico").asText();
        long procedimentoId = criarProcedimento("Corte", 60, "80.00");
        LocalDate dia = alvo();
        criarDisponibilidade(dia, "08:00", "18:00");

        JsonNode agendamento = json(perform(post("/agendamentos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Maria\",\"telefoneCliente\":\"9199999\",\"inicio\":\"%sT09:00:00\"}",
                procedimentoId, dia)), 201));
        org.junit.jupiter.api.Assertions.assertEquals("AGENDADO", agendamento.get("estado").asText());
        long id = agendamento.get("id").asLong();

        mvc.perform(get("/agendamentos").param("de", dia.toString()).param("ate", dia.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nomeCliente").value("Maria"));

        mvc.perform(get("/publico/{link}", link))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tipo").value("PROFISSIONAL"))
            .andExpect(jsonPath("$.itens[0].nome").value("Corte"));

        JsonNode horarios = json(perform(get("/publico/{link}/horarios", link)
            .param("procedimentoId", String.valueOf(procedimentoId))
            .param("data", dia.toString()), 200));
        boolean livreAs10 = false;
        boolean livreAs9 = false;
        for (JsonNode horario : horarios) {
            if (horario.asText().equals(dia + "T10:00:00")) livreAs10 = true;
            if (horario.asText().equals(dia + "T09:00:00")) livreAs9 = true;
        }
        org.junit.jupiter.api.Assertions.assertTrue(livreAs10);
        org.junit.jupiter.api.Assertions.assertFalse(livreAs9);

        perform(put("/agendamentos/" + id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format("{\"inicio\":\"%sT10:00:00\"}", dia)), 200);

        perform(delete("/agendamentos/" + id), 200);

        mvc.perform(get("/agendamentos").param("de", dia.toString()).param("ate", dia.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].estado").value("CANCELADO"));
    }

    @Test
    void bloqueioCancelaAgendamentosConflitantes() throws Exception {
        long procedimentoId = criarProcedimento("Unha", 60, "50.00");
        LocalDate dia = alvo();
        criarDisponibilidade(dia, "08:00", "18:00");
        JsonNode agendamento = json(perform(post("/agendamentos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Ana\",\"telefoneCliente\":\"9199999\",\"inicio\":\"%sT09:00:00\"}",
                procedimentoId, dia)), 201));

        perform(post("/bloqueios")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"inicio\":\"%sT09:00:00\",\"fim\":\"%sT10:00:00\",\"motivo\":\"Manutenção\",\"cancelarAgendamentos\":true}",
                dia, dia)), 201);

        mvc.perform(get("/agendamentos").param("de", dia.toString()).param("ate", dia.toString()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(agendamento.get("id").asLong()))
            .andExpect(jsonPath("$[0].estado").value("CANCELADO"));
    }

    @Test
    void regrasDeConflitoRejeitamHorariosInvalidos() throws Exception {
        long procedimentoId = criarProcedimento("Corte", 60, "80.00");
        LocalDate dia = alvo();
        criarDisponibilidade(dia, "08:00", "18:00");

        String linkProfissional = json(perform(get("/perfil"), 200)).get("linkPublico").asText();
        perform(post("/publico/{link}/agendamentos", linkProfissional)
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Maria\",\"telefoneCliente\":\"9199999\",\"inicio\":\"%sT19:00:00\"}",
                procedimentoId, dia)), 409);

        perform(post("/agendamentos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Maria\",\"telefoneCliente\":\"9199999\",\"inicio\":\"%sT09:00:00\"}",
                procedimentoId, dia)), 201);

        perform(post("/agendamentos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Joana\",\"telefoneCliente\":\"9188888\",\"inicio\":\"%sT09:00:00\"}",
                procedimentoId, dia)), 409);

        perform(post("/bloqueios")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"inicio\":\"%sT14:00:00\",\"fim\":\"%sT15:00:00\",\"motivo\":\"Almoço\"}",
                dia, dia)), 201);

        perform(post("/agendamentos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Joana\",\"telefoneCliente\":\"9188888\",\"inicio\":\"%sT14:00:00\"}",
                procedimentoId, dia)), 409);
    }

    @Test
    void empresaLiberaAgrupaAgendaEAGendaPeloLink() throws Exception {
        long corte1 = criarProcedimento("Corte", 60, "80.00");
        long corte2 = criarProcedimento("Corte", 60, "90.00");
        long idade = criarProcedimento(" corte ", 30, "40.00");
        LocalDate dia = alvo();
        criarDisponibilidade(dia, "08:00", "18:00");

        mvc.perform(get("/empresa/procedimentos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].procedimentos[0].liberado").value(false));

        perform(put("/empresa/procedimentos/{id}", corte1)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nomeNoLink\":\"Corte unissex\"}"), 204);
        perform(put("/empresa/procedimentos/{id}", corte2)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nomeNoLink\":\"Corte unissex\"}"), 204);

        mvc.perform(get("/empresa/procedimentos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].procedimentos[0].liberado").value(true));

        JsonNode empresa = json(perform(get("/empresa"), 200));
        String linkEmpresa = empresa.get("linkPublico").asText();
        perform(get("/publico/{link}", linkEmpresa), 200);

        mvc.perform(get("/publico/{link}", linkEmpresa))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tipo").value("EMPRESA"))
            .andExpect(jsonPath("$.itens.length()").value(1))
            .andExpect(jsonPath("$.itens[0].nome").value("Corte unissex"))
            .andExpect(jsonPath("$.itens[0].opcoes.length()").value(2));

        long profissionalId = json(perform(get("/perfil"), 200)).get("id").asLong();
        mvc.perform(get("/empresa/profissionais/{id}/agendamentos", profissionalId)
                .param("de", dia.toString()).param("ate", dia.toString()))
            .andExpect(status().isOk());

        perform(post("/empresa/agendamentos")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"chave\":\"corte unissex\",\"nomeCliente\":\"Carla\",\"telefoneCliente\":\"9177777\",\"inicio\":\"%sT11:00:00\"}",
                dia)), 201);

        mvc.perform(get("/empresa/agendamentos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].nomeCliente").value("Carla"))
            .andExpect(jsonPath("$[0].origem").value("EMPRESA"));

        mvc.perform(get("/publico/{link}", linkEmpresa))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.itens.length()").value(1));
        org.junit.jupiter.api.Assertions.assertTrue(idade > 0);
    }

    @Test
    void clienteNaoPodeCancelarNemRemarcarForaDoPrazo() throws Exception {
        long procedimentoId = criarProcedimento("Corte", 30, "80.00");
        String link = json(perform(get("/perfil"), 200)).get("linkPublico").asText();

        LocalDateTime alvo = LocalDateTime.now().plusMinutes(90)
            .withSecond(0).withNano(0)
            .withMinute(LocalDateTime.now().getMinute() < 30 ? 0 : 30);
        criarDisponibilidade(alvo.toLocalDate(), "00:00", "23:59");

        JsonNode agendamento = json(perform(post("/publico/{link}/agendamentos", link)
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format(
                "{\"procedimentoId\":%d,\"nomeCliente\":\"Maria\",\"telefoneCliente\":\"9199999\",\"inicio\":\"%s\"}",
                procedimentoId, alvo)), 201));
        String token = agendamento.get("token").asText();

        perform(delete("/publico/agendamentos/{token}", token), 409);
        perform(put("/publico/agendamentos/{token}", token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format("{\"inicio\":\"%s\"}", alvo.plusDays(1))), 409);
    }

    @Test
    void sairDaEmpresaPreservaOsDadosDoProfissional() throws Exception {
        long procedimentoId = criarProcedimento("Corte", 60, "80.00");
        JsonNode perfilAntes = json(perform(get("/perfil"), 200));
        perform(get("/vinculos/atual"), 200);

        perform(post("/vinculos/sair"), 200);

        perform(get("/vinculos/atual"), 404);
        JsonNode perfilDepois = json(perform(get("/perfil"), 200));
        org.junit.jupiter.api.Assertions.assertEquals(perfilAntes.get("id").asLong(), perfilDepois.get("id").asLong());
        JsonNode procedimentos = json(perform(get("/procedimentos"), 200));
        boolean preservado = false;
        for (JsonNode p : procedimentos) {
            if (p.get("id").asLong() == procedimentoId && "Corte".equals(p.get("nome").asText())) preservado = true;
        }
        org.junit.jupiter.api.Assertions.assertTrue(preservado);
        perform(get("/publico/{link}", perfilDepois.get("linkPublico").asText()), 200);
    }

    private long criarProcedimento(String nome, int minutos, String preco) throws Exception {
        String corpo = String.format("{\"nome\":\"%s\",\"duracaoMinutos\":%d,\"preco\":%s}", nome, minutos, preco);
        return json(perform(post("/procedimentos").contentType(MediaType.APPLICATION_JSON).content(corpo), 201))
            .get("id").asLong();
    }

    private void criarDisponibilidade(LocalDate dia, String inicio, String fim) throws Exception {
        perform(post("/disponibilidades")
            .contentType(MediaType.APPLICATION_JSON)
            .content(String.format("{\"diaSemana\":\"%s\",\"horaInicio\":\"%s\",\"horaFim\":\"%s\"}",
                dia.getDayOfWeek(), inicio, fim)), 201);
    }

    private LocalDate alvo() {
        LocalDate dia = LocalDate.now().plusDays(3);
        while (dia.getDayOfWeek().getValue() > 5) dia = dia.plusDays(1);
        return dia;
    }

    private MvcResult perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder builder,
                              int status) throws Exception {
        return mvc.perform(builder).andExpect(status().is(status)).andReturn();
    }

    private JsonNode json(MvcResult resultado) throws Exception {
        return json.readTree(resultado.getResponse().getContentAsString());
    }
}
