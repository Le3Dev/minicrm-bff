import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  DadosAgregados,
  ObterDadosAgregados,
} from '../application/aggregated-data/ObterDadosAgregados';

@ApiTags('Dashboard')
@Controller()
export class AggregatedDataController {
  constructor(private readonly obter: ObterDadosAgregados) {}

  @Get('aggregated-data')
  @ApiOperation({
    summary: 'Junta clientes, funil e indicadores do escopo do usuário',
    description:
      'Chama MS Clientes e MS Oportunidades em paralelo e envia o resultado à Function. Se um serviço falhar, devolve o resto e lista a falha em `falhas`.',
  })
  @ApiQuery({ name: 'usuarioId', required: true, example: 'u1' })
  executar(@Query('usuarioId') usuarioId?: string): Promise<DadosAgregados> {
    return this.obter.executar(usuarioId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Verificação de saúde' })
  saude(): { status: string; servico: string } {
    return { status: 'ok', servico: 'minicrm-bff' };
  }
}
