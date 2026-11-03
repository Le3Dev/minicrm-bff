import { escopoDaRequisicao } from '../../domain/escopo';
import {
  ComandoRepasse,
  deuCerto,
  RespostaRemota,
  ServicoRemoto,
} from '../portas';

/**
 * Repasse de /oportunidades/* ao MS Oportunidades. A listagem recebe o escopo (RF15).
 * Em POST, confere antes se o cliente existe: os microsserviços não se chamam, quem orquestra é o BFF.
 */
export class RepassarOportunidades {
  constructor(
    private readonly msOportunidades: ServicoRemoto,
    private readonly msClientes: ServicoRemoto,
  ) {}

  async executar(c: ComandoRepasse): Promise<RespostaRemota> {
    const query = { ...c.query };
    const listagem = c.metodo === 'GET' && c.caminho === '/oportunidades';
    const escopo = escopoDaRequisicao(
      c.usuarioId,
      listagem ? query.responsavelId : undefined,
    );
    if (listagem) query.responsavelId = escopo.join(',');

    if (c.metodo === 'POST' && c.caminho === '/oportunidades') {
      const problema = await this.conferirCliente(c.corpo);
      if (problema) return problema;
    }
    return this.msOportunidades.enviar({
      metodo: c.metodo,
      caminho: c.caminho,
      query,
      corpo: c.corpo,
    });
  }

  /** Devolve a resposta de erro a repassar, ou nulo se o cliente existe e não foi excluído. */
  private async conferirCliente(
    corpo: unknown,
  ): Promise<RespostaRemota | null> {
    const clienteId = (corpo as { clienteId?: unknown } | null)?.clienteId;
    if (typeof clienteId !== 'string' || clienteId.trim() === '') return null; // o MS valida e lista os erros
    const resposta = await this.msClientes.enviar({
      metodo: 'GET',
      caminho: `/clientes/${encodeURIComponent(clienteId.trim())}`,
    });
    if (!deuCerto(resposta)) return resposta;
    const detalhe = resposta.corpo as {
      cliente?: { excluido?: boolean };
      excluido?: boolean;
    } | null;
    if (detalhe?.cliente?.excluido === true || detalhe?.excluido === true) {
      return {
        status: 409,
        corpo: {
          status: 409,
          codigo: 'CLIENTE_EXCLUIDO',
          erro: 'Cliente excluído não pode receber oportunidades',
          erros: ['clienteId: cliente excluído'],
        },
      };
    }
    return null;
  }
}
