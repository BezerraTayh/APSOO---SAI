# SAI — Frontend

Frontend React 19 + Vite 8 do Sistema de Agenda Inteligente.

## Executar

```bash
npm install
npm run dev
```

Aplicação: http://localhost:5173

## Build e testes

```bash
npm run build
npm test
```

## Telas

- Acesso (profissional/empresa)
- Visão geral
- Minha agenda (dia, semana e mês)
- Procedimentos (CRUD)
- Disponibilidade (horários, bloqueios e conflitos)
- Clientes
- Minha empresa (convites e vínculo)
- Configurações (lembretes, prazos, link e perfil)
- Ajuda e FAQ

A navegação acontece pela barra lateral, com transições entre as telas e estados de foco acessíveis.

## Integração com o Backend

O cliente HTTP fica em `src/api/client.js` e os adaptadores de resposta em `src/api/models.js`.
As rotas usadas seguem o contrato do backend:

- `/procedimentos`
- `/disponibilidades` e `/bloqueios`
- `/agendamentos`
- `/perfil`
- `/vinculos`
- `/publico` (consultas e agendamento público)

Configuração por variáveis de ambiente (`.env`):

```env
VITE_API_URL=/api
VITE_DEBUG=false
VITE_PROXY_TARGET=http://localhost:8080
```

O Vite encaminha `/api/*` para `VITE_PROXY_TARGET`, removendo o prefixo `/api`.
Não há autenticação neste frontend: a sessão é apenas local e o backend deve operar no perfil de integração sem autenticação.

## Organização

```
src/
  api/                  cliente HTTP, adaptadores e testes
  styles/global.css     base visual e acessibilidade
  pages/auth/           tela de acesso
  pages/dashboard/      telas do painel
```

Cada tela mantém seus componentes e estilos na própria pasta.
