const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'inventory.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carrier TEXT NOT NULL,
    denomination INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    UNIQUE(carrier, denomination)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out')),
    quantity INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

const getProducts = db.prepare(`
  SELECT id, carrier, denomination, quantity, note
  FROM products
  ORDER BY carrier, denomination
`);

const getProductById = db.prepare(`
  SELECT id, carrier, denomination, quantity, note
  FROM products
  WHERE id = ?
`);

const insertProduct = db.prepare(`
  INSERT INTO products (carrier, denomination, quantity, note)
  VALUES (?, ?, ?, ?)
`);

const updateProduct = db.prepare(`
  UPDATE products
  SET carrier = ?, denomination = ?, quantity = ?, note = ?
  WHERE id = ?
`);

const deleteProductTransactions = db.prepare(`
  DELETE FROM transactions WHERE product_id = ?
`);

const deleteProduct = db.prepare(`
  DELETE FROM products WHERE id = ?
`);

const updateProductQuantity = db.prepare(`
  UPDATE products SET quantity = ? WHERE id = ?
`);

const insertTransaction = db.prepare(`
  INSERT INTO transactions (product_id, type, quantity, balance_after)
  VALUES (?, ?, ?, ?)
`);

const getTransactions = db.prepare(`
  SELECT
    t.id,
    t.product_id,
    p.carrier,
    p.denomination,
    t.type,
    t.quantity,
    t.balance_after,
    t.created_at
  FROM transactions t
  JOIN products p ON p.id = t.product_id
  ORDER BY t.created_at DESC, t.id DESC
  LIMIT ?
`);

const getTransactionsByDate = db.prepare(`
  SELECT
    t.id,
    t.product_id,
    p.carrier,
    p.denomination,
    t.type,
    t.quantity,
    t.balance_after,
    t.created_at
  FROM transactions t
  JOIN products p ON p.id = t.product_id
  WHERE date(t.created_at) = date(?)
  ORDER BY p.carrier, p.denomination, t.type, t.created_at
`);

const stockIn = db.transaction((productId, quantity) => {
  const product = getProductById.get(productId);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const newQuantity = product.quantity + quantity;
  updateProductQuantity.run(newQuantity, productId);
  insertTransaction.run(productId, 'in', quantity, newQuantity);

  return { ...product, quantity: newQuantity };
});

const stockOut = db.transaction((productId, quantity) => {
  const product = getProductById.get(productId);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  if (product.quantity < quantity) {
    throw new Error('INSUFFICIENT_STOCK');
  }

  const newQuantity = product.quantity - quantity;
  updateProductQuantity.run(newQuantity, productId);
  insertTransaction.run(productId, 'out', quantity, newQuantity);

  return { ...product, quantity: newQuantity };
});

const updateProductRecord = db.transaction((id, carrier, denomination, quantity, note) => {
  const product = getProductById.get(id);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  updateProduct.run(carrier, denomination, quantity, note, id);
  return getProductById.get(id);
});

const removeProduct = db.transaction((productId) => {
  const product = getProductById.get(productId);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  deleteProductTransactions.run(productId);
  deleteProduct.run(productId);
  return product;
});

function buildDailyReport(date) {
  const transactions = getTransactionsByDate.all(date);

  const stockInByKey = new Map();
  const stockOutByKey = new Map();

  for (const item of transactions) {
    const denomination = Number(item.denomination) || 0;
    const quantity = Number(item.quantity) || 0;

    if (item.type === 'in') {
      const key = `${item.carrier}|${denomination}`;
      if (!stockInByKey.has(key)) {
        stockInByKey.set(key, {
          item_name: item.carrier,
          carrier: item.carrier,
          denomination,
          quantity: 0,
        });
      }
      const row = stockInByKey.get(key);
      row.quantity += quantity;
      continue;
    }

    const key = `${item.carrier}|${denomination}`;
    if (!stockOutByKey.has(key)) {
      stockOutByKey.set(key, {
        item_name: item.carrier,
        carrier: item.carrier,
        denomination,
        quantity: 0,
      });
    }
    const row = stockOutByKey.get(key);
    row.quantity += quantity;
  }

  const stock_in = [...stockInByKey.values()]
    .sort((a, b) => a.carrier.localeCompare(b.carrier) || a.denomination - b.denomination)
    .map((row) => ({
      item_name: row.carrier,
      denomination: row.denomination,
      quantity: row.quantity,
      total_price: row.denomination * row.quantity,
    }));

  const stock_out = [...stockOutByKey.values()]
    .sort((a, b) => a.carrier.localeCompare(b.carrier) || a.denomination - b.denomination)
    .map((row) => ({
      item_name: row.carrier,
      denomination: row.denomination,
      quantity: row.quantity,
      total_price: row.denomination * row.quantity,
    }));

  const summary = {
    stock_in_qty: stock_in.reduce((sum, row) => sum + row.quantity, 0),
    stock_in_total: stock_in.reduce((sum, row) => sum + row.total_price, 0),
    stock_out_qty: stock_out.reduce((sum, row) => sum + row.quantity, 0),
    stock_out_total: stock_out.reduce((sum, row) => sum + row.total_price, 0),
  };

  return {
    date,
    generated_at: new Date().toLocaleString('en-MY', { hour12: false }),
    stock_in,
    stock_out,
    summary,
    transaction_count: transactions.length,
  };
}

module.exports = {
  db,
  getProducts,
  getProductById,
  insertProduct,
  updateProductRecord,
  removeProduct,
  getTransactions,
  getTransactionsByDate,
  buildDailyReport,
  stockIn,
  stockOut,
};
