/**
 * Generate AI images for DxR cases
 * Creates patient photos, physical exam findings, and radiology images
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import {
  generatePatientPhoto,
  generateSkinFinding,
  generateEyeFinding,
  generateChestXRay,
  generateCTScan,
  generateEKG,
  getRequiredImagesForCase,
} from '../src/lib/imageGeneration';
import { uploadImageToCloudinary } from '../src/lib/cloudinary';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

if (!process.env.CLOUDINARY_CLOUD_NAME) {
  console.error('❌ Missing Cloudinary configuration!');
  console.error('Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface GenerationOptions {
  caseId?: string; // Generate for specific case
  count?: number; // Number of cases to process
  onlyPatientPhotos?: boolean; // Only generate patient photos (faster MVP)
  skipExisting?: boolean; // Skip cases that already have images
}

async function generateImagesForCase(
  caseId: string,
  caseData: any,
  onlyPatientPhotos: boolean = false
): Promise<number> {
  console.log(`\n  📸 Generating images for case #${caseData.case_number}: ${caseData.title}`);

  let imagesGenerated = 0;

  try {
    // 1. Generate patient photo
    if (!caseData.patient_image_url) {
      console.log('    → Generating patient photo...');
      const { imageBuffer, prompt } = await generatePatientPhoto(caseData);

      // Upload to Cloudinary
      const publicId = `case_${caseData.case_number}_patient`;
      const { url, thumbnailUrl } = await uploadImageToCloudinary(
        imageBuffer,
        publicId,
        'dxr-patients'
      );

      // Update case with patient photo URL
      await supabase
        .from('dxr_cases')
        .update({ patient_image_url: url })
        .eq('id', caseId);

      // Save media record
      await supabase.from('dxr_media').insert({
        case_id: caseId,
        media_type: 'patient_photo',
        file_url: url,
        thumbnail_url: thumbnailUrl,
        title: 'Patient Photo',
        description: `${caseData.patient_age}yo ${caseData.patient_sex}`,
        requires_action: 'always_visible',
        ai_generated: true,
        generation_prompt: prompt,
      });

      imagesGenerated++;
      console.log('    ✓ Patient photo generated');

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // If only generating patient photos, stop here
    if (onlyPatientPhotos) {
      return imagesGenerated;
    }

    // 2. Get list of required images
    const requiredImages = getRequiredImagesForCase(caseData);
    console.log(`    → ${requiredImages.length - 1} additional images needed`);

    // 3. Generate each required image
    for (const imageReq of requiredImages) {
      if (imageReq.type === 'patient_photo') continue; // Already done

      // Check if already exists
      const { data: existing } = await supabase
        .from('dxr_media')
        .select('id')
        .eq('case_id', caseId)
        .eq('media_type', imageReq.type)
        .eq('description', imageReq.description)
        .single();

      if (existing) {
        console.log(`    ⊙ Skipping ${imageReq.type} (already exists)`);
        continue;
      }

      console.log(`    → Generating ${imageReq.type}: ${imageReq.description}...`);

      let imageBuffer: Buffer;
      let prompt: string;

      try {
        switch (imageReq.type) {
          case 'skin_finding':
            const result1 = await generateSkinFinding(imageReq.description);
            imageBuffer = result1.imageBuffer;
            prompt = result1.prompt;
            break;

          case 'eye_finding':
            const result2 = await generateEyeFinding(imageReq.description);
            imageBuffer = result2.imageBuffer;
            prompt = result2.prompt;
            break;

          case 'xray':
            const result3 = await generateChestXRay(imageReq.description);
            imageBuffer = result3.imageBuffer;
            prompt = result3.prompt;
            break;

          case 'ct_scan':
            const result4 = await generateCTScan('chest', imageReq.description);
            imageBuffer = result4.imageBuffer;
            prompt = result4.prompt;
            break;

          case 'ekg':
            const result5 = await generateEKG(imageReq.description);
            imageBuffer = result5.imageBuffer;
            prompt = result5.prompt;
            break;

          default:
            console.log(`    ⊙ Skipping unsupported type: ${imageReq.type}`);
            continue;
        }

        // Upload to Cloudinary
        const publicId = `case_${caseData.case_number}_${imageReq.type}_${Date.now()}`;
        const { url, thumbnailUrl } = await uploadImageToCloudinary(
          imageBuffer,
          publicId,
          `dxr-${imageReq.type}`
        );

        // Save media record
        await supabase.from('dxr_media').insert({
          case_id: caseId,
          media_type: imageReq.type,
          file_url: url,
          thumbnail_url: thumbnailUrl,
          title: imageReq.description,
          description: imageReq.description,
          requires_action: imageReq.action,
          ai_generated: true,
          generation_prompt: prompt,
        });

        imagesGenerated++;
        console.log(`    ✓ ${imageReq.type} generated`);

        // Rate limiting - 2 seconds between images
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`    ✗ Failed to generate ${imageReq.type}:`, error);
      }
    }

    return imagesGenerated;
  } catch (error) {
    console.error(`  ✗ Error generating images for case ${caseData.case_number}:`, error);
    return imagesGenerated;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options: GenerationOptions = {
    onlyPatientPhotos: args.includes('--patient-photos-only'),
    skipExisting: !args.includes('--regenerate'),
  };

  // Parse arguments
  const caseIdArg = args.find((arg) => arg.startsWith('--case-id='));
  if (caseIdArg) {
    options.caseId = caseIdArg.split('=')[1];
  }

  const countArg = args.find((arg) => arg.startsWith('--count='));
  if (countArg) {
    options.count = parseInt(countArg.split('=')[1], 10);
  }

  console.log('\n🎨 DxR Image Generation\n');
  console.log('Options:');
  console.log(`  Patient photos only: ${options.onlyPatientPhotos}`);
  console.log(`  Skip existing: ${options.skipExisting}`);
  console.log('');

  // Get cases to process
  let query = supabase.from('dxr_cases').select('*').order('case_number');

  if (options.caseId) {
    query = query.eq('id', options.caseId);
  } else if (options.skipExisting && options.onlyPatientPhotos) {
    query = query.is('patient_image_url', null);
  }

  if (options.count) {
    query = query.limit(options.count);
  }

  const { data: cases, error } = await query;

  if (error) {
    console.error('❌ Error fetching cases:', error);
    process.exit(1);
  }

  if (!cases || cases.length === 0) {
    console.log('No cases found to process.');
    process.exit(0);
  }

  console.log(`Found ${cases.length} cases to process\n`);

  let totalImages = 0;

  for (let i = 0; i < cases.length; i++) {
    const caseData = cases[i];
    console.log(`[${i + 1}/${cases.length}] Processing case #${caseData.case_number}`);

    const imagesGenerated = await generateImagesForCase(
      caseData.id,
      caseData,
      options.onlyPatientPhotos
    );

    totalImages += imagesGenerated;
  }

  console.log(`\n✅ Complete! Generated ${totalImages} images for ${cases.length} cases\n`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
