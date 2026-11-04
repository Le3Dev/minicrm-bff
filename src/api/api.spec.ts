import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ObterDadosAgregados } from '../application/aggregated-data/ObterDadosAgregados';
import { RepassarClientes } from '../application/clientes/RepassarClientes';
import { RepassarOportunidades } from '../application/oportunidades/RepassarOportunidades';
import { ServicoIndisponivelError } from '../application/portas';
import { ok, ServicoFalso } from '../testes';
import { AggregatedDataController } from './AggregatedDataController';
import { ClientesController } from './ClientesController';
import { ErroFilter } from './ErroFilter';
import { OportunidadesController } from './OportunidadesController';

describe('API do BFF', () => {
  let app: INestApplication;
  let clientes: ServicoFalso;
  let oportunidades: ServicoFalso;
  let funcao: ServicoFalso;

  beforeEach(async () => {
    clientes = new ServicoFalso(ok({ itens: [], paginacao: { total: 0 } }));
    oportunidades = new ServicoFalso(ok({ etapas: [] }));
    funcao = new ServicoFalso(ok({ oportunidades: {} }));
    const modulo = await Test.createTestingModule({
      controllers: [
        ClientesController,
        OportunidadesController,
        AggregatedDataController,
      ],
      providers: [
        { provide: APP_FILTER, useClass: ErroFilter },
        { provide: RepassarClientes, useValue: new RepassarClientes(clientes) },
        {
          provide: RepassarOportunidades,
          useValue: new RepassarOportunidades(oportunidades, clientes),
        },
        {
          provide: ObterDadosAgregados,
          useValue: new ObterDadosAgregados(clientes, oportunidades, funcao),
        },
      ],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  it('GET /clientes aplica o escopo e tira o usuarioId da query repassada', async () => {
    const r = await request(app.getHttpServer()).get(
      '/clientes?usuarioId=u1&q=acme',
    );

    expect(r.status).toBe(200);
    expect(clientes.chamadas[0].query).toEqual({
      q: 'acme',
      responsavelId: 'u1,u2,u5,u4',
    });
  });

  it('repassa o status e o corpo de erro do MS Clientes', async () => {
    const erro = {
      status: 400,
      codigo: 'VALIDACAO',
      erro: 'Dados inválidos',
      erros: ['nome: curto', 'email: inválido'],
    };
    clientes = Object.assign(clientes, {});
    const servico = new ServicoFalso(ok(erro, 400));
    const modulo = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [
        { provide: RepassarClientes, useValue: new RepassarClientes(servico) },
      ],
    }).compile();
    const outro = modulo.createNestApplication();
    await outro.init();

    const r = await request(outro.getHttpServer())
      .post('/clientes?usuarioId=u2')
      .send({ nome: 'A' });

    expect(r.status).toBe(400);
    expect(r.body).toEqual(erro);
    await outro.close();
  });

  it('sem usuarioId responde 400 no formato padrão', async () => {
    const r = await request(app.getHttpServer()).get('/clientes');
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({
      status: 400,
      codigo: 'VALIDACAO',
      erros: ['usuarioId: obrigatório'],
    });
  });

  it('responsável fora do escopo responde 403', async () => {
    const r = await request(app.getHttpServer()).get(
      '/oportunidades?usuarioId=u2&responsavelId=u5',
    );
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe('FORA_DO_ESCOPO');
    expect(oportunidades.chamadas).toHaveLength(0);
  });

  it('DELETE 204 passa sem corpo', async () => {
    clientes = new ServicoFalso(ok(null, 204));
    const modulo = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [
        { provide: RepassarClientes, useValue: new RepassarClientes(clientes) },
      ],
    }).compile();
    const outro = modulo.createNestApplication();
    await outro.init();

    const r = await request(outro.getHttpServer()).delete(
      '/clientes/c1?usuarioId=u2',
    );

    expect(r.status).toBe(204);
    expect(clientes.chamadas[0]).toMatchObject({
      metodo: 'DELETE',
      caminho: '/clientes/c1',
    });
    await outro.close();
  });

  it('serviço fora do ar vira 504 (timeout) ou 502 (rede)', async () => {
    oportunidades = new ServicoFalso(() => {
      throw new ServicoIndisponivelError('ms-oportunidades', 'timeout');
    });
    const modulo = await Test.createTestingModule({
      controllers: [OportunidadesController],
      providers: [
        { provide: APP_FILTER, useClass: ErroFilter },
        {
          provide: RepassarOportunidades,
          useValue: new RepassarOportunidades(oportunidades, clientes),
        },
      ],
    }).compile();
    const outro = modulo.createNestApplication();
    await outro.init();

    const r = await request(outro.getHttpServer()).get(
      '/oportunidades?usuarioId=u3',
    );

    expect(r.status).toBe(504);
    expect(r.body.codigo).toBe('SERVICO_INDISPONIVEL');
    await outro.close();
  });

  it('GET /aggregated-data devolve o consolidado e GET /health responde ok', async () => {
    const r = await request(app.getHttpServer()).get(
      '/aggregated-data?usuarioId=u2',
    );
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      usuario: { id: 'u2' },
      escopo: ['u2'],
      falhas: [],
    });

    const saude = await request(app.getHttpServer()).get('/health');
    expect(saude.body).toEqual({ status: 'ok', servico: 'minicrm-bff' });
  });

  it('PATCH /oportunidades/:id repassa o corpo ao MS Oportunidades', async () => {
    await request(app.getHttpServer())
      .patch('/oportunidades/7?usuarioId=u2')
      .send({ etapa: 'Fechado', resultado: 'perdido', motivoPerda: 'Preço' });
    expect(oportunidades.chamadas[0]).toMatchObject({
      metodo: 'PATCH',
      caminho: '/oportunidades/7',
      corpo: { etapa: 'Fechado', resultado: 'perdido', motivoPerda: 'Preço' },
    });
  });
});
