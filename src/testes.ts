import {
  RequisicaoRemota,
  RespostaRemota,
  ServicoRemoto,
} from './application/portas';

/** Serviço falso: registra as chamadas e responde com o que foi programado. */
export class ServicoFalso implements ServicoRemoto {
  readonly chamadas: RequisicaoRemota[] = [];

  constructor(
    private readonly resposta:
      | RespostaRemota
      | ((r: RequisicaoRemota) => RespostaRemota | Promise<RespostaRemota>),
  ) {}

  async enviar(r: RequisicaoRemota): Promise<RespostaRemota> {
    this.chamadas.push(r);
    return typeof this.resposta === 'function'
      ? this.resposta(r)
      : this.resposta;
  }
}

export const ok = (corpo: unknown, status = 200): RespostaRemota => ({
  status,
  corpo,
});
