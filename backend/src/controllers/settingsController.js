import pool from '../config/database.js';
import bcryptjs from 'bcryptjs';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

export const getSettings = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    console.log('📊 Obteniendo settings para usuario:', userId);
    
    connection = await pool.getConnection();

    const [userSettings] = await connection.query(
      `SELECT id, full_name, email, username, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!userSettings || userSettings.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const user = userSettings[0];

    // Obtener configuración general
    let appSettings = {
      storeName: 'Frutería Any',
      currency: 'USD',
      language: 'es',
      theme: 'light',
      tax_rate: 12
    };

    try {
      const [settings] = await connection.query(
        `SELECT storeName, currency, language, theme, tax_rate FROM app_settings LIMIT 1`
      );
      if (settings && settings.length > 0) {
        appSettings = { ...appSettings, ...settings[0] };
        console.log('✅ App settings encontrados:', appSettings);
      } else {
        console.log('⚠️ No hay app_settings en BD, usando defaults');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo obtener app_settings:', error.message);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          username: user.username,
          createdAt: user.created_at
        },
        appSettings: appSettings
      }
    });
  } catch (error) {
    console.error('❌ Error en getSettings:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const updateSettings = async (req, res) => {
  let connection;
  try {
    const { storeName, tax_rate, currency, language, theme } = req.body;
    console.log('📝 Actualizando settings:', { storeName, tax_rate, currency, language, theme });

    connection = await pool.getConnection();

    // Verificar si existen registros en app_settings
    const [existing] = await connection.query(
      `SELECT id FROM app_settings LIMIT 1`
    );

    if (existing && existing.length > 0) {
      // Actualizar
      await connection.query(
        `UPDATE app_settings SET storeName = ?, tax_rate = ?, currency = ?, language = ?, theme = ? WHERE id = 1`,
        [storeName || 'Frutería Any', tax_rate || 12, currency || 'USD', language || 'es', theme || 'light']
      );
      console.log('✅ Settings actualizados');
    } else {
      // Insertar
      await connection.query(
        `INSERT INTO app_settings (storeName, tax_rate, currency, language, theme) VALUES (?, ?, ?, ?, ?)`,
        [storeName || 'Frutería Any', tax_rate || 12, currency || 'USD', language || 'es', theme || 'light']
      );
      console.log('✅ Settings insertados');
    }

    res.json({ success: true, message: '✅ Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('❌ Error en updateSettings:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const updateProfile = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { fullName, email, phone } = req.body;

    if (!fullName && !email && !phone) {
      return res.status(400).json({ success: false, error: 'Proporciona al menos un campo para actualizar' });
    }

    connection = await pool.getConnection();

    let updateFields = [];
    let params = [];

    if (fullName) {
      updateFields.push('full_name = ?');
      params.push(fullName);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }

    params.push(userId);

    const [result] = await connection.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({ success: true, message: '✅ Perfil actualizado exitosamente' });
  } catch (error) {
    console.error('❌ Error en updateProfile:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const changePassword = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Las contraseñas no coinciden' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    connection = await pool.getConnection();

    const [users] = await connection.query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const validPassword = await bcryptjs.compare(currentPassword, users[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Contraseña actual incorrecta' });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, BCRYPT_ROUNDS);

    await connection.query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ success: true, message: '✅ Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('❌ Error en changePassword:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const updateAppSettings = async (req, res) => {
  let connection;
  try {
    const { storeName, currency, language, theme } = req.body;

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE app_settings SET storeName = ?, currency = ?, language = ?, theme = ?`,
      [storeName || 'Frutería Any', currency || 'USD', language || 'es', theme || 'light']
    );

    if (result.affectedRows === 0) {
      await connection.query(
        `INSERT INTO app_settings (storeName, currency, language, theme) VALUES (?, ?, ?, ?)`,
        [storeName || 'Frutería Any', currency || 'USD', language || 'es', theme || 'light']
      );
    }

    res.json({ success: true, message: '✅ Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('❌ Error en updateAppSettings:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};

export const updateNotifications = async (req, res) => {
  let connection;
  try {
    const userId = req.user.id;
    const { notificationsEnabled } = req.body;

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE user_settings SET notifications_enabled = ? WHERE user_id = ?`,
      [notificationsEnabled ? 1 : 0, userId]
    );

    if (result.affectedRows === 0) {
      await connection.query(
        `INSERT INTO user_settings (user_id, notifications_enabled) VALUES (?, ?)`,
        [userId, notificationsEnabled ? 1 : 0]
      );
    }

    res.json({ success: true, message: '✅ Notificaciones actualizadas exitosamente' });
  } catch (error) {
    console.error('❌ Error en updateNotifications:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    if (connection) await connection.release();
  }
};