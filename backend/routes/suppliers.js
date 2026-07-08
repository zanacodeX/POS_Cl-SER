const express = require('express');
const router = express.Router();
const { query, transaction } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let where = [];
    let params = [];
    if (search) {
      where.push('(s.name LIKE ? OR s.contact_person LIKE ? OR s.phone LIKE ? OR s.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await query(`SELECT COUNT(*) AS total FROM suppliers s ${whereClause}`, params);
    const total = countResult[0].total;

    const suppliers = await query(
      `SELECT s.*, (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) AS total_orders
       FROM suppliers s ${whereClause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ data: suppliers, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const suppliers = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (suppliers.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const payments = await query(
      'SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ supplier: suppliers[0], payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact_person, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const result = await query(
      'INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [name, contact_person || null, phone || null, email || null, address || null]
    );
    const supplier = await query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
    res.status(201).json(supplier[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const suppliers = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (suppliers.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const { name, contact_person, phone, email, address } = req.body;
    await query(
      'UPDATE suppliers SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      [
        name || suppliers[0].name,
        contact_person !== undefined ? contact_person : suppliers[0].contact_person,
        phone !== undefined ? phone : suppliers[0].phone,
        email !== undefined ? email : suppliers[0].email,
        address !== undefined ? address : suppliers[0].address,
        req.params.id
      ]
    );
    const updated = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pay', async (req, res) => {
  try {
    const { amount, payment_method, notes } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount is required' });
    const suppliers = await query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (suppliers.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    const result = await transaction(async (conn) => {
      const [paymentResult] = await conn.query(
        'INSERT INTO supplier_payments (supplier_id, amount, payment_method, notes, user_id) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, parseFloat(amount), payment_method || null, notes || null, req.user.id]
      );
      const newBalance = parseFloat(suppliers[0].balance) - parseFloat(amount);
      await conn.query('UPDATE suppliers SET balance = ? WHERE id = ?', [newBalance, req.params.id]);
      const [paymentRows] = await conn.query('SELECT * FROM supplier_payments WHERE id = ?', [paymentResult.insertId]);
      const [updated] = await conn.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
      return { payment: paymentRows[0], supplier: updated[0] };
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/payments', async (req, res) => {
  try {
    const payments = await query(
      'SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required.' });
    }
    const placeholders = ids.map(() => '?').join(',');
    const dependent = await query(
      `SELECT COUNT(*) AS cnt FROM purchase_orders WHERE supplier_id IN (${placeholders})`,
      ids
    );
    if (dependent[0].cnt > 0) {
      return res.status(400).json({ error: 'Cannot delete supplier(s) with existing purchase orders.' });
    }
    await query(`DELETE FROM suppliers WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} supplier(s) deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
