// critical.js
let products = [];
let currentType = "all"; // "all" | "data" | "minutes" | "sms"

// Load More
let allFilteredProducts = [];
let currentBatch = 0;
const BATCH_SIZE = 6;

// DOM
const networkFilterBar = document.getElementById("networkFilterBar");
const productGrid = document.getElementById("productGrid");
const loadMoreContainer = document.getElementById("loadMoreContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const bottomAllBtn = document.getElementById("bottomAllBtn");
const bottomDataBtn = document.getElementById("bottomDataBtn");
const bottomMinBtn = document.getElementById("bottomMinBtn");
const bottomSmsBtn = document.getElementById("bottomSmsBtn");

// ============================================
// Build type filter bar (Data / Minutes / SMS)
// ============================================
function buildTypeFilters() {
    if (!networkFilterBar) return;

    const buttons = [
        { type: "all",     label: "All Packages" },
        { type: "data",    label: "Data" },
        { type: "minutes", label: "Minutes" },
        { type: "sms",     label: "SMS" }
    ];

    networkFilterBar.innerHTML = buttons.map(b => `
        <button class="filter-btn ${currentType === b.type ? "active" : ""}" data-type="${b.type}">
            ${b.label}
        </button>
    `).join("");

    networkFilterBar.querySelectorAll("[data-type]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentType = btn.dataset.type;
            networkFilterBar.querySelectorAll("[data-type]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            updateBottomBarActive(currentType);
            renderProductsWithLoadMore();
        });
    });
}

// ============================================
// Filtering — Safaricom only
// ============================================
function getFilteredProducts() {
    let filtered = products.filter(p => p.network === "Safaricom");
    if (currentType !== "all") {
        filtered = filtered.filter(p => p.type === currentType);
    }
    return filtered;
}

// ============================================
// Rendering
// ============================================
function renderProductsWithLoadMore() {
    if (!productGrid) return;

    allFilteredProducts = getFilteredProducts();
    currentBatch = 0;
    productGrid.innerHTML = "";

    renderNextBatch();

    if (loadMoreContainer) {
        if (allFilteredProducts.length > BATCH_SIZE) {
            loadMoreContainer.style.display = "flex";
            if (loadMoreBtn) loadMoreBtn.style.display = "inline-flex";
        } else {
            loadMoreContainer.style.display = "none";
        }
    }
}

function renderNextBatch() {
    const nextItems = allFilteredProducts.slice(currentBatch, currentBatch + BATCH_SIZE);

    nextItems.forEach(product => {
        const template = document.getElementById("productCardTemplate");
        if (!template) return;
        const card = template.content.cloneNode(true);
        const cardDiv = card.querySelector(".product-card");
        cardDiv.classList.add("safaricom");

        card.querySelector(".product-title").textContent = product.title;
        card.querySelector(".validity-badge").textContent = product.validity;
        card.querySelector(".price-value").textContent = product.price;

        card.querySelector(".btn-buy").dataset.productId = product.id;
        card.querySelector(".btn-gift").dataset.productId = product.id;

        card.querySelector(".btn-buy").addEventListener("click", () => {
            if (typeof openPaymentModal === "function") openPaymentModal(product, "buy");
        });
        card.querySelector(".btn-gift").addEventListener("click", () => {
            if (typeof openPaymentModal === "function") openPaymentModal(product, "gift");
        });

        const popularIds = [1, 4, 7, 12, 17, 23, 30];
        if (popularIds.includes(product.id)) {
            const popularBadge = card.querySelector(".popular-badge");
            if (popularBadge) popularBadge.style.display = "block";
        }

        productGrid.appendChild(card);
    });

    currentBatch += BATCH_SIZE;

    if (loadMoreBtn && currentBatch >= allFilteredProducts.length) {
        loadMoreBtn.style.display = "none";
    }
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", renderNextBatch);
}

// ============================================
// Bottom filter bar
// ============================================
function updateBottomBarActive(type) {
    [bottomAllBtn, bottomDataBtn, bottomMinBtn, bottomSmsBtn].forEach(btn => {
        if (btn) btn.classList.remove("active");
    });
    const map = {
        "all":     bottomAllBtn,
        "data":    bottomDataBtn,
        "minutes": bottomMinBtn,
        "sms":     bottomSmsBtn
    };
    const target = map[type];
    if (target) target.classList.add("active");
}

function handleBottomTypeClick(type) {
    const mainBtn = document.querySelector(`.filter-btn[data-type="${type}"]`);
    if (mainBtn) {
        mainBtn.click();
        setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
    }
}

if (bottomAllBtn) bottomAllBtn.addEventListener("click", () => handleBottomTypeClick("all"));
if (bottomDataBtn) bottomDataBtn.addEventListener("click", () => handleBottomTypeClick("data"));
if (bottomMinBtn) bottomMinBtn.addEventListener("click", () => handleBottomTypeClick("minutes"));
if (bottomSmsBtn) bottomSmsBtn.addEventListener("click", () => handleBottomTypeClick("sms"));

// ============================================
// Init
// ============================================
fetch("products.json")
    .then(res => res.json())
    .then(data => {
        const raw = Array.isArray(data) ? data : (data.products || []);
        products = raw.filter(p => p.network !== "Airtel");
        buildTypeFilters();
        renderProductsWithLoadMore();
        updateBottomBarActive("all");
    })
    .catch(err => console.error("Failed to load products:", err));