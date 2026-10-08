// check-db.js
import { query, pool } from './db.js';

async function test() {
  try {
    const { rows } = await query('SELECT 1 AS ok, NOW() AS now, current_database() AS db, current_user AS usr');
    console.log('✅ Conexión exitosa');
    console.log(rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('❌ Fallo de conexión:', e.message);
    if (e.code) console.error('Código:', e.code);
    if (e.detail) console.error('Detalle:', e.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();