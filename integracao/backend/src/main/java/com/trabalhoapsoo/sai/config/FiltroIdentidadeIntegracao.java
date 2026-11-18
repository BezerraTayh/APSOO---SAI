package com.trabalhoapsoo.sai.config;

import java.io.IOException;
import java.util.List;

import com.trabalhoapsoo.sai.repository.EmpresaRepository;
import com.trabalhoapsoo.sai.repository.ProfissionalRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Identidade interna usada apenas no perfil de integração (sem login).
 * Não cria sessão, senha nem token de acesso: apenas associa a requisição
 * à conta padrão esperada pelos controllers existentes.
 */
public class FiltroIdentidadeIntegracao extends OncePerRequestFilter {

    private final ProfissionalRepository profissionais;
    private final EmpresaRepository empresas;
    private final String emailProfissional;
    private final String emailEmpresa;

    public FiltroIdentidadeIntegracao(ProfissionalRepository profissionais,
                                      EmpresaRepository empresas,
                                      String emailProfissional,
                                      String emailEmpresa) {
        this.profissionais = profissionais;
        this.empresas = empresas;
        this.emailProfissional = emailProfissional;
        this.emailEmpresa = emailEmpresa;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        boolean empresa = request.getRequestURI().startsWith("/empresa");
        Long id = empresa
            ? empresas.findByEmail(emailEmpresa).map(e -> e.getId()).orElse(null)
            : profissionais.findByEmail(emailProfissional).map(p -> p.getId()).orElse(null);
        String tipo = empresa ? "EMPRESA" : "PROFISSIONAL";

        if (id != null) {
            Jwt jwt = Jwt.withTokenValue("integracao")
                .header("alg", "none")
                .subject(String.valueOf(id))
                .claim("tipo", tipo)
                .build();
            SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(jwt, List.of(new SimpleGrantedAuthority("ROLE_" + tipo))));
        }
        chain.doFilter(request, response);
    }
}
