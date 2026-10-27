// critical.js
let products = [];
let currentNetwork = "all";
let currentType = null;

// Load More variables
let allFilteredProducts = [];
let currentBatch = 0;
const BATCH_SIZE = 6; // reduced from 12 for faster initial paint

// DOM elements
const networkFilterBar = document.getElementById("networkFilterBar");
const typeFilterBar = document.getElementById("typeFilterBar");
const productGrid = document.getElementById("productGrid");
const bottomSafaricomBtn = document.getElementById("bottomSafaricomBtn");
const bottomAirtelBtn = document.getElementById("bottomAirtelBtn");
const loadMoreContainer = document.getElementById("loadMoreContainer");
const loadMoreBtn = document.getElementById("loadMoreBtn");

// ============================================
// Product Loading & Filtering
// ============================================

function buildNetworkFilters() {
    const networks = ["all", ...new Set(products.map(p => p.network))];
    networkFilterBar.innerHTML = networks.map(net => `
        <button class="filter-btn ${net === "all" ? "active" : ""}" data-network="${net}">
            ${net === "all" ? "All" : net}
        </button>
    `).join("");

    document.querySelectorAll("[data-network]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll("[data-network]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentNetwork = btn.dataset.network;
            currentType = null;
            updateTypeFilters();
            renderProductsWithLoadMore();
            updateBottomBarActive(currentNetwork);
        });
    });
}

