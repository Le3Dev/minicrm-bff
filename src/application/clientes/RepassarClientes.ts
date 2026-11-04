import { escopoDaRequisicao } from '../../domain/escopo';
import { ComandoRepasse, RespostaRemota, ServicoRemoto } from '../portas';

/** Repasse do CRUD de clientes ao MS Clientes. A listagem recebe o escopo do usuário (RF15) em responsavelId. */
export class RepassarClientes {
  constructor(private readonly msClientes: ServicoRemoto) {}

  async executar(c: ComandoRepasse): Promise<RespostaRemota> {
    const query = { ...c.query };
    const listagem = c.metodo === 'GET' && c.caminho === '/clientes';
    const escopo = escopoDaRequisicao(
      c.usuarioId,
      listagem ? query.responsavelId : undefined,
    );
    if (listagem) query.responsavelId = escopo.join(',');
    return this.msClientes.enviar({
      metodo: c.metodo,
      caminho: c.caminho,
      query,
      corpo: c.corpo,
    });
  }
}
