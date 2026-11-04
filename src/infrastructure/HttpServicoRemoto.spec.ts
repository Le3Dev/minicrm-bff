import { ServicoIndisponivelError } from '../application/portas';
import { HttpServicoRemoto } from './HttpServicoRemoto';

describe('HttpServicoRemoto', () => {
  const fetchOriginal = global.fetch;
  afterEach(() => {
    global.fetch = fetchOriginal;
  });

  const resposta = (status: number, corpo: string) =>
    new Response(corpo || null, { status });

  it('monta a URL com query, manda o JSON e o cabeçalho de chave', async () => {
    const fetchFalso = jest.fn().mockResolvedValue(resposta(201, '{"id":1}'));
    global.fetch = fetchFalso;

    const r = await new HttpServicoRemoto('function', 'http://f/', 1000, {
      'x-functions-key': 'segredo',
    }).enviar({
      metodo: 'POST',
      caminho: '/api/indicadores',
      query: { a: '1' },
      corpo: { x: 1 },
    });

    expect(r).toEqual({ status: 201, corpo: { id: 1 } });
    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe('http://f/api/indicadores?a=1');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"x":1}');
    expect(init.headers).toMatchObject({
      'content-type': 'application/json',
      'x-functions-key': 'segredo',
    });
  });

  it('repassa erros HTTP e corpo vazio (204) sem lançar', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(resposta(404, '{"codigo":"NAO_ENCONTRADO"}'))
      .mockResolvedValueOnce(resposta(204, ''));
    const servico = new HttpServicoRemoto('ms', 'http://ms', 1000);

    expect(await servico.enviar({ metodo: 'GET', caminho: '/x' })).toEqual({
      status: 404,
      corpo: { codigo: 'NAO_ENCONTRADO' },
    });
    expect(await servico.enviar({ metodo: 'DELETE', caminho: '/x' })).toEqual({
      status: 204,
      corpo: null,
    });
  });

  it('timeout e falha de rede viram ServicoIndisponivelError', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(timeout)
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    const servico = new HttpServicoRemoto('ms', 'http://ms', 1000);

    await expect(
      servico.enviar({ metodo: 'GET', caminho: '/x' }),
    ).rejects.toMatchObject({ motivo: 'timeout', servico: 'ms' });
    await expect(
      servico.enviar({ metodo: 'GET', caminho: '/x' }),
    ).rejects.toBeInstanceOf(ServicoIndisponivelError);
  });
});
