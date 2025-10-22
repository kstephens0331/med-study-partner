import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

// File type detection
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ppt':
    case 'pptx':
      return 'powerpoint';
    case 'pdf':
      return 'textbook';
    case 'doc':
    case 'docx':
      return 'lecture';
    case 'txt':
    case 'md':
    case 'note':
    case 'notes':
      return 'notes';
    default:
      return 'other';
  }
}

// Calculate SHA-256 hash of file
function calculateFileHash(buffer: ArrayBuffer): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}

// Extract document date and metadata using Together AI
async function extractDocumentMetadata(
  fileContent: ArrayBuffer,
  fileName: string,
  fileType: string
): Promise<{
  documentDate: string | null;
  title: string;
  keywords: string[];
  outline: string[];
}> {
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

  if (!TOGETHER_API_KEY) {
    return {
      documentDate: null,
      title: fileName,
      keywords: [],
      outline: [],
    };
  }

  // Convert file content to base64 for AI analysis
  const base64Content = Buffer.from(fileContent).toString('base64').substring(0, 10000); // First 10KB

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a document analysis AI. Extract metadata from medical education materials. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: `Analyze this ${fileType} file "${fileName}". Extract:
1. Document creation date (if mentioned in content, format: YYYY-MM-DD)
2. Document title
3. Main keywords (5-10 words)
4. Outline/topics covered (5-10 bullet points)

Respond with JSON:
{
  "documentDate": "YYYY-MM-DD or null",
  "title": "extracted title",
  "keywords": ["keyword1", "keyword2"],
  "outline": ["topic1", "topic2"]
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('AI extraction failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Document metadata extraction failed:', error);
    return {
      documentDate: null,
      title: fileName,
      keywords: [],
      outline: [],
    };
  }
}

// Compare two documents to determine which is newer using AI
async function compareDocumentVersions(
  newContent: ArrayBuffer,
  newMetadata: any,
  existingTitle: string,
  existingDate: string | null
): Promise<{ isNewer: boolean; reason: string }> {
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

  if (!TOGETHER_API_KEY) {
    // Fallback to date comparison
    if (!existingDate || !newMetadata.documentDate) {
      return { isNewer: true, reason: 'No date comparison available, accepting new version' };
    }
    const isNewer = new Date(newMetadata.documentDate) > new Date(existingDate);
    return { isNewer, reason: `Date comparison: ${newMetadata.documentDate} vs ${existingDate}` };
  }

  try {
    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a document version comparison AI. Determine which document is more recent based on content dates and information. Respond ONLY with valid JSON.',
          },
          {
            role: 'user',
            content: `Compare these two documents:

Existing: "${existingTitle}" (date: ${existingDate || 'unknown'})
New: "${newMetadata.title}" (date: ${newMetadata.documentDate || 'unknown'})
New keywords: ${newMetadata.keywords.join(', ')}

Respond with JSON:
{
  "isNewer": true/false,
  "reason": "explanation of which is more recent and why"
}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error('AI comparison failed');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Document comparison failed:', error);
    // Fallback to date comparison
    if (!existingDate || !newMetadata.documentDate) {
      return { isNewer: true, reason: 'Comparison failed, accepting new version' };
    }
    const isNewer = new Date(newMetadata.documentDate) > new Date(existingDate);
    return { isNewer, reason: `Fallback date comparison: ${newMetadata.documentDate} vs ${existingDate}` };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const blockId = formData.get('blockId') as string | null;
    const materialType = formData.get('materialType') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Get file buffer and calculate hash
    const arrayBuffer = await file.arrayBuffer();
    const fileHash = calculateFileHash(arrayBuffer);
    const detectedType = materialType || getFileType(file.name);

    // Extract metadata using AI
    console.log(`Extracting metadata for ${file.name}...`);
    const metadata = await extractDocumentMetadata(arrayBuffer, file.name, detectedType);

    // Check for duplicates in student's own materials
    const { data: studentDuplicates } = await supabase
      .from('student_materials')
      .select('id, title, file_name')
      .eq('user_id', user.id)
      .eq('file_hash', fileHash);

    if (studentDuplicates && studentDuplicates.length > 0) {
      return NextResponse.json(
        {
          error: 'Duplicate file',
          message: `You already uploaded this file as "${studentDuplicates[0].title}"`,
          duplicate: studentDuplicates[0],
        },
        { status: 409 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('student-materials')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Insert student material
    const { data: studentMaterial, error: insertError } = await supabase
      .from('student_materials')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        file_hash: fileHash,
        storage_path: fileName,
        title: metadata.title,
        keywords: metadata.keywords,
        outline: metadata.outline,
        material_type: detectedType,
        document_date: metadata.documentDate,
        block_id: blockId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      // Clean up uploaded file
      await supabase.storage.from('student-materials').remove([fileName]);
      return NextResponse.json({ error: 'Failed to save material record' }, { status: 500 });
    }

    // Check if should share to global (not for notes)
    let globalSharingResult = null;
    if (detectedType !== 'notes') {
      console.log(`Checking global sharing for ${detectedType}...`);

      // Check for duplicates in global materials
      const { data: globalDuplicates } = await supabase
        .from('iuhs_global_materials')
        .select('id, title, created_at')
        .eq('file_hash', fileHash)
        .eq('category', detectedType)
        .eq('status', 'active')
        .eq('is_latest_version', true);

      if (globalDuplicates && globalDuplicates.length > 0) {
        // Duplicate exists - compare versions using AI
        const comparison = await compareDocumentVersions(
          arrayBuffer,
          metadata,
          globalDuplicates[0].title,
          globalDuplicates[0].created_at
        );

        if (comparison.isNewer) {
          // New version is newer - archive old and create new
          console.log(`Updating global material: ${comparison.reason}`);

          // Archive old version
          await supabase
            .from('iuhs_global_materials')
            .update({
              status: 'superseded',
              is_latest_version: false,
              archived_at: new Date().toISOString(),
              archived_reason: `Superseded by newer version: ${comparison.reason}`,
            })
            .eq('id', globalDuplicates[0].id);

          // Create new global material
          const { data: newGlobalMaterial } = await supabase
            .from('iuhs_global_materials')
            .insert({
              file_name: file.name,
              file_type: file.type,
              file_size_bytes: file.size,
              file_hash: fileHash,
              title: metadata.title,
              keywords: metadata.keywords,
              outline: metadata.outline,
              category: detectedType,
              status: 'active',
              is_latest_version: true,
              version: (globalDuplicates[0] as any).version + 1 || 2,
              previous_version_id: globalDuplicates[0].id,
            })
            .select()
            .single();

          // Update student material to reference global
          await supabase
            .from('student_materials')
            .update({
              shared_to_global: true,
              global_material_id: newGlobalMaterial?.id,
            })
            .eq('id', studentMaterial.id);

          globalSharingResult = {
            action: 'updated',
            message: `Updated global repository with newer version (${comparison.reason})`,
          };
        } else {
          globalSharingResult = {
            action: 'skipped',
            message: `Existing global version is newer (${comparison.reason})`,
          };
        }
      } else {
        // No duplicate - add to global
        console.log('Adding new material to global repository...');

        const { data: newGlobalMaterial } = await supabase.from('iuhs_global_materials').insert({
          file_name: file.name,
          file_type: file.type,
          file_size_bytes: file.size,
          file_hash: fileHash,
          title: metadata.title,
          keywords: metadata.keywords,
          outline: metadata.outline,
          category: detectedType,
          status: 'active',
          is_latest_version: true,
          version: 1,
        }).select().single();

        // Update student material to reference global
        await supabase
          .from('student_materials')
          .update({
            shared_to_global: true,
            global_material_id: newGlobalMaterial?.id,
          })
          .eq('id', studentMaterial.id);

        globalSharingResult = {
          action: 'added',
          message: 'Added to IUHS global repository',
        };
      }
    }

    return NextResponse.json({
      success: true,
      material: studentMaterial,
      metadata: metadata,
      globalSharing: globalSharingResult,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
