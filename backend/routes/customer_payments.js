const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { customer_id } = req.query;
    let sql = 'SELECT * FROM customer_payments';
    let params = [];
    if (customer_id) {
      sql += ' WHERE customer_id = ?';
      params.push(customer_id);
    }
    sql += ' ORDER BY created_at DESC';
    const payments = await query(sql, params);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_id, amount, payment_method, notes } = req.body;
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }
    const customers = await query('SELECT id, balance FROM customers WHERE id = ?', [customer_id]);
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    const newBalance = parseFloat(customers[0].balance) - parseFloat(amount);
    await query('UPDATE customers SET balance = ? WHERE id = ?', [newBalance, customer_id]);
    const result = await query(
      'INSERT INTO customer_payments (customer_id, amount, payment_method, notes, user_id) VALUES (?, ?, ?, ?, ?)',
      [customer_id, amount, payment_method || 'cash', notes || null, req.user.id]
    );
    const payment = await query('SELECT * FROM customer_payments WHERE id = ?', [result.insertId]);
    res.status(201).json(payment[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
