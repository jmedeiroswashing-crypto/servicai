import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { Request } from 'express';

/**
 * multer's diskStorage({ destination: '<string>' }) chama fs.mkdirSync()
 * direto no próprio construtor, sem try/catch — se isso falhar (filesystem
 * somente leitura em serverless), derruba o bootstrap inteiro do Nest, não só
 * o upload. Usar `destination` como função (em vez de string) evita essa
 * chamada automática: criamos a pasta nós mesmos, protegida, e caímos para a
 * pasta temporária do sistema (sempre gravável, mesmo em serverless) se a
 * pasta preferida não puder ser criada. Em serverless o arquivo ainda some
 * entre requisições de qualquer forma (limitação já documentada), mas pelo
 * menos a API não cai inteira por causa disso.
 */
export function safeDiskDestination(preferredDir: string) {
  return (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    try {
      mkdirSync(preferredDir, { recursive: true });
      cb(null, preferredDir);
    } catch {
      cb(null, tmpdir());
    }
  };
}
