const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BLOG_DIR = './blog';
const BACKUP_DIR = './blog-brand-backup';

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
    console.log('📁 Created backup directory');
}

// Get all HTML files in blog directory
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'blog.html');

let updatedCount = 0;

files.forEach(file => {
    const filePath = path.join(BLOG_DIR, file);
    const backupPath = path.join(BACKUP_DIR, file);

    // Backup original
    fs.copyFileSync(filePath, backupPath);

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // ===== DOMAIN REFERENCES (FIX ANY OLD DOMAIN MENTIONS) =====
    // Replace any lingering bingwasoko.co.ke references with datasokoni.com
    content = content.replace(/bingwasoko\.co\.ke/g, 'datasokoni.com');
    content = content.replace(/https:\/\/bingwasoko\.co\.ke/g, 'https://datasokoni.com');
    
    // Fix any email domains
    content = content.replace(/support@bingwasoko\.co\.ke/g, 'support@datasokoni.com');

    // ===== BRAND NAME (ONLY FIX IF "BingwaSoko" OR "Bingwa Sokoni" SOMEHOW APPEARS) =====
    // These are edge-case fixes – DataSokoni already uses "Bingwa Data" correctly
    content = content.replace(/BingwaSoko/g, 'Bingwa Data');
    content = content.replace(/BingwaSoko's/g, "Bingwa Data's");
    content = content.replace(/BingwaSokoni/g, 'Bingwa Data');
    content = content.replace(/BingwaSokoni's/g, "Bingwa Data's");
    content = content.replace(/Bingwa Sokoni/g, 'Bingwa Data');
    content = content.replace(/Bingwa Sokoni's/g, "Bingwa Data's");
    
    // Fix legacy logo in header (if any)
    content = content.replace(
        /<span class="bingwa">Bingwa<\/span><span class="soko">(Sokoni|Soko)<\/span>/g,
        '<span class="bingwa">Bingwa</span><span class="soko">Data</span>'
    );

    // Fix legacy footer logo (if any)
    content = content.replace(
        /<h3 class="footer-logo">Bingwa<span> (Sokoni|Soko)<\/span><\/h3>/g,
        '<h3 class="footer-logo">Bingwa<span>Data</span></h3>'
    );

    // ===== COPYRIGHT YEAR =====
    content = content.replace(/© \d{4}/g, '© 2026');

    // ===== WHAT WE DO NOT CHANGE =====
    // ❌ Image names (bingwa-data-image-*.webp stay as they are)
    // ❌ Favicon (bingwa-data-favicon.webp stays as is)
    // ❌ Blog image assets (they are already correct)

    // Only write if changes were made
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        updatedCount++;
        console.log(`✅ Updated: ${file}`);
    } else {
        console.log(`⏭️ No changes needed: ${file}`);
    }
});

console.log(`\n✅ Done! Updated ${updatedCount} files.`);
console.log(`📁 Backups saved in: ${BACKUP_DIR}`);