const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;
    let where = [];
    let params = [];
    if (search) {
      where.push('(c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) AS total FROM customers c ${whereClause}`, params);
    const total = countResult[0].total;
    const customers = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS total_orders FROM customers c ${whereClause} ORDER BY c.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ data: customers, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required.' });
    }
    const customers = await query(
      'SELECT id, name, phone FROM customers WHERE phone LIKE ? OR name LIKE ? LIMIT 20',
      [`%${q}%`, `%${q}%`]
    );
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customers = await query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const orders = await query(
      'SELECT id, invoice_no, total, created_at FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    const summary = await query(
      'SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0) AS total_spent FROM orders WHERE customer_id = ?',
      [req.params.id]
    );
    res.json({ ...customers[0], orders, summary: summary[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (phone) {
      const dup = await query('SELECT id FROM customers WHERE phone = ?', [phone]);
      if (dup.length > 0) {
        return res.status(409).json({ error: 'Phone number already exists.' });
      }
    }
    const result = await query(
      'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      [name.trim(), phone || null, email || null, address || null]
    );
    const customer = await query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json(customer[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Phone number already exists.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const customers = await query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const { name, phone, email, address } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ error: 'Customer name cannot be empty.' });
    }
    if (phone) {
      const dup = await query('SELECT id FROM customers WHERE phone = ? AND id != ?', [phone, req.params.id]);
      if (dup.length > 0) {
        return res.status(409).json({ error: 'Phone number already in use.' });
      }
    }
    await query(
      'UPDATE customers SET name = COALESCE(?, name), phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address) WHERE id = ?',
      [name ? name.trim() : null, phone !== undefined ? phone : null, email !== undefined ? email : null, address !== undefined ? address : null, req.params.id]
    );
    const updated = await query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Phone number already in use.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [customer] = await query('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    const orders = await query('SELECT COUNT(*) AS cnt FROM orders WHERE customer_id = ?', [req.params.id]);
    if (orders[0].cnt > 0) {
      return res.status(400).json({ error: 'Cannot delete customer with existing orders.' });
    }
    await query('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
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
      `SELECT COUNT(*) AS cnt FROM orders WHERE customer_id IN (${placeholders})`,
      ids
    );
    if (dependent[0].cnt > 0) {
      return res.status(400).json({ error: 'Cannot delete customer(s) with existing orders.' });
    }
    await query(`DELETE FROM customers WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} customer(s) deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
