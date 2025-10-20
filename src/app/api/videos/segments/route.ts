import { createServerClient } from '@/lib/supabaseServer';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/videos/segments
 * Fetch video segments with optional filtering
 * Query params: system, topics, difficulty, keywords, limit, onlyCompleted, onlyIncomplete
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const system = searchParams.get('system');
  const topics = searchParams.get('topics')?.split(',');
  const difficulty = searchParams.get('difficulty');
  const keywords = searchParams.get('keywords');
  const limit = parseInt(searchParams.get('limit') || '50');
  const onlyCompleted = searchParams.get('onlyCompleted') === 'true';
  const onlyIncomplete = searchParams.get('onlyIncomplete') === 'true';

  try {
    // Build query
    let query = supabase
      .from('video_segments')
      .select(`
        *,
        source:video_sources(*),
        progress:video_watch_progress(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply filters
    if (system) {
      query = query.eq('system', system);
    }

    if (topics && topics.length > 0) {
      query = query.contains('topics', topics);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (keywords) {
      query = query.or(`title.ilike.%${keywords}%,description.ilike.%${keywords}%,keywords.cs.{${keywords}}`);
    }

    const { data: segments, error } = await query;

    if (error) throw error;

    // Filter by completion status if requested
    let filteredSegments = segments;
    if (onlyCompleted) {
      filteredSegments = segments?.filter(s => s.progress?.some((p: any) => p.user_id === user.id && p.is_completed)) || [];
    } else if (onlyIncomplete) {
      filteredSegments = segments?.filter(s => !s.progress?.some((p: any) => p.user_id === user.id && p.is_completed)) || [];
    }

    return NextResponse.json({
      segments: filteredSegments,
      total: filteredSegments?.length || 0
    });
  } catch (error: any) {
    console.error('Error fetching video segments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
