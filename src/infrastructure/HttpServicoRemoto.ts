import {
  RequisicaoRemota,
  RespostaRemota,
  ServicoIndisponivelError,
  ServicoRemoto,
} from '../application/portas';

/** Cliente HTTP (fetch) de um serviço remoto, com timeout para absorver o cold start. */
export class HttpServicoRemoto implements ServicoRemoto {
  constructor(
    private readonly nome: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly cabecalhos: Record<string, string> = {},
  ) {}

  async enviar(r: RequisicaoRemota): Promise<RespostaRemota> {
    const query = new URLSearchParams(r.query ?? {}).toString();
    const url = `${this.baseUrl.replace(/\/+$/, '')}${r.caminho}${query ? `?${query}` : ''}`;
    const temCorpo =
      r.corpo !== undefined && r.metodo !== 'GET' && r.metodo !== 'DELETE';
    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: r.metodo,
        headers: {
          accept: 'application/json',
          ...(temCorpo ? { 'content-type': 'application/json' } : {}),
          ...this.cabecalhos,
        },
        body: temCorpo ? JSON.stringify(r.corpo) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (erro) {
      const timeout =
        erro instanceof Error &&
        (erro.name === 'TimeoutError' || erro.name === 'AbortError');
      throw new ServicoIndisponivelError(
        this.nome,
        timeout ? 'timeout' : 'rede',
      );
    }
    const texto = await resposta.text();
    return { status: resposta.status, corpo: interpretar(texto) };
  }
}

function interpretar(texto: string): unknown {
  if (texto === '') return null;
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}
