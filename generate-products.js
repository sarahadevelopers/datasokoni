const fs = require('fs');
const path = require('path');

// ===== 1. CREATE PRODUCT FOLDER IF MISSING =====
const productDir = './product';
if (!fs.existsSync(productDir)) {
    fs.mkdirSync(productDir);
    console.log('📁 Created /product folder');
}

// ===== 2. LOAD DATA =====
const products = require('./products.json');
const template = fs.readFileSync('./product-template.html', 'utf8');

// ===== 3. HELPER: Determine Product Type =====
function getProductType(product) {
    const title = product.title.toLowerCase();
    const type = product.type || '';
    
    if (type && ['data', 'minutes', 'sms'].includes(type)) {
        return type;
    }
    
    if (title.includes('mins') || title.includes('call') || title.includes('voice')) {
        if (title.includes('sms') || title.includes('calls/sms')) {
            return 'sms';
        }
        return 'minutes';
    }
    if (title.includes('sms')) {
        return 'sms';
    }
    return 'data';
}

// ===== 4. HELPER: Calculate Savings =====
function calculateSavings(product) {
    const ussdPrices = {
        'Safaricom': {
            '1.25 GB': 100,
            '2.5 GB': 500,
            '1.5 GB': 50,
            '1 GB': 50,
            '600 MB': 50,
            '300 MB': 30,
            '14 GB': 1000,
            '250 Mins': 230,
            '800 Mins': 975,
            '300 Mins': 485,
            '100 Mins': 96,
            '50 Mins': 51,
            '45 Mins': 50,
            '150 Calls/SMS': 96,
            '60 Calls/SMS': 40,
            '1700 Mins': 1940,
            '500 Mins': 485,
            '1250 Mins': 975,
            '150 Mins/2GB': 275,
            '550 Mins/6GB': 1000,
            '20 SMS': 5
        },
        'Airtel': {
            '2 GB': 100,
            '14 GB': 435,
            '30 GB': 950,
            '45 GB/400 Mins': 950,
            '7.5 GB': 435,
            '90 GB/900Mins': 1550,
            '200 MB/25Mins': 48,
            '1.5 GB': 48,
            '1 GB': 50,
            '1.2 GB': 96,
            '7 GB': 261,
            '100 Mins': 100,
            '1,000 SMS': 35,
            '600 MB': 48,
            '300 MB': 30
        }
    };

    const networkPrices = ussdPrices[product.network] || {};
    const officialPrice = networkPrices[product.title] || product.price * 1.5;
    const savings = Math.round(((officialPrice - product.price) / officialPrice) * 100);
    return Math.min(savings, 80);
}

// ===== 5. HELPER: Generate SKU =====
function generateSKU(product) {
    const network = product.network.substring(0, 3).toUpperCase();
    const id = String(product.id).padStart(3, '0');
    return `BD-${network}-${id}`;
}

// ===== 6. HELPER: Generate Description =====
function generateDescription(product) {
    const cleanTitle = product.title.replace(/\//g, 'and');
    const validity = product.validity;
    const price = product.price;
    
    let useCase = 'your daily internet needs';
    if (validity === 'Midnight') {
        useCase = 'late-night downloads and streaming';
    } else if (validity.includes('Hour') && parseInt(validity) <= 3) {
        useCase = 'quick internet access';
    } else if (validity.includes('Day') || validity.includes('Days')) {
        useCase = 'all-day browsing and streaming';
    }
    
    return `Get ${cleanTitle} of ${product.network} data for just Ksh ${price} valid ${validity}. Perfect for ${useCase}. Okoa friendly, instant delivery.`;
}

// ===== 7. HELPER: Generate Related Products =====
function getRelatedProducts(currentProduct, allProducts, limit = 3) {
    const sameNetwork = allProducts.filter(p => 
        p.network === currentProduct.network && p.id !== currentProduct.id
    );
    const shuffled = sameNetwork.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit);
    
    return selected.map(p => {
        const slug = generateSlug(p);
        return `
        <a href="/product/${slug}.html" class="related-card">
            <div class="r-name">${p.title}</div>
            <div class="r-price">Ksh ${p.price}</div>
            <div class="r-validity">⏱️ ${p.validity}</div>
        </a>
        `;
    }).join('');
}