function updateTypeFilters() {
    if (currentNetwork === "all") {
        typeFilterBar.style.display = "none";
        typeFilterBar.classList.remove("airtel-mode");
        return;
    }

    const availableTypes = [...new Set(products.filter(p => p.network === currentNetwork).map(p => p.type))];
    if (availableTypes.length === 0) {
        typeFilterBar.style.display = "none";
        typeFilterBar.classList.remove("airtel-mode");
        return;
    }

    typeFilterBar.style.display = "flex";
    typeFilterBar.innerHTML = availableTypes.map(type => `
        <button class="filter-btn ${currentType === type ? "active" : ""}" data-type="${type}">
            ${type === "data" ? "Data (MB/GB)" : type === "minutes" ? "Minutes" : "SMS"}
        </button>
    `).join("") + `<button class="filter-btn ${currentType === null ? "active" : ""}" data-type="all">All Types</button>`;

    if (currentNetwork.toLowerCase() === "airtel") {
        typeFilterBar.classList.add("airtel-mode");
    } else {
        typeFilterBar.classList.remove("airtel-mode");
    }

    document.querySelectorAll("[data-type]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentType = btn.dataset.type === "all" ? null : btn.dataset.type;
            renderProductsWithLoadMore();
            document.querySelectorAll("[data-type]").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

function getFilteredProducts() {
    let filtered = products;
    if (currentNetwork !== "all") {
        filtered = filtered.filter(p => p.network === currentNetwork);
    }
    if (currentType) {
        filtered = filtered.filter(p => p.type === currentType);
    }
    return filtered;
}

function renderProductsWithLoadMore() {
    allFilteredProducts = getFilteredProducts();
    currentBatch = 0;
    productGrid.innerHTML = "";
    
    // Insert trending banner once, before any products (if not already present)
    if (!document.querySelector('.trending-banner')) {
        const trendingTemplate = document.getElementById('trendingBannerTemplate');
        if (trendingTemplate) {
            const trendingClone = trendingTemplate.content.cloneNode(true);
            productGrid.appendChild(trendingClone);
            attachTrendingOfferHandlers();
        }
    }
    
    // CRITICAL: Call renderNextBatch to actually show products
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
        const card = template.content.cloneNode(true);
        const cardDiv = card.querySelector(".product-card");
        cardDiv.classList.add(product.network.toLowerCase());

        card.querySelector(".product-title").textContent = product.title;
        card.querySelector(".validity-badge").textContent = product.validity;
        card.querySelector(".price-value").textContent = product.price;
        
        card.querySelector(".btn-buy").dataset.productId = product.id;
        card.querySelector(".btn-gift").dataset.productId = product.id;

        card.querySelector(".btn-buy").addEventListener("click", () => {
            if (typeof openPaymentModal === 'function') openPaymentModal(product, "buy");
        });
        card.querySelector(".btn-gift").addEventListener("click", () => {
            if (typeof openPaymentModal === 'function') openPaymentModal(product, "gift");
        });
        
        const popularIds = [1, 4, 7, 12, 17, 23, 30];
        if (popularIds.includes(product.id)) {
            const popularBadge = card.querySelector(".popular-badge");
            if (popularBadge) popularBadge.style.display = "block";
        }

        productGrid.appendChild(card);
    });
    
    currentBatch += BATCH_SIZE;
    
    // Show the trending banner after the first batch (only once)
    if (currentBatch === BATCH_SIZE) {
        const bannerContainer = document.getElementById('trendingBannerContainer');
        if (bannerContainer && bannerContainer.style.visibility === 'hidden') {
            bannerContainer.style.visibility = 'visible';
            // Attach event handlers to the newly visible banner offers
            attachTrendingOfferHandlers();
        }
    }
    
    if (loadMoreBtn && currentBatch >= allFilteredProducts.length) {
        loadMoreBtn.style.display = "none";
    }
}
function attachTrendingOfferHandlers() {
    const trendingOffers = document.querySelectorAll('.trending-offer');
    trendingOffers.forEach(offer => {
        const bundleId = parseInt(offer.dataset.bundleId);
        const bundleTitle = offer.dataset.bundleTitle;
        const bundlePrice = parseInt(offer.dataset.bundlePrice);
        const bundleNetwork = offer.dataset.bundleNetwork;
        const bundleValidity = offer.dataset.bundleValidity;
        let bundleType = "data";
        if (bundleTitle.includes("Mins")) bundleType = "minutes";
        if (bundleTitle.includes("SMS")) bundleType = "sms";
        const product = {
            id: bundleId,
            title: bundleTitle,
            price: bundlePrice,
            network: bundleNetwork,
            validity: bundleValidity,
            type: bundleType
        };
        offer.addEventListener('click', (e) => {
            if (e.target.classList.contains('trending-offer-btn')) return;
            if (typeof openPaymentModal === 'function') openPaymentModal(product, 'buy');
        });
        const btn = offer.querySelector('.trending-offer-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof openPaymentModal === 'function') openPaymentModal(product, 'buy');
            });
        }
    });
}

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", renderNextBatch);
}

// ============================================
// Bottom Filter Bar
// ============================================

function updateBottomBarActive(network) {
    if (bottomSafaricomBtn) bottomSafaricomBtn.classList.remove("active");
    if (bottomAirtelBtn) bottomAirtelBtn.classList.remove("active");
    if (network === "Safaricom" && bottomSafaricomBtn) {
        bottomSafaricomBtn.classList.add("active");
    } else if (network === "Airtel" && bottomAirtelBtn) {
        bottomAirtelBtn.classList.add("active");
    }
}

function handleBottomNetworkClick(network) {
    const mainBtn = document.querySelector(`.filter-btn[data-network="${network}"]`);
    if (mainBtn) {
        mainBtn.click();
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    }
}

if (bottomSafaricomBtn) {
    bottomSafaricomBtn.addEventListener("click", () => handleBottomNetworkClick("Safaricom"));
}
if (bottomAirtelBtn) {
    bottomAirtelBtn.addEventListener("click", () => handleBottomNetworkClick("Airtel"));
}

// ============================================
// Initial Load (Products)
// ============================================

fetch("products.json")
    .then(res => res.json())
    .then(data => {
        products = data;
        buildNetworkFilters();
        renderProductsWithLoadMore();
    })
    .catch(err => console.error("Failed to load products:", err));
