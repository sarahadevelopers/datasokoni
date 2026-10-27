const fs = require('fs');
const path = require('path');

// Configuration
const BLOG_DIR = './blog';
const CSS_FILE = 'blog-full.css';
const OUTPUT_DIR = './blog'; // overwrite in place

// Mapping from inline style patterns to classes
const styleToClassMap = [
    // Warning box
    {
        pattern: /style="background:\s*#fff3cd;\s*border-left:\s*4px\s*solid\s*#ffc107;\s*padding:\s*1rem;\s*margin:\s*1\.5rem\s*0;"/gi,
        className: 'warning-box'
    },
    // Soft CTA
    {
        pattern: /style="background:\s*#e8f5e9;\s*padding:\s*1rem;\s*border-radius:\s*16px;\s*margin:\s*2rem\s*0;\s*text-align:\s*center;"/gi,
        className: 'soft-cta'
    },
    // FAQ item (no style, but we'll ensure consistency)
    {
        pattern: /<div class="faq-item" style="margin-bottom:\s*1rem;">/gi,
        replaceWith: '<div class="faq-item">'
    },
    // Till box (inline style already minimal, but we can clean)
    {
        pattern: /style="display:\s*inline-flex;\s*align-items:\s*center;\s*gap:\s*10px;\s*background:\s*#f9f9f9;\s*padding:\s*8px\s*16px;\s*border-radius:\s*50px;\s*border:\s*1px\s*solid\s*#eee;\s*margin:\s*1rem\s*0;"/gi,
        className: 'till-box'
    },
    // Trust badge
    {
        pattern: /style="display:\s*flex;\s*align-items:\s*center;\s*gap:\s*15px;\s*background:\s*#fdfdfd;\s*border:\s*1px\s*solid\s*#e0e0e0;\s*padding:\s*15px\s*25px;\s*border-radius:\s*16px;\s*margin:\s*2rem\s*0;"/gi,
        className: 'trust-badge'
    },
    // Related posts list items (just remove inline style)
    {
        pattern: /style="display:\s*flex;\s*align-items:\s*center;\s*gap:\s*12px;\s*margin-bottom:\s*1rem;"/gi,
        replaceWith: ''
    },
];

// Helper to replace inline style with class
function convertInlineStyles(htmlContent) {
    let updatedHtml = htmlContent;

    for (const mapping of styleToClassMap) {
        if (mapping.className) {
            // Replace style attribute with class
            updatedHtml = updatedHtml.replace(mapping.pattern, `class="${mapping.className}"`);
        } else if (mapping.replaceWith) {
            // Direct replacement (remove style attribute)
            updatedHtml = updatedHtml.replace(mapping.pattern, mapping.replaceWith);
        }
    }

    // Also remove any remaining empty style attributes (style="")
    updatedHtml = updatedHtml.replace(/style="\s*"/gi, '');

    // Update CSS link: ensure blog-full.css is included (and remove old style blocks)
    // First, remove any existing <style> block that contains blog-specific styles (we'll rely on external CSS)
    // But careful: do not remove critical CSS that is needed for above-fold. We'll instead keep only the 
    // critical CSS (the small one) and remove the large duplicate style blocks.
    // We'll find the first <style> tag that contains many lines (indicating it's the large block) and remove it.
    // Simpler: remove all <style> blocks that are not the critical one? Risk.
    // Instead, we'll assume the file already has a <style> block with blog-specific styles; we'll replace it with a link.
    // We'll look for a pattern: <style>/* Additional blog‑post styles */ ... </style> and replace with link.
    const largeStyleRegex = /<style>\s*\/\* Additional blog‑post styles \*\/[\s\S]*?<\/style>/gi;
    updatedHtml = updatedHtml.replace(largeStyleRegex, '');

    // Ensure the external CSS link is present (and only once)
    const cssLink = `<link rel="stylesheet" href="${CSS_FILE}">`;
    if (!updatedHtml.includes(CSS_FILE)) {
        // Insert after the Google Fonts link or before closing </head>
        updatedHtml = updatedHtml.replace(/<\/head>/, `    <link rel="stylesheet" href="${CSS_FILE}">\n</head>`);
    }

    return updatedHtml;
}

// Process all HTML files in BLOG_DIR
fs.readdir(BLOG_DIR, (err, files) => {
    if (err) {
        console.error('Error reading blog directory:', err);
        return;
    }

    const htmlFiles = files.filter(file => file.endsWith('.html'));
    console.log(`Found ${htmlFiles.length} blog HTML files.`);

    htmlFiles.forEach(file => {
        const filePath = path.join(BLOG_DIR, file);
        const originalContent = fs.readFileSync(filePath, 'utf8');
        const newContent = convertInlineStyles(originalContent);

        if (originalContent !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`✅ Converted: ${file}`);
        } else {
            console.log(`⏭️ No changes: ${file}`);
        }
    });

    console.log('🎉 Conversion complete!');
});
