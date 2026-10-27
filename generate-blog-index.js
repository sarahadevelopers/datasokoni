const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BLOG_DIR = './blog';
const OUTPUT_FILE = './blog.html';

// Helper to extract metadata from an HTML file
function extractMetadata(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    
    // Try to get title from <title> tag (remove site name)
    let title = $('title').first().text();
    title = title.replace(/\s*\|\s*Bingwa Data.*$/, ''); // remove " | Bingwa Data Blog" etc.
    
    // Try to get description from meta description
    let excerpt = $('meta[name="description"]').attr('content') || '';
    // Fallback: first paragraph of .post-content
    if (!excerpt) {
        excerpt = $('.post-content p').first().text().substring(0, 160);
    }
    
    // Try to get date from .post-meta (e.g., "📅 26 May 2026")
    let dateText = $('.post-meta').text();
    const dateMatch = dateText.match(/(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/);
    let date = dateMatch ? dateMatch[0] : 'Unknown date';
    
    // Try to get image from .featured-image src
    let image = $('.featured-image').attr('src') || '/assets/blog-default-thumb.webp';
    // Ensure image path is absolute if it's relative
    if (image && !image.startsWith('http') && !image.startsWith('/')) {
        image = '/' + image; // prepend slash to make it root-relative
    }
    
    // Get the file name (slug)
    const slug = path.basename(filePath);
    
    return { title, excerpt, date, image, slug };
}

// Read all HTML files in /blog
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'blog.html');
const posts = [];

for (const file of files) {
    const filePath = path.join(BLOG_DIR, file);
    const meta = extractMetadata(filePath);
    posts.push(meta);
}

// Sort by date (newest first) – parse date string to Date object
function parseDate(dateStr) {
    // Handle "26 May 2026" format
    const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        const year = parseInt(parts[2]);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    return new Date(0); // fallback
}
posts.sort((a, b) => parseDate(b.date) - parseDate(a.date));

// Build the HTML
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bingwa Data Blog – Cheap Bundles, Airtime & Data Guides</title>
    <meta name="description" content="Expert tips, price comparisons, and guides to buying Safaricom and Airtel bundles cheaply. Save money with Till 1621614 – Okoa friendly.">
    <link rel="canonical" href="https://datasokoni.com/blog.html">
    <link rel="icon" type="image/webp" href="/bingwa-data-favicon.webp">
    <link rel="alternate icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style-full.css">
    <style>
        :root{--brand:#1A73E8;--safaricom:#009B4D;--airtel:#E10000}
        .blog-grid { max-width: 1100px; margin: 3rem auto; padding: 0 1.5rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 25px; }
        .index-card { background: white; border: 1px solid #edf2f7; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.01); transition: transform 0.2s; }
        .index-card:hover { transform: translateY(-3px); }
        .index-card img { width: 100%; height: 180px; object-fit: cover; }
        .index-card-content { padding: 1.5rem; display: flex; flex-direction: column; flex-grow: 1; }
        .index-date { font-size: 0.8rem; color: #64748b; margin-bottom: 0.5rem; }
        .index-card-content h2 { font-size: 1.25rem; margin: 0 0 0.75rem; line-height: 1.4; }
        .index-card-content h2 a { color: #1a1a1a; text-decoration: none; }
        .index-card-content h2 a:hover { color: var(--brand); }
        .index-card-content p { color: #4a5568; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem; }
        .read-more { color: var(--brand); font-weight: 700; text-decoration: none; margin-top: auto; font-size: 0.9rem; }
        .read-more:hover { text-decoration: underline; }
        @media (max-width: 768px) {
            .blog-grid { gap: 1rem; }
            .index-card-content { padding: 1rem; }
        }
    </style>
</head>
<body>
    <!-- Header (Bingwa Data) -->
    <header class="header">
        <div class="logo">
            <span class="bingwa">Bingwa</span><span class="soko">Data</span>
        </div>
        <div class="tagline">Your data marketplace – cheap internet bundles in Kenya.</div>
        <div class="system-status">
            <span class="pulse-dot"></span>
            <span class="status-text">System Online • Instant Delivery</span>
        </div>
        <a href="https://wa.me/254726948564" class="whatsapp-icon" target="_blank" aria-label="WhatsApp Support">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 1.89.52 3.64 1.43 5.15L2 22l4.85-1.43A9.97 9.97 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="#25D366"/>
                <path d="M12 6.5c-3.04 0-5.5 2.46-5.5 5.5 0 1.04.29 2.01.79 2.85L6.5 17.5l2.65-.79c.84.5 1.81.79 2.85.79 3.04 0 5.5-2.46 5.5-5.5S15.04 6.5 12 6.5z" fill="white"/>
            </svg>
        </a>
    </header>

    <main>
        <h1 style="text-align:center; margin-top:3rem; font-size:2.5rem; font-weight:800;">Bingwa Data Knowledge Hub</h1>
        <p style="text-align:center; color:#64748b; max-width:600px; margin:0.5rem auto 2rem;">Save money on every megabyte. Read our step‑by‑step guides and comparisons.</p>
        <div class="blog-grid">
            ${posts.map(post => `
            <article class="index-card">
                <img src="${post.image}" alt="${post.title}" loading="lazy" onerror="this.src='/assets/blog-default-thumb.webp'">
                <div class="index-card-content">
                    <span class="index-date">📅 ${post.date}</span>
                    <h2><a href="./blog/${post.slug}">${post.title}</a></h2>
                    <p>${post.excerpt.substring(0, 120)}...</p>
                    <a href="./blog/${post.slug}" class="read-more">Read more →</a>
                </div>
            </article>
            `).join('')}
        </div>
    </main>

    <!-- Footer (Bingwa Data) -->
    <footer class="footer">
        <div class="footer-grid">
            <div class="footer-about">
                <h3 class="footer-logo">Bingwa<span>Data</span></h3>
                <p>Your number one stop for affordable internet bundles. Secure payments via M-PESA Till 1621614.</p>
            </div>
            <div class="footer-support">
                <h4>Support</h4>
                <ul>
                    <li><a href="https://wa.me/254726948564">WhatsApp Help</a></li>
                    <li><a href="mailto:support@datasokoni.com">Email Us</a></li>
                </ul>
            </div>
            <div class="footer-links">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="faq.html">FAQs</a></li>
                    <li><a href="blog.html">Blogs</a></li>
                    <li><a href="about.html">About Us</a></li>
                    <li><a href="terms.html">Terms of Service</a></li>
                </ul>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 Bingwa Data | Built for Speed.</p>
            <p class="disclaimer">Payments secured via M-PESA STK Push (Till 1621614). Independent reseller platform – not affiliated with Safaricom or Airtel.</p>
        </div>
    </footer>
</body>
</html>`;

fs.writeFileSync(OUTPUT_FILE, indexHTML);
console.log(`✅ Generated ${OUTPUT_FILE} with ${posts.length} blog posts.`);