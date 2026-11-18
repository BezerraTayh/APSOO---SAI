# SAI — Sistema de Agenda Inteligente

## Executar com Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- PostgreSQL: porta `${POSTGRES_PORT:-5432}`

## Executar localmente sem Docker

1. Suba um PostgreSQL e configure `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.
2. Backend: `cd backend && SPRING_PROFILES_ACTIVE=integracao ./mvnw spring-boot:run` (ou `mvn spring-boot:run`).
3. Frontend: `cd Frontend && npm ci && npm run dev`.

## Testes

```bash
cd backend && mvn test
cd Frontend && npm test
cd Frontend && npm run test:e2e   # requer stack no ar
```

## Funcionalidades integradas

- Procedimentos: CRUD e publicação automática no link do profissional.
- Disponibilidade: intervalos por dia, bloqueios e conflitos de agenda.
- Agenda: criação manual, remarcação, cancelamento e histórico.
- Links públicos: perfil do profissional/empresa, horários livres, reserva sem conta, consulta/remarcação/cancelamento por token.
- Empresa: vínculos, liberação e agrupamento de procedimentos, agenda somente leitura e agendamento em nome de clientes.
- Regras preservadas: antecedência mínima de 30 min, janela de 30 dias, um agendamento ativo por horário, sem reserva em bloqueio/fora de expediente, prazo de cancelamento/remarcação e notificações em log.
