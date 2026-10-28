# BFF — Mini CRM

> Parte do sistema **Mini CRM (PJBL)**. Arquitetura (C4, Canvas, ARC42), frontends, infra e links de todos os repositórios: [Le3Dev/minicrm-arquitetura](https://github.com/Le3Dev/minicrm-arquitetura).

**Backend for Frontend** em **Node.js (NestJS)**: a única porta de entrada dos frontends. O AWS API Gateway encaminha tudo para cá, e o BFF orquestra o MS Clientes, o MS Oportunidades e a Azure Function.

> **Situação:** a fazer (aluno B). O passo a passo completo está no guia da pessoa B; este README é o ponto de partida.

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

## Arquitetura do código (alvo)

```
src/
├── domain/          regras puras: escopo do usuário (RF15), tipos
├── application/     uma pasta por caso de uso (vertical slice) + portas
├── infrastructure/  clientes HTTP para MS Clientes, MS Oportunidades e Function
└── api/             controllers NestJS, Swagger em /docs, tratamento de erro
```

`domain` e `application` não importam NestJS nem `infrastructure`; um teste de arquitetura (dependency-cruiser) cobra isso no `npm test`.

## Variáveis de ambiente

| Variável | Local | Nuvem |
| --- | --- | --- |
| `PORT` | `3000` | `3000` |
| `MS_CLIENTES_URL` | `http://localhost:8080` | URL do MS Clientes |
| `MS_OPORTUNIDADES_URL` | `http://localhost:8081` | URL do MS Oportunidades |
| `FUNCTION_URL` | `http://localhost:7071` | URL da Function App |
| `FUNCTION_KEY` | vazio | chave da Function (segredo) |
| `CORS_ORIGENS` | `http://localhost:5000` | URL do Shell na Vercel |

## CI e Docker Hub

`.github/workflows/ci.yml` roda `npm ci`, `npm test` e `npm run build` em cada push (assim que existir `package.json`). Numa tag `v*` (ex.: `v1.0.0`) publica `leandrocanha/minicrm-bff` no Docker Hub (secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`).

## Alunos

Pedro Henrique Z. Costa · Lincoln Neto · Nicolas Tancon · Leandro Canha
