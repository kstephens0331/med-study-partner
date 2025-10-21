# Phase 9: Visual Patient Simulation System

## Overview
Add realistic visual components to DxR cases including AI-generated patient photos, physical exam findings, imaging studies, and diagnostic test visualizations.

## Architecture

### 1. Image Generation Strategy

#### Option A: AI Image Generation (Recommended for MVP)
- **Tool**: Stable Diffusion via Replicate API or Together AI
- **Pros**:
  - Customizable for exact findings needed
  - Generate unlimited variations
  - Can create age/ethnicity-appropriate patients
  - Privacy-safe (no real patient photos)
- **Cons**:
  - Requires generation time
  - May need manual curation
  - API costs

#### Option B: Stock Medical Image Libraries
- **Sources**:
  - DermNet (dermatology)
  - OpenI (radiology)
  - MedPix (comprehensive)
- **Pros**: Real medical images, high quality
- **Cons**: Limited customization, licensing issues

#### Option C: Hybrid Approach (Long-term)
- AI-generated patient avatars
- Curated real medical images for specific findings
- AI-generated overlays on base images

### 2. Image Categories & Requirements

#### Patient Photos
```typescript
{
  media_type: 'patient_photo',
  generation_prompt: "Professional medical photograph of a [age]yo [ethnicity] [sex]
                      patient, [build] build, in hospital gown, neutral expression,
                      clinical setting, high quality medical photography",
  display: "Always visible at top of case"
}
```

#### Skin Findings
Examples needed:
- Jaundice (icterus)
- Cyanosis (central vs peripheral)
- Petechiae / purpura
- Rashes (maculopapular, vesicular, etc.)
- Edema
- Erythema
- Pallor
- Bruising / ecchymosis
- Surgical scars
- Track marks
- Clubbing

```typescript
{
  media_type: 'skin_finding',
  requires_action: 'examine_skin',
  generation_prompt: "Close-up medical photograph showing [specific finding]
                      on [body location], clinical photography, clear detail"
}
```

#### Eye Findings
- Conjunctival pallor
- Scleral icterus
- Arcus senilis
- Pupil abnormalities
- Red eye / conjunctivitis
- Ptosis
- Nystagmus (video)

#### Physical Exam Findings
- Clubbing of digits
- Splinter hemorrhages
- Kaposi lesions
- Spider angiomas
- Caput medusae
- Pitting edema
- Joint deformities

#### Radiology Images
**X-rays:**
- Chest (pneumonia, CHF, pneumothorax, etc.)
- Abdomen (bowel obstruction, free air, etc.)
- Extremity fractures

**CT Scans:**
- Head (stroke, hemorrhage, mass)
- Chest (PE, pneumonia, mass)
- Abdomen (appendicitis, diverticulitis, masses)

**MRI:**
- Brain (stroke, MS lesions, tumors)
- Spine (disc herniation, stenosis)

**Ultrasound:**
- FAST exam
- Gallstones
- Hydronephrosis
- Pregnancy

#### Diagnostic Test Visualizations
**EKG Tracings:**
- Normal sinus rhythm
- Atrial fibrillation
- STEMI patterns
- Heart blocks
- Arrhythmias

**Microscopy:**
- Blood smears
- Urine sediment
- Gram stains

### 3. Database Schema

```sql
-- Already created in migration 20250120000005
dxr_media table:
- id, case_id, media_type
- file_url, thumbnail_url
- title, description, findings
- requires_action (triggers display)
- ai_generated, generation_prompt
```

### 4. Storage Solution

#### Option A: Supabase Storage
```typescript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('dxr-media')
  .upload(`cases/${caseId}/${filename}`, file);
```

**Buckets needed:**
- `dxr-patient-photos`
- `dxr-exam-findings`
- `dxr-radiology`
- `dxr-diagnostics`

#### Option B: Cloudinary (Recommended)
- Better image optimization
- On-the-fly transformations
- CDN delivery
- Better for AI-generated images

### 5. Image Generation Script

```typescript
// scripts/generateDxRImages.ts
async function generateCaseImages(caseId: string, caseData: DxRCase) {
  // 1. Generate patient photo
  const patientPrompt = createPatientPhotoPrompt(caseData);
  const patientImage = await generateImage(patientPrompt);

  // 2. Generate exam findings
  for (const finding of caseData.physical_exam_findings) {
    if (finding.isAbnormal && requiresVisualization(finding)) {
      const findingPrompt = createFindingPrompt(finding);
      const findingImage = await generateImage(findingPrompt);
      await saveDxRMedia({
        case_id: caseId,
        media_type: 'skin_finding',
        file_url: findingImage.url,
        requires_action: `examine_${finding.system}`,
        ...
      });
    }
  }

  // 3. Generate radiology images
  for (const imaging of caseData.available_imaging) {
    const radiologyPrompt = createRadiologyPrompt(imaging);
    const radiologyImage = await generateImage(radiologyPrompt);
    await saveDxRMedia({
      media_type: getRadiologyType(imaging.modality),
      requires_action: `order_${imaging.name}`,
      ...
    });
  }

  // 4. Generate EKG if applicable
  if (needsEKG(caseData)) {
    const ekgImage = await generateEKG(caseData);
    await saveDxRMedia({ media_type: 'ekg', ... });
  }
}
```

