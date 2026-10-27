// non-critical.js
// ============================================
// Payment Modal, Quick Buy, Live Notifications, Hero Section (Top Picks)
// ============================================

// ---------- Shared secret (must match API_SECRET in Render) ----------
const API_SECRET = "103e07b75c0b3d874cd4376dd0e095729f66d4f26803361aa087df169acc4ac4";

// ---------- reCAPTCHA site key (from Google) ----------
const RECAPTCHA_SITE_KEY = "6LcKDGEtAAAAAJKAWjXB7j5bSIPvzz94wBWapTD5";

// ---------- Modal Event Attachment ----------
function attachModalEvents() {
    const modal = document.getElementById('paymentModal');
    if (!modal) return;
    
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
    }
    
    modal.removeEventListener('click', outsideClickHandler);
    modal.addEventListener('click', outsideClickHandler);
    
    const doneBtn = modal.querySelector('.done-btn');
    if (doneBtn) {
        doneBtn.removeEventListener('click', closeModal);
        doneBtn.addEventListener('click', closeModal);
    }
}

function outsideClickHandler(e) {
    if (e.target === document.getElementById('paymentModal')) {
        closeModal();
    }
}

// ---------- Lazy‑load modal HTML when needed ----------
function ensureModalExists() {
    let modal = document.getElementById('paymentModal');
    if (modal) {
        attachModalEvents();
        return;
    }
    
    const modalHTML = `
        <div id="paymentModal" class="modal">
            <div class="modal-content">
                <span class="close">&times;</span>
                <div id="modalBody"></div>
                <div id="modalSpinner" style="display: none;" class="spinner-container">
                    <div class="spinner"></div>
                    <p class="spinner-text">Requesting M-PESA PIN... Check your phone.</p>
                </div>
                <div id="modalSuccess" style="display: none;" class="success-container">
                    <div class="checkmark">✔</div>
                    <h3>Payment Successful!</h3>
                    <p>Your bundle is being processed. Thank you for choosing DataSokonini.</p>
                    <button class="done-btn">Done</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    attachModalEvents();
}

// ---------- Payment Modal ----------
let selectedProduct = null;
let currentAction = null;
const phonePattern = '^(07[0-9]{8}|011[0-9]{7}|2547[0-9]{8}|25411[0-9]{7})$';

function validatePhone(phone) {
    const regex = new RegExp(phonePattern);
    return regex.test(phone);
}

function openPaymentModal(product, action) {
    ensureModalExists();
    
    selectedProduct = product;
    currentAction = action;
    const savedNumber = localStorage.getItem("DataSokonini_saved_number") || "";

    document.body.classList.add("modal-open");

    document.getElementById("modalBody").style.display = "block";
    document.getElementById("modalSpinner").style.display = "none";
    document.getElementById("modalSuccess").style.display = "none";

    let html = `
        <div class="product-summary">
            <h3>${product.title}</h3>
            <p>${product.validity} · Ksh ${product.price}</p>
        </div>
    `;

    if (action === "gift") {
        html += `
            <input type="tel" id="recipientNumber" placeholder="Recipient's number (e.g., 0712345678)" pattern="${phonePattern}" required>
            <input type="tel" id="payerNumber" placeholder="Your number for payment" value="${savedNumber}" pattern="${phonePattern}" required>
            <div class="save-number">
                <input type="checkbox" id="saveNumberCheckbox" ${savedNumber ? "checked" : ""}>
                <label for="saveNumberCheckbox">Save my number for next time</label>
            </div>
            <button class="pay-btn" id="payNowBtn">Send Gift</button>
        `;
    } else {
        html += `
            <input type="tel" id="payerNumber" placeholder="Your phone number" value="${savedNumber}" pattern="${phonePattern}" required>
            <div class="save-number">
                <input type="checkbox" id="saveNumberCheckbox" ${savedNumber ? "checked" : ""}>
                <label for="saveNumberCheckbox">Save my number for next time</label>
            </div>
            <button class="pay-btn" id="payNowBtn">Pay via M-PESA</button>
        `;
    }

    document.getElementById("modalBody").innerHTML = html;

    const payBtn = document.getElementById("payNowBtn");
    if (payBtn) {
        payBtn.removeEventListener("click", handlePayClick);
        payBtn.addEventListener("click", handlePayClick);
    }

    function handlePayClick() {
        const saveCheckbox = document.getElementById("saveNumberCheckbox").checked;
        let payerNumber = document.getElementById("payerNumber").value.trim();
        if (!validatePhone(payerNumber)) {
            alert("Enter a valid Safaricom number (07XXXXXXXX, 011XXXXXXX, 2547XXXXXXXX, or 25411XXXXXXX).");
            return;
        }
        if (saveCheckbox) {
            localStorage.setItem("DataSokonini_saved_number", payerNumber);
        } else {
            localStorage.removeItem("DataSokonini_saved_number");
        }

        let recipientNumber = payerNumber;
        if (action === "gift") {
            recipientNumber = document.getElementById("recipientNumber").value.trim();
            if (!validatePhone(recipientNumber)) {
                alert("Enter a valid recipient number.");
                return;
            }
        }

        initiatePayment(product, payerNumber, recipientNumber, action);
    }

    document.getElementById("paymentModal").style.display = "flex";
}

// ---------- Initiate Payment (with reCAPTCHA & Secret) ----------
function initiatePayment(product, payerNumber, recipientNumber, action) {
    document.getElementById("modalBody").style.display = "none";
    document.getElementById("modalSpinner").style.display = "block";

    const apiUrl = (typeof window.API_BASE_URL !== 'undefined')
        ? window.API_BASE_URL + "/api/pay"
        : "https://saraha-pay-daraja.onrender.com/api/pay";

    const payload = {
        name: product.title,
        phone: payerNumber,
        amount: product.price,
        recipient: action === "gift" ? recipientNumber : undefined
    };

    // Check if reCAPTCHA is available
    if (typeof grecaptcha === 'undefined') {
        console.error("reCAPTCHA not loaded – aborting payment");
        alert("Security verification failed. Please refresh the page and try again.");
        closeModal();
        return;
    }

    // Use grecaptcha.ready() to ensure it's fully loaded
    grecaptcha.ready(() => {
        grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'payment' })
            .then(token => {
                if (!token || token.length === 0) {
                    console.error("reCAPTCHA returned empty token");
                    alert("Security verification failed. Please refresh and try again.");
                    closeModal();
                    return;
                }
                // Send the request with the token
                sendPaymentRequest(apiUrl, payload, token, product, action);
            })
            .catch(err => {
                console.error("reCAPTCHA error:", err);
                alert("Security verification failed. Please refresh and try again.");
                closeModal();
            });
    });
}

// ---------- Actual fetch with headers ----------
function sendPaymentRequest(apiUrl, payload, recaptchaToken, product, action) {
    fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Secret": API_SECRET,
            "X-Recaptcha-Token": recaptchaToken
        },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            if (action !== "gift") saveLastPurchase(product);
            return { success: true, transactionId: data.transactionId };
        } else {
            throw new Error(data.error || data.details || "Payment failed");
        }
    })
    .then(() => {
        setTimeout(() => {
            document.getElementById("modalSpinner").style.display = "none";
            document.getElementById("modalSuccess").style.display = "block";
        }, 2000);
    })
    .catch(error => {
        console.error("Payment error:", error);
        alert("Payment failed: " + error.message);
        closeModal();
    });
}

// ---------- Close Modal ----------
function closeModal() {
    const modal = document.getElementById("paymentModal");
    if (!modal) return;
    
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
    
    const modalBody = document.getElementById("modalBody");
    const modalSpinner = document.getElementById("modalSpinner");
    const modalSuccess = document.getElementById("modalSuccess");
    
    if (modalBody) modalBody.style.display = "block";
    if (modalSpinner) modalSpinner.style.display = "none";
    if (modalSuccess) modalSuccess.style.display = "none";
    
    selectedProduct = null;
    currentAction = null;
}

// ---------- Quick Buy Bar ----------
function saveLastPurchase(product) {
    localStorage.setItem('DataSokonini_last_bundle', JSON.stringify({
        title: product.title,
        network: product.network,
        price: product.price,
        validity: product.validity,
        type: product.type,
        id: product.id
    }));
    showQuickBuyBar();
}

function showQuickBuyBar() {
    const lastBundle = localStorage.getItem('DataSokonini_last_bundle');
    if (!lastBundle) return;
    const quickBuyBar = document.getElementById('quickBuyBar');
    const lastBundleName = document.getElementById('lastBundleName');
    if (!quickBuyBar || !lastBundleName) return;
    const bundle = JSON.parse(lastBundle);
    lastBundleName.innerText = `${bundle.title} (Ksh ${bundle.price})`;
    quickBuyBar.classList.add('show');
    setTimeout(() => quickBuyBar.classList.remove('show'), 6000);
}

const repeatBuyBtn = document.getElementById('repeatBuyBtn');
if (repeatBuyBtn) {
    repeatBuyBtn.addEventListener('click', () => {
        const lastBundle = localStorage.getItem('DataSokonini_last_bundle');
        if (lastBundle) openPaymentModal(JSON.parse(lastBundle), 'buy');
    });
}

// ---------- Live Notifications ----------
const purchaseMessages = [
    "🔥 Someone in Nairobi just bought 1.25GB!",
    "📞 Customer in Mombasa purchased 45 minutes",
    "⚡ Nakuru user just got 2.5GB data!",
    "📱 Kisumu customer topped up 1GB",
    "💬 Eldoret user bought 50 minutes",
    "🚀 Thika resident just grabbed 1GB for 1 hour!"
];

let notifIndex = 0;

function startLiveNotifications() {
    const notif = document.getElementById('liveNotification');
    if (!notif) return;
    setInterval(() => {
        const notifText = document.getElementById('liveNotifText');
        if (notifText) {
            notifText.innerText = purchaseMessages[notifIndex % purchaseMessages.length];
        }
        notif.style.display = 'block';
        setTimeout(() => notif.style.display = 'none', 4000);
        notifIndex++;
    }, 25000);
}

// ---------- Hero Section (Top Picks) ----------
function renderHeroSection() {
    const heroContainer = document.getElementById("heroScroll");
    if (!heroContainer) return;
    if (typeof products === 'undefined') return;
    const topPickIds = [1, 23, 17, 30, 41, 10];
    const topPicks = products.filter(p => topPickIds.includes(p.id)).slice(0, 6);
    if (topPicks.length === 0) return;

    heroContainer.innerHTML = topPicks.map(product => `
        <div class="hero-card ${product.network.toLowerCase()}" data-product-id="${product.id}">
            <div class="network-strip" style="background: ${product.network === "Safaricom" ? "var(--safaricom)" : product.network === "Airtel" ? "var(--airtel)" : "var(--utility)"};"></div>
            <div class="featured-badge">⭐ Top Pick</div>
            <div class="card-header">
                <div class="product-title">${product.title}</div>
                <div class="validity-badge">${product.validity}</div>
            </div>
            <div class="price-container">
                <span class="currency">Ksh</span>
                <span class="price-value">${product.price}</span>
            </div>
            <div class="okoa-badge">⚡ Okoa Friendly</div>
            <div class="actions">
                <button class="btn-buy">Buy Now</button>
                <button class="btn-gift">Gift</button>
            </div>
        </div>
    `).join("");

    document.querySelectorAll(".hero-card").forEach(card => {
        const productId = parseInt(card.dataset.productId);
        const product = products.find(p => p.id === productId);
        if (!product) return;
        card.querySelector(".btn-buy").addEventListener("click", (e) => {
            e.stopPropagation();
            openPaymentModal(product, "buy");
        });
        card.querySelector(".btn-gift").addEventListener("click", (e) => {
            e.stopPropagation();
            openPaymentModal(product, "gift");
        });
    });
}

// ---------- Wait for critical.js to define products ----------
function waitForProducts() {
    if (typeof products !== 'undefined' && products.length) {
        renderHeroSection();
        startLiveNotifications();
        setTimeout(() => {
            if (localStorage.getItem('DataSokonini_last_bundle')) showQuickBuyBar();
        }, 1000);
    } else {
        setTimeout(waitForProducts, 200);
    }
}

// ===== FIX: Ensure close button works on existing modals =====
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('paymentModal')) {
        attachModalEvents();
    }
});

waitForProducts();