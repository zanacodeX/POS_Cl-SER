const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

router.use(verifyToken);

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const salesResult = await query(
      "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE DATE(created_at) = ? AND status = 'completed'",
      [today]
    );
    const ordersResult = await query(
      "SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = ? AND status = 'completed'",
      [today]
    );
    const productsResult = await query('SELECT COUNT(*) AS count FROM products WHERE active = 1');
    const lowStockResult = await query('SELECT COUNT(*) AS count FROM products WHERE active = 1 AND quantity <= low_stock_threshold');
    const topProducts = await query(
      `SELECT oi.product_id, oi.product_name, SUM(oi.quantity) AS total_qty, SUM(oi.subtotal) AS total_sales
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE DATE(o.created_at) = ? AND o.status = 'completed'
       GROUP BY oi.product_id, oi.product_name
       ORDER BY total_qty DESC LIMIT 10`,
      [today]
    );
    const profitResult = await query(
      "SELECT COALESCE(SUM(profit), 0) AS today_profit FROM orders WHERE DATE(created_at) = ? AND status = 'completed'",
      [today]
    );
    const dueResult = await query("SELECT COUNT(*) AS count FROM customers WHERE balance > 0");
    const expiringResult = await query("SELECT COUNT(*) AS count FROM products WHERE active = 1 AND expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND expiry_date >= CURDATE()");
    const discountedResult = await query("SELECT COUNT(*) AS count FROM products WHERE active = 1 AND discount_type IS NOT NULL");
    const weeklySales = await query(
      `SELECT DATE(created_at) AS date, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(profit), 0) AS profit
       FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND status = 'completed'
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    res.json({
      today_sales: salesResult[0].total,
      today_orders: ordersResult[0].count,
      total_products: productsResult[0].count,
      low_stock_count: lowStockResult[0].count,
      top_products: topProducts,
      today_profit: profitResult[0].today_profit,
      due_customers: dueResult[0].count,
      expiring_products: expiringResult[0].count,
      discounted_products: discountedResult[0].count,
      weekly_sales: weeklySales
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/sales/daily', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter (YYYY-MM-DD) is required.' });
    }
    const orders = await query(
      "SELECT * FROM orders WHERE DATE(created_at) = ? ORDER BY created_at DESC",
      [date]
    );
    const summary = await query(
      "SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0) AS total_sales, COALESCE(SUM(discount), 0) AS total_discount, COALESCE(SUM(tax), 0) AS total_tax FROM orders WHERE DATE(created_at) = ? AND status = 'completed'",
      [date]
    );
    res.json({ date, orders, summary: summary[0] });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/sales/period', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ error: 'From and to dates (YYYY-MM-DD) are required.' });
    }
    const orders = await query(
      "SELECT * FROM orders WHERE DATE(created_at) BETWEEN ? AND ? ORDER BY created_at DESC",
      [from, to]
    );
    const summary = await query(
      "SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0) AS total_sales, COALESCE(SUM(discount), 0) AS total_discount, COALESCE(SUM(tax), 0) AS total_tax FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed'",
      [from, to]
    );
    const daily = await query(
      "SELECT DATE(created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(total), 0) AS sales FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed' GROUP BY DATE(created_at) ORDER BY date ASC",
      [from, to]
    );
    res.json({ from, to, orders, summary: summary[0], daily });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/inventory/low-stock', requireAdmin, async (req, res) => {
  try {
    const products = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = 1 AND p.quantity <= p.low_stock_threshold
       ORDER BY (p.quantity - p.low_stock_threshold) ASC`
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/profit', async (req, res) => {
  try {
    const { from, to } = req.query;
    let where = "o.status = 'completed'";
    let params = [];
    if (from && to) {
      where += ' AND DATE(o.created_at) BETWEEN ? AND ?';
      params.push(from, to);
    }
    const result = await query(
      `SELECT COUNT(*) AS total_orders, COALESCE(SUM(o.total), 0) AS total_sales, COALESCE(SUM(o.profit), 0) AS total_profit, COALESCE(SUM(o.discount), 0) AS total_discount FROM orders o WHERE ${where}`,
      params
    );
    const daily = await query(
      `SELECT DATE(o.created_at) AS date, COUNT(*) AS orders, COALESCE(SUM(o.total), 0) AS sales, COALESCE(SUM(o.profit), 0) AS profit FROM orders o WHERE ${where} GROUP BY DATE(o.created_at) ORDER BY date ASC`,
      params
    );
    res.json({ ...result[0], daily });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/expiring', async (req, res) => {
  try {
    const { days } = req.query;
    const withinDays = parseInt(days) || 30;
    const products = await query(
      `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.active = 1 AND p.expiry_date IS NOT NULL AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND p.expiry_date >= CURDATE() ORDER BY p.expiry_date ASC`,
      [withinDays]
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/expired', async (req, res) => {
  try {
    const products = await query(
      `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.active = 1 AND p.expiry_date IS NOT NULL AND p.expiry_date < CURDATE() ORDER BY p.expiry_date ASC`
    );
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.get('/customers/due', async (req, res) => {
  try {
    const customers = await query(
      `SELECT c.*, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS total_orders FROM customers c WHERE c.balance > 0 ORDER BY c.balance DESC`
    );
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
