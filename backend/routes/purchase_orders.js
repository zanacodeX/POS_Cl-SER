const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function generatePONo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = uuidv4().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `PO-${y}${m}${d}-${suffix}`;
}

router.get('/', async (req, res) => {
  try {
    const { page, limit, status, search } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    let where = [];
    let params = [];

    if (status) {
      where.push('po.status = ?');
      params.push(status);
    }
    if (search) {
      where.push('po.po_no LIKE ?');
      params.push(`%${search}%`);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) AS total FROM purchase_orders po ${whereClause}`, params);
    const total = countResult[0].total;

    const orders = await query(
      `SELECT po.*, u.full_name AS user_name, s.name AS supplier_name
       FROM purchase_orders po
       LEFT JOIN users u ON u.id = po.user_id
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       ${whereClause}
       ORDER BY po.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ data: orders, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orders = await query(
      `SELECT po.*, u.full_name AS user_name, s.name AS supplier_name
       FROM purchase_orders po
       LEFT JOIN users u ON u.id = po.user_id
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = ?`,
      [req.params.id]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }
    const items = await query('SELECT * FROM purchase_order_items WHERE po_id = ?', [orders[0].id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { supplier_id, items, discount, notes } = req.body;
    if (!supplier_id) {
      return res.status(400).json({ error: 'Supplier ID is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required.' });
    }

    const poNo = generatePONo();
    let subtotal = 0;
    const poItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0 || !item.unit_cost || item.unit_cost <= 0) {
        return res.status(400).json({ error: 'Each item must have product_id, quantity, and unit_cost.' });
      }
      const products = await query('SELECT id, name FROM products WHERE id = ?', [item.product_id]);
      if (products.length === 0) {
        return res.status(404).json({ error: `Product id ${item.product_id} not found.` });
      }
      const product = products[0];
      const itemSubtotal = parseFloat((item.unit_cost * item.quantity).toFixed(2));
      subtotal += itemSubtotal;
      poItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: itemSubtotal
      });
    }

    const discountAmt = parseFloat(discount) || 0;
    const total = parseFloat((subtotal - discountAmt).toFixed(2));

    const result = await transaction(async (conn) => {
      const [orderResult] = await conn.query(
        `INSERT INTO purchase_orders (po_no, supplier_id, user_id, subtotal, discount, total, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [poNo, supplier_id, req.user.id, subtotal, discountAmt, total, notes || null]
      );
      const poId = orderResult.insertId;
      for (const pi of poItems) {
        await conn.query(
          'INSERT INTO purchase_order_items (po_id, product_id, product_name, quantity, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
          [poId, pi.product_id, pi.product_name, pi.quantity, pi.unit_cost, pi.subtotal]
        );
      }
      const [orderRows] = await conn.query('SELECT * FROM purchase_orders WHERE id = ?', [poId]);
      const [itemRows] = await conn.query('SELECT * FROM purchase_order_items WHERE po_id = ?', [poId]);
      return { ...orderRows[0], items: itemRows };
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Create purchase order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/:id/receive', async (req, res) => {
  try {
    const orders = await query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }
    const order = orders[0];
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending purchase orders can be received.' });
    }

    const items = await query('SELECT * FROM purchase_order_items WHERE po_id = ?', [order.id]);

    await transaction(async (conn) => {
      for (const item of items) {
        if (item.product_id) {
          await conn.query(
            'UPDATE products SET quantity = quantity + ?, cost = ? WHERE id = ?',
            [item.quantity, item.unit_cost, item.product_id]
          );
        } else {
          await conn.query(
            'INSERT INTO products (name, quantity, cost) VALUES (?, ?, ?)',
            [item.product_name, item.quantity, item.unit_cost]
          );
        }
      }
      await conn.query(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        ['received', order.id]
      );
      await conn.query(
        'UPDATE suppliers SET balance = balance + ? WHERE id = ?',
        [order.total, order.supplier_id]
      );
    });

    const updated = await query('SELECT * FROM purchase_orders WHERE id = ?', [order.id]);
    const updatedItems = await query('SELECT * FROM purchase_order_items WHERE po_id = ?', [order.id]);
    res.json({ ...updated[0], items: updatedItems });
  } catch (err) {
    console.error('Receive purchase order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const orders = await query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }
    if (orders[0].status !== 'pending') {
      return res.status(400).json({ error: 'Only pending purchase orders can be cancelled.' });
    }
    await query('UPDATE purchase_orders SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    const updated = await query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orders = await query('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found.' });
    }
    await query('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Purchase order deleted successfully.' });
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
    await query(`DELETE FROM purchase_orders WHERE id IN (${placeholders})`, ids);
    res.json({ message: `${ids.length} purchase order(s) deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