// ===== 8. HELPER: Generate Slug (FIXED – includes ID for 100% uniqueness) =====
function generateSlug(product) {
    // Include network + title + validity + ID to make slugs 100% unique
    // Example: airtel-14-gb-7-days-27, airtel-14-gb-7-days-38
    const networkPrefix = product.network.toLowerCase();
    const titleSlug = product.title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\//g, '-')
        .replace(/[^a-z0-9-]/g, '');
    const validitySlug = product.validity
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/\//g, '-')
        .replace(/[^a-z0-9-]/g, '');
    return `${networkPrefix}-${titleSlug}-${validitySlug}-${product.id}`;
}

// ===== 9. HELPER: Generate Validity Date (7 days from now) =====
function getValidityDate() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// ===== 10. GENERATE PRODUCTS =====
let generatedCount = 0;

products.forEach(product => {
    // Validate product has required fields
    if (!product.id || !product.title || !product.price || !product.network) {
        console.warn(`⚠️ Skipping product: Missing required fields (id: ${product.id})`);
        return;
    }

    // Generate all dynamic values
    const slug = generateSlug(product);
    const savings = calculateSavings(product);
    const description = generateDescription(product);
    const relatedProducts = getRelatedProducts(product, products, 3);
    const networkClass = product.network === 'Airtel' ? 'airtel' : '';
    const productType = getProductType(product);
    const sku = generateSKU(product);
    const validityDate = getValidityDate();

    // Replace all placeholders
    const pageContent = template
        .replace(/\{\{PRODUCT_NAME\}\}/g, product.title)
        .replace(/\{\{PRICE\}\}/g, product.price)
        .replace(/\{\{VALIDITY\}\}/g, product.validity || 'Varies')
        .replace(/\{\{NETWORK\}\}/g, product.network)
        .replace(/\{\{NETWORK_CLASS\}\}/g, networkClass)
        .replace(/\{\{SLUG\}\}/g, slug)
        .replace(/\{\{BUNDLE_ID\}\}/g, product.id)
        .replace(/\{\{SKU\}\}/g, sku)
        .replace(/\{\{SAVINGS_PERCENT\}\}/g, savings)
        .replace(/\{\{PRODUCT_DESCRIPTION\}\}/g, description)
        .replace(/\{\{DATA_AMOUNT\}\}/g, product.title)
        .replace(/\{\{RELATED_PRODUCTS\}\}/g, relatedProducts)
        .replace(/\{\{VALIDITY_DATE\}\}/g, validityDate)
        .replace(/\{\{PRODUCT_TYPE\}\}/g, productType);

    // Write the file
    const filePath = `./product/${slug}.html`;
    fs.writeFileSync(filePath, pageContent);
    console.log(`✅ Generated: product/${slug}.html (${productType})`);
    generatedCount++;
});

console.log(`\n🎉 Done! Generated ${generatedCount} product pages.`);

// ===== 11. GENERATE PRODUCT SITEMAP =====
function generateProductSitemap() {
    const baseUrl = 'https://datasokoni.com';
    const today = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    products.forEach(product => {
        const slug = generateSlug(product);
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}/product/${slug}.html</loc>\n`;
        sitemap += `    <lastmod>${today}</lastmod>\n`;
        sitemap += `    <priority>0.6</priority>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `  </url>\n`;
    });
    
    sitemap += `</urlset>`;
    
    fs.writeFileSync('./product-sitemap.xml', sitemap);
    console.log(`✅ Generated: product-sitemap.xml (${products.length} product URLs)`);
}

// ===== 12. GENERATE PRODUCTS.JSON BACKUP (optional) =====
function generateProductsBackup() {
    const backup = JSON.stringify(products, null, 2);
    fs.writeFileSync('./products-backup.json', backup);
    console.log(`✅ Generated: products-backup.json`);
}

// Run all generators
console.log('\n🚀 Generating all assets...\n');
generateProductSitemap();
// generateProductsBackup(); // Uncomment if needed

console.log('\n✅ All done! Your product pages are ready.');