import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('📁 Buscando .env en:', path.join(__dirname, '.env'));
console.log('✅ JWT_SECRET cargado:', process.env.JWT_SECRET ? 'Sí' : 'NO');

if (!process.env.PORT) {
  console.warn('⚠️  PORT no definido, usando puerto 3000');
  process.env.PORT = 3000;
}

if (!process.env.NODE_ENV) {
  console.warn('⚠️  NODE_ENV no definido, usando "development"');
  process.env.NODE_ENV = 'development';
}

import { requestLogger, errorHandler } from './src/middleware/auth.js';

// ============ IMPORTAR RUTAS ============
import authRoutes from './src/routes/authRoutes.js';
import productsRoutes from './src/routes/productsRoutes.js';
import inventoryRoutes from './src/routes/inventoryAdjustmentRoutes.js';
import salesRoutes from './src/routes/salesRoutes.js';
import purchasesRoutes from './src/routes/purchasesRoutes.js';
import suppliersRoutes from './src/routes/providersRoutes.js';
import usersRoutes from './src/routes/usersRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';
import settingsRoutes from './src/routes/settingsRoutes.js';
import taxRoutes from './src/routes/taxRoutes.js';

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ============ CONFIGURACIÓN CORS ============
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============ MIDDLEWARE ============
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]'));
app.use(requestLogger);

// ============ REGISTRAR RUTAS ============
const routes = [
  { path: '/api/auth', router: authRoutes, name: 'Auth' },
  { path: '/api/products', router: productsRoutes, name: 'Products' },
  { path: '/api/inventory', router: inventoryRoutes, name: 'Inventory' },
  { path: '/api/sales', router: salesRoutes, name: 'Sales' },
  { path: '/api/purchases', router: purchasesRoutes, name: 'Purchases' },
  { path: '/api/suppliers', router: suppliersRoutes, name: 'Suppliers' },
  { path: '/api/users', router: usersRoutes, name: 'Users' },
  { path: '/api/analytics', router: analyticsRoutes, name: 'Analytics' },
  { path: '/api/settings', router: settingsRoutes, name: 'Settings' },
  { path: '/api/taxes', router: taxRoutes, name: 'Taxes' }
];

routes.forEach(({ path, router, name }) => {
  if (!router) {
    console.error(`❌ Error: Router ${name} no está disponible`);
    process.exit(1);
  }
  app.use(path, router);
  console.log(`✅ Ruta registrada: ${path} (${name})`);
});

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// ============ ERROR HANDLER ============
app.use(errorHandler);

// ============ INICIAR SERVIDOR ============
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR INICIADO EXITOSAMENTE');
  console.log('='.repeat(60));
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔐 CORS: ${CORS_ORIGIN}`);
  console.log(`📅 Hora: ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');
});

// ============ MANEJO DE ERRORES NO CAPTURADOS ============
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION');
  console.error('Error:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n📛 SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Timeout al cerrar servidor');
    process.exit(1);
  }, 30000);
});

export default app;