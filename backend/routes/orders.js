const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function generateInvoiceNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix = uuidv4().replace(/-/g, '').substring(0, 4).toUpperCase();
  return `INV-${y}${m}${d}-${suffix}`;
}

router.post('/', async (req, res) => {
  try {
    const { customer_id, items, payment_method, amount_tendered, discount, discount_percentage } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required.' });
    }
    const invoiceNo = generateInvoiceNo();
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Each item must have a valid product_id and quantity.' });
      }
      const products = await query('SELECT id, name, price, cost, quantity FROM products WHERE id = ? AND active = 1', [item.product_id]);
      if (products.length === 0) {
        return res.status(404).json({ error: `Product id ${item.product_id} not found.` });
      }
      const product = products[0];
      if (product.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.quantity}` });
      }
      const itemLineDiscount = parseFloat(item.line_discount) || 0;
      const itemSubtotal = parseFloat((product.price * item.quantity).toFixed(2));
      const itemCost = parseFloat((parseFloat(product.cost || 0) * item.quantity).toFixed(2));
      const itemProfit = parseFloat((itemSubtotal - itemCost).toFixed(2));
      subtotal += itemSubtotal;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        unit_cost: parseFloat(product.cost || 0),
        profit: itemProfit,
        subtotal: itemSubtotal,
        line_discount: itemLineDiscount
      });
    }
    let discountAmt = parseFloat(discount) || 0;
    if (discount_percentage && !discount) {
      discountAmt = parseFloat((subtotal * parseFloat(discount_percentage) / 100).toFixed(2));
    }
    const tax = parseFloat((subtotal * 0.05).toFixed(2));
    const total = parseFloat((subtotal - discountAmt + tax).toFixed(2));
    let totalProfit = parseFloat(orderItems.reduce((s, i) => s + i.profit, 0).toFixed(2));
    if (totalProfit > 0 && subtotal > 0) {
      totalProfit = parseFloat((totalProfit * (1 - discountAmt / subtotal)).toFixed(2));
    }
    const tendered = parseFloat(amount_tendered) || 0;
    const change = parseFloat(Math.max(0, tendered - total).toFixed(2));

    const result = await transaction(async (conn) => {
      const [orderResult] = await conn.query(
        `INSERT INTO orders (invoice_no, user_id, customer_id, subtotal, discount, tax, total, profit, payment_method, amount_tendered, change_due)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [invoiceNo, req.user.id, customer_id || null, subtotal, discountAmt, tax, total, totalProfit, payment_method || 'cash', tendered, change]
      );
      const orderId = orderResult.insertId;
      for (const oi of orderItems) {
        await conn.query(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, profit, subtotal, line_discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [orderId, oi.product_id, oi.product_name, oi.quantity, oi.unit_price, oi.unit_cost, oi.profit, oi.subtotal, oi.line_discount]
        );
        await conn.query('UPDATE products SET quantity = quantity - ? WHERE id = ?', [oi.quantity, oi.product_id]);
      }
      const dueAmount = parseFloat(Math.max(0, total - tendered).toFixed(2));
      if (dueAmount > 0 && customer_id) {
        await conn.query('UPDATE customers SET balance = balance + ? WHERE id = ?', [dueAmount, customer_id]);
      }
      const itemsDiscountTotal = parseFloat(orderItems.reduce((s, i) => s + i.line_discount, 0).toFixed(2));
      const orderDiscount = parseFloat((discountAmt - itemsDiscountTotal).toFixed(2));
      const [orderRows] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      const [itemRows] = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      return { ...orderRows[0], items: itemRows, discount_percentage: discount_percentage || null, items_discount_total: itemsDiscountTotal, order_discount: orderDiscount };
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, date, status: orderStatus, search } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    let where = [];
    let params = [];
    if (date) {
      where.push('DATE(o.created_at) = ?');
      params.push(date);
    }
    if (orderStatus) {
      where.push('o.status = ?');
      params.push(orderStatus);
    }
    if (search) {
      where.push('o.invoice_no LIKE ?');
      params.push(`%${search}%`);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) AS total FROM orders o ${whereClause}`, params);
    const total = countResult[0].total;
    const orders = await query(
      `SELECT o.*, u.full_name AS user_name, c.name AS customer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN customers c ON c.id = o.customer_id
       ${whereClause}
       ORDER BY o.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ data: orders, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/invoice/:invoice_no', async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.*, u.full_name AS user_name, c.name AS customer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.invoice_no = ?`,
      [req.params.invoice_no]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.*, u.full_name AS user_name, c.name AS customer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [orders[0].id]);
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [order] = await query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    await transaction(async (conn) => {
      const items = await conn.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of items[0]) {
        await conn.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      await conn.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
      await conn.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    });
    res.json({ message: 'Order deleted successfully.' });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs array is required.' });
    }
    await transaction(async (conn) => {
      const placeholders = ids.map(() => '?').join(',');
      const [items] = await conn.query(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
        ids
      );
      for (const item of items) {
        await conn.query('UPDATE products SET quantity = quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      await conn.query(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ids);
      await conn.query(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
    });
    res.json({ message: `${ids.length} order(s) deleted.` });
  } catch (err) {
    console.error('Bulk delete order error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/customer/:customer_id', async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    const params = [req.params.customer_id];
    const countResult = await query('SELECT COUNT(*) AS total FROM orders WHERE customer_id = ?', params);
    const total = countResult[0].total;
    const orders = await query(
      `SELECT o.*, u.full_name AS user_name, c.name AS customer_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.customer_id = ?
       ORDER BY o.id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ data: orders, total, page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
