import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { RepassarOportunidades } from '../application/oportunidades/RepassarOportunidades';
import { comandoDe, responder } from './repasse';

@ApiTags('Oportunidades')
@ApiQuery({
  name: 'usuarioId',
  required: true,
  example: 'u1',
  description: 'Usuário logado no Shell (define o escopo, RF15)',
})
@Controller('oportunidades')
export class OportunidadesController {
  constructor(private readonly repassar: RepassarOportunidades) {}

  @Get()
  @ApiOperation({
    summary:
      'Funil com as 4 etapas, quantidade e soma; aplica o escopo (RF08, RF15, RF19)',
  })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({
    name: 'responsavelId',
    required: false,
    description: 'Lista separada por vírgula; 403 se fora do escopo',
  })
  async listar(@Req() req: Request, @Res() res: Response): Promise<void> {
    responder(
      res,
      await this.repassar.executar(comandoDe(req, 'GET', '/oportunidades')),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma oportunidade' })
  async buscar(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(req, 'GET', `/oportunidades/${encodeURIComponent(id)}`),
      ),
    );
  }

  @Post()
  @ApiOperation({
    summary: 'Cria oportunidade; confere antes se o cliente existe (RF07)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      example: {
        clienteId: 'c1',
        titulo: 'Plano anual',
        valor: 18500,
        responsavelId: 'u2',
      },
    },
  })
  async criar(
    @Body() corpo: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(req, 'POST', '/oportunidades', corpo),
      ),
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Edita título, valor, data prevista e responsável (só aberta)',
  })
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
        comandoDe(
          req,
          'PUT',
          `/oportunidades/${encodeURIComponent(id)}`,
          corpo,
        ),
      ),
    );
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Move no funil, fecha (ganho/perdido + motivo) ou reabre (RF09, RF29)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      example: { etapa: 'Fechado', resultado: 'perdido', motivoPerda: 'Preço' },
    },
  })
  async mover(
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
          'PATCH',
          `/oportunidades/${encodeURIComponent(id)}`,
          corpo,
        ),
      ),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Exclui (proibido se fechada como ganha)' })
  async excluir(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    responder(
      res,
      await this.repassar.executar(
        comandoDe(req, 'DELETE', `/oportunidades/${encodeURIComponent(id)}`),
      ),
    );
  }
}
