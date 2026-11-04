import { ServicoIndisponivelError } from '../portas';
import { ok, ServicoFalso } from '../../testes';
import { ObterDadosAgregados } from './ObterDadosAgregados';

const clientes = ok({
  itens: [
    { id: 'c1', nome: 'Acme', status: 'Ativo', responsavelId: 'u2' },
    { id: 'c2', nome: 'Beta', status: 'Prospect', responsavelId: 'u5' },
  ],
  paginacao: { pagina: 1, porPagina: 200, total: 2, totalPaginas: 1 },
});

const funil = ok({
  etapas: [
    { etapa: 'Prospecção', quantidade: 0, valorTotal: 0, itens: [] },
    {
      etapa: 'Proposta',
      quantidade: 1,
      valorTotal: 7200,
      itens: [
        {
          id: 2,
          clienteId: 'c2',
          etapa: 'Proposta',
          resultado: null,
          motivoPerda: null,
          valor: 7200,
          responsavelId: 'u5',
        },
      ],
    },
    {
      etapa: 'Fechado',
      quantidade: 1,
      valorTotal: 18500,
      itens: [
        {
          id: 1,
          clienteId: 'c1',
          etapa: 'Fechado',
          resultado: 'ganho',
          motivoPerda: null,
          valor: 18500,
          responsavelId: 'u2',
        },
      ],
    },
  ],
});

const indicadores = {
  clientes: { total: 2 },
  oportunidades: { taxaConversao: 1 },
};

describe('ObterDadosAgregados', () => {
  it('junta clientes, funil e indicadores do escopo do Gerente', async () => {
    const ms = new ServicoFalso(clientes);
    const op = new ServicoFalso(funil);
    const funcao = new ServicoFalso(ok(indicadores));

    const dados = await new ObterDadosAgregados(ms, op, funcao).executar('u1');

    expect(dados.usuario).toEqual({
      id: 'u1',
      nome: 'Ana Costa',
      perfil: 'Gerente',
    });
    expect(dados.escopo).toEqual(['u1', 'u2', 'u5', 'u4']);
    expect(dados.clientes.total).toBe(2);
    expect(dados.funil).toHaveLength(3);
    expect(dados.indicadores).toEqual(indicadores);
    expect(dados.falhas).toEqual([]);
    expect(ms.chamadas[0]).toEqual({
      metodo: 'GET',
      caminho: '/clientes',
      query: { responsavelId: 'u1,u2,u5,u4', porPagina: '200' },
    });
    expect(op.chamadas[0].query).toEqual({ responsavelId: 'u1,u2,u5,u4' });
  });

  it('envia à Function só os campos do contrato, com id em texto', async () => {
    const funcao = new ServicoFalso(ok(indicadores));
    await new ObterDadosAgregados(
      new ServicoFalso(clientes),
      new ServicoFalso(funil),
      funcao,
    ).executar('u3');

    expect(funcao.chamadas[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/api/indicadores',
    });
    expect(funcao.chamadas[0].corpo).toEqual({
      clientes: [
        { id: 'c1', status: 'Ativo', responsavelId: 'u2' },
        { id: 'c2', status: 'Prospect', responsavelId: 'u5' },
      ],
      oportunidades: [
        {
          id: '2',
          clienteId: 'c2',
          etapa: 'Proposta',
          resultado: null,
          motivoPerda: null,
          valor: 7200,
          responsavelId: 'u5',
        },
        {
          id: '1',
          clienteId: 'c1',
          etapa: 'Fechado',
          resultado: 'ganho',
          motivoPerda: null,
          valor: 18500,
          responsavelId: 'u2',
        },
      ],
    });
  });

  it('se o MS Oportunidades cai, devolve o resto e lista a falha', async () => {
    const op = new ServicoFalso(() => {
      throw new ServicoIndisponivelError('ms-oportunidades', 'timeout');
    });

    const dados = await new ObterDadosAgregados(
      new ServicoFalso(clientes),
      op,
      new ServicoFalso(ok(indicadores)),
    ).executar('u1');

    expect(dados.falhas).toEqual([
      { servico: 'ms-oportunidades', erro: 'timeout' },
    ]);
    expect(dados.funil).toEqual([]);
    expect(dados.clientes.itens).toHaveLength(2);
    expect(dados.indicadores).toEqual(indicadores);
  });

  it('resposta de erro HTTP de um serviço também vira falha', async () => {
    const dados = await new ObterDadosAgregados(
      new ServicoFalso(ok({}, 500)),
      new ServicoFalso(funil),
      new ServicoFalso(ok(indicadores)),
    ).executar('u3');

    expect(dados.falhas).toEqual([
      { servico: 'ms-clientes', erro: 'HTTP 500' },
    ]);
    expect(dados.clientes).toEqual({ total: 0, itens: [] });
    expect(dados.funil).toHaveLength(3);
  });

  it('se a Function falha, mantém clientes e funil e deixa indicadores vazio', async () => {
    const funcao = new ServicoFalso(ok({ codigo: 'x' }, 401));

    const dados = await new ObterDadosAgregados(
      new ServicoFalso(clientes),
      new ServicoFalso(funil),
      funcao,
    ).executar('u3');

    expect(dados.indicadores).toEqual({});
    expect(dados.falhas).toEqual([{ servico: 'function', erro: 'HTTP 401' }]);
    expect(dados.clientes.total).toBe(2);
  });

  it('exige usuário válido', async () => {
    const caso = new ObterDadosAgregados(
      new ServicoFalso(clientes),
      new ServicoFalso(funil),
      new ServicoFalso(ok({})),
    );
    await expect(caso.executar(undefined)).rejects.toThrow('Dados inválidos');
    await expect(caso.executar('u99')).rejects.toThrow('Usuário desconhecido');
  });
});
