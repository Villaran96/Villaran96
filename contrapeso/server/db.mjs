// Base de datos en un archivo JSON. Suficiente para cientos de suscriptores; para
// miles, cambia este módulo por PostgreSQL manteniendo la misma forma de los datos.

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const EMPTY = () => ({
  users: [],
  sessions: [],
  resets: [],
  contracts: [],
  applications: [],
  userData: {},
  content: null,
  settings: {},
  stripeEvents: [],
});

export async function openDb(dir) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, 'db.json');
  let data;
  try {
    data = { ...EMPTY(), ...JSON.parse(await readFile(file, 'utf8')) };
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error(`No se puede leer ${file}: ${e.message}`);
    data = EMPTY();
  }

  let timer = null;
  let chain = Promise.resolve();

  function flush() {
    clearTimeout(timer);
    timer = null;
    chain = chain.then(async () => {
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(data));
      await rename(tmp, file);
    }).catch((e) => console.error('[db] no se pudo guardar:', e.message));
    return chain;
  }

  function save() {
    clearTimeout(timer);
    timer = setTimeout(flush, 40);
  }

  return { data, save, flush, file };
}
