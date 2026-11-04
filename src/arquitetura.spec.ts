import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** Teste de arquitetura: dependency-cruiser confere as regras de .dependency-cruiser.cjs. */
describe('arquitetura (dependency-cruiser)', () => {
  const raiz = join(__dirname, '..');
  const depcruise = join(
    raiz,
    'node_modules',
    'dependency-cruiser',
    'bin',
    'dependency-cruiser.mjs',
  );

  it('domain e application não importam infrastructure, api nem @nestjs/*', () => {
    const r = spawnSync(
      process.execPath,
      [
        depcruise,
        'src',
        '--config',
        '.dependency-cruiser.cjs',
        '--output-type',
        'err',
      ],
      {
        cwd: raiz,
        encoding: 'utf8',
      },
    );
    expect(r.stdout + r.stderr).not.toMatch(/error/i);
    expect(r.status).toBe(0);
  });
});
