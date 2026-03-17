import db from '../config/database.js';

export const getSuppliers = async (req, res) => {
  try {
    const [suppliers] = await db.query(
      'SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name'
    );
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [name, contact_person, phone, email, address]
    );
    
    res.json({ success: true, data: { id: result.insertId, name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email, address } = req.body;
    
    await db.query(
      'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      [name, contact_person, phone, email, address, id]
    );
    
    res.json({ success: true, message: 'Proveedor actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE suppliers SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true, message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};