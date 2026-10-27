const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BASE_URL = 'https://datasokoni.com';
const BLOG_DIR = './blog';
const PRODUCT_DIR = './product';
const OUTPUT_DIR = './';

// Helper: Get last modified date from file or use current date
function getLastMod(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtime.toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
}

// Helper: Extract title from HTML
function extractTitle(filePath) {
    try {
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        const title = $('title').first().text();
        return title.replace(/\s*\|\s*Bingwa Data.*$/, '').trim();
    } catch (e) {
        return '';
    }
}

// ============================
// 1. PRODUCT SITEMAP
// ============================
function generateProductSitemap() {
    const files = fs.readdirSync(PRODUCT_DIR).filter(f => f.endsWith('.html'));
    let urls = [];

    for (const file of files) {
        const filePath = path.join(PRODUCT_DIR, file);
        const lastMod = getLastMod(filePath);
        const slug = file.replace('.html', '');
        urls.push({
            loc: `${BASE_URL}/product/${slug}.html`,
            lastmod: lastMod,
            priority: '0.6',
            changefreq: 'monthly'
        });
    }

    // Sort by ID (optional)
    urls.sort((a, b) => {
        const idA = parseInt(a.loc.match(/-(\d+)\.html$/)?.[1] || 0);
        const idB = parseInt(b.loc.match(/-(\d+)\.html$/)?.[1] || 0);
        return idA - idB;
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const url of urls) {
        xml += `  <url>\n`;
        xml += `    <loc>${url.loc}</loc>\n`;
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `  </url>\n`;
    }
    xml += `</urlset>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'product-sitemap.xml'), xml);
    console.log(`✅ Generated product-sitemap.xml with ${urls.length} products.`);
}

// ============================
// 2. BLOG SITEMAP
// ============================
function generateBlogSitemap() {
    const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'blog.html');
    let urls = [];

    for (const file of files) {
        const filePath = path.join(BLOG_DIR, file);
        const lastMod = getLastMod(filePath);
        const slug = file.replace('.html', '');
        const title = extractTitle(filePath);
        urls.push({
            loc: `${BASE_URL}/blog/${slug}.html`,
            lastmod: lastMod,
            priority: '0.7',
            changefreq: 'monthly'
        });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const url of urls) {
        xml += `  <url>\n`;
        xml += `    <loc>${url.loc}</loc>\n`;
        xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
        xml += `    <priority>${url.priority}</priority>\n`;
        xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
        xml += `  </url>\n`;
    }
    xml += `</urlset>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'blog-sitemap.xml'), xml);
    console.log(`✅ Generated blog-sitemap.xml with ${urls.length} blog posts.`);
}

// ============================
// 3. MAIN PAGES SITEMAP
// ============================
function generateMainSitemap() {
    const pages = [
        { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'weekly' },
        { loc: `${BASE_URL}/blog.html`, priority: '0.8', changefreq: 'weekly' },
        { loc: `${BASE_URL}/about.html`, priority: '0.7', changefreq: 'monthly' },
        { loc: `${BASE_URL}/faq.html`, priority: '0.7', changefreq: 'monthly' },
        { loc: `${BASE_URL}/terms.html`, priority: '0.5', changefreq: 'yearly' },
    ];

    // Check if files exist and get lastmod
    const fileMap = {
        '/': 'index.html',
        '/blog.html': 'blog.html',
        '/about.html': 'about.html',
        '/faq.html': 'faq.html',
        '/terms.html': 'terms.html',
    };

    for (const page of pages) {
        const filePath = page.loc.replace(BASE_URL, '.');
        if (fs.existsSync(filePath)) {
            page.lastmod = getLastMod(filePath);
        } else {
            // Try with index.html
            const indexPath = page.loc.replace(BASE_URL, '.') + 'index.html';
            if (fs.existsSync(indexPath)) {
                page.lastmod = getLastMod(indexPath);
            } else {
                page.lastmod = new Date().toISOString().split('T')[0];
            }
        }
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const page of pages) {
        xml += `  <url>\n`;
        xml += `    <loc>${page.loc}</loc>\n`;
        xml += `    <lastmod>${page.lastmod || new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `  </url>\n`;
    }
    xml += `</urlset>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'main-sitemap.xml'), xml);
    console.log(`✅ Generated main-sitemap.xml with ${pages.length} main pages.`);
}

// ============================
// 4. MASTER SITEMAP INDEX
// ============================
function generateMasterSitemap() {
    const sitemaps = [
        { loc: `${BASE_URL}/product-sitemap.xml` },
        { loc: `${BASE_URL}/blog-sitemap.xml` },
        { loc: `${BASE_URL}/main-sitemap.xml` },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const sitemap of sitemaps) {
        xml += `  <sitemap>\n`;
        xml += `    <loc>${sitemap.loc}</loc>\n`;
        xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        xml += `  </sitemap>\n`;
    }
    xml += `</sitemapindex>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);
    console.log(`✅ Generated master sitemap.xml with ${sitemaps.length} sitemaps.`);
}

// ============================
// RUN ALL
// ============================
try {
    // Create directories if they don't exist
    if (!fs.existsSync(PRODUCT_DIR)) {
        console.warn(`⚠️ ${PRODUCT_DIR} directory not found. Skipping product sitemap.`);
    } else {
        generateProductSitemap();
    }

    if (!fs.existsSync(BLOG_DIR)) {
        console.warn(`⚠️ ${BLOG_DIR} directory not found. Skipping blog sitemap.`);
    } else {
        generateBlogSitemap();
    }

    generateMainSitemap();
    generateMasterSitemap();

    console.log('\n🎉 All sitemaps generated successfully!');
    console.log('📂 Files created:');
    console.log(`   - sitemap.xml (master index)`);
    console.log(`   - product-sitemap.xml (${fs.readdirSync(PRODUCT_DIR).filter(f => f.endsWith('.html')).length} products)`);
    console.log(`   - blog-sitemap.xml (${fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'blog.html').length} blog posts)`);
    console.log(`   - main-sitemap.xml (5 main pages)`);
    console.log('\n📤 Submit sitemap.xml to Google Search Console.');

} catch (error) {
    console.error('❌ Error generating sitemaps:', error.message);
}