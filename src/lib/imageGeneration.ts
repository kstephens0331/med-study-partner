/**
 * AI Image Generation for DxR Cases
 * Uses Together AI's Stable Diffusion models
 */

import { DxRCase, PatientCharacteristics } from '@/types/dxr';

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY!;
const IMAGE_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0'; // or 'runwayml/stable-diffusion-v1-5'

interface ImageGenerationResult {
  imageBuffer: Buffer;
  prompt: string;
}

/**
 * Generate an image using Together AI's Stable Diffusion
 */
async function generateImageWithTogetherAI(
  prompt: string,
  negativePrompt?: string
): Promise<Buffer> {
  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      negative_prompt: negativePrompt || 'blurry, low quality, distorted, cartoon, anime, drawing, illustration, text, watermark',
      width: 1024,
      height: 1024,
      steps: 30,
      n: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image generation failed: ${error}`);
  }

  const data = await response.json();

  // data.data[0].url contains a base64 encoded image or URL
  const imageUrl = data.data[0].url;

  // If it's a URL, fetch the image
  if (imageUrl.startsWith('http')) {
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // If it's base64, decode it
  const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Generate a patient photo based on demographics
 */
export async function generatePatientPhoto(
  caseData: DxRCase
): Promise<ImageGenerationResult> {
  const age = caseData.patient_age;
  const sex = caseData.patient_sex === 'M' ? 'male' : 'female';

  // Age category for more realistic prompts
  let ageCategory = '';
  if (age < 18) ageCategory = 'child';
  else if (age < 30) ageCategory = 'young adult';
  else if (age < 50) ageCategory = 'middle-aged';
  else if (age < 70) ageCategory = 'older';
  else ageCategory = 'elderly';

  const prompt = `Professional medical photograph of a ${age} year old ${sex} ${ageCategory} patient,
neutral expression, wearing hospital gown, clinical setting background,
professional medical photography, high quality, realistic, front-facing portrait,
soft medical lighting, clean background, photorealistic`;

  const negativePrompt = 'blurry, cartoon, anime, drawing, illustration, makeup, jewelry,
smiling, text, watermark, distorted features, low quality';

  const imageBuffer = await generateImageWithTogetherAI(prompt, negativePrompt);

  return {
    imageBuffer,
    prompt,
  };
}

/**
 * Generate a skin finding image (jaundice, cyanosis, rash, etc.)
 */
export async function generateSkinFinding(
  finding: string,
  location: string = 'torso'
): Promise<ImageGenerationResult> {
  const prompt = `Professional medical photograph showing ${finding} on patient ${location},
close-up clinical photography, clear detail, medical documentation quality,
realistic skin texture, professional medical lighting, high resolution, photorealistic`;

  const negativePrompt = 'blurry, cartoon, drawing, illustration, text, watermark,
distorted, low quality, amateur photography';

  const imageBuffer = await generateImageWithTogetherAI(prompt, negativePrompt);

  return {
    imageBuffer,
    prompt,
  };
}

/**
 * Generate an eye finding image
 */
export async function generateEyeFinding(
  finding: string
): Promise<ImageGenerationResult> {
  const prompt = `Professional medical close-up photograph of human eye showing ${finding},
ophthalmology examination photo, high detail, clear focus, medical documentation quality,
professional medical lighting, realistic eye anatomy, photorealistic`;

  const negativePrompt = 'blurry, cartoon, drawing, illustration, text, watermark,
distorted, low quality, multiple eyes, closed eye';

  const imageBuffer = await generateImageWithTogetherAI(prompt, negativePrompt);

  return {
    imageBuffer,
    prompt,
  };
}

/**
 * Generate a chest X-ray image
 */
export async function generateChestXRay(
  findings: string
): Promise<ImageGenerationResult> {
  const prompt = `Medical chest X-ray radiograph showing ${findings},
PA view, professional radiology imaging, high contrast black and white,
clear anatomical structures, diagnostic quality, DICOM standard, medical imaging`;

  const negativePrompt = 'color, blurry, cartoon, drawing, illustration, text, watermark,
distorted, low quality, multiple views, CT scan, MRI';

  const imageBuffer = await generateImageWithTogetherAI(prompt, negativePrompt);

  return {
    imageBuffer,
    prompt,
  };
}

/**
 * Generate a CT scan image
 */
export async function generateCTScan(
  bodyPart: string,
  findings: string
): Promise<ImageGenerationResult> {
  const prompt = `Medical CT scan of ${bodyPart} showing ${findings},
axial view, professional radiology imaging, gray scale, clear anatomical detail,
diagnostic quality, medical imaging, windowing optimized`;

  const negativePrompt = 'color, blurry, cartoon, drawing, illustration, text, watermark,
distorted, low quality, X-ray, MRI, ultrasound';

  const imageBuffer = await generateImageWithTogetherAI(prompt, negativePrompt);

  return {
    imageBuffer,
    prompt,
  };
}

/**
 * Generate an EKG tracing
 */
export async function generateEKG(
  rhythm: string
): Promise<ImageGenerationResult> {
  const prompt = `Medical 12-lead EKG tracing showing ${rhythm},
professional electrocardiogram, clear waveforms, standard EKG grid paper,
medical documentation quality, black traces on pink/white grid background,
diagnostic quality, medical equipment output`;

  const negativePrompt = 'blurry, cartoon, drawing, illustration, text annotations, watermark,
distorted, low quality, color traces, no grid';

  const imageBuffer = await generateImageWithTogetherAI(prompt, negativePrompt);

  return {
    imageBuffer,
    prompt,
  };
}

/**
 * Determine what images are needed for a case
 */
export function getRequiredImagesForCase(caseData: DxRCase): {
  type: string;
  description: string;
  action: string;
}[] {
  const requiredImages: { type: string; description: string; action: string }[] = [];

  // Always need patient photo
  requiredImages.push({
    type: 'patient_photo',
    description: 'Virtual patient avatar',
    action: 'always_visible',
  });

  // Check physical exam findings for visual abnormalities
  const visualFindings = [
    'jaundice', 'icterus', 'cyanosis', 'pallor', 'rash', 'petechiae',
    'purpura', 'ecchymosis', 'edema', 'clubbing', 'erythema', 'lesion',
  ];

  caseData.physical_exam_findings?.forEach((finding) => {
    if (finding.isAbnormal) {
      const findingLower = finding.finding.toLowerCase();
      const hasVisualFinding = visualFindings.some((vf) =>
        findingLower.includes(vf)
      );

      if (hasVisualFinding) {
        requiredImages.push({
          type: 'skin_finding',
          description: finding.finding,
          action: `examine_${finding.system.toLowerCase()}`,
        });
      }
    }
  });

  // Check available imaging
  caseData.available_imaging?.forEach((imaging) => {
    const imagingType = imaging.modality.toLowerCase();
    if (imagingType.includes('x-ray') || imagingType.includes('xray')) {
      requiredImages.push({
        type: 'xray',
        description: imaging.name,
        action: `order_${imaging.name.replace(/\s+/g, '_').toLowerCase()}`,
      });
    } else if (imagingType.includes('ct')) {
      requiredImages.push({
        type: 'ct_scan',
        description: imaging.name,
        action: `order_${imaging.name.replace(/\s+/g, '_').toLowerCase()}`,
      });
    }
  });

  // Check for EKG
  const hasEKG = caseData.available_procedures?.some((proc) =>
    proc.name.toLowerCase().includes('ekg') || proc.name.toLowerCase().includes('ecg')
  );

  if (hasEKG) {
    requiredImages.push({
      type: 'ekg',
      description: '12-lead EKG',
      action: 'order_ekg',
    });
  }

  return requiredImages;
}
