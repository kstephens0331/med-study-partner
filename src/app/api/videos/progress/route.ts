import { createServerClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/videos/progress
 * Update video watch progress
 * Body: { segment_id, position_seconds, is_completed }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { segment_id, position_seconds, is_completed } = await req.json();

    if (!segment_id) {
      return NextResponse.json({ error: 'segment_id is required' }, { status: 400 });
    }

    // Upsert progress
    const { data, error } = await supabase
      .from('video_watch_progress')
      .upsert({
        user_id: user.id,
        video_segment_id: segment_id,
        last_position_seconds: position_seconds || 0,
        is_completed: is_completed || false,
        last_watched_at: new Date().toISOString(),
        ...(is_completed && { completed_at: new Date().toISOString() })
      }, {
        onConflict: 'user_id,video_segment_id',
        returning: 'minimal'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, progress: data });
  } catch (error: any) {
    console.error('Error updating video progress:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/videos/progress
 * Get user's watch progress for specific segment or all segments
 * Query params: segment_id (optional)
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const segment_id = searchParams.get('segment_id');

  try {
    let query = supabase
      .from('video_watch_progress')
      .select('*')
      .eq('user_id', user.id);

    if (segment_id) {
      query = query.eq('video_segment_id', segment_id).single();
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ progress: data });
  } catch (error: any) {
    console.error('Error fetching video progress:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
