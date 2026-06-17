const LOW_STOCK_THRESHOLD = 10;

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const messageEl = document.getElementById('message');

const dashboardBody = document.getElementById('dashboard-body');
const dashboardFoot = document.getElementById('dashboard-foot');
const manageBody = document.getElementById('manage-body');
const historyBody = document.getElementById('history-body');
const reportContent = document.getElementById('report-content');
const reportDateInput = document.getElementById('report-date');
const printReportBtn = document.getElementById('print-report');
const downloadReportBtn = document.getElementById('download-report');

const stockInProduct = document.getElementById('stock-in-product');
const stockOutProduct = document.getElementById('stock-out-product');
const stockOutCurrent = document.getElementById('stock-out-current');

const productForm = document.getElementById('product-form');
const productFormTitle = document.getElementById('product-form-title');
const productFormSubmit = document.getElementById('product-form-submit');
const productIdInput = document.getElementById('product-id');
const cancelEditBtn = document.getElementById('cancel-edit');

let productsCache = [];
let currentReport = null;

function showMessage(text, type = 'success') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
}

function clearMessage() {
  messageEl.className = 'message hidden';
  messageEl.textContent = '';
}

function formatDenomination(amount) {
  return `RM ${amount}`;
}

function formatMoney(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return 'RM 0.00';
  }
  return `RM ${value.toFixed(2)}`;
}

function getTotalPrice(product) {
  return Number(product.denomination || 0) * Number(product.quantity || 0);
}

function formatProductLabel(product) {
  return `${product.carrier} ${formatDenomination(product.denomination)} (Stock: ${product.quantity})`;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function switchTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabName);
  });

  clearMessage();

  if (tabName === 'dashboard') {
    loadDashboard();
  } else if (tabName === 'history') {
    loadHistory();
  } else if (tabName === 'daily-report') {
    initReportDate();
  } else if (tabName === 'manage-inventory') {
    loadManageInventory();
  } else if (tabName === 'stock-in' || tabName === 'stock-out') {
    loadProductOptions();
  }
}

function renderProductOptions(selectEl, includeQuantity = true) {
  if (!productsCache.length) {
    selectEl.innerHTML = '<option value="">No products yet. Please add one first.</option>';
    return;
  }

  selectEl.innerHTML = productsCache
    .map((product) => {
      const label = includeQuantity
        ? formatProductLabel(product)
        : `${product.carrier} ${formatDenomination(product.denomination)}`;
      return `<option value="${product.id}">${label}</option>`;
    })
    .join('');
}

function renderProductActions(product) {
  return `
    <div class="actions">
      <button type="button" class="btn btn-small btn-secondary" data-action="edit" data-id="${product.id}">Edit</button>
      <button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="${product.id}">Delete</button>
    </div>
  `;
}

function renderProductRow(product) {
  const lowStockClass = product.quantity < LOW_STOCK_THRESHOLD ? 'low-stock' : '';
  return `
    <tr>
      <td>${escapeHtml(product.carrier)}</td>
      <td>${formatDenomination(product.denomination)}</td>
      <td class="${lowStockClass}">${product.quantity}</td>
      <td>${formatMoney(getTotalPrice(product))}</td>
      <td>${escapeHtml(product.note || '-')}</td>
      <td>${renderProductActions(product)}</td>
    </tr>
  `;
}

function renderDashboardFooter(products) {
  const grandTotal = products.reduce((sum, product) => sum + getTotalPrice(product), 0);
  dashboardFoot.classList.remove('hidden');
  dashboardFoot.innerHTML = `
    <tr class="total-row">
      <td colspan="3"><strong>Grand Total Inventory Price</strong></td>
      <td><strong>${formatMoney(grandTotal)}</strong></td>
      <td colspan="2"></td>
    </tr>
  `;
}

function updateStockOutHint() {
  const selected = productsCache.find(
    (product) => String(product.id) === stockOutProduct.value
  );

  if (!selected) {
    stockOutCurrent.textContent = 'Current stock: -';
    return;
  }

  stockOutCurrent.textContent = `Current stock: ${selected.quantity}`;
}

async function loadProducts() {
  productsCache = await api('/api/products');
  return productsCache;
}

async function loadProductOptions() {
  await loadProducts();
  renderProductOptions(stockInProduct);
  renderProductOptions(stockOutProduct);
  updateStockOutHint();
}

async function loadDashboard() {
  dashboardBody.innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';
  dashboardFoot.classList.add('hidden');
  dashboardFoot.innerHTML = '';

  try {
    const products = await loadProducts();

    if (!products.length) {
      dashboardBody.innerHTML = '<tr><td colspan="6" class="empty">No products yet. Go to Manage Inventory to add one.</td></tr>';
      return;
    }

    dashboardBody.innerHTML = products.map(renderProductRow).join('');
    renderDashboardFooter(products);
  } catch (error) {
    dashboardBody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function loadManageInventory() {
  manageBody.innerHTML = '<tr><td colspan="6" class="empty">Loading...</td></tr>';

  try {
    const products = await loadProducts();

    if (!products.length) {
      manageBody.innerHTML = '<tr><td colspan="6" class="empty">No products yet. Use the form above to add one.</td></tr>';
      return;
    }

    manageBody.innerHTML = products.map(renderProductRow).join('');
  } catch (error) {
    manageBody.innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function loadHistory() {
  historyBody.innerHTML = '<tr><td colspan="5" class="empty">Loading...</td></tr>';

  try {
    const transactions = await api('/api/transactions?limit=50');

    if (!transactions.length) {
      historyBody.innerHTML = '<tr><td colspan="5" class="empty">No transactions yet</td></tr>';
      return;
    }

    historyBody.innerHTML = transactions
      .map((item) => {
        const typeLabel = item.type === 'in' ? 'Stock In' : 'Stock Out';
        const badgeClass = item.type === 'in' ? 'in' : 'out';
        return `
          <tr>
            <td>${escapeHtml(item.created_at)}</td>
            <td>${escapeHtml(item.carrier)} ${formatDenomination(item.denomination)}</td>
            <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
            <td>${item.quantity}</td>
            <td>${item.balance_after}</td>
          </tr>
        `;
      })
      .join('');
  } catch (error) {
    historyBody.innerHTML = `<tr><td colspan="5" class="empty">${escapeHtml(error.message)}</td></tr>`;
  }
}

function initReportDate() {
  if (!reportDateInput.value) {
    reportDateInput.value = getLocalDateString();
  }
}

function normalizeReport(report) {
  const recomputeStockIn = (rows) =>
    (rows || []).map((row) => {
      const denomination = Number(row.denomination) || 0;
      const quantity = Number(row.quantity) || 0;
      return {
        item_name: row.item_name || row.carrier || '-',
        denomination,
        quantity,
        total_price: denomination * quantity,
      };
    });

  const recomputeStockOut = (rows) =>
    (rows || []).map((row) => {
      const denomination = Number(row.denomination) || 0;
      const quantity = Number(row.quantity) || 0;
      return {
        item_name: row.item_name || row.carrier || '-',
        denomination,
        quantity,
        total_price: denomination * quantity,
      };
    });

  const buildSummary = (stockIn, stockOut) => ({
    stock_in_qty: stockIn.reduce((sum, row) => sum + row.quantity, 0),
    stock_in_total: stockIn.reduce((sum, row) => sum + row.total_price, 0),
    stock_out_qty: stockOut.reduce((sum, row) => sum + row.quantity, 0),
    stock_out_total: stockOut.reduce((sum, row) => sum + row.total_price, 0),
  });

  if (Array.isArray(report.stock_in) || Array.isArray(report.stock_out)) {
    const stock_in = recomputeStockIn(report.stock_in);
    const stock_out = recomputeStockOut(report.stock_out);

    return {
      date: report.date ?? '',
      generated_at: report.generated_at ?? '',
      stock_in,
      stock_out,
      summary: buildSummary(stock_in, stock_out),
      transaction_count: report.transaction_count ?? 0,
    };
  }

  if (Array.isArray(report.carriers)) {
    const stockInMap = new Map();
    const stockOutMap = new Map();

    for (const group of report.carriers) {
      for (const line of group.stock_in || []) {
        const denomination = Number(line.denomination) || 0;
        const quantity = Number(line.quantity) || 0;
        const key = `${group.carrier}|${denomination}`;

        if (!stockInMap.has(key)) {
          stockInMap.set(key, {
            item_name: group.carrier,
            carrier: group.carrier,
            denomination,
            quantity: 0,
          });
        }

        const row = stockInMap.get(key);
        row.quantity += quantity;
      }

      for (const line of group.stock_out || []) {
        const denomination = Number(line.denomination) || 0;
        const quantity = Number(line.quantity) || 0;
        const key = `${group.carrier}|${denomination}`;

        if (!stockOutMap.has(key)) {
          stockOutMap.set(key, {
            item_name: group.carrier,
            carrier: group.carrier,
            denomination,
            quantity: 0,
          });
        }

        const row = stockOutMap.get(key);
        row.quantity += quantity;
      }
    }

    const stock_in = recomputeStockIn(
      [...stockInMap.values()].sort(
        (a, b) => a.carrier.localeCompare(b.carrier) || a.denomination - b.denomination
      )
    );
    const stock_out = recomputeStockOut(
      [...stockOutMap.values()].sort(
        (a, b) => a.carrier.localeCompare(b.carrier) || a.denomination - b.denomination
      )
    );

    return {
      date: report.date ?? '',
      generated_at: report.generated_at ?? '',
      stock_in,
      stock_out,
      summary: buildSummary(stock_in, stock_out),
      transaction_count: report.transaction_count ?? 0,
    };
  }

  return {
    date: report.date ?? '',
    generated_at: report.generated_at ?? '',
    stock_in: [],
    stock_out: [],
    summary: buildSummary([], []),
    transaction_count: report.transaction_count ?? 0,
  };
}

function getRowTotal(row) {
  const denomination = Number(row.denomination) || 0;
  const quantity = Number(row.quantity) || 0;
  const totalPrice = Number(row.total_price);
  return Number.isFinite(totalPrice) && totalPrice > 0 ? totalPrice : denomination * quantity;
}

function renderStockInTable(rows) {
  const items = rows || [];

  if (!items.length) {
    return '<p class="report-empty">No stock in today.</p>';
  }

  return `
    <table class="report-table report-table-4col">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Value (RM)</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.item_name || row.carrier || '-')}</td>
                <td>${row.denomination}</td>
                <td>${row.quantity}</td>
                <td>${formatMoney(getRowTotal(row))}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderStockOutTable(rows) {
  const items = rows || [];

  if (!items.length) {
    return '<p class="report-empty">No stock out today.</p>';
  }

  return `
    <table class="report-table report-table-4col">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Value (RM)</th>
          <th>Qty</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.item_name || row.carrier || '-')}</td>
                <td>${row.denomination}</td>
                <td>${row.quantity}</td>
                <td>${formatMoney(getRowTotal(row))}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderDailyReport(rawReport) {
  const report = normalizeReport(rawReport);
  const hasData = report.stock_in.length || report.stock_out.length;

  return `
    <article class="report-sheet">
      <header class="report-header">
        <h3>Daily Closing Report</h3>
        <p><strong>Date:</strong> ${escapeHtml(report.date)}</p>
        <p><strong>Generated:</strong> ${escapeHtml(report.generated_at)}</p>
      </header>

      ${hasData ? '' : '<p class="empty">No transactions recorded for this date.</p>'}

      <section class="report-block">
        <h3>Stock In</h3>
        ${renderStockInTable(report.stock_in)}
        <p class="report-subtotal">Total: ${report.summary.stock_in_qty} cards · ${formatMoney(report.summary.stock_in_total)}</p>
      </section>

      <section class="report-block">
        <h3>Stock Out</h3>
        ${renderStockOutTable(report.stock_out)}
        <p class="report-subtotal">Total: ${report.summary.stock_out_qty} cards · ${formatMoney(report.summary.stock_out_total)}</p>
      </section>

      <footer class="report-summary">
        <p><strong>Transactions today:</strong> ${report.transaction_count}</p>
      </footer>
    </article>
  `;
}

function buildReportText(rawReport) {
  const report = normalizeReport(rawReport);
  const lines = [
    'DAILY CLOSING REPORT',
    `Date: ${report.date}`,
    `Generated: ${report.generated_at}`,
    '',
    'STOCK IN',
  ];

  if (!report.stock_in.length) {
    lines.push('(none)');
  } else {
    for (const row of report.stock_in) {
      lines.push(`${row.item_name || row.carrier || '-'} | RM ${row.denomination} | ${row.quantity} cards | ${formatMoney(getRowTotal(row))}`);
    }
    lines.push(`Total: ${report.summary.stock_in_qty} cards | ${formatMoney(report.summary.stock_in_total)}`);
  }

  lines.push('', 'STOCK OUT');

  if (!report.stock_out.length) {
    lines.push('(none)');
  } else {
    for (const row of report.stock_out) {
      lines.push(`${row.item_name || row.carrier || '-'} | RM ${row.denomination} | ${row.quantity} cards | ${formatMoney(getRowTotal(row))}`);
    }
    lines.push(`Total: ${report.summary.stock_out_qty} cards | ${formatMoney(report.summary.stock_out_total)}`);
  }

  lines.push('', `Transactions today: ${report.transaction_count}`);
  return lines.join('\n');
}

async function generateDailyReport() {
  clearMessage();
  reportContent.innerHTML = '<p class="empty">Generating report...</p>';

  try {
    const date = reportDateInput.value || getLocalDateString();
    const report = normalizeReport(await api(`/api/reports/daily?date=${encodeURIComponent(date)}`));
    currentReport = report;
    reportContent.innerHTML = renderDailyReport(report);
    printReportBtn.classList.remove('hidden');
    downloadReportBtn.classList.remove('hidden');
    showMessage('Report generated successfully');
  } catch (error) {
    currentReport = null;
    reportContent.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
    printReportBtn.classList.add('hidden');
    downloadReportBtn.classList.add('hidden');
    showMessage(error.message, 'error');
  }
}

function printDailyReport() {
  if (!currentReport) {
    return;
  }
  window.print();
}

function downloadDailyReport() {
  if (!currentReport) {
    return;
  }

  const blob = new Blob([buildReportText(currentReport)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `daily-report-${currentReport.date}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetProductForm() {
  productForm.reset();
  productIdInput.value = '';
  document.getElementById('product-quantity').value = '0';
  productFormTitle.textContent = 'Add Product';
  productFormSubmit.textContent = 'Add Product';
  cancelEditBtn.classList.add('hidden');
}

function startEditProduct(product) {
  productIdInput.value = product.id;
  document.getElementById('product-carrier').value = product.carrier;
  document.getElementById('product-denomination').value = product.denomination;
  document.getElementById('product-quantity').value = product.quantity;
  document.getElementById('product-note').value = product.note || '';
  productFormTitle.textContent = 'Edit Product';
  productFormSubmit.textContent = 'Save Changes';
  cancelEditBtn.classList.remove('hidden');
  switchTab('manage-inventory');
  productForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function handleEditProduct(id) {
  try {
    const product = productsCache.find((item) => item.id === id) || await api(`/api/products/${id}`);
    startEditProduct(product);
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function handleDeleteProduct(id) {
  const product = productsCache.find((item) => item.id === id);
  const label = product
    ? `${product.carrier} ${formatDenomination(product.denomination)}`
    : 'this product';

  if (!window.confirm(`Delete ${label}? This will also remove its transaction history.`)) {
    return;
  }

  clearMessage();

  try {
    await api(`/api/products/${id}`, { method: 'DELETE' });
    showMessage('Product deleted successfully');

    if (Number(productIdInput.value) === id) {
      resetProductForm();
    }

    await refreshInventoryViews();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function refreshInventoryViews() {
  await loadProducts();
  const activePanel = document.querySelector('.panel.active');

  if (activePanel?.id === 'dashboard') {
    await loadDashboard();
  } else if (activePanel?.id === 'manage-inventory') {
    await loadManageInventory();
  } else if (activePanel?.id === 'stock-in' || activePanel?.id === 'stock-out') {
    await loadProductOptions();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

document.getElementById('refresh-dashboard').addEventListener('click', loadDashboard);
document.getElementById('refresh-history').addEventListener('click', loadHistory);
document.getElementById('refresh-manage').addEventListener('click', loadManageInventory);
document.getElementById('generate-report').addEventListener('click', generateDailyReport);
printReportBtn.addEventListener('click', printDailyReport);
downloadReportBtn.addEventListener('click', downloadDailyReport);
stockOutProduct.addEventListener('change', updateStockOutHint);
cancelEditBtn.addEventListener('click', resetProductForm);

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);
  if (button.dataset.action === 'edit') {
    handleEditProduct(id);
  } else if (button.dataset.action === 'delete') {
    handleDeleteProduct(id);
  }
});

document.getElementById('stock-in-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  try {
    const productId = Number(stockInProduct.value);
    const quantity = Number(document.getElementById('stock-in-quantity').value);

    await api('/api/stock/in', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });

    showMessage('Stock in successful');
    event.target.reset();
    await loadProductOptions();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

document.getElementById('stock-out-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  try {
    const productId = Number(stockOutProduct.value);
    const quantity = Number(document.getElementById('stock-out-quantity').value);

    await api('/api/stock/out', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });

    showMessage('Stock out successful');
    event.target.reset();
    await loadProductOptions();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  try {
    const carrier = document.getElementById('product-carrier').value.trim();
    const denomination = Number(document.getElementById('product-denomination').value);
    const quantity = Number(document.getElementById('product-quantity').value);
    const note = document.getElementById('product-note').value.trim();
    const productId = productIdInput.value;

    const payload = { carrier, denomination, quantity };
    if (note) {
      payload.note = note;
    }

    if (productId) {
      await api(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showMessage('Product updated successfully');
    } else {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showMessage('Product added successfully');
    }

    resetProductForm();
    await refreshInventoryViews();
  } catch (error) {
    showMessage(error.message, 'error');
  }
});

reportDateInput.value = getLocalDateString();
loadDashboard();
