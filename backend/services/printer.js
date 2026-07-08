function printReceipt(orderData) {
  const line = '================================';
  const sub = '--------------------------------';
  console.log('\n' + line);
  console.log('         SALES RECEIPT');
  console.log(line);
  console.log(`Invoice: ${orderData.invoice_no || 'N/A'}`);
  console.log(`Date: ${new Date().toLocaleString()}`);
  console.log(`Cashier: ${orderData.user_name || 'N/A'}`);
  if (orderData.customer_name) {
    console.log(`Customer: ${orderData.customer_name}`);
  }
  console.log(sub);
  if (orderData.items && orderData.items.length > 0) {
    for (const item of orderData.items) {
      const name = (item.product_name || 'Item').padEnd(20);
      const qty = item.quantity || 0;
      const price = parseFloat(item.unit_price || 0).toFixed(2);
      const total = parseFloat(item.subtotal || 0).toFixed(2);
      console.log(`${name} x${qty}  @${price}`);
      console.log(`  ${' '.repeat(20)}${total}`);
    }
  }
  console.log(sub);
  console.log(`Subtotal:${' '.repeat(12)}${parseFloat(orderData.subtotal || 0).toFixed(2)}`);
  if (orderData.discount > 0) {
    console.log(`Discount:${' '.repeat(13)}-${parseFloat(orderData.discount).toFixed(2)}`);
  }
  console.log(`Tax:${' '.repeat(18)}${parseFloat(orderData.tax || 0).toFixed(2)}`);
  console.log(`TOTAL:${' '.repeat(15)}${parseFloat(orderData.total || 0).toFixed(2)}`);
  if (orderData.amount_tendered > 0) {
    console.log(`Tendered:${' '.repeat(12)}${parseFloat(orderData.amount_tendered).toFixed(2)}`);
    console.log(`Change:${' '.repeat(14)}${parseFloat(orderData.change_due || 0).toFixed(2)}`);
  }
  console.log(line);
  console.log('      Thank you for your purchase!');
  console.log(line + '\n');
  return { printed: true, message: 'Receipt logged to console' };
}

function getPrinters() {
  return [
    { name: 'POS-58 Thermal Printer', interface: 'USB', status: 'online' },
    { name: 'Microsoft Print to PDF', interface: 'Software', status: 'online' }
  ];
}

module.exports = { printReceipt, getPrinters };
