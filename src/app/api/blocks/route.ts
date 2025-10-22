import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Get all blocks for current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: blocks, error } = await supabase
      .from('material_blocks')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Fetch blocks error:', error);
      return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 });
    }

    return NextResponse.json({ blocks });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create new block
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json({ error: 'Block name is required' }, { status: 400 });
    }

    // Get max position
    const { data: maxBlock } = await supabase
      .from('material_blocks')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = maxBlock ? maxBlock.position + 1 : 0;

    const { data: block, error } = await supabase
      .from('material_blocks')
      .insert({
        user_id: user.id,
        name,
        description,
        color: color || '#3b82f6',
        icon: icon || '📚',
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.error('Create block error:', error);
      return NextResponse.json({ error: 'Failed to create block' }, { status: 500 });
    }

    return NextResponse.json({ success: true, block });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
