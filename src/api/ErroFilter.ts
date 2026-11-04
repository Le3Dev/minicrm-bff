import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ServicoIndisponivelError } from '../application/portas';
import { ErroDominio } from '../domain/erros';

/** Mesmo formato de erro dos microsserviços: { status, codigo, erro, erros[] }. */
@Catch()
export class ErroFilter implements ExceptionFilter {
  private readonly log = new Logger(ErroFilter.name);

  catch(erro: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (erro instanceof ErroDominio) {
      res.status(erro.status).json({
        status: erro.status,
        codigo: erro.codigo,
        erro: erro.message,
        erros: erro.erros,
      });
    } else if (erro instanceof ServicoIndisponivelError) {
      const status = erro.motivo === 'timeout' ? 504 : 502;
      const mensagem = `Serviço indisponível: ${erro.servico} (${erro.motivo})`;
      res.status(status).json({
        status,
        codigo: 'SERVICO_INDISPONIVEL',
        erro: mensagem,
        erros: [mensagem],
      });
    } else if (erro instanceof HttpException) {
      const status = erro.getStatus();
      res.status(status).json({
        status,
        codigo: 'REQUISICAO_INVALIDA',
        erro: erro.message,
        erros: [erro.message],
      });
    } else {
      this.log.error(erro);
      res.status(500).json({
        status: 500,
        codigo: 'ERRO_INTERNO',
        erro: 'Erro interno',
        erros: ['Erro interno'],
      });
    }
  }
}
