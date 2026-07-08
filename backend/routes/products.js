const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const { search, category_id, low_stock, has_discount, active, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = ['p.active = 1'];
    let params = [];

    if (search) {
      where.push('(p.name LIKE ? OR p.barcode LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      where.push('p.category_id = ?');
      params.push(category_id);
    }
    if (low_stock === 'true') {
      where.push('p.quantity <= p.low_stock_threshold');
    }
    if (has_discount === 'true') {
      where.push('p.discount_type IS NOT NULL');
    }
    if (active === 'false') {
      where = ['1=1'];
    }

    const whereClause = where.join(' AND ');
    const countResult = await query(`SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`, params);
    const total = countResult[0].total;

    const products = await query(
      `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE ${whereClause} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // Attach price tiers
    if (products.length > 0) {
      const ids = products.map(p => p.id);
      const tiers = await query(
        `SELECT * FROM product_price_tiers WHERE product_id IN (${ids.map(() => '?').join(',')}) ORDER BY product_id, min_qty ASC`,
        ids
      );
      const tierMap = {};
      for (const t of tiers) {
        if (!tierMap[t.product_id]) tierMap[t.product_id] = [];
        tierMap[t.product_id].push(t);
      }
      for (const p of products) {
        p.price_tiers = tierMap[p.id] || [];
      }
    }

    res.json({ data: products, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/barcode/:barcode', async (req, res) => {
  try {
    const products = await query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.barcode = ? LIMIT 1',
      [req.params.barcode]
    );
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const tiers = await query(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_qty ASC',
      [products[0].id]
    );
    res.json({ ...products[0], price_tiers: tiers });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const products = await query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?',
      [req.params.id]
    );
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const tiers = await query(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_qty ASC',
      [req.params.id]
    );
    res.json({ ...products[0], price_tiers: tiers });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { barcode, name, category_id, batch_no, expiry_date, mfg_date, price, cost, quantity, low_stock_threshold, discount_type, discount_value, discount_min_qty, discount_valid_from, discount_valid_to, bundle_qty, bundle_price } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }
    if (barcode) {
      const existing = await query('SELECT id FROM products WHERE barcode = ?', [barcode]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Barcode already exists.' });
      }
    }
    const result = await query(
      'INSERT INTO products (barcode, name, category_id, batch_no, expiry_date, mfg_date, price, cost, quantity, low_stock_threshold, discount_type, discount_value, discount_min_qty, discount_valid_from, discount_valid_to, bundle_qty, bundle_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [barcode || null, name, category_id || null, batch_no || null, expiry_date || null, mfg_date || null, price, cost || 0, quantity || 0, low_stock_threshold || 5, discount_type || null, discount_value || null, discount_min_qty || null, discount_valid_from || null, discount_valid_to || null, bundle_qty || null, bundle_price || null]
    );
    const product = await query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?',
      [result.insertId]
    );
    res.status(201).json(product[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Barcode already exists.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const { barcode, name, category_id, batch_no, expiry_date, mfg_date, price, cost, quantity, low_stock_threshold, discount_type, discount_value, discount_min_qty, discount_valid_from, discount_valid_to, bundle_qty, bundle_price } = req.body;
    if (barcode) {
      const dup = await query('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode, req.params.id]);
      if (dup.length > 0) {
        return res.status(409).json({ error: 'Barcode already exists.' });
      }
    }
    await query(
      `UPDATE products SET barcode = ?, name = COALESCE(?, name), category_id = ?, batch_no = ?, expiry_date = ?, mfg_date = ?, price = COALESCE(?, price), cost = COALESCE(?, cost), quantity = COALESCE(?, quantity), low_stock_threshold = COALESCE(?, low_stock_threshold), discount_type = ?, discount_value = ?, discount_min_qty = ?, discount_valid_from = ?, discount_valid_to = ?, bundle_qty = ?, bundle_price = ? WHERE id = ?`,
      [barcode || products[0].barcode, name || null, category_id !== undefined ? category_id : products[0].category_id,
       batch_no !== undefined ? batch_no : products[0].batch_no,
       expiry_date !== undefined ? expiry_date : products[0].expiry_date,
       mfg_date !== undefined ? mfg_date : products[0].mfg_date,
       price || null, cost !== undefined ? cost : null, quantity !== undefined ? quantity : null,
       low_stock_threshold || null,
       discount_type !== undefined ? discount_type : products[0].discount_type,
       discount_value !== undefined ? discount_value : products[0].discount_value,
       discount_min_qty !== undefined ? discount_min_qty : products[0].discount_min_qty,
       discount_valid_from !== undefined ? discount_valid_from : products[0].discount_valid_from,
       discount_valid_to !== undefined ? discount_valid_to : products[0].discount_valid_to,
       bundle_qty !== undefined ? bundle_qty : products[0].bundle_qty,
       bundle_price !== undefined ? bundle_price : products[0].bundle_price, req.params.id]
    );
    const updated = await query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?',
      [req.params.id]
    );
    res.json(updated[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Barcode already exists.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const products = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    await query('UPDATE products SET active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deactivated successfully.' });
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
    await query(`UPDATE products SET active = 0 WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} product(s) deactivated.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
