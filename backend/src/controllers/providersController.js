import db from '../config/database.js';

export const getProviders = async (req, res) => {
  try {
    const [providers] = await db.query(
      'SELECT * FROM providers WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Error en getProviders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getProviderById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[provider]] = await db.query(
      'SELECT * FROM providers WHERE id = ? AND is_active = 1',
      [id]
    );
    if (!provider) {
      return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    }
    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Error en getProviderById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createProvider = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre del proveedor es requerido' });
    }

    const [result] = await db.query(
      'INSERT INTO providers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [name, contact_person || null, phone || null, email || null, address || null]
    );

    res.json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    console.error('Error en createProvider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address } = req.body;

    await db.query(
      'UPDATE providers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      [name, contact_person || null, phone || null, email || null, address || null, id]
    );

    res.json({ success: true, message: 'Proveedor actualizado' });
  } catch (error) {
    console.error('Error en updateProvider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE providers SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Proveedor eliminado' });
  } catch (error) {
    console.error('Error en deleteProvider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
