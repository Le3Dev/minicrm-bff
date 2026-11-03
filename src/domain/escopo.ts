import { ForaDoEscopoError, UsuarioIdAusenteError } from './erros';
import { idsVisiveis } from './usuarios';

/**
 * Responsáveis que a requisição pode enxergar (RF15).
 * Sem `solicitados`, devolve o escopo inteiro; com `solicitados` (lista separada por vírgula),
 * devolve só eles, ou falha com 403 se algum estiver fora do escopo.
 */
export function escopoDaRequisicao(
  usuarioId: string | undefined,
  solicitados?: string,
): string[] {
  if (!usuarioId?.trim()) throw new UsuarioIdAusenteError();
  const visiveis = idsVisiveis(usuarioId.trim());
  const pedidos = (solicitados ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (pedidos.length === 0) return visiveis;
  const fora = pedidos.filter((id) => !visiveis.includes(id));
  if (fora.length > 0) throw new ForaDoEscopoError(fora);
  return pedidos;
}
