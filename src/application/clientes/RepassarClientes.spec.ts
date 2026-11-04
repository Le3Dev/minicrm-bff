import { ForaDoEscopoError, UsuarioIdAusenteError } from '../../domain/erros';
import { ok, ServicoFalso } from '../../testes';
import { RepassarClientes } from './RepassarClientes';

describe('RepassarClientes', () => {
  it('aplica o escopo do Gerente em responsavelId na listagem e repassa a resposta', async () => {
    const ms = new ServicoFalso(ok({ itens: [] }));
    const resposta = await new RepassarClientes(ms).executar({
      usuarioId: 'u1',
      metodo: 'GET',
      caminho: '/clientes',
      query: { q: 'acme', pagina: '2' },
    });

    expect(resposta).toEqual(ok({ itens: [] }));
    expect(ms.chamadas[0].query).toEqual({
      q: 'acme',
      pagina: '2',
      responsavelId: 'u1,u2,u5,u4',
    });
  });

  it('Vendedor só enxerga a si mesmo', async () => {
    const ms = new ServicoFalso(ok({}));
    await new RepassarClientes(ms).executar({
      usuarioId: 'u2',
      metodo: 'GET',
      caminho: '/clientes',
      query: {},
    });
    expect(ms.chamadas[0].query).toEqual({ responsavelId: 'u2' });
  });

  it('pedir responsável fora do escopo dá 403 sem chamar o serviço', async () => {
    const ms = new ServicoFalso(ok({}));
    await expect(
      new RepassarClientes(ms).executar({
        usuarioId: 'u2',
        metodo: 'GET',
        caminho: '/clientes',
        query: { responsavelId: 'u5' },
      }),
    ).rejects.toThrow(ForaDoEscopoError);
    expect(ms.chamadas).toHaveLength(0);
  });

  it('repassa corpo, status e erro sem alterar', async () => {
    const erro = {
      status: 400,
      codigo: 'VALIDACAO',
      erro: 'Dados inválidos',
      erros: ['nome: curto'],
    };
    const ms = new ServicoFalso(ok(erro, 400));
    const resposta = await new RepassarClientes(ms).executar({
      usuarioId: 'u2',
      metodo: 'POST',
      caminho: '/clientes',
      query: {},
      corpo: { nome: 'A' },
    });

    expect(resposta).toEqual({ status: 400, corpo: erro });
    expect(ms.chamadas[0]).toMatchObject({
      metodo: 'POST',
      caminho: '/clientes',
      corpo: { nome: 'A' },
    });
  });

  it('exige usuarioId em todas as rotas', async () => {
    await expect(
      new RepassarClientes(new ServicoFalso(ok({}))).executar({
        metodo: 'GET',
        caminho: '/clientes/c1',
        query: {},
      }),
    ).rejects.toThrow(UsuarioIdAusenteError);
  });
});
