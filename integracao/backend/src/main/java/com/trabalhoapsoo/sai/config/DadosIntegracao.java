package com.trabalhoapsoo.sai.config;

import java.time.Clock;
import java.time.LocalDateTime;

import com.trabalhoapsoo.sai.model.Empresa;
import com.trabalhoapsoo.sai.model.EstadoVinculo;
import com.trabalhoapsoo.sai.model.Profissional;
import com.trabalhoapsoo.sai.model.VinculoEmpresa;
import com.trabalhoapsoo.sai.repository.EmpresaRepository;
import com.trabalhoapsoo.sai.repository.ProfissionalRepository;
import com.trabalhoapsoo.sai.repository.VinculoEmpresaRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

/** Cria as contas padrão usadas pelo perfil de integração (sem login). */
@Configuration
@Profile("integracao")
@ConditionalOnProperty(name = "sai.integracao-sem-auth", havingValue = "true")
public class DadosIntegracao {

    private final ProfissionalRepository profissionais;
    private final EmpresaRepository empresas;
    private final VinculoEmpresaRepository vinculos;
    private final PasswordEncoder encoder;
    private final Clock relogio;
    private final String emailProfissional;
    private final String emailEmpresa;

    public DadosIntegracao(ProfissionalRepository profissionais,
                           EmpresaRepository empresas,
                           VinculoEmpresaRepository vinculos,
                           PasswordEncoder encoder,
                           Clock relogio,
                           @Value("${sai.integracao.profissional-email:integracao@profissional.local}") String emailProfissional,
                           @Value("${sai.integracao.empresa-email:integracao@empresa.local}") String emailEmpresa) {
        this.profissionais = profissionais;
        this.empresas = empresas;
        this.vinculos = vinculos;
        this.encoder = encoder;
        this.relogio = relogio;
        this.emailProfissional = emailProfissional;
        this.emailEmpresa = emailEmpresa;
    }

    @Bean
    public ApplicationRunner runnerDadosIntegracao() {
        return args -> garantir();
    }

    @Transactional
    public void garantir() {
        Profissional p = profissionais.findByEmail(emailProfissional).orElseGet(() ->
            profissionais.save(new Profissional(emailProfissional,
                encoder.encode("nao-usar-login"), "Profissional Integração", "83999999999")));
        Empresa e = empresas.findByEmail(emailEmpresa).orElseGet(() ->
            empresas.save(new Empresa(emailEmpresa,
                encoder.encode("nao-usar-login"), "Empresa Integração", "83988888888")));

        if (vinculos.findFirstByProfissionalIdAndStatus(p.getId(), EstadoVinculo.ATIVO).isEmpty()) {
            LocalDateTime agora = LocalDateTime.now(relogio);
            VinculoEmpresa v = new VinculoEmpresa(e, p, agora);
            v.mudarEstado(EstadoVinculo.ATIVO, agora);
            vinculos.save(v);
        }
    }
}
