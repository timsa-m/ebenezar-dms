import dotenv from 'dotenv';
dotenv.config();

import { createAdminClient } from '../src/lib/supabase/admin';

async function migrateImages() {
  const supabase = createAdminClient();
  console.log('Fetching vehicles to check for Base64 images...');

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('id, make_model, images');

  if (error || !vehicles) {
    console.error('Error fetching vehicles:', error);
    return;
  }

  let totalMigrated = 0;

  for (const vehicle of vehicles) {
    if (!vehicle.images || !Array.isArray(vehicle.images) || vehicle.images.length === 0) {
      continue;
    }

    const hasBase64 = vehicle.images.some(img => typeof img === 'string' && img.startsWith('data:image'));
    if (!hasBase64) {
      continue;
    }

    console.log(`\nMigrating images for: ${vehicle.make_model} (${vehicle.id})...`);
    const newImages: string[] = [];

    for (let i = 0; i < vehicle.images.length; i++) {
      const img = vehicle.images[i];
      if (typeof img === 'string' && img.startsWith('data:image')) {
        const match = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!match) {
          newImages.push(img);
          continue;
        }

        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const filename = `vehicles/${vehicle.id}/gallery/img_${i}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('vehicle-assets')
          .upload(filename, buffer, { contentType: mimeType, upsert: true });

        if (uploadError) {
          console.error(`  Failed to upload image ${i}:`, uploadError.message);
          newImages.push(img);
        } else {
          const { data: pubData } = supabase.storage
            .from('vehicle-assets')
            .getPublicUrl(filename);
          newImages.push(pubData.publicUrl);
          totalMigrated++;
          console.log(`  Uploaded image ${i} -> ${pubData.publicUrl}`);
        }
      } else {
        newImages.push(img);
      }
    }

    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ images: newImages })
      .eq('id', vehicle.id);

    if (updateError) {
      console.error(`Failed to update vehicle ${vehicle.id}:`, updateError.message);
    } else {
      console.log(`Successfully updated ${vehicle.make_model} images in database.`);
    }
  }

  console.log(`\nMigration completed! Total images migrated: ${totalMigrated}`);
}

migrateImages();
