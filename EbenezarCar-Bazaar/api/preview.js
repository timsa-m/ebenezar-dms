/**
 * Dynamic Open Graph & Social Preview Generator for Ebenezar Car Bazaar
 * 
 * Features:
 * - Serves rich Open Graph (og:image 1200x630, summary_large_image) for WhatsApp Status,
 *   WhatsApp chats, Facebook, X (Twitter), Telegram, iMessage, and other social crawlers.
 * - Supports short links: /v/:id (e.g., /v/toyota-passo-kcc771p or /v/kcc771p).
 * - Redirects directly to /inventory if vehicle is not found or invalid.
 * - Instantly transitions regular browser visitors to the full vehicle details page.
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatKES(amount) {
  if (!amount || isNaN(Number(amount))) return '';
  return `KSh ${Number(amount).toLocaleString('en-KE')}`;
}

export default async function handler(req, res) {
  const { id, isHire } = req.query;
  const cleanId = String(id || '').trim();

  // If no ID is provided, redirect to inventory
  if (!cleanId) {
    return res.redirect(302, '/inventory');
  }

  const host = req.headers.host || 'ebenezarenterprises.com';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const siteUrl = `${protocol}://${host}`;

  let vehicle = null;

  try {
    // 1. Fetch vehicle data from production DMS API
    const dmsUrl = `https://dms.ebenezarenterprises.com/api/vehicles/${encodeURIComponent(cleanId)}`;
    const response = await fetch(dmsUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4500)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && !data.error && (data._id || data.id || data.name)) {
        vehicle = data;
      }
    }
  } catch (err) {
    console.warn(`[Preview API] Error fetching vehicle ${cleanId}:`, err.message);
  }

  // 2. If vehicle not found, redirect to /inventory as requested
  if (!vehicle) {
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.redirect(302, `${siteUrl}/inventory`);
  }

  // 3. Resolve vehicle attributes
  const rawTitle = vehicle.name || vehicle.make_model || 'Quality Vehicle';
  const year = vehicle.modelYear || vehicle.year || '';
  const makeModel = `${year ? year + ' ' : ''}${rawTitle}`.trim();
  const price = isHire
    ? (vehicle.hirePrice || vehicle.hire_price || 0)
    : (vehicle.price || vehicle.sale_price || 0);
  const formattedPrice = price ? formatKES(price) : 'Contact for Price';
  const priceDisplay = isHire ? `${formattedPrice}/day` : formattedPrice;

  const slug = vehicle.slug || vehicle._id || cleanId;
  const targetPath = isHire ? `/vehicle/hire/${encodeURIComponent(slug)}` : `/vehicle/${encodeURIComponent(slug)}`;
  const shortLink = `${siteUrl}/v/${encodeURIComponent(slug)}`;
  const canonicalUrl = `${siteUrl}${targetPath}`;

  // Vehicle photo for large WhatsApp status / social card preview
  const primaryImage = (Array.isArray(vehicle.images) && vehicle.images.length > 0)
    ? vehicle.images[0]
    : (vehicle.primaryImage || `${siteUrl}/logo.png`);

  const category = vehicle.category || vehicle.type || 'Vehicle';
  const transmission = vehicle.transmission || 'Automatic';
  const fuel = vehicle.fuelType || vehicle.fuel_type || 'Petrol';
  const location = vehicle.location || 'Kisumu, Kenya';

  // Compelling description for social snippet
  const description = vehicle.description
    ? vehicle.description.replace(/<[^>]*>/g, '').slice(0, 160).trim()
    : `Verified ${makeModel} (${category}, ${transmission}, ${fuel}) available for ${isHire ? 'hire' : 'sale'} at Ebenezar Car Bazaar, ${location}. Flexible asset financing, hire purchase & trade-ins.`;

  const pageTitle = `${makeModel} - ${priceDisplay} | Ebenezar Car Bazaar Kenya`;

  // 4. Check if the requester is a social media crawler/bot
  const userAgent = req.headers['user-agent'] || '';
  const isCrawler = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|applebot|pinterest|skypeuripreview|googlebot|bingbot/i.test(userAgent);

  // If a human visitor in a normal browser opened /v/:id, immediately redirect to SPA page
  if (!isCrawler && req.headers.accept && req.headers.accept.includes('text/html')) {
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.redirect(302, targetPath);
  }

  // 5. Generate high-resolution Open Graph HTML response for crawlers & WhatsApp
  // Note: og:image:width 1200 & og:image:height 630 trigger WhatsApp's large 3/4 card preview
  const html = `<!DOCTYPE html>
<html lang="en" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Ebenezar Car Bazaar">
  <meta property="og:title" content="${escapeHtml(makeModel)} - ${escapeHtml(priceDisplay)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(shortLink)}">
  <meta property="og:image" content="${escapeHtml(primaryImage)}">
  <meta property="og:image:secure_url" content="${escapeHtml(primaryImage)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(makeModel)}">
  <meta property="og:locale" content="en_KE">

  <!-- Twitter / X Card (Large Image) -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@ebenezarvehicles">
  <meta name="twitter:title" content="${escapeHtml(makeModel)} - ${escapeHtml(priceDisplay)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(primaryImage)}">
  <meta name="twitter:image:alt" content="${escapeHtml(makeModel)}">

  <!-- Schema.org Structured Data -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Car",
    "name": ${JSON.stringify(makeModel)},
    "image": ${JSON.stringify(primaryImage)},
    "description": ${JSON.stringify(description)},
    "offers": {
      "@type": "Offer",
      "price": ${JSON.stringify(price)},
      "priceCurrency": "KES",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "AutoDealer",
        "name": "Ebenezar Car Bazaar",
        "telephone": "+254722263192",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "38 Ondiek Highway",
          "addressLocality": "Kisumu",
          "addressCountry": "KE"
        }
      }
    }
  }
  </script>

  <!-- Instant Browser Redirect -->
  <meta http-equiv="refresh" content="0;url=${escapeHtml(targetPath)}">
  <script>
    window.location.replace(${JSON.stringify(targetPath)});
  </script>

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05);
      max-width: 540px;
      width: 100%;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .img-container {
      position: relative;
      width: 100%;
      height: 280px;
      background: #0f172a;
    }
    .img-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .price-badge {
      position: absolute;
      bottom: 14px;
      left: 14px;
      background: rgba(11, 77, 183, 0.95);
      color: #ffffff;
      font-weight: 800;
      font-size: 1.1rem;
      padding: 6px 14px;
      border-radius: 8px;
      backdrop-filter: blur(4px);
    }
    .content {
      padding: 20px;
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.5;
    }
    .short-link {
      background: #f1f5f9;
      padding: 6px 10px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #334155;
      display: inline-block;
      margin-bottom: 16px;
    }
    .btn {
      display: block;
      width: 100%;
      text-align: center;
      background: #0B4DB7;
      color: #ffffff;
      font-weight: 700;
      padding: 12px;
      border-radius: 10px;
      text-decoration: none;
      box-sizing: border-box;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #083b8d;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="img-container">
      <img src="${escapeHtml(primaryImage)}" alt="${escapeHtml(makeModel)}">
      <div class="price-badge">${escapeHtml(priceDisplay)}</div>
    </div>
    <div class="content">
      <h1>${escapeHtml(makeModel)}</h1>
      <div class="short-link">${escapeHtml(shortLink)}</div>
      <p>${escapeHtml(description)}</p>
      <a class="btn" href="${escapeHtml(targetPath)}">View Vehicle Details</a>
    </div>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
