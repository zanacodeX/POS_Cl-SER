const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken, requireAdmin);

router.get('/', async (req, res) => {
  try {
    const users = await query('SELECT id, username, role, full_name, phone, active, created_at FROM users ORDER BY id DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { username, password, role, full_name, phone } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    const existing = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
      [username, hash, role || 'cashier', full_name || null, phone || null]
    );
    const users = await query('SELECT id, username, role, full_name, phone, active, created_at FROM users WHERE id = ?', [result.insertId]);
    res.status(201).json(users[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const users = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const { password, role, full_name, phone } = req.body;
    const updates = [];
    const params = [];
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(hash);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (full_name !== undefined) {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (updates.length > 0) {
      params.push(req.params.id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }
    const updated = await query('SELECT id, username, role, full_name, phone, active, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const users = await query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    await query('UPDATE users SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deactivated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
