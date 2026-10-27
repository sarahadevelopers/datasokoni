// hero-carousel.js
// ============================================
// Hero Carousel Functionality (Lightweight)
// ============================================

(function() {
    let currentSlide = 0;
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    const prevBtn = document.getElementById('heroPrevBtn');
    const nextBtn = document.getElementById('heroNextBtn');
    
    function showSlide(index) {
        if (!slides.length) return;
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
        if (dots.length) {
            dots.forEach(dot => dot.classList.remove('active'));
            dots[index].classList.add('active');
        }
        currentSlide = index;
    }
    
    function nextSlide() { showSlide(currentSlide + 1); }
    function prevSlide() { showSlide(currentSlide - 1); }
    
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    if (dots.length) {
        dots.forEach((dot, idx) => dot.addEventListener('click', () => showSlide(idx)));
    }
    
    let autoSlideInterval = setInterval(nextSlide, 5000); // 5 seconds
    
    const carousel = document.querySelector('.hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', () => clearInterval(autoSlideInterval));
        carousel.addEventListener('mouseleave', () => {
            autoSlideInterval = setInterval(nextSlide, 5000);
        });
    }
})();

// Hero CTA buttons (direct purchase)
document.querySelectorAll('.hero-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const bundleId = btn.dataset.bundleId;
        const bundleTitle = btn.dataset.bundleTitle;
        const bundlePrice = btn.dataset.bundlePrice;
        const bundleNetwork = btn.dataset.bundleNetwork;
        const product = {
            id: parseInt(bundleId),
            title: bundleTitle,
            price: parseInt(bundlePrice),
            network: bundleNetwork,
            validity: bundleNetwork === "Safaricom" ? "Midnight" : "Valid until midnight",
            type: bundleTitle.includes("GB") ? "data" : (bundleTitle.includes("Mins") ? "minutes" : "data")
        };
        if (typeof openPaymentModal === 'function') {
            openPaymentModal(product, 'buy');
        } else {
            console.error('openPaymentModal not ready');
            alert('Please wait, page is still loading. Try again in a moment.');
        }
    });
});
