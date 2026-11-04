import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AggregatedDataController } from './api/AggregatedDataController';
import { ClientesController } from './api/ClientesController';
import { ErroFilter } from './api/ErroFilter';
import { OportunidadesController } from './api/OportunidadesController';
import { ObterDadosAgregados } from './application/aggregated-data/ObterDadosAgregados';
import { RepassarClientes } from './application/clientes/RepassarClientes';
import { RepassarOportunidades } from './application/oportunidades/RepassarOportunidades';
import {
  FUNCTION_INDICADORES,
  MS_CLIENTES,
  MS_OPORTUNIDADES,
  ServicoRemoto,
} from './application/portas';
import { Configuracao, lerConfiguracao } from './infrastructure/configuracao';
import { HttpServicoRemoto } from './infrastructure/HttpServicoRemoto';

const CONFIGURACAO = 'CONFIGURACAO';

/** Raiz de composição: liga as portas da aplicação aos clientes HTTP. */
@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [
    ClientesController,
    OportunidadesController,
    AggregatedDataController,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ErroFilter },
    { provide: CONFIGURACAO, useFactory: () => lerConfiguracao() },
    {
      provide: MS_CLIENTES,
      inject: [CONFIGURACAO],
      useFactory: (c: Configuracao) =>
        new HttpServicoRemoto('ms-clientes', c.msClientesUrl, c.timeoutMs),
    },
    {
      provide: MS_OPORTUNIDADES,
      inject: [CONFIGURACAO],
      useFactory: (c: Configuracao) =>
        new HttpServicoRemoto(
          'ms-oportunidades',
          c.msOportunidadesUrl,
          c.timeoutMs,
        ),
    },
    {
      provide: FUNCTION_INDICADORES,
      inject: [CONFIGURACAO],
      useFactory: (c: Configuracao) =>
        new HttpServicoRemoto(
          'function',
          c.functionUrl,
          c.timeoutMs,
          c.functionKey ? { 'x-functions-key': c.functionKey } : {},
        ),
    },
    {
      provide: RepassarClientes,
      inject: [MS_CLIENTES],
      useFactory: (clientes: ServicoRemoto) => new RepassarClientes(clientes),
    },
    {
      provide: RepassarOportunidades,
      inject: [MS_OPORTUNIDADES, MS_CLIENTES],
      useFactory: (oportunidades: ServicoRemoto, clientes: ServicoRemoto) =>
        new RepassarOportunidades(oportunidades, clientes),
    },
    {
      provide: ObterDadosAgregados,
      inject: [MS_CLIENTES, MS_OPORTUNIDADES, FUNCTION_INDICADORES],
      useFactory: (
        clientes: ServicoRemoto,
        oportunidades: ServicoRemoto,
        funcao: ServicoRemoto,
      ) => new ObterDadosAgregados(clientes, oportunidades, funcao),
    },
  ],
})
export class AppModule {}
