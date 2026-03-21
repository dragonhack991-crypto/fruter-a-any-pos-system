import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import logger from './src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Validación de variables de entorno
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Variables de entorno faltantes', missingEnvVars.join(', '));
  process.exit(1);
}

logger.info('✅ Variables de entorno validadas correctamente');

// Importar rutas
import { requestLogger, errorHandler } from './src/middleware/auth.js';
import authRoutes from './src/routes/authRoutes.js';
import productsRoutes from './src/routes/productsRoutes.js';
import inventoryRoutes from './src/routes/inventoryRoutes.js';
import salesRoutes from './src/routes/salesRoutes.js';
import purchasesRoutes from './src/routes/purchasesRoutes.js';
import suppliersRoutes from './src/routes/providersRoutes.js';
import usersRoutes from './src/routes/usersRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logger Morgan para HTTP requests
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]'));

// Custom logger
app.use(requestLogger);

// Rutas
const routes = [
  { path: '/api/auth', router: authRoutes, name: 'Auth' },
  { path: '/api/products', router: productsRoutes, name: 'Products' },
  { path: '/api/inventory', router: inventoryRoutes, name: 'Inventory' },
  { path: '/api/sales', router: salesRoutes, name: 'Sales' },
  { path: '/api/purchases', router: purchasesRoutes, name: 'Purchases' },
  { path: '/api/suppliers', router: suppliersRoutes, name: 'Suppliers' },
  { path: '/api/users', router: usersRoutes, name: 'Users' },
  { path: '/api/analytics', router: analyticsRoutes, name: 'Analytics' }
];

routes.forEach(({ path, router, name }) => {
  if (!router) {
    logger.error(`Router ${name} no está disponible`);
    process.exit(1);
  }
  app.use(path, router);
  logger.info(`Ruta registrada: ${path} (${name})`);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info('🚀 SERVIDOR INICIADO EXITOSAMENTE');
  logger.info(`📍 Puerto: ${PORT}`);
  logger.info(`🌍 Environment: ${NODE_ENV}`);
  logger.info(`🔐 CORS: ${CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Timeout al cerrar servidor');
    process.exit(1);
  }, 30000);
});

export default app;