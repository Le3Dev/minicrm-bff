import { UsuarioDesconhecidoError } from './erros';

export type Perfil = 'Admin' | 'Gerente' | 'Vendedor';

export interface Usuario {
  readonly id: string;
  readonly nome: string;
  readonly perfil: Perfil;
  readonly gerenteId: string | null;
}

/** Massa de usuários do Mini-CRM. */
export const USUARIOS: readonly Usuario[] = [
  { id: 'u3', nome: 'Rui Alves', perfil: 'Admin', gerenteId: null },
  { id: 'u1', nome: 'Ana Costa', perfil: 'Gerente', gerenteId: null },
  { id: 'u6', nome: 'Caio Bezerra', perfil: 'Gerente', gerenteId: null },
  { id: 'u2', nome: 'Pedro Dias', perfil: 'Vendedor', gerenteId: 'u1' },
  { id: 'u5', nome: 'Larissa Ferraz', perfil: 'Vendedor', gerenteId: 'u1' },
  { id: 'u4', nome: 'Bia Melo', perfil: 'Vendedor', gerenteId: 'u1' },
  { id: 'u7', nome: 'Otavio Pinto', perfil: 'Vendedor', gerenteId: 'u6' },
  { id: 'u8', nome: 'Marina Rocha', perfil: 'Vendedor', gerenteId: 'u6' },
];

export function buscarUsuario(usuarioId: string): Usuario {
  const usuario = USUARIOS.find((x) => x.id === usuarioId);
  if (!usuario) throw new UsuarioDesconhecidoError(usuarioId);
  return usuario;
}

/** RF15: Admin vê todos; Gerente vê a si e aos vendedores dele; Vendedor só a si. */
export function idsVisiveis(usuarioId: string): string[] {
  const u = buscarUsuario(usuarioId);
  if (u.perfil === 'Admin') return USUARIOS.map((x) => x.id);
  if (u.perfil === 'Gerente') {
    return [
      u.id,
      ...USUARIOS.filter((x) => x.gerenteId === u.id).map((x) => x.id),
    ];
  }
  return [u.id];
}
