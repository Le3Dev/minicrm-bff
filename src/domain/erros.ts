/** Erro de regra do BFF, no mesmo formato dos microsserviços: { status, codigo, erro, erros[] }. */
export class ErroDominio extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly erros: string[] = [mensagem],
  ) {
    super(mensagem);
  }
}

export class UsuarioIdAusenteError extends ErroDominio {
  constructor() {
    super(400, 'VALIDACAO', 'Dados inválidos', ['usuarioId: obrigatório']);
  }
}

export class UsuarioDesconhecidoError extends ErroDominio {
  constructor(usuarioId: string) {
    super(403, 'USUARIO_DESCONHECIDO', `Usuário desconhecido: ${usuarioId}`);
  }
}

export class ForaDoEscopoError extends ErroDominio {
  constructor(responsaveis: string[]) {
    super(
      403,
      'FORA_DO_ESCOPO',
      'Responsável fora do escopo do usuário',
      responsaveis.map((id) => `responsavelId: ${id} está fora do escopo`),
    );
  }
}
