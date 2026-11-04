import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RepassarClientes } from '../application/clientes/RepassarClientes';
import { comandoDe, responder } from './repasse';

@ApiTags('Clientes')
@ApiQuery({
  name: 'usuarioId',
  required: true,
  example: 'u1',
  description: 'Usuário logado no Shell (define o escopo, RF15)',
})
@Controller('clientes')
export class ClientesController {
  constructor(private readonly repassar: RepassarClientes) {}

  @Get()
  @ApiOperation({
    summary:
      'Pesquisa clientes; aplica o escopo do usuário em responsavelId (RF15)',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({
    name: 'responsavelId',
    required: false,
    description: 'Lista separada por vírgula; 403 se fora do escopo',
  })
  @ApiQuery({ name: 'pagina', required: false })
  async listar(@Req() req: Request, @Res() res: Response): Promise<void> {
    responder(
      res,
      await this.repassar.executar(comandoDe(req, 'GET', '/clientes')),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do cliente com interações' })
  async buscar(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(req, 'GET', `/clientes/${encodeURIComponent(id)}`),
      ),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra cliente (nasce Prospect)' })
  @ApiBody({
    schema: {
      type: 'object',
      example: {
        nome: 'Ana Souza',
        empresa: 'Acme',
        email: 'ana@acme.com',
        responsavelId: 'u2',
      },
    },
  })
  async cadastrar(
    @Body() corpo: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(comandoDe(req, 'POST', '/clientes', corpo)),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Altera cliente ou transfere o responsável' })
  @ApiBody({ schema: { type: 'object' } })
  async atualizar(
    @Param('id') id: string,
    @Body() corpo: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(req, 'PATCH', `/clientes/${encodeURIComponent(id)}`, corpo),
      ),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclusão lógica' })
  async excluir(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(req, 'DELETE', `/clientes/${encodeURIComponent(id)}`),
      ),
    );
  }

  @Post(':id/interacoes')
  @ApiOperation({ summary: 'Registra interação (Ligação, E-mail ou Reunião)' })
  @ApiBody({
    schema: {
      type: 'object',
      example: { tipo: 'Ligação', observacao: 'Primeiro contato' },
    },
  })
  async registrarInteracao(
    @Param('id') id: string,
    @Body() corpo: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(
          req,
          'POST',
          `/clientes/${encodeURIComponent(id)}/interacoes`,
          corpo,
        ),
      ),
    );
  }
}
