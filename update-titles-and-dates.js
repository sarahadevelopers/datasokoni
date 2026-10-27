const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const BLOG_DIR = './blog';
const BACKUP_DIR = './blog-title-date-backup';

// Create backup directory
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
    console.log('📁 Created backup directory');
}

// Get all HTML files in blog directory
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'blog.html');

let updatedCount = 0;
let titleUpdatedCount = 0;
let dateUpdatedCount = 0;

files.forEach(file => {
    const filePath = path.join(BLOG_DIR, file);
    const backupPath = path.join(BACKUP_DIR, file);

    // Backup original
    fs.copyFileSync(filePath, backupPath);

    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    let modified = false;

    // ===== 1. UPDATE TITLE WITH (2026) =====
    const titleTag = $('title');
    if (titleTag.length > 0) {
        let titleText = titleTag.text();
        // Check if title already has (2026) or (2025)
        if (!titleText.includes('(2026)') && !titleText.includes('(2025)')) {
            // Don't add year if it's a blog index or generic page
            if (!titleText.includes('Blog') && !titleText.includes('Home')) {
                // Add (2026) at the end, before the separator if exists
                if (titleText.includes('|')) {
                    titleText = titleText.replace('|', '(2026) |');
                } else {
                    titleText = titleText + ' (2026)';
                }
                titleTag.text(titleText);
                modified = true;
                titleUpdatedCount++;
                console.log(`✅ Updated title: ${file}`);
            }
        }
    }

    // ===== 2. ADD "Last Updated" TO POST META =====
    const postMeta = $('.post-meta');
    if (postMeta.length > 0) {
        const currentText = postMeta.text();
        // Check if "Last updated" is already present
        if (!currentText.includes('Last updated')) {
            // Check if there's a date already (e.g., "📅 July 26, 2026")
            const dateMatch = currentText.match(/📅\s*([^·]+)/);
            if (dateMatch) {
                // Add Last updated after the date
                const newText = currentText + ' · 📝 Last updated: July 2026';
                postMeta.text(newText);
                modified = true;
                dateUpdatedCount++;
                console.log(`  ✅ Added Last Updated date: ${file}`);
            } else {
                // If no date found, add at the end
                const newText = currentText + ' · 📝 Last updated: July 2026';
                postMeta.text(newText);
                modified = true;
                dateUpdatedCount++;
                console.log(`  ✅ Added Last Updated date: ${file}`);
            }
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, $.html());
        updatedCount++;
    } else {
        console.log(`  ⏭️ No changes needed: ${file}`);
    }
});

console.log(`\n✅ Done!`);
console.log(`📊 Updated ${updatedCount} files`);
console.log(`   - Titles updated: ${titleUpdatedCount}`);
console.log(`   - Last Updated added: ${dateUpdatedCount}`);
console.log(`📁 Backups saved in: ${BACKUP_DIR}`);