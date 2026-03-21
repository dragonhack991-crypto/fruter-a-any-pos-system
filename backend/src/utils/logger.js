import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const LogLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const colors = {
  ERROR: '\x1b[31m',    // Rojo
  WARN: '\x1b[33m',     // Amarillo
  INFO: '\x1b[36m',     // Cyan
  DEBUG: '\x1b[35m',    // Magenta
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || LogLevels.INFO;
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  writeToFile(level, message, data = '') {
    const timestamp = this.getTimestamp();
    const logMessage = `[${timestamp}] ${level} - ${message} ${data}\n`;
    const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
    
    fs.appendFileSync(logFile, logMessage);
  }

  log(level, message, data = '') {
    const timestamp = this.getTimestamp();
    const color = colors[level] || colors.INFO;
    
    console.log(`${color}[${timestamp}] ${level}${colors.RESET} - ${message}`, data || '');
    
    // Escribir en archivo
    this.writeToFile(level, message, typeof data === 'object' ? JSON.stringify(data) : data);
  }

  error(message, error = '') {
    this.log(LogLevels.ERROR, message, error);
  }

  warn(message, data = '') {
    this.log(LogLevels.WARN, message, data);
  }

  info(message, data = '') {
    this.log(LogLevels.INFO, message, data);
  }

  debug(message, data = '') {
    if (this.level === LogLevels.DEBUG) {
      this.log(LogLevels.DEBUG, message, data);
    }
  }
}

export default new Logger();