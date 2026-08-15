# Finanfi

Aplicação de controle financeiro pessoal e de ganhos como motorista de aplicativo. A Fase 1 entrega autenticação, dashboard e CRUD de receitas e despesas com persistência em PostgreSQL.

## Arquitetura

- **Interface e API:** Next.js 15, React e TypeScript, organizados em App Router, componentes e bibliotecas.
- **Banco:** PostgreSQL 17, acessado exclusivamente pelo Prisma ORM.
- **Autenticação:** credenciais com hash bcrypt e sessão JWT em cookie `httpOnly`; toda consulta é limitada ao usuário autenticado.
- **Infraestrutura:** aplicação e banco em containers distintos, rede interna e volume nomeado persistente.
- **Inicialização:** o healthcheck libera a aplicação somente quando o banco está pronto; o entrypoint executa `prisma migrate deploy` antes do servidor.

## Estrutura

```text
app/                    páginas e rotas HTTP
components/             componentes reutilizáveis
lib/                    autenticação, banco e formatadores
prisma/                 schema e migrations versionadas
public/                 arquivos públicos
Dockerfile              build multi-stage de produção
docker-compose.yml      aplicação e PostgreSQL
docker-compose.dev.yml  sobreposição para hot reload
```

## Modelagem

O banco já reserva entidades para a evolução planejada: `User`, `Category`, `Transaction`, `Bill`, `Vehicle`, `Journey`, `JourneyCost`, `Fueling`, `Goal`, `Vault` e `Setting`. As relações possuem exclusão em cascata por proprietário e os lançamentos têm índice por usuário, data e tipo.

## Início rápido (produção)

Copie as variáveis e troque a senha e a chave de autenticação:

```bash
cp .env.example .env
docker compose up -d --build
```

Acesse [http://localhost:3100](http://localhost:3100). Nenhuma dependência precisa ser instalada fora dos containers. A porta externa pode ser alterada pela variável `APP_PORT` no arquivo `.env`.

## Desenvolvimento com hot reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

O diretório do projeto é montado no container; mudanças no código são refletidas pelo servidor de desenvolvimento. Dependências e arquivos de build permanecem em volumes Docker.

## Comandos úteis

```bash
docker compose logs -f
docker compose down
docker compose restart
docker compose exec app sh
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma studio --hostname 0.0.0.0
```

`docker compose down` preserva `postgres_data`. Para apagar deliberadamente todos os dados, use `docker compose down -v`.

## Fases seguintes

1. **Fase 2:** contas recorrentes e metas financeiras.
2. **Fase 3:** jornadas, ganhos por aplicativo, custos e abastecimentos.
3. **Fase 4:** relatórios, projeções e cálculo de custo real por quilômetro.
