# Project Status Report

Dashboard de acompanhamento de status de projetos, com suporte a **múltiplos projetos** do Azure DevOps. O projeto original (Altana - Datalake) continua lendo das exportações `.parquet` da pasta `data/`; qualquer novo projeto cadastrado em `/projects` é sincronizado diretamente via API do Azure DevOps e armazenado no PostgreSQL. Inclui também um módulo de Agenda (reuniões, pautas, atas e anexos) e dados editáveis do projeto (datas de início/fim), tudo via Prisma.

## Setup inicial

### 1. Instalar dependências

```bash
npm install
```

> Nota: se a pasta `node_modules` já existir e o `npm install` reclamar de arquivos, apague a pasta `node_modules` manualmente antes de instalar novamente.

### 2. Banco de dados (PostgreSQL via Docker)

O projeto usa PostgreSQL para dados de Agenda (reuniões/anexos) e informações do projeto. Suba o banco com Docker Compose:

```bash
npm run db:up
```

Isso inicia um container `postgres:16-alpine` na porta `5432` com usuário/senha `postgres`/`postgres` e banco `project_status_report` (veja `docker-compose.yml`). Para derrubar o container: `npm run db:down`.

### 3. Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste se necessário:

```bash
cp .env.example .env
```

- `DATABASE_URL` já vem pronta para o banco local do docker-compose.
- As variáveis `AWS_*` são necessárias para o upload de anexos na Agenda (veja seção S3 abaixo).

### 4. Prisma: gerar client e aplicar schema

```bash
npm run db:generate
npm run db:migrate
```

`db:generate` gera o Prisma Client a partir de `prisma/schema.prisma`. `db:migrate` cria as tabelas no banco (modelos `Project`, `WorkItem`, `Meeting`, `MeetingAttachment`, `ProjectInfo`). Para inspecionar os dados visualmente: `npm run db:studio`.

### 5. Integração com Azure DevOps (múltiplos projetos)

Para cadastrar e sincronizar **outros projetos** além do projeto legado (Altana), configure um Personal Access Token do Azure DevOps no `.env`:

```
AZURE_DEVOPS_ORG_URL="https://dev.azure.com/sua-organizacao"
AZURE_DEVOPS_PAT="..."
```

O PAT precisa de permissão de leitura em **Work Items**. Ele é compartilhado por todos os projetos cadastrados — todos devem pertencer à mesma organização do Azure DevOps.

Com isso configurado, acesse `/projects` no app para:

1. Criar um novo projeto informando um nome de exibição e o nome exato do Team Project no Azure DevOps.
2. Clicar em **Sincronizar** a qualquer momento para buscar os work items mais recentes via API (WIQL + work items batch) e gravá-los no Postgres, substituindo os dados anteriores do projeto.

O seletor de projeto na barra lateral troca qual projeto está "ativo" (guardado em cookie) — todas as páginas (Visão Geral, Sprints, Demandas, Agenda) passam a refletir o projeto selecionado. O projeto legado (Altana) nunca precisa de sincronização manual: ele continua lendo direto de `data/*.parquet`.

### 6. Upload de anexos (S3)

Os anexos de reunião (documentos, atas em PDF, etc.) são enviados para um bucket S3 — não ficam salvos localmente. Preencha no `.env`:

```
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="..."
```

O bucket pode ser privado: os links de download são gerados como URLs assinadas (válidas por 1 hora) no momento em que a página é renderizada, via `lib/s3.ts`.

Para desenvolvimento local sem AWS real, é possível apontar para um serviço compatível com S3 (ex.: MinIO, Cloudflare R2) definindo também:

```
AWS_S3_ENDPOINT="http://localhost:9000"
AWS_S3_FORCE_PATH_STYLE="true"
```

### 7. Autenticação (Better Auth) e email (SMTP)

O app é fechado por login — não existe cadastro público. Preencha no `.env`:

```
BETTER_AUTH_SECRET="..."   # openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"

SMTP_HOST="smtp.suaempresa.com"
SMTP_PORT="587"
SMTP_SECURE="false"        # "true" apenas para a porta 465 (TLS implícito)
SMTP_USER="..."
SMTP_PASSWORD="..."
EMAIL_FROM="Project Status Report <no-reply@suaempresa.com>"
```

