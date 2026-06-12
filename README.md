# Switch Rural - Sistema de Gestão Agrícola

MVP responsivo para acompanhamento de uma lavoura de soja durante um ciclo de 120 dias. O sistema possui áreas separadas para produtor e agrônomo, banco SQLite local, autenticação por sessão, cálculos de produtividade, alertas críticos e fila de registros offline.

## Tecnologias

- Next.js 16 com App Router e TypeScript
- React 19
- Prisma 7
- SQLite com `better-sqlite3`
- Recharts para a linha do tempo do ciclo
- Lucide React para ícones
- Cookie HTTP-only com JWT assinado para autenticação

## Funcionalidades disponíveis

- Login de produtor e agrônomo
- Cadastro de usuários, fazendas, talhões e ciclos
- Restrição de acesso aos dados por fazenda e perfil
- Validação do vazio sanitário de Goiás
- Checklist de vistoria agronômica
- Amostragem e cálculo automático de produtividade
- Registro de pragas, doenças e plantas daninhas
- Notificação automática ao produtor para ocorrências graves
- Abertura e fechamento de chamados de manejo
- Cálculo automático do tempo de resposta
- Fotos simuladas com coordenadas do navegador
- Dashboard com cards, progresso e linha do tempo de 120 dias
- Trilha lúdica de riscos com 120 blocos diários coloridos
- Gráfico de produtividade estimada ao longo do ciclo
- Histórico de alertas e central de notificações
- Dashboard exclusivo para desenvolvedores com métricas globais
- Estrutura multitenant com `tenantId`
- Login Google opcional para contas previamente cadastradas
- Demarcação da fazenda em mapa de satélite do Google
- Fila offline em `localStorage` para vistorias, ocorrências e fotos
- Sincronização automática quando a conexão volta

## Pré-requisitos no Windows

Instale:

1. [Node.js 24 LTS](https://nodejs.org/) ou uma versão compatível com Prisma 7: Node 20.19+, 22.12+ ou 24+.
2. [Visual Studio Code](https://code.visualstudio.com/).
3. Git, caso o projeto seja obtido por repositório.

Extensões recomendadas no VS Code:

- ESLint, da Microsoft
- Prisma, da Prisma

Confira a instalação no PowerShell:

```powershell
node --version
npm --version
```

## Como executar no VS Code

Abra o PowerShell e entre na pasta do projeto:

```powershell
cd "C:\Users\grimm\OneDrive\Documentos\Switch_Rural"
code .
```

No VS Code, abra o terminal integrado com `Ctrl + '` e execute:

```powershell
npm install
```

Se o arquivo `.env` não existir, crie-o a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Prepare o cliente Prisma, o banco SQLite e os dados iniciais:

```powershell
npm run setup
```

Inicie o ambiente de desenvolvimento:

```powershell
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Para encerrar o servidor, pressione `Ctrl + C` no terminal.

## Usuários de teste

### Produtor

- E-mail: `produtor@switchrural.com`
- Senha: `123456`

### Agrônomo

- E-mail: `agronomo@switchrural.com`
- Senha: `123456`

### Desenvolvedor

- E-mail: `dev@switchrural.com`
- Senha: `123456`

O perfil de desenvolvedor possui acesso ao console global com quantidade de
tenants, usuários, fazendas, hectares, vistorias e ocorrências.

## Configuração do Google

As integrações são opcionais. Sem as chaves, o restante do sistema continua
funcionando normalmente.

### Login com Google

No Google Cloud Console:

1. Configure a tela de consentimento OAuth.
2. Crie um Client ID do tipo aplicação Web.
3. Cadastre `http://localhost:3000` nas origens JavaScript durante o desenvolvimento.
4. Em produção, cadastre somente o domínio HTTPS real.

Preencha no `.env`:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
```

O login Google não cria usuários automaticamente. O e-mail precisa ser
previamente cadastrado no console do desenvolvedor e associado a um tenant.
No primeiro acesso, o sistema vincula o identificador Google à conta existente.

### Google Maps

No mesmo projeto Google Cloud:

1. Ative a Maps JavaScript API.
2. Crie uma API key.
3. Restrinja a chave por domínio e permita apenas a Maps JavaScript API.
4. Ative faturamento e alertas de orçamento no Google Cloud.

Preencha:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="sua-chave"
```

Na tela de fazendas, use o botão **Demarcar**. O mapa abre em modo satélite;
cada clique adiciona um vértice ao polígono. A implementação não usa a antiga
Drawing Library, removida das versões atuais do Google Maps em maio de 2026.

## Multitenancy e RLS

O modelo possui uma tabela `Tenant` e um campo `tenantId` nas entidades
operacionais. Produtores e agrônomos recebem o tenant dentro da sessão, e as
consultas do SQLite aplicam filtros de acesso na aplicação. Desenvolvedores
possuem acesso global explícito.

SQLite não suporta Row Level Security. Para produção com PostgreSQL:

1. Mude o provider Prisma para `postgresql`.
2. Use `@prisma/adapter-pg` e uma URL PostgreSQL com pooling.
3. Crie e aplique migrations com Prisma Migrate.
4. Execute `prisma/postgresql/rls.sql`.
5. Configure `DATABASE_PROVIDER="postgresql"`.
6. Execute as operações dentro do contexto de `src/lib/tenant-context.ts`.

O script ativa e força RLS nas tabelas, aplica políticas `USING` e
`WITH CHECK`, e usa `app.current_tenant_id` definido pelo servidor. A role do
banco usada pela aplicação não deve ser superusuária nem possuir `BYPASSRLS`.

Nunca aceite o `tenantId` diretamente do navegador como fonte de autorização.
O tenant confiável deve vir da sessão validada no servidor.

## Arquitetura recomendada para produção

Para publicar o sistema, use PostgreSQL gerenciado no lugar do SQLite. As
opções mais simples para este projeto são Neon ou Supabase; para uma operação
maior e com equipe de infraestrutura, AWS RDS também é uma boa opção.

O projeto Next.js está na raiz deste repositório para que a Vercel detecte o
framework automaticamente. O script `postinstall` gera o Prisma Client durante
cada instalação limpa e o comando de build repete essa geração por segurança.

O SQLite local não deve ser usado como banco persistente na Vercel. As funções
da plataforma possuem filesystem somente leitura, com `/tmp` temporário, e os
dados seriam perdidos ou ficariam inconsistentes entre execuções. Configure um
PostgreSQL antes de disponibilizar cadastros reais.

Uma composição prática:

1. Hospede o Next.js na Vercel.
2. Use PostgreSQL no Neon ou Supabase, na mesma região da aplicação.
3. Execute migrations do Prisma no processo de deploy, nunca o seed de demonstração.
4. Aplique `prisma/postgresql/rls.sql` com uma role administrativa separada.
5. Armazene fotos em um serviço de objetos, como Supabase Storage, Amazon S3 ou Cloudflare R2.
6. Configure domínio HTTPS, variáveis de ambiente, logs, monitoramento e alertas.
7. Ative backups automáticos e teste periodicamente a restauração.

Antes do primeiro deploy, todas as consultas operacionais devem passar pelo
contexto RLS de `src/lib/tenant-context.ts`. O código atual já filtra tenants na
aplicação e inclui as políticas PostgreSQL, mas essa integração deve ser
validada integralmente no banco escolhido antes de receber dados reais.

Para uma primeira produção com baixo custo, a combinação recomendada é
**Vercel + Neon PostgreSQL + Cloudflare R2**. Supabase pode substituir Neon e o
armazenamento em uma única plataforma caso seja preferível centralizar os
serviços.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o Next.js em modo de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm start` | Executa o build de produção |
| `npm run lint` | Verifica o código com ESLint |
| `npm run setup` | Gera o Prisma Client, inicializa o SQLite e executa o seed |
| `npm run db:generate` | Gera novamente o Prisma Client |
| `npm run db:push` | Inicializa as tabelas SQLite do MVP |
| `npm run db:seed` | Restaura os dados de demonstração |
| `npm run db:studio` | Abre o Prisma Studio |

O comando `npm run setup` pode ser executado novamente para restaurar a base de demonstração. O seed remove os registros atuais antes de recriar os dados iniciais.

## Banco de dados

O arquivo do banco é criado em:

```text
prisma/dev.db
```

O modelo principal está em `prisma/schema.prisma`. A inicialização idempotente fica em `prisma/init.sql` e é executada por `prisma/init-db.ts`. Essa estratégia evita falhas do mecanismo nativo de migração que podem ocorrer em algumas instalações do Windows dentro de pastas sincronizadas pelo OneDrive.

Ao evoluir o modelo, atualize o schema Prisma e crie uma migração correspondente antes de usar dados de produção.

## Regras implementadas

### Produtividade

O cálculo está em `src/lib/agriculture.ts`. O MVP usa espaçamento padrão de 0,50 m entre linhas:

```text
plantas/ha = plantas por metro × 10.000 ÷ 0,50
kg/ha = grãos/ha × PMG ÷ 1.000.000
sacas/ha = kg/ha ÷ 60
```

### Vazio sanitário

Para fazendas com região `GO`, o início de novos ciclos fica bloqueado entre junho e setembro. A regra está isolada em `validateSanitaryBreak`.

### Funcionamento offline

Quando o navegador está sem conexão, vistorias, ocorrências e fotos são colocadas em uma fila no `localStorage`. O indicador no topo mostra a situação da conexão e a quantidade pendente. Ao receber o evento `online`, o sistema tenta sincronizar a fila.

Para testar:

1. Entre com o usuário agrônomo.
2. Abra as ferramentas do navegador e ative o modo offline.
3. Registre uma vistoria ou ocorrência.
4. Volte ao modo online.
5. Aguarde a sincronização automática e atualize a listagem.

## Estrutura principal

```text
prisma/
  schema.prisma       Modelos do banco
  init.sql            Estrutura inicial do SQLite
  init-db.ts          Inicializador idempotente
  seed.ts             Dados de demonstração
src/
  app/
    (app)/            Telas autenticadas
    api/              Rotas de backend
    login/            Tela pública de login
  components/         Componentes, formulários e gráficos
  generated/prisma/   Cliente gerado pelo Prisma
  lib/                Autenticação, acesso, cálculos e fila offline
prisma/postgresql/
  rls.sql             Políticas PostgreSQL de isolamento por tenant
```

## Limitações desta primeira versão

- A criação de usuários é administrativa apenas no nível de MVP.
- Fotos são armazenadas como Data URL no SQLite e limitadas a aproximadamente 1,8 MB.
- A notificação por WhatsApp ou push é simulada no banco e no dashboard.
- A fila offline usa `localStorage`; uma evolução natural é migrá-la para IndexedDB.
- Antes de produção, troque `AUTH_SECRET`, adicione recuperação de senha, auditoria e políticas administrativas mais rígidas.
- O RLS real depende da migração para PostgreSQL; no SQLite o isolamento é realizado pela aplicação.
