import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { extractFromPptx } from "@/lib/ingest/pptx";
import { extractFromPdf } from "@/lib/ingest/pdf";
import { createServerClient, supaAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
const MAX_LEN = 50000; // Larger limit for global materials

function calculateFileHash(buffer: ArrayBuffer): string {
  const hash = createHash('sha256');
  hash.update(Buffer.from(buffer));
  return hash.digest('hex');
}

function topKeywords(text: string, k = 30): string[] {
  const stop = new Set([
    "the", "and", "of", "to", "in", "a", "for", "with", "on", "by", "as", "is", "at", "or", "be", "an", "are", "that", "from", "this"
  ]);
  const counts: Record<string, number> = {};
  text.toLowerCase().replace(/[^a-z0-9:\- ]+/g, " ").split(/\s+/).forEach(w => {
    if (!w || stop.has(w) || w.length < 3) return;
    counts[w] = (counts[w] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w);
}

export async function POST(req: NextRequest) {
  // Authenticate admin user
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is info@stephenscode.dev
  if (user.email !== 'info@stephenscode.dev') {
    return NextResponse.json({
      error: "Access denied. Only IUHS admin (info@stephenscode.dev) can upload to global repository."
    }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const title = form.get("title") as string;
  const category = form.get("category") as string;
  const subject = form.get("subject") as string;
  const system = form.get("system") as string | null;
  const year = form.get("year") as string | null;
  const semester = form.get("semester") as string | null;
  const courseCode = form.get("courseCode") as string | null;
  const instructorName = form.get("instructorName") as string | null;
  const department = form.get("department") as string | null;
  const tags = form.get("tags") as string | null; // Comma-separated

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (!title || !category || !subject) {
    return NextResponse.json({ error: "Missing required fields: title, category, subject" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  let fullText = "";
  let outline: string[] = [];
  let fileType = "unknown";

  // Calculate file hash for duplicate detection
  const fileHash = calculateFileHash(buf);

  // Check for duplicates
  const adminClient = supaAdmin();
  const { data: existingMaterial } = await adminClient
    .rpc('check_duplicate_material', { p_file_hash: fileHash });

  if (existingMaterial && existingMaterial.length > 0) {
    const existing = existingMaterial[0];

    // Log duplicate attempt
    await adminClient.from('iuhs_duplicate_uploads').insert({
      file_hash: fileHash,
      file_name: file.name,
      attempted_by: user.id,
      existing_material_id: existing.material_id,
      was_newer_version: false,
    });

    return NextResponse.json({
      duplicate: true,
      existing_material: {
        id: existing.material_id,
        title: existing.title,
        version: existing.version,
        upload_date: existing.upload_date,
      },
      message: "This file already exists in the IUHS Global Repository. Use 'Upload New Version' if you want to replace it."
    }, { status: 409 }); // Conflict
  }

  // Extract content based on file type
  try {
    if (name.endsWith(".pptx")) {
      const deck = await extractFromPptx(buf);
      fullText = deck.fullText;
      outline = deck.outline;
      fileType = "pptx";
    } else if (name.endsWith(".pdf")) {
      const pdf = await extractFromPdf(buf);
      fullText = pdf.fullText;
      outline = pdf.outline;
      fileType = "pdf";
    } else if (name.endsWith(".docx")) {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(process.env.NEXT_PUBLIC_INGESTOR_URL!, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      fullText = data.text || "";
      outline = data.outline || [];
      fileType = "docx";
    } else if (name.match(/\.(mp3|mp4|m4a|wav|webm|ogg)$/)) {
      const formData = new FormData();
      formData.append("audio", file);
      const response = await fetch(process.env.NEXT_PUBLIC_TRANSCRIBER_URL!, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      fullText = data.transcript || data.text || "";
      fileType = name.split(".").pop() || "audio";
    } else if (name.match(/\.(txt|md|markdown|note|notes|text)$/)) {
      const decoder = new TextDecoder("utf-8");
      fullText = decoder.decode(buf);
      fileType = name.split(".").pop() || "text";
    } else {
      return NextResponse.json({
        error: "Unsupported file type. Supported: .pptx, .pdf, .docx, .mp3, .mp4, .m4a, .wav, .txt, .md"
      }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: `Parse failed: ${e?.message || "unknown error"}` }, { status: 500 });
  }

  // Generate keywords
  const keywords = topKeywords(fullText, 30);

  // Insert into IUHS Global Materials
  try {
    const { data: material, error: dbError } = await adminClient
      .from("iuhs_global_materials")
      .insert({
        file_name: file.name,
        file_type: fileType,
        file_size_bytes: file.size,
        file_hash: fileHash,
        title,
        content_text: fullText.slice(0, MAX_LEN),
        outline,
        keywords,
        category,
        subject,
        system,
        year: year ? parseInt(year) : null,
        semester,
        course_code: courseCode,
        instructor_name: instructorName,
        department,
        source: 'iuhs_admin',
        uploaded_by: user.id,
        status: 'active',
        is_latest_version: true,
        version: 1,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Failed to save IUHS material:", dbError);
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    // Add tags if provided
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagArray.length > 0) {
        await adminClient.from('iuhs_material_tags').insert(
          tagArray.map(tag => ({
            material_id: material.id,
            tag,
          }))
        );
      }
    }

    return NextResponse.json({
      ok: true,
      material: {
        id: material.id,
        title: material.title,
        file_hash: fileHash,
        version: material.version,
      },
      message: "Material successfully uploaded to IUHS Global Repository",
    });

  } catch (e: any) {
    console.error("Database error:", e);
    return NextResponse.json({ error: `Failed to upload: ${e.message}` }, { status: 500 });
  }
}

// Upload new version of existing material
export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || user.email !== 'info@stephenscode.dev') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const oldMaterialId = form.get("oldMaterialId") as string;

  if (!file || !oldMaterialId) {
    return NextResponse.json({ error: "Missing file or oldMaterialId" }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const fileHash = calculateFileHash(buf);
  const name = file.name.toLowerCase();
  let fullText = "";
  let outline: string[] = [];
  let fileType = "unknown";

  // Extract content (same as POST)
  try {
    if (name.endsWith(".pptx")) {
      const deck = await extractFromPptx(buf);
      fullText = deck.fullText;
      outline = deck.outline;
      fileType = "pptx";
    } else if (name.endsWith(".pdf")) {
      const pdf = await extractFromPdf(buf);
      fullText = pdf.fullText;
      outline = pdf.outline;
      fileType = "pdf";
    }
    // ... (other file types same as POST)
  } catch (e: any) {
    return NextResponse.json({ error: `Parse failed: ${e?.message}` }, { status: 500 });
  }

  const adminClient = supaAdmin();

  // Get old material info
  const { data: oldMaterial } = await adminClient
    .from('iuhs_global_materials')
    .select('*')
    .eq('id', oldMaterialId)
    .single();

  if (!oldMaterial) {
    return NextResponse.json({ error: "Old material not found" }, { status: 404 });
  }

  // Insert new version
  const { data: newMaterial, error } = await adminClient
    .from('iuhs_global_materials')
    .insert({
      ...oldMaterial,
      id: undefined, // Let DB generate new ID
      file_hash: fileHash,
      file_name: file.name,
      file_type: fileType,
      file_size_bytes: file.size,
      content_text: fullText.slice(0, MAX_LEN),
      outline,
      keywords: topKeywords(fullText, 30),
      upload_date: new Date().toISOString(),
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Failed to upload new version: ${error.message}` }, { status: 500 });
  }

  // Archive old version
  await adminClient.rpc('archive_old_version', {
    p_old_material_id: oldMaterialId,
    p_new_material_id: newMaterial.id,
  });

  // Log as newer version upload
  await adminClient.from('iuhs_duplicate_uploads').insert({
    file_hash: fileHash,
    file_name: file.name,
    attempted_by: user.id,
    existing_material_id: oldMaterialId,
    was_newer_version: true,
    version_replaced_id: newMaterial.id,
  });

  return NextResponse.json({
    ok: true,
    message: "New version uploaded successfully",
    old_version: oldMaterial.version,
    new_version: newMaterial.version,
    new_material_id: newMaterial.id,
  });
}