- `BETTER_AUTH_SECRET` assina sessões e tokens — gere um valor aleatório e não o reutilize entre ambientes.
- `BETTER_AUTH_URL` deve ser a URL pública do app (usada para montar os links dos emails de convite/redefinição de senha e de reunião publicada).
- `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`EMAIL_FROM` conectam a um servidor SMTP qualquer (Office 365, Gmail/Workspace com senha de app, Amazon SES, Mailgun, Postfix interno, etc.) e são usados para três tipos de email: convite de novo usuário, "esqueci minha senha" e notificação de reunião publicada (enviada a todos os clientes vinculados ao projeto da reunião). Sem `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD` configurados, os emails só são registrados no log do servidor (nada é enviado, mas o fluxo continua funcionando).

Existem três papéis:

- **Admin** — acesso total, inclusive cadastro/edição de usuários em `/admin/users`.
- **Gerente** — pode editar projetos, sincronizar dados e gerenciar a Agenda (criar, publicar, arquivar reuniões).
- **Cliente** — acesso somente leitura, restrito aos projetos que um admin vinculou a ele no convite (ou depois, em `/admin/users`).

Como não há cadastro público, o primeiro acesso é feito em `/setup` — essa rota só funciona enquanto não existir nenhum usuário no banco e cria automaticamente o primeiro Admin. A partir daí, novos usuários só entram por convite: o admin preenche nome, email e papel em `/admin/users` (selecionando os projetos, se o papel for Cliente) e o Better Auth dispara um email de "definir senha" via SMTP, reaproveitando o mesmo fluxo do "esqueci minha senha".

### 8. Rodar o app

```bash
npm run dev
```

Abra http://localhost:3000. No primeiro acesso, vá em `/setup` para criar o usuário Admin.

Para gerar a versão de produção:

```bash
npm run build
npm start
```

## Como os dados são carregados

Cada projeto cadastrado tem uma "fonte" (`Project.source`):

- **`PARQUET`** (só o projeto legado Altana): toda vez que a página é acessada, o app lê **todos** os arquivos `.parquet` dentro de `data/` e faz o merge por `work_item_id`, mantendo sempre a revisão mais recente de cada item (`system_rev`). Você pode soltar novas exportações na pasta `data/` (não precisa apagar as antigas) e simplesmente atualizar a página — não é necessário rebuildar.
- **`AZURE_DEVOPS`** (projetos criados em `/projects`): os work items ficam armazenados na tabela `WorkItem` do Postgres, populada pelo botão **Sincronizar** (que consulta a API do Azure DevOps via `lib/azure-devops.ts` e regrava a tabela via `lib/sync.ts`). As páginas sempre leem o que está no banco — para atualizar, é preciso sincronizar novamente.

Em ambos os casos, `lib/metrics.ts` aplica a mesma lógica de agregação (sprints, atraso/adiantamento, totais, carga por responsável) sobre a lista de work items, independentemente de onde vieram.

## Metodologia: Sprint atual, atrasado e adiantado

- **Sprint atual**: a sprint mais recente que tem itens ativamente em andamento (estados `In Progress`, `Active`, `Tests Done`, `Pending Publish`). Se nenhuma sprint tiver itens ativos, usa-se a primeira sprint ainda não concluída.
- **Atrasado**: item que está em uma sprint anterior à sprint atual e ainda não foi fechado (`Closed`/`Resolved`).
- **Adiantado**: item concluído (`Closed`/`Resolved`) em uma sprint posterior à sprint atual.
- **Pontos pendentes**: soma de Story Points de todos os itens que ainda não estão `Closed`/`Resolved`.

Essa lógica está centralizada em `lib/metrics.ts`.

## Estrutura

- `data/` — exportações Azure DevOps (`.parquet`) do projeto legado
- `lib/parquet.ts` — leitura e merge dos arquivos parquet
- `lib/azure-devops.ts` — cliente da API REST do Azure DevOps (WIQL + work items batch), mapeamento de campos
- `lib/sync.ts` — sincroniza um projeto via API e grava os work items no Postgres
- `lib/projects.ts` — CRUD de projetos, projeto legado criado automaticamente na primeira execução
- `lib/active-project.ts` — resolve o "projeto ativo" a partir do cookie `activeProjectId`
- `lib/metrics.ts` — cálculo de métricas (sprints, atraso/adiantamento, pontos, carga por responsável), lendo do parquet ou do Postgres conforme a fonte do projeto
- `lib/meetings.ts` — CRUD de reuniões e anexos (Prisma), sempre escopado por projeto
- `lib/project-info.ts` — leitura/edição de datas de início/fim e notas, por projeto
- `lib/s3.ts` — upload, remoção e geração de URL assinada para anexos no S3
- `prisma/schema.prisma` — modelos `Project`, `WorkItem`, `Meeting`, `MeetingAttachment`, `ProjectInfo`
- `docker-compose.yml` — PostgreSQL local para desenvolvimento
- `app/projects/page.tsx` — cadastro de projetos e botão Sincronizar
- `app/page.tsx` — Visão Geral (dashboard executivo + card de período do projeto ativo)
- `app/sprints/page.tsx` — detalhamento por sprint (com reuniões vinculadas)
- `app/work-items/page.tsx` — lista filtrável de demandas
- `app/work-items/[id]/page.tsx` — página de detalhe de uma demanda (descrição, critérios de aceite, QA, histórico, hierarquia pai/filhos, pessoas, datas e reuniões relacionadas)
- `app/agenda/page.tsx` — lista de reuniões (próximas/anteriores)
- `app/agenda/new/page.tsx`, `app/agenda/[id]/page.tsx`, `app/agenda/[id]/edit/page.tsx` — criação, detalhe e edição de reunião
- `app/agenda/actions.ts` — Server Actions (CRUD de reunião, upload/remoção de anexos no S3)
- `components/Sidebar.tsx` — navegação + seletor de projeto ativo
- `stitch/` — referências de design (UI/UX) usadas como base visual

## Detalhe da demanda

Clicando em qualquer ID ou título de demanda (no dashboard, em Sprints ou em Demandas) você abre `/work-items/[id]` com:

- Descrição, critérios de aceite, validação de QA e aprovação do PO (quando preenchidos no Azure DevOps)
- Estado atual, prazo (atrasado/adiantado/no prazo), prioridade, story points, horas previstas e tamanho
- Progresso da sprint à qual o item pertence
- Responsável, quem criou/alterou/resolveu/fechou o item
- Datas de criação, alteração, mudança de status, resolução e fechamento
- Hierarquia: item pai e itens filhos (via campo Parent do Azure DevOps), com links diretos
- Botão para abrir o item original no Azure DevOps
