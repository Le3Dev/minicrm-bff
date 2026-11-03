import { escopoDaRequisicao } from '../../domain/escopo';
import { buscarUsuario } from '../../domain/usuarios';
import {
  deuCerto,
  RespostaRemota,
  ServicoIndisponivelError,
  ServicoRemoto,
} from '../portas';

export interface Falha {
  servico: string;
  erro: string;
}

export interface DadosAgregados {
  usuario: { id: string; nome: string; perfil: string };
  escopo: string[];
  clientes: { total: number; itens: unknown[] };
  funil: unknown[];
  indicadores: unknown;
  falhas: Falha[];
}

interface ClienteRemoto {
  id: string;
  status: string;
  responsavelId?: string;
}

interface OportunidadeRemota {
  id: number | string;
  clienteId?: string;
  etapa: string;
  resultado?: string | null;
  motivoPerda?: string | null;
  valor: number;
  responsavelId?: string;
}

interface ColunaFunil {
  itens?: OportunidadeRemota[];
}

/**
 * GET /aggregated-data: junta clientes, funil e indicadores do escopo do usuário.
 * Usa Promise.allSettled: se um serviço falha, devolve o resto e lista a falha em `falhas`.
 */
export class ObterDadosAgregados {
  constructor(
    private readonly msClientes: ServicoRemoto,
    private readonly msOportunidades: ServicoRemoto,
    private readonly funcao: ServicoRemoto,
  ) {}

  async executar(usuarioId: string | undefined): Promise<DadosAgregados> {
    const ids = escopoDaRequisicao(usuarioId);
    const usuario = buscarUsuario(usuarioId!.trim());
    const responsavelId = ids.join(',');
    const falhas: Falha[] = [];

    const [clientesRes, oportunidadesRes] = await Promise.allSettled([
      this.msClientes.enviar({
        metodo: 'GET',
        caminho: '/clientes',
        query: { responsavelId, porPagina: '200' },
      }),
      this.msOportunidades.enviar({
        metodo: 'GET',
        caminho: '/oportunidades',
        query: { responsavelId },
      }),
    ]);

    const clientes = this.extrair('ms-clientes', clientesRes, falhas) as
      { itens?: ClienteRemoto[]; paginacao?: { total?: number } } | undefined;
    const funil = this.extrair('ms-oportunidades', oportunidadesRes, falhas) as
      { etapas?: ColunaFunil[] } | undefined;

    const itensClientes = clientes?.itens ?? [];
    const colunas = funil?.etapas ?? [];
    const oportunidades = colunas.flatMap((coluna) => coluna.itens ?? []);

    const indicadores = await this.calcularIndicadores(
      itensClientes,
      oportunidades,
      falhas,
    );

    return {
      usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      escopo: ids,
      clientes: {
        total: clientes?.paginacao?.total ?? itensClientes.length,
        itens: itensClientes,
      },
      funil: colunas,
      indicadores,
      falhas,
    };
  }

  private async calcularIndicadores(
    clientes: ClienteRemoto[],
    oportunidades: OportunidadeRemota[],
    falhas: Falha[],
  ): Promise<unknown> {
    const corpo = {
      clientes: clientes.map((c) => ({
        id: c.id,
        status: c.status,
        responsavelId: c.responsavelId,
      })),
      oportunidades: oportunidades.map((o) => ({
        id: String(o.id),
        clienteId: o.clienteId,
        etapa: o.etapa,
        resultado: o.resultado ?? null,
        motivoPerda: o.motivoPerda ?? null,
        valor: o.valor,
        responsavelId: o.responsavelId,
      })),
    };
    const [resultado] = await Promise.allSettled([
      this.funcao.enviar({
        metodo: 'POST',
        caminho: '/api/indicadores',
        corpo,
      }),
    ]);
    return this.extrair('function', resultado, falhas) ?? {};
  }

  /** Devolve o corpo se o serviço respondeu 2xx; senão registra a falha e devolve nulo. */
  private extrair(
    servico: string,
    resultado: PromiseSettledResult<RespostaRemota>,
    falhas: Falha[],
  ): unknown {
    if (resultado.status === 'rejected') {
      const motivo: unknown = resultado.reason;
      const erro =
        motivo instanceof ServicoIndisponivelError
          ? motivo.motivo
          : motivo instanceof Error
            ? motivo.message
            : String(motivo);
      falhas.push({ servico, erro });
      return undefined;
    }
    if (!deuCerto(resultado.value)) {
      falhas.push({ servico, erro: `HTTP ${resultado.value.status}` });
      return undefined;
    }
    return resultado.value.corpo;
  }
}
