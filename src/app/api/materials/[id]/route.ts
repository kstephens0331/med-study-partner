import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Update material (move to block, rename, etc.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const materialId = params.id;
    const updates = await req.json();

    // Verify ownership
    const { data: material } = await supabase
      .from('student_materials')
      .select('user_id')
      .eq('id', materialId)
      .single();

    if (!material || material.user_id !== user.id) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 });
    }

    // Update material
    const { data: updatedMaterial, error } = await supabase
      .from('student_materials')
      .update(updates)
      .eq('id', materialId)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
    }

    return NextResponse.json({ success: true, material: updatedMaterial });
  } catch (error: any) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete material
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const materialId = params.id;

    // Get material to verify ownership and get storage path
    const { data: material } = await supabase
      .from('student_materials')
      .select('user_id, storage_path')
      .eq('id', materialId)
      .single();

    if (!material || material.user_id !== user.id) {
      return NextResponse.json({ error: 'Material not found or access denied' }, { status: 404 });
    }

    // Delete from storage
    if (material.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('student-materials')
        .remove([material.storage_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete from database
    const { error } = await supabase.from('student_materials').delete().eq('id', materialId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
