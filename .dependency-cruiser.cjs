/** Regras de arquitetura do BFF (Clean Architecture): a dependência aponta sempre para dentro. */
module.exports = {
  forbidden: [
    {
      name: 'domain-puro',
      comment: 'domain não importa application, infrastructure, api nem @nestjs/*',
      severity: 'error',
      from: { path: '^src/domain', pathNot: '\\.spec\\.ts$' },
      to: { path: ['^src/(application|infrastructure|api)', '^node_modules/@nestjs'] },
    },
    {
      name: 'application-sem-infra-nem-api',
      comment: 'application não importa infrastructure, api nem @nestjs/*',
      severity: 'error',
      from: { path: '^src/application', pathNot: '\\.spec\\.ts$' },
      to: { path: ['^src/(infrastructure|api)', '^node_modules/@nestjs'] },
    },
    {
      name: 'infrastructure-sem-api',
      comment: 'infrastructure só implementa portas; não conhece a api',
      severity: 'error',
      from: { path: '^src/infrastructure', pathNot: '\\.spec\\.ts$' },
      to: { path: '^src/api' },
    },
    {
      name: 'slices-independentes',
      comment: 'cada caso de uso (vertical slice) só depende de domain e portas, nunca de outra slice',
      severity: 'error',
      from: { path: '^src/application/([^/]+)/', pathNot: '\\.spec\\.ts$' },
      to: { path: '^src/application/([^/]+)/', pathNot: '^src/application/$1/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.spec\\.ts$|src/testes\\.ts$' },
  },
};
