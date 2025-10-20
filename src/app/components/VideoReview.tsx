'use client';

import { useState, useEffect } from 'react';
import { VideoSegmentWithProgress, VideoFilterOptions, MedicalSystem, VideoDifficulty } from '@/types/video';

const SYSTEMS: { id: MedicalSystem; name: string }[] = [
  { id: 'heme', name: 'Hematology' },
  { id: 'renal', name: 'Renal' },
  { id: 'cards', name: 'Cardiology' },
  { id: 'neuro', name: 'Neurology' },
  { id: 'pulm', name: 'Pulmonology' },
  { id: 'endo', name: 'Endocrinology' },
  { id: 'gi', name: 'Gastroenterology' },
  { id: 'micro', name: 'Microbiology' },
  { id: 'pharm', name: 'Pharmacology' },
  { id: 'genetics', name: 'Genetics' },
  { id: 'obgyn', name: 'OB/GYN' },
  { id: 'psych', name: 'Psychiatry' },
  { id: 'peds', name: 'Pediatrics' }
];

export default function VideoReview() {
  const [segments, setSegments] = useState<VideoSegmentWithProgress[]>([]);
  const [filteredSegments, setFilteredSegments] = useState<VideoSegmentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<VideoSegmentWithProgress | null>(null);

  // Filter state
  const [selectedSystem, setSelectedSystem] = useState<MedicalSystem | ''>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<VideoDifficulty | ''>('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  // Load segments
  useEffect(() => {
    loadSegments();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [segments, selectedSystem, selectedDifficulty, searchKeywords, showOnlyCompleted, showOnlyIncomplete]);

  async function loadSegments() {
    setLoading(true);
    try {
      const res = await fetch('/api/videos/segments?limit=100');
      const data = await res.json();
      setSegments(data.segments || []);
    } catch (error) {
      console.error('Error loading video segments:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...segments];

    if (selectedSystem) {
      filtered = filtered.filter(s => s.system === selectedSystem);
    }

    if (selectedDifficulty) {
      filtered = filtered.filter(s => s.difficulty === selectedDifficulty);
    }

    if (searchKeywords) {
      const keywords = searchKeywords.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(keywords) ||
        s.description?.toLowerCase().includes(keywords) ||
        s.keywords?.some(k => k.toLowerCase().includes(keywords))
      );
    }

    if (showOnlyCompleted) {
      filtered = filtered.filter(s => s.progress?.is_completed);
    }

    if (showOnlyIncomplete) {
      filtered = filtered.filter(s => !s.progress?.is_completed);
    }

    setFilteredSegments(filtered);
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function getProgressPercentage(segment: VideoSegmentWithProgress): number {
    if (!segment.progress || !segment.duration_seconds) return 0;
    return Math.min(100, (segment.progress.last_position_seconds / segment.duration_seconds) * 100);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Video Review</h1>
          <p className="text-gray-300">Segmented lectures broken into 5-7 minute chunks for focused study</p>
        </div>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* System Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">System</label>
              <select
                value={selectedSystem}
                onChange={(e) => setSelectedSystem(e.target.value as MedicalSystem | '')}
                className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Systems</option>
                {SYSTEMS.map(sys => (
                  <option key={sys.id} value={sys.id}>{sys.name}</option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as VideoDifficulty | '')}
                className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="Topics, keywords..."
                className="w-full bg-white/20 text-white border border-white/30 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
              />
            </div>
          </div>

          {/* Progress Filters */}
          <div className="flex gap-4">
            <label className="flex items-center text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyCompleted}
                onChange={(e) => {
                  setShowOnlyCompleted(e.target.checked);
                  if (e.target.checked) setShowOnlyIncomplete(false);
                }}
                className="mr-2"
              />
              Only Completed
            </label>
            <label className="flex items-center text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyIncomplete}
                onChange={(e) => {
                  setShowOnlyIncomplete(e.target.checked);
                  if (e.target.checked) setShowOnlyCompleted(false);
                }}
                className="mr-2"
              />
              Only Incomplete
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              {filteredSegments.length} Video{filteredSegments.length !== 1 ? 's' : ''}
            </h2>
            <button
              onClick={loadSegments}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              <p className="text-gray-300 mt-4">Loading videos...</p>
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No videos found matching your filters</p>
              <p className="text-gray-500 mt-2">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSegments.map(segment => (
                <div
                  key={segment.id}
                  onClick={() => setSelectedSegment(segment)}
                  className="bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg p-4 cursor-pointer transition group"
                >
                  {/* Thumbnail placeholder */}
                  <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg h-40 mb-3 flex items-center justify-center">
                    <svg className="w-16 h-16 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    {segment.progress?.is_completed && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                        ✓ Completed
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-white font-semibold mb-2 group-hover:text-purple-300 transition">
                    {segment.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    {segment.system && (
                      <span className="px-2 py-1 bg-purple-600/30 rounded text-purple-300 text-xs">
                        {SYSTEMS.find(s => s.id === segment.system)?.name}
                      </span>
                    )}
                    {segment.difficulty && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        segment.difficulty === 'easy' ? 'bg-green-600/30 text-green-300' :
                        segment.difficulty === 'moderate' ? 'bg-yellow-600/30 text-yellow-300' :
                        'bg-red-600/30 text-red-300'
                      }`}>
                        {segment.difficulty}
                      </span>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {segment.description || 'No description available'}
                  </p>

                  {/* Duration and Progress */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">
                      {formatDuration(segment.duration_seconds)}
                    </span>
                    {segment.progress && (
                      <span className="text-purple-400">
                        {Math.round(getProgressPercentage(segment))}% watched
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {segment.progress && getProgressPercentage(segment) > 0 && (
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${getProgressPercentage(segment)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Player Modal (placeholder - will implement full player next) */}
        {selectedSegment && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl max-w-4xl w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedSegment.title}</h2>
                  <p className="text-gray-400">{selectedSegment.description}</p>
                </div>
                <button
                  onClick={() => setSelectedSegment(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Video player placeholder */}
              <div className="bg-black rounded-lg h-96 flex items-center justify-center mb-4">
                <p className="text-white">Video Player Component (Coming Next)</p>
              </div>

              {/* Key Concepts */}
              {selectedSegment.key_concepts && selectedSegment.key_concepts.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">Key Concepts:</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSegment.key_concepts.map((concept, i) => (
                      <span key={i} className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-sm">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {selectedSegment.summary && (
                <div>
                  <h3 className="text-white font-semibold mb-2">Summary:</h3>
                  <p className="text-gray-300">{selectedSegment.summary}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
