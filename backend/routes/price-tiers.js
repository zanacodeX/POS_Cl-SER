const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/:product_id', async (req, res) => {
  try {
    const tiers = await query(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_qty ASC',
      [req.params.product_id]
    );
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:product_id', async (req, res) => {
  try {
    const { tiers } = req.body;
    const productId = req.params.product_id;
    const product = await query('SELECT id FROM products WHERE id = ?', [productId]);
    if (product.length === 0) return res.status(404).json({ error: 'Product not found.' });

    await query('DELETE FROM product_price_tiers WHERE product_id = ?', [productId]);

    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
      for (const tier of tiers) {
        if (!tier.min_qty || !tier.unit_price) continue;
        await query(
          'INSERT INTO product_price_tiers (product_id, min_qty, max_qty, unit_price) VALUES (?, ?, ?, ?)',
          [productId, tier.min_qty, tier.max_qty || null, tier.unit_price]
        );
      }
    }

    const updated = await query(
      'SELECT * FROM product_price_tiers WHERE product_id = ? ORDER BY min_qty ASC',
      [productId]
    );
    res.json(updated);
  } catch (err) {
    console.error('Price tier save error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
