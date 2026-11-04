export type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequisicaoRemota {
  metodo: Metodo;
  caminho: string;
  query?: Record<string, string>;
  corpo?: unknown;
}

export interface RespostaRemota {
  status: number;
  corpo: unknown;
}

/** Cliente HTTP de um serviço chamado pelo BFF (MS Clientes, MS Oportunidades ou Function). */
export interface ServicoRemoto {
  enviar(requisicao: RequisicaoRemota): Promise<RespostaRemota>;
}

/** Lançada pela infraestrutura quando o serviço não responde (rede ou timeout). */
export class ServicoIndisponivelError extends Error {
  constructor(
    readonly servico: string,
    readonly motivo: 'timeout' | 'rede',
  ) {
    super(`${servico}: ${motivo}`);
  }
}

export const MS_CLIENTES = 'MS_CLIENTES';
export const MS_OPORTUNIDADES = 'MS_OPORTUNIDADES';
export const FUNCTION_INDICADORES = 'FUNCTION_INDICADORES';

export const deuCerto = (r: RespostaRemota): boolean =>
  r.status >= 200 && r.status < 300;

/** Pedido já traduzido do HTTP do front: `query` sem o `usuarioId`, que vai separado. */
export interface ComandoRepasse {
  usuarioId?: string;
  metodo: Metodo;
  caminho: string;
  query: Record<string, string>;
  corpo?: unknown;
}