### 6. UI Components

#### PatientPhotoDisplay Component
```typescript
// Shows patient avatar at top of case
<div className="patient-photo-container">
  <img
    src={caseData.patient_image_url}
    alt="Virtual patient"
    className="w-48 h-48 rounded-lg object-cover"
  />
  <div className="patient-info">
    {age}yo {sex}, {characteristics.build}
  </div>
</div>
```

#### ImageModal Component
```typescript
// Full-screen image viewer with findings overlay
<ImageModal
  image={selectedImage}
  findings={image.findings}
  onClose={() => setSelectedImage(null)}
/>
```

#### ExamFindingImage Component
```typescript
// Revealed when student performs exam
{selectedExam.includes(finding) && finding.image_url && (
  <div className="finding-image">
    <img src={finding.image_url} />
    <p>{finding.findings}</p>
  </div>
)}
```

### 7. Generation Workflow

```
1. Generate 1,500 DxR cases (text only) ✓
2. For each case:
   a. Generate patient photo based on demographics
   b. Identify visual findings (abnormal exam, imaging, etc.)
   c. Generate images for each finding
   d. Upload to storage
   e. Save media records to dxr_media table
3. Update UI to display images progressively
```

### 8. Progressive Enhancement

**Phase 9A (MVP - Quick Win):**
- Patient photos for all cases
- Key physical exam findings (jaundice, cyanosis, rashes)
- Basic radiology (chest X-ray, common CT findings)
- Total images needed: ~3,000-5,000

**Phase 9B (Full Implementation):**
- All physical exam findings
- Comprehensive radiology library
- EKG tracings
- Microscopy images
- Total images needed: ~10,000-15,000

**Phase 9C (Advanced):**
- Interactive 3D patient models
- Video findings (gait abnormalities, tremors)
- Animated procedures
- Real-time image annotation

### 9. Cost Estimation

#### AI Image Generation (Stable Diffusion via Replicate)
- ~$0.0023 per image
- 5,000 images = ~$11.50
- 15,000 images = ~$34.50

#### Storage (Cloudinary Free Tier)
- 25GB storage
- 25GB bandwidth/month
- Should cover 5,000-10,000 images

#### Supabase Storage
- 100MB free tier (not enough)
- $0.021/GB storage
- $0.09/GB bandwidth

**Recommendation**: Use Cloudinary for images

### 10. Implementation Plan

**Week 1: Infrastructure**
- ✓ Database migration
- ✓ TypeScript types
- Set up Cloudinary account
- Create image generation script framework

**Week 2: Patient Photos**
- Generate 1,500 patient photos
- Upload to Cloudinary
- Update UI to display patient photos

**Week 3: Physical Exam Findings**
- Identify top 20 visual findings
- Generate images for each
- Update exam interface to show images

**Week 4: Radiology**
- Generate common X-rays and CTs
- Update diagnostics interface
- Add image modal viewer

**Week 5: Polish & Testing**
- Image quality review
- Performance optimization
- User testing

### 11. Technical Considerations

**Performance:**
- Lazy load images
- Use thumbnails in lists
- Progressive image loading
- CDN caching

**Accessibility:**
- Alt text for all images
- Describe findings for screen readers
- Keyboard navigation for image modals

**Privacy:**
- All AI-generated (no real patient data)
- Clearly label as simulations
- Educational use disclaimer

### 12. Next Steps

1. Apply migration: `20250120000005_add_dxr_visual_media.sql`
2. Set up Cloudinary account
3. Create image generation script
4. Start with patient photos (easiest MVP)
5. Gradually add exam findings and radiology

## Files to Create/Update

- ✓ `supabase/migrations/20250120000005_add_dxr_visual_media.sql`
- ✓ `src/types/dxr.ts` (add media types)
- `scripts/generateDxRImages.ts` (image generation)
- `src/lib/imageGeneration.ts` (AI image helpers)
- `src/app/components/PatientPhoto.tsx`
- `src/app/components/ImageModal.tsx`
- Update `DxRCaseView.tsx` to show images

## Success Metrics

- Patient photos for all 1,500 cases
- Visual findings for top 50 abnormal exams
- Radiology images for top 30 common studies
- Page load time < 3 seconds
- Image quality rated 4+/5 by medical students
