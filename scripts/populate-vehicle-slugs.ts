import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function populateSlugs() {
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, make_model, year, registration_no, slug');

  if (error || !vehicles) {
    console.error('Error fetching vehicles:', error);
    return;
  }

  console.log(`Checking ${vehicles.length} vehicles for clean slugs...`);

  const seenSlugs = new Map<string, number>();
  let updatedCount = 0;

  for (const v of vehicles) {
    const makePart = slugify(v.make_model || 'vehicle');
    const yearPart = v.year ? `-${v.year}` : '';
    const regPart = v.registration_no ? `-${slugify(v.registration_no)}` : `-${v.id.slice(0, 6)}`;
    
    let slug = `${makePart}${yearPart}${regPart}`;

    const currentCount = seenSlugs.get(slug) || 0;
    seenSlugs.set(slug, currentCount + 1);

    if (currentCount > 0) {
      slug = `${slug}-${currentCount + 1}`;
    }

    if (v.slug !== slug) {
      const { error: updErr } = await supabase
        .from('vehicles')
        .update({ slug })
        .eq('id', v.id);

      if (updErr) {
        console.error(`Failed to update slug for ${v.id}:`, updErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`✅ Finished: Successfully updated ${updatedCount} vehicle slugs.`);
}

populateSlugs();
