import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = 'https://ebenezarenterprises.com';

async function generateSitemap() {
  console.log('🔍 Fetching published vehicles from Supabase...');

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, make_model, slug, is_published, for_hire, status, updated_at, created_at')
    .eq('is_published', true);

  if (error) {
    console.error('❌ Error fetching vehicles:', error.message);
    process.exit(1);
  }

  const currentDate = new Date().toISOString().split('T')[0];
  console.log(`📋 Found ${vehicles?.length || 0} published vehicles.`);

  const staticPages = [
    {
      loc: `${BASE_URL}/`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '1.0',
      comment: 'Homepage & Featured Showroom',
    },
    {
      loc: `${BASE_URL}/inventory`,
      lastmod: currentDate,
      changefreq: 'daily',
      priority: '0.95',
      comment: 'Complete Vehicle Inventory / Showroom',
    },
    {
      loc: `${BASE_URL}/trade-in`,
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '0.8',
      comment: 'Vehicle Trade-In & Valuation',
    },
    {
      loc: `${BASE_URL}/contact`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.8',
      comment: 'Dealership Location & Contact',
    },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n`;
  xml += `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n`;
  xml += `        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n\n`;

  xml += `  <!-- Core Navigation Pages -->\n`;
  for (const page of staticPages) {
    xml += `  <!-- ${page.comment} -->\n`;
    xml += `  <url>\n`;
    xml += `    <loc>${page.loc}</loc>\n`;
    xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n\n`;
  }

  if (vehicles && vehicles.length > 0) {
    xml += `  <!-- Published Vehicles for Sale -->\n`;
    for (const v of vehicles) {
      const slugOrId = v.slug || v.id;
      const lastmodDate = (v.updated_at || v.created_at || currentDate).split('T')[0];
      const name = v.make_model || 'Vehicle';

      xml += `  <!-- ${name} -->\n`;
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/vehicle/${slugOrId}</loc>\n`;
      xml += `    <lastmod>${lastmodDate}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.85</priority>\n`;
      xml += `  </url>\n\n`;

      if (v.for_hire) {
        xml += `  <!-- ${name} (Hire) -->\n`;
        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/vehicle/hire/${slugOrId}</loc>\n`;
        xml += `    <lastmod>${lastmodDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n\n`;
      }
    }
  }

  xml += `</urlset>\n`;

  const sitemapPath = path.resolve('EbenezarCar-Bazaar', 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml, 'utf8');

  console.log(`✅ Sitemap successfully written to ${sitemapPath}`);
  console.log(`📊 Total URLs in sitemap: ${staticPages.length + (vehicles?.length || 0)}`);
}

generateSitemap();
