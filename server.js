const express = require('express');
const path = require('path');
const {
  getProducts,
  getProductById,
  insertProduct,
  updateProductRecord,
  removeProduct,
  getTransactions,
  buildDailyReport,
  stockIn,
  stockOut,
} = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function parsePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.status = 400;
    throw error;
  }
  return num;
}

function parseNonNegativeInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) {
    const error = new Error(`${fieldName} must be a non-negative integer`);
    error.status = 400;
    throw error;
  }
  return num;
}

function parseProductId(value) {
  return parsePositiveInt(value, 'id');
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseReportDate(value) {
  if (!value) {
    return getLocalDateString();
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const error = new Error('date must be in YYYY-MM-DD format');
    error.status = 400;
    throw error;
  }

  return value;
}

function validateProductPayload(body, { requireQuantity = false } = {}) {
  const { carrier, denomination, note } = body;

  if (!carrier || typeof carrier !== 'string' || !carrier.trim()) {
    const error = new Error('carrier is required');
    error.status = 400;
    throw error;
  }

  const denom = parsePositiveInt(denomination, 'denomination');

  let quantity;
  if (requireQuantity || (body.quantity != null && body.quantity !== '')) {
    quantity = parseNonNegativeInt(body.quantity ?? 0, 'quantity');
  }

  return {
    carrier: carrier.trim(),
    denomination: denom,
    quantity,
    note: note ? String(note).trim() : null,
  };
}

app.get('/api/products', (req, res) => {
  const products = getProducts.all();
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  try {
    const id = parseProductId(req.params.id);
    const product = getProductById.get(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to fetch product' });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { carrier, denomination, quantity, note } = validateProductPayload(req.body, {
      requireQuantity: false,
    });
    const initialQuantity = quantity ?? 0;

    const result = insertProduct.run(carrier, denomination, initialQuantity, note);
    const product = getProductById.get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Product with this carrier and denomination already exists' });
    }
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to create product' });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const id = parseProductId(req.params.id);
    const existing = getProductById.get(id);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const { carrier, denomination, quantity, note } = validateProductPayload(req.body, {
      requireQuantity: true,
    });

    const product = updateProductRecord(id, carrier, denomination, quantity, note);
    res.json(product);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Product with this carrier and denomination already exists' });
    }
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const id = parseProductId(req.params.id);
    const product = removeProduct(id);
    res.json({ message: 'Product deleted', product });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Product not found' });
    }
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to delete product' });
  }
});

app.post('/api/stock/in', (req, res) => {
  try {
    const productId = parsePositiveInt(req.body.productId, 'productId');
    const quantity = parsePositiveInt(req.body.quantity, 'quantity');

    const product = stockIn(productId, quantity);
    res.json({ message: 'Stock in successful', product });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Product not found' });
    }
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Stock in failed' });
  }
});

app.post('/api/stock/out', (req, res) => {
  try {
    const productId = parsePositiveInt(req.body.productId, 'productId');
    const quantity = parsePositiveInt(req.body.quantity, 'quantity');

    const product = stockOut(productId, quantity);
    res.json({ message: 'Stock out successful', product });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Stock out failed' });
  }
});

app.get('/api/transactions', (req, res) => {
  const limit = req.query.limit ? parsePositiveInt(req.query.limit, 'limit') : 50;
  const transactions = getTransactions.all(limit);
  res.json(transactions);
});

app.get('/api/reports/daily', (req, res) => {
  try {
    const date = parseReportDate(req.query.date);
    const report = buildDailyReport(date);
    res.json(report);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to generate report' });
  }
});

app.listen(PORT, () => {
  console.log(`Telecom inventory system running at http://localhost:${PORT}`);
});
