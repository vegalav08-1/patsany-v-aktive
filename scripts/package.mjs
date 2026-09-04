import { readdir, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve('dist');
async function inspect(dir) {
  let bytes = 0;
  for (const name of await readdir(dir)) {
    const path = `${dir}/${name}`, info = await stat(path);
    if (info.isDirectory()) bytes += await inspect(path);
    else {
      if (/friends\.jpg|\.map$|\.env|\.ts$|package-lock|node_modules/.test(path)) throw new Error(`Unexpected release file: ${path}`);
      bytes += info.size;
    }
  }
  return bytes;
}
const bytes = await inspect(root);
if (bytes > 5 * 1024 * 1024) throw new Error('Production assets exceed 5 MiB');
await writeFile(`${root}/.nojekyll`, '');
execFileSync('/usr/bin/zip', ['-q', '-r', '-FS', resolve('business-game-dist.zip'), '.'], { cwd: root });
console.log(`business-game-dist.zip ready; uncompressed website: ${bytes.toLocaleString('ru-RU')} bytes`);
