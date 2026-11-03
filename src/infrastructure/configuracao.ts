export interface Configuracao {
  port: number;
  msClientesUrl: string;
  msOportunidadesUrl: string;
  functionUrl: string;
  functionKey: string;
  corsOrigens: string[];
  timeoutMs: number;
}

export function lerConfiguracao(
  env: NodeJS.ProcessEnv = process.env,
): Configuracao {
  return {
    port: Number(env.PORT ?? 3000),
    msClientesUrl: env.MS_CLIENTES_URL ?? 'http://localhost:8080',
    msOportunidadesUrl: env.MS_OPORTUNIDADES_URL ?? 'http://localhost:8081',
    functionUrl: env.FUNCTION_URL ?? 'http://localhost:7071',
    functionKey: env.FUNCTION_KEY ?? '',
    corsOrigens: (env.CORS_ORIGENS ?? 'http://localhost:5000')
      .split(',')
      .map((o) => o.trim())
      .filter((o) => o.length > 0),
    timeoutMs: Number(env.TIMEOUT_MS ?? 10000),
  };
}
