# BFF — Mini CRM

> Parte do sistema **Mini CRM (PJBL)**. Arquitetura (C4, Canvas, ARC42), frontends, infra e links de todos os repositórios: [Le3Dev/minicrm-arquitetura](https://github.com/Le3Dev/minicrm-arquitetura).

**Backend for Frontend** em **Node.js (NestJS)**: a única porta de entrada dos frontends. O AWS API Gateway encaminha tudo para cá, e o BFF orquestra o MS Clientes, o MS Oportunidades e a Azure Function.

> **Situação:** pronto: rotas de repasse, `GET /aggregated-data`, escopo RF15, Swagger, testes unitários e de arquitetura, Dockerfile.

| | URL |
| --- | --- |
| API na nuvem | `https://<bff>.azurecontainerapps.io` |
| Swagger | `https://<bff>.azurecontainerapps.io/docs` |
| Imagem Docker | `docker.io/leandrocanha/minicrm-bff:latest` |

## Onde ele fica na solução

```
Shell + MFs → AWS API Gateway → BFF ─┬→ MS Clientes (MongoDB Atlas)
                                     ├→ MS Oportunidades (Azure SQL)
                                     └→ Azure Function (POST /api/indicadores)
```

## O que ele precisa fazer

| Rota | Encaminha para | Observação |
| --- | --- | --- |
| `GET /aggregated-data?usuarioId=` | MS Clientes + MS Oportunidades + Function | Rota exigida pelo enunciado: junta tudo para o dashboard; `Promise.allSettled` e lista de falhas em vez de erro 500 |
| `GET/POST /clientes`, `GET/PATCH/DELETE /clientes/{id}`, `POST /clientes/{id}/interacoes` | MS Clientes | Contrato usado pelo MF Clientes (já pronto) |
| `/oportunidades/*` | MS Oportunidades | Em `POST`, conferir antes que o cliente existe |

Toda rota recebe `?usuarioId=`. O BFF calcula os responsáveis visíveis (RF15: Admin vê todos, Gerente vê a si e aos vendedores dele, Vendedor só a si) e manda a lista em `responsavelId=` ao microsserviço.

Contratos dos serviços chamados:

- MS Clientes: Swagger em `/docs` — [minicrm-ms-clientes](https://github.com/Le3Dev/minicrm-ms-clientes)
- MS Oportunidades: Swagger em `/docs` — [minicrm-ms-oportunidades](https://github.com/Le3Dev/minicrm-ms-oportunidades)
- Function: [`openapi.yaml`](https://github.com/Le3Dev/minicrm-function/blob/main/src/main/resources/docs/openapi.yaml) (header `x-functions-key`)

## Arquitetura do código

**Clean Architecture** com a camada de aplicação em **vertical slices** (um pacote por caso de uso):

```
src/
├── domain/          regras puras: usuários e escopo (RF15), erros no formato dos microsserviços
├── application/     uma pasta por caso de uso + portas (ServicoRemoto)
│   ├── clientes/          RepassarClientes
│   ├── oportunidades/     RepassarOportunidades (confere o cliente antes do POST)
│   └── aggregated-data/   ObterDadosAgregados (Promise.allSettled + lista de falhas)
├── infrastructure/  HttpServicoRemoto (fetch com timeout) e leitura das variáveis de ambiente
└── api/             controllers NestJS, filtro de erros, Swagger em /docs
```

Regras conferidas pelo **dependency-cruiser** (`.dependency-cruiser.cjs`, executado dentro do `npm test`, em `src/arquitetura.spec.ts`):

- `domain` não importa `application`, `infrastructure`, `api` nem `@nestjs/*`.
- `application` não importa `infrastructure`, `api` nem `@nestjs/*`.
- `infrastructure` não conhece a `api`; uma slice não depende de outra.

`app.module.ts` é a raiz de composição: liga as portas aos clientes HTTP.

## Como funciona

- Toda rota exige `?usuarioId=` (usuário logado no Shell). Sem ele: `400`; usuário fora da massa: `403`.
- **Escopo (RF15):** Admin vê todos, Gerente vê a si e aos vendedores dele, Vendedor só a si. Nas listagens o BFF manda esse escopo em `responsavelId=`; pedir um responsável fora dele dá `403 FORA_DO_ESCOPO`.
- **Repasse:** corpo, status e erro do microsserviço voltam sem alteração (`{status, codigo, erro, erros[]}`), porque o MF mostra `erros[]` campo a campo.
- `POST /oportunidades` confere antes `GET /clientes/{id}` no MS Clientes; cliente inexistente repassa o `404` e cliente excluído dá `409 CLIENTE_EXCLUIDO`.
- `GET /aggregated-data` busca clientes (`porPagina=200`) e funil em paralelo, manda o resultado a `POST /api/indicadores` da Function (header `x-functions-key`) e devolve `{usuario, escopo, clientes, funil, indicadores, falhas[]}`. Serviço fora do ar ou lento (timeout de 10 s) vira item de `falhas`, não erro 500.
- Serviço fora do ar nas rotas de repasse: `504` (timeout) ou `502` (rede), `codigo: SERVICO_INDISPONIVEL`.

## Rodar localmente

Pré-requisito: Node.js 22.

```bash
cp .env.example .env
npm ci
npm run start:dev      # http://localhost:3000/docs
npm test               # unitários, API (supertest) e arquitetura
npm run build
```

## Variáveis de ambiente

| Variável | Local | Nuvem |
| --- | --- | --- |
| `PORT` | `3000` | `3000` |
| `MS_CLIENTES_URL` | `http://localhost:8080` | URL do MS Clientes |
| `MS_OPORTUNIDADES_URL` | `http://localhost:8081` | URL do MS Oportunidades |
| `FUNCTION_URL` | `http://localhost:7071` | URL da Function App |
| `FUNCTION_KEY` | vazio | chave da Function (segredo) |
| `CORS_ORIGENS` | `http://localhost:5000` | URL do Shell na Vercel (lista separada por vírgula) |
| `TIMEOUT_MS` | `10000` | `10000` (absorve o cold start) |

## CI e Docker Hub

`.github/workflows/ci.yml` roda `npm ci`, `npm test` e `npm run build` em cada push (assim que existir `package.json`). Numa tag `v*` (ex.: `v1.0.0`) publica `leandrocanha/minicrm-bff` no Docker Hub (secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`).

## Alunos

Pedro Henrique Z. Costa · Lincoln Neto · Nicolas Tancon · Leandro Canha
