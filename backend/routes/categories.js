const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const categories = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c ORDER BY c.name ASC`
    );
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const result = await query('INSERT INTO categories (name, description) VALUES (?, ?)', [name.trim(), description || null]);
    const category = await query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(category[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    const { name, description } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({ error: 'Category name cannot be empty.' });
    }
    await query('UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
      [name ? name.trim() : null, description !== undefined ? description : null, req.params.id]);
    const updated = await query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const categories = await query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    const products = await query('SELECT COUNT(*) AS count FROM products WHERE active = 1 AND category_id = ?', [req.params.id]);
    if (products[0].count > 0) {
      return res.status(400).json({ error: `Cannot delete. ${products[0].count} product(s) are in this category. Move or delete them first.` });
    }
    await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully.' });
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
    const cats = await query(
      `SELECT c.id, c.name, (SELECT COUNT(*) FROM products WHERE active = 1 AND category_id = c.id) AS cnt
       FROM categories c WHERE c.id IN (${placeholders})`,
      ids
    );
    const blocked = cats.filter(c => c.cnt > 0);
    if (blocked.length > 0) {
      const names = blocked.map(c => `"${c.name}" (${c.cnt} products)`).join(', ');
      return res.status(400).json({ error: `Cannot delete: ${names}. Move or delete products first.` });
    }
    await query(`DELETE FROM categories WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} category(s) deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
