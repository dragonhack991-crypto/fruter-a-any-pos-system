import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
    if (err) {
      console.error('Token error:', err.message);
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }
    req.user = user;
    console.log('User from token:', user); // Debug
    next();
  });
};

export const authorizeRole = (roles) => {
  return (req, res, next) => {
    console.log('Required roles:', roles);
    console.log('User data:', req.user);
    
    const roleMap = {
      1: 'admin',
      2: 'manager',
      3: 'cashier'
    };

    // El token tiene 'role', no 'role_id'
    const userRole = roleMap[req.user?.role];
    console.log('User role:', userRole);

    if (!roles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Permisos insuficientes' });
    }
    next();
  };
};

export const requestLogger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor'
  });
};