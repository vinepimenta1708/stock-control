// Stock Control — a mini ERP inventory module
// Data is saved in the browser (localStorage).

const STORAGE_KEY = "stock-control-data";

let state = loadState();
let editingSku = null; // SKU of the product being edited (null = creating)

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) { /* ignore */ }
  return sampleData();
}

// Sample data so the app isn't empty on first visit
function sampleData() {
  return {
    products: [
      { sku: "PRD-001", name: "Wireless Mouse", price: 25.9, qty: 18, min: 5 },
      { sku: "PRD-002", name: "USB-C Cable", price: 9.5, qty: 3, min: 10 },
      { sku: "PRD-003", name: "Mechanical Keyboard", price: 89.0, qty: 7, min: 4 },
    ],
    history: [],
  };
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const money = (v) => v.toLocaleString("en-US", { style: "currency", currency: "USD" });
const $ = (id) => document.getElementById(id);

function render() {
  renderKpis();
  renderInventory();
  renderProductOptions();
  renderHistory();
  renderChart();
}

function renderKpis() {
  const { products } = state;
  $("kpi-products").textContent = products.length;
  $("kpi-items").textContent = products.reduce((sum, p) => sum + p.qty, 0);
  $("kpi-value").textContent = money(products.reduce((sum, p) => sum + p.qty * p.price, 0));
  $("kpi-low").textContent = products.filter((p) => p.qty <= p.min).length;
}

function renderInventory() {
  const term = $("search").value.trim().toLowerCase();
  const rows = state.products.filter(
    (p) => p.sku.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)
  );

  $("inventory").innerHTML = rows.length
    ? rows.map((p) => {
        const low = p.qty <= p.min;
        return `<tr>
          <td>${escape(p.sku)}</td>
          <td>${escape(p.name)}</td>
          <td>${money(p.price)}</td>
          <td>${p.qty}</td>
          <td>${p.min}</td>
          <td><span class="badge ${low ? "low" : "ok"}">${low ? "Low stock" : "OK"}</span></td>
          <td class="actions">
            <button class="link edit" data-edit="${escape(p.sku)}">Edit</button>
            <button class="link" data-remove="${escape(p.sku)}">Remove</button>
          </td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="7" class="empty">No products found.</td></tr>`;
}

function renderProductOptions() {
  const options = state.products
    .map((p) => `<option value="${escape(p.sku)}">${escape(p.sku)} — ${escape(p.name)}</option>`)
    .join("");
  $("move-product").innerHTML = options;

  // Keep the selected history filter after re-rendering
  const current = $("history-product").value;
  $("history-product").innerHTML = `<option value="">All products</option>${options}`;
  $("history-product").value = state.products.some((p) => p.sku === current) ? current : "";
}

// Horizontal bar chart: current quantity per product, with a marker at the minimum stock
function renderChart() {
  const max = Math.max(1, ...state.products.map((p) => Math.max(p.qty, p.min)));
  $("chart").innerHTML = state.products.length
    ? state.products.map((p) => {
        const low = p.qty <= p.min;
        return `<div class="bar-row" title="${escape(p.name)}: ${p.qty} (min ${p.min})">
          <span class="bar-label">${escape(p.name)}</span>
          <div class="bar-track">
            <div class="bar-fill ${low ? "low" : ""}" style="width:${(p.qty / max) * 100}%"></div>
            <div class="bar-min" style="left:${(p.min / max) * 100}%"></div>
          </div>
          <span class="bar-value">${p.qty}</span>
        </div>`;
      }).join("")
    : `<p class="empty">Add products to see the chart.</p>`;
}

function filteredHistory() {
  const sku = $("history-product").value;
  const type = $("history-type").value;
  return state.history.filter((h) => (!sku || h.sku === sku) && (!type || h.type === type));
}

function renderHistory() {
  const items = filteredHistory();
  $("history").innerHTML = items.length
    ? items.slice().reverse().map((h) => `
        <li>
          <span class="${h.type}">${h.type === "in" ? "+" : "−"}${h.qty} · ${escape(h.sku)}</span>
          <time>${new Date(h.date).toLocaleString()}</time>
        </li>`).join("")
    : `<li class="empty">No movements yet.</li>`;
}

function escape(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// --- Events ---

$("product-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const sku = $("sku").value.trim().toUpperCase();
  const data = {
    name: $("name").value.trim(),
    price: Number($("price").value),
    min: Number($("min").value),
  };

  if (editingSku) {
    const product = state.products.find((p) => p.sku === editingSku);
    Object.assign(product, data);
  } else {
    if (state.products.some((p) => p.sku === sku)) {
      alert(`SKU ${sku} already exists.`);
      return;
    }
    state.products.push({ sku, qty: 0, ...data });
  }

  saveState();
  resetProductForm();
  render();
});

function startEditing(sku) {
  const product = state.products.find((p) => p.sku === sku);
  if (!product) return;
  editingSku = sku;
  $("sku").value = product.sku;
  $("sku").disabled = true; // SKU is the product key and can't change
  $("name").value = product.name;
  $("price").value = product.price;
  $("min").value = product.min;
  $("form-title").textContent = `Edit product ${sku}`;
  $("form-submit").textContent = "Save changes";
  $("form-cancel").hidden = false;
  $("name").focus();
}

function resetProductForm() {
  editingSku = null;
  $("product-form").reset();
  $("sku").disabled = false;
  $("min").value = 5;
  $("form-title").textContent = "New product";
  $("form-submit").textContent = "Add product";
  $("form-cancel").hidden = true;
}

$("form-cancel").addEventListener("click", resetProductForm);

$("move-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = $("move-msg");
  const product = state.products.find((p) => p.sku === $("move-product").value);
  const type = $("move-type").value;
  const qty = Number($("move-qty").value);

  if (!product) return;
  if (type === "out" && qty > product.qty) {
    msg.textContent = `Not enough stock. Available: ${product.qty}.`;
    msg.className = "msg error";
    return;
  }

  product.qty += type === "in" ? qty : -qty;
  state.history.push({ sku: product.sku, type, qty, date: new Date().toISOString() });
  saveState();
  msg.textContent = "Movement registered.";
  msg.className = "msg success";
  render();
});

$("inventory").addEventListener("click", (e) => {
  if (e.target.dataset.edit) return startEditing(e.target.dataset.edit);
  const sku = e.target.dataset.remove;
  if (!sku || !confirm(`Remove product ${sku}?`)) return;
  state.products = state.products.filter((p) => p.sku !== sku);
  if (editingSku === sku) resetProductForm();
  saveState();
  render();
});

$("search").addEventListener("input", renderInventory);
$("history-product").addEventListener("change", renderHistory);
$("history-type").addEventListener("change", renderHistory);

$("export").addEventListener("click", () => {
  const lines = [["date", "sku", "type", "quantity"], ...filteredHistory().map((h) => [h.date, h.sku, h.type, h.qty])];
  const csv = lines.map((l) => l.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "stock-movements.csv";
  link.click();
});

$("reset").addEventListener("click", () => {
  if (!confirm("Restore the sample data? All your products and movements will be lost.")) return;
  state = sampleData();
  saveState();
  resetProductForm();
  $("move-msg").textContent = "";
  render();
});

// --- Theme (light / dark) ---

const THEME_KEY = "stock-control-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("theme-toggle").textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
}

$("theme-toggle").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
});

applyTheme(document.documentElement.dataset.theme || "light");
render();
