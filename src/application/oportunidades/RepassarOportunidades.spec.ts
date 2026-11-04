import { ok, ServicoFalso } from '../../testes';
import { RepassarOportunidades } from './RepassarOportunidades';

const nova = {
  clienteId: 'c1',
  titulo: 'Plano anual',
  valor: 100,
  responsavelId: 'u2',
};

describe('RepassarOportunidades', () => {
  it('aplica o escopo na listagem', async () => {
    const ms = new ServicoFalso(ok({ etapas: [] }));
    await new RepassarOportunidades(ms, new ServicoFalso(ok({}))).executar({
      usuarioId: 'u6',
      metodo: 'GET',
      caminho: '/oportunidades',
      query: { clienteId: 'c1' },
    });
    expect(ms.chamadas[0].query).toEqual({
      clienteId: 'c1',
      responsavelId: 'u6,u7,u8',
    });
  });

  it('em POST confere o cliente antes de criar', async () => {
    const ms = new ServicoFalso(ok({ id: 1 }, 201));
    const clientes = new ServicoFalso(
      ok({ cliente: { id: 'c1', excluido: false } }),
    );

    const resposta = await new RepassarOportunidades(ms, clientes).executar({
      usuarioId: 'u2',
      metodo: 'POST',
      caminho: '/oportunidades',
      query: {},
      corpo: nova,
    });

    expect(clientes.chamadas).toEqual([
      { metodo: 'GET', caminho: '/clientes/c1' },
    ]);
    expect(resposta.status).toBe(201);
    expect(ms.chamadas[0].corpo).toEqual(nova);
  });

  it('cliente inexistente repassa o 404 do MS Clientes e não cria nada', async () => {
    const erro = {
      status: 404,
      codigo: 'NAO_ENCONTRADO',
      erro: 'Cliente não encontrado',
      erros: ['Cliente não encontrado'],
    };
    const ms = new ServicoFalso(ok({}, 201));

    const resposta = await new RepassarOportunidades(
      ms,
      new ServicoFalso(ok(erro, 404)),
    ).executar({
      usuarioId: 'u2',
      metodo: 'POST',
      caminho: '/oportunidades',
      query: {},
      corpo: nova,
    });

    expect(resposta).toEqual({ status: 404, corpo: erro });
    expect(ms.chamadas).toHaveLength(0);
  });

  it('cliente excluído dá 409 CLIENTE_EXCLUIDO', async () => {
    const ms = new ServicoFalso(ok({}, 201));
    const clientes = new ServicoFalso(
      ok({ cliente: { id: 'c1', excluido: true } }),
    );

    const resposta = await new RepassarOportunidades(ms, clientes).executar({
      usuarioId: 'u2',
      metodo: 'POST',
      caminho: '/oportunidades',
      query: {},
      corpo: nova,
    });

    expect(resposta.status).toBe(409);
    expect(resposta.corpo).toMatchObject({ codigo: 'CLIENTE_EXCLUIDO' });
    expect(ms.chamadas).toHaveLength(0);
  });

  it('sem clienteId deixa o MS Oportunidades listar os erros', async () => {
    const erro = {
      status: 400,
      codigo: 'VALIDACAO',
      erro: 'Dados inválidos',
      erros: ['clienteId: não deve estar em branco'],
    };
    const ms = new ServicoFalso(ok(erro, 400));
    const clientes = new ServicoFalso(ok({}));

    const resposta = await new RepassarOportunidades(ms, clientes).executar({
      usuarioId: 'u2',
      metodo: 'POST',
      caminho: '/oportunidades',
      query: {},
      corpo: { titulo: 'A' },
    });

    expect(resposta.status).toBe(400);
    expect(clientes.chamadas).toHaveLength(0);
  });

  it('PATCH, PUT e DELETE passam direto', async () => {
    const ms = new ServicoFalso(ok({ id: 7 }));
    const caso = new RepassarOportunidades(ms, new ServicoFalso(ok({})));
    await caso.executar({
      usuarioId: 'u2',
      metodo: 'PATCH',
      caminho: '/oportunidades/7',
      query: {},
      corpo: { etapa: 'Contato' },
    });
    await caso.executar({
      usuarioId: 'u2',
      metodo: 'DELETE',
      caminho: '/oportunidades/7',
      query: {},
    });
    expect(ms.chamadas.map((c) => c.metodo)).toEqual(['PATCH', 'DELETE']);
  });
});
