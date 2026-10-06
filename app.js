// Stock Control — a mini ERP inventory module
// Data is saved in the browser (localStorage).

const STORAGE_KEY = "stock-control-data";

const state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return saved;
  } catch (e) { /* ignore */ }
  // Sample data so the app isn't empty on first visit
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
          <td><button class="link" data-remove="${escape(p.sku)}">Remove</button></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="7" class="empty">No products found.</td></tr>`;
}

function renderProductOptions() {
  $("move-product").innerHTML = state.products
    .map((p) => `<option value="${escape(p.sku)}">${escape(p.sku)} — ${escape(p.name)}</option>`)
    .join("");
}

function renderHistory() {
  $("history").innerHTML = state.history.length
    ? state.history.slice().reverse().map((h) => `
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
  if (state.products.some((p) => p.sku === sku)) {
    alert(`SKU ${sku} already exists.`);
    return;
  }
  state.products.push({
    sku,
    name: $("name").value.trim(),
    price: Number($("price").value),
    qty: 0,
    min: Number($("min").value),
  });
  saveState();
  e.target.reset();
  $("min").value = 5;
  render();
});

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
  const sku = e.target.dataset.remove;
  if (!sku || !confirm(`Remove product ${sku}?`)) return;
  state.products = state.products.filter((p) => p.sku !== sku);
  saveState();
  render();
});

$("search").addEventListener("input", renderInventory);

$("export").addEventListener("click", () => {
  const lines = [["date", "sku", "type", "quantity"], ...state.history.map((h) => [h.date, h.sku, h.type, h.qty])];
  const csv = lines.map((l) => l.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  link.download = "stock-movements.csv";
  link.click();
});

render();
