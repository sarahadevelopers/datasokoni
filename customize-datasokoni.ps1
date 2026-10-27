# ===== DataSokoni Customization Script =====
Write-Host "🚀 Customizing DataSokoni..." -ForegroundColor Green

# 1. Replace brand names in all files
Get-ChildItem -Recurse -Include *.html,*.js,*.css,*.json,*.xml | ForEach-Object {
    (Get-Content $_.FullName) -replace 'BingwaSoko', 'DataSokoni' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace 'BingwaSokoni', 'DataSokoni' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace 'bingwasoko', 'datasokoni' | Set-Content $_.FullName
    Write-Host "✅ Updated: $($_.Name)" -ForegroundColor Yellow
}

# 2. Rename images
if (Test-Path "bingwa-image-Safaricom.webp") {
    Rename-Item "bingwa-image-Safaricom.webp" "datasokoni-image-Safaricom.webp"
    Write-Host "✅ Renamed: bingwa-image-Safaricom.webp → datasokoni-image-Safaricom.webp"
}
if (Test-Path "bingwa-image-Airtel.webp") {
    Rename-Item "bingwa-image-Airtel.webp" "datasokoni-image-Airtel.webp"
    Write-Host "✅ Renamed: bingwa-image-Airtel.webp → datasokoni-image-Airtel.webp"
}
if (Test-Path "bingwa-image-2.webp") {
    Rename-Item "bingwa-image-2.webp" "datasokoni-image-fallback.webp"
    Write-Host "✅ Renamed: bingwa-image-2.webp → datasokoni-image-fallback.webp"
}
if (Test-Path "bingwa-logo.webp") {
    Rename-Item "bingwa-logo.webp" "datasokoni-logo.webp"
    Write-Host "✅ Renamed: bingwa-logo.webp → datasokoni-logo.webp"
}
if (Test-Path "bingwa-sokoni-favicon.webp") {
    Rename-Item "bingwa-sokoni-favicon.webp" "datasokoni-favicon.webp"
    Write-Host "✅ Renamed: bingwa-sokoni-favicon.webp → datasokoni-favicon.webp"
}

# 3. Update product-template.html image paths
$templateFile = "product-template.html"
if (Test-Path $templateFile) {
    (Get-Content $templateFile) -replace 'bingwa-image', 'datasokoni-image' | Set-Content $templateFile
    Write-Host "✅ Updated image paths in product-template.html"
}

Write-Host ""
Write-Host "✅ Customization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update meta descriptions in index.html"
Write-Host "2. Update logo text in index.html"
Write-Host "3. Regenerate product pages: node generate-products.js"
Write-Host "4. Submit sitemaps to Google Search Console"
Write-Host ""