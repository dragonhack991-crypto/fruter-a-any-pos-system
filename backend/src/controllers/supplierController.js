import db from '../config/database.js';

export const getSuppliers = async (req, res) => {
  try {
    const [suppliers] = await db.query(
      'SELECT * FROM providers WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, city } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO providers (name, contact_person, phone, email, address, city) VALUES (?, ?, ?, ?, ?, ?)',
      [name, contact_person || '', phone || '', email || '', address || '', city || '']
    );
    
    res.json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address, city } = req.body;
    
    await db.query(
      'UPDATE providers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ?, city = ? WHERE id = ?',
      [name, contact_person || '', phone || '', email || '', address || '', city || '', id]
    );
    
    res.json({ success: true, message: 'Proveedor actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE providers SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};