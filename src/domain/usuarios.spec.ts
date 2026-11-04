import { escopoDaRequisicao } from './escopo';
import {
  ForaDoEscopoError,
  UsuarioDesconhecidoError,
  UsuarioIdAusenteError,
} from './erros';
import { idsVisiveis, USUARIOS } from './usuarios';

describe('idsVisiveis (RF15)', () => {
  it('Admin vê todos os usuários', () => {
    expect(idsVisiveis('u3').sort()).toEqual(USUARIOS.map((u) => u.id).sort());
  });

  it('Gerente vê a si e aos vendedores dele', () => {
    expect(idsVisiveis('u1').sort()).toEqual(['u1', 'u2', 'u4', 'u5']);
    expect(idsVisiveis('u6').sort()).toEqual(['u6', 'u7', 'u8']);
  });

  it('Vendedor vê só a si', () => {
    expect(idsVisiveis('u2')).toEqual(['u2']);
  });

  it('usuário desconhecido é recusado', () => {
    expect(() => idsVisiveis('u99')).toThrow(UsuarioDesconhecidoError);
  });
});

describe('escopoDaRequisicao', () => {
  it('sem responsável pedido devolve o escopo inteiro', () => {
    expect(escopoDaRequisicao('u1').sort()).toEqual(['u1', 'u2', 'u4', 'u5']);
  });

  it('com responsáveis dentro do escopo devolve só eles', () => {
    expect(escopoDaRequisicao('u1', 'u2, u5')).toEqual(['u2', 'u5']);
  });

  it('responsável fora do escopo dá 403', () => {
    expect(() => escopoDaRequisicao('u2', 'u5')).toThrow(ForaDoEscopoError);
    expect(() => escopoDaRequisicao('u1', 'u2,u7')).toThrow(ForaDoEscopoError);
  });

  it('exige usuarioId', () => {
    expect(() => escopoDaRequisicao(undefined)).toThrow(UsuarioIdAusenteError);
    expect(() => escopoDaRequisicao('  ')).toThrow(UsuarioIdAusenteError);
  });
});
