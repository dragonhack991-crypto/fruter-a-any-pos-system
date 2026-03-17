import pool from '../config/database.js';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en .env');
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

function generateToken(userId, role) {
  if (!userId || !role) {
    throw new Error('userId y role son requeridos para generar token');
  }

  try {
    return jwt.sign(
      { id: userId, role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  } catch (error) {
    console.error('Error generando token:', error);
    throw new Error('Error al generar token de autenticación');
  }
}

async function hashPassword(password) {
  if (!password || password.length < 8) {
    throw new Error('Contraseña no válida');
  }

  try {
    return await bcryptjs.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    console.error('Error hasheando contraseña:', error);
    throw new Error('Error al procesar contraseña');
  }
}

async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }

  try {
    return await bcryptjs.compare(password, hash);
  } catch (error) {
    console.error('Error comparando contraseña:', error);
    return false;
  }
}

export const register = async (req, res) => {
  let connection;

  try {
    const { username, email, password, full_name, role_id = 3 } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: username, email, password, full_name'
      });
    }

    if (![1, 2, 3].includes(role_id)) {
      return res.status(400).json({
        success: false,
        error: 'role_id debe ser 1 (admin), 2 (manager) o 3 (cashier)'
      });
    }

    connection = await pool.getConnection();

    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El usuario o email ya está registrado'
      });
    }

    const passwordHash = await hashPassword(password);

    const [result] = await connection.query(
      `INSERT INTO users 
       (username, email, password_hash, full_name, role_id, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, full_name, role_id, 1]
    );

    if (!result || result.affectedRows === 0) {
      throw new Error('No se pudo insertar el usuario');
    }

    const userId = result.insertId;
    const token = generateToken(userId, role_id);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        id: userId,
        username,
        email,
        full_name,
        role_id,
        token
      }
    });

  } catch (error) {
    console.error('Error en register:', error);
    
    const statusCode = error.message.includes('ya existe') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Error al registrar usuario'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const login = async (req, res) => {
  let connection;

  try {
    const { username, password } = req.body;

    console.log('🔍 Login attempt - username:', username);

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username y password son requeridos'
      });
    }

    connection = await pool.getConnection();

    const [users] = await connection.query(
      `SELECT id, username, email, full_name, password_hash, role_id, is_active 
       FROM users 
       WHERE username = ? AND is_active = 1`,
      [username]
    );

    if (!users || users.length === 0) {
      console.log('❌ Usuario no encontrado:', username);
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña incorrecto'
      });
    }

    const user = users[0];
    console.log('✅ Usuario encontrado:', user.username);

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      console.log('❌ Contraseña incorrecta');
      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña incorrecto'
      });
    }

    const token = generateToken(user.id, user.role_id);
    console.log('✅ Token generado para usuario:', user.username);

    try {
      await connection.query(
        'INSERT INTO activity_logs (user_id, action, ip_address) VALUES (?, ?, ?)',
        [user.id, 'login', req.ip || 'unknown']
      );
    } catch (logError) {
      console.warn('⚠️ Error registrando login:', logError.message);
    }

    res.json({
      success: true,
      message: 'Sesión iniciada exitosamente',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role_id: user.role_id
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al iniciar sesión'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const getProfile = async (req, res) => {
  let connection;

  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    connection = await pool.getConnection();

    const [users] = await connection.query(
      `SELECT id, username, email, full_name, role_id, is_active, created_at 
       FROM users 
       WHERE id = ?`,
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener perfil'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const changePassword = async (req, res) => {
  let connection;

  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'currentPassword y newPassword son requeridos'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Nueva contraseña debe tener al menos 8 caracteres'
      });
    }

    connection = await pool.getConnection();

    const [users] = await connection.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const passwordMatch = await comparePassword(currentPassword, users[0].password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecto'
      });
    }

    const newPasswordHash = await hashPassword(newPassword);

    const [result] = await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error('No se pudo actualizar la contraseña');
    }

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error en changePassword:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al cambiar contraseña'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const getAllUsers = async (req, res) => {
  let connection;

  try {
    connection = await pool.getConnection();

    const [users] = await connection.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.is_active, u.created_at, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      users: users || []
    });

  } catch (error) {
    console.error('Error en getAllUsers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener usuarios'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const getUserById = async (req, res) => {
  let connection;

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario requerido'
      });
    }

    connection = await pool.getConnection();

    const [users] = await connection.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.is_active, u.created_at, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: users[0]
    });

  } catch (error) {
    console.error('Error en getUserById:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al obtener usuario'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const updateUser = async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const { full_name, email, role_id, is_active } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario requerido'
      });
    }

    if (!full_name && !email && !role_id && is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Proporciona al menos un campo para actualizar'
      });
    }

    connection = await pool.getConnection();

    let updateFields = [];
    let params = [];

    if (full_name) {
      updateFields.push('full_name = ?');
      params.push(full_name);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (role_id) {
      updateFields.push('role_id = ?');
      params.push(role_id);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    params.push(id);

    const [result] = await connection.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error en updateUser:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al actualizar usuario'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const deleteUser = async (req, res) => {
  let connection;

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario requerido'
      });
    }

    if (req.user?.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propia cuenta'
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.query(
      'UPDATE users SET is_active = FALSE WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });

  } catch (error) {
    console.error('Error en deleteUser:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al eliminar usuario'
    });
  } finally {
    if (connection) {
      try {
        await connection.release();
      } catch (releaseError) {
        console.error('Error liberando conexión:', releaseError);
      }
    }
  }
};

export const refreshToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    const roleId = req.user?.role_id;

    if (!userId || !roleId) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const newToken = generateToken(userId, roleId);

    res.json({
      success: true,
      token: newToken
    });

  } catch (error) {
    console.error('Error en refreshToken:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al refrescar token'
    });
  }
};
// Cambiar contraseña de un usuario (admin/manager)
export const resetUserPassword = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      });
    }

    connection = await pool.getConnection();

    const hashedPassword = await bcryptjs.hash(newPassword, BCRYPT_ROUNDS);

    const [result] = await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error en resetUserPassword:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

// Cambiar estado de usuario (activo/inactivo)
export const updateUserStatus = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    const { status } = req.body;

    connection = await pool.getConnection();

    const [result] = await connection.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [status ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: 'Estado del usuario actualizado' });
  } catch (error) {
    console.error('Error en updateUserStatus:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};