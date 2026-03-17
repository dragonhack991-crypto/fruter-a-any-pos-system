import mysql from 'mysql2/promise.js';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Variables de entorno faltantes: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
  dateStrings: true,
});

if (!pool) {
  console.error('❌ Error al crear pool de base de datos');
  process.exit(1);
}

(async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Base de datos conectada exitosamente');
    
    const [tables] = await connection.query(
      "SELECT COUNT(*) as count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [process.env.DB_NAME]
    );
    
    if (tables[0].count === 0) {
      console.warn('⚠️  ADVERTENCIA: La base de datos está vacía. Por favor ejecute schema.sql');
    } else {
      console.log(`✅ ${tables[0].count} tablas encontradas en la base de datos`);
    }
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.release();
    }
  }
})();

export default pool;