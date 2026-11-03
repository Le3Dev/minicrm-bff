import type { Request, Response } from 'express';
import { ComandoRepasse, Metodo, RespostaRemota } from '../application/portas';

/** Traduz a requisição do front no comando de repasse: o `usuarioId` sai da query e vai separado. */
export function comandoDe(
  req: Request,
  metodo: Metodo,
  caminho: string,
  corpo?: unknown,
): ComandoRepasse {
  const query: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(req.query)) {
    if (chave === 'usuarioId') continue;
    if (typeof valor === 'string') query[chave] = valor;
    else if (Array.isArray(valor))
      query[chave] = valor
        .filter((v): v is string => typeof v === 'string')
        .join(',');
  }
  const usuarioId =
    typeof req.query.usuarioId === 'string' ? req.query.usuarioId : undefined;
  return { usuarioId, metodo, caminho, query, corpo };
}

/** Devolve ao front o mesmo status e corpo do serviço. */
export function responder(res: Response, r: RespostaRemota): void {
  if (r.status === 204 || r.corpo === null) {
    res.status(r.status).send();
  } else if (typeof r.corpo === 'string') {
    res.status(r.status).type('text/plain').send(r.corpo);
  } else {
    res.status(r.status).json(r.corpo);
  }
}
