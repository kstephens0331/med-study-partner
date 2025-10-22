"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  SkillProgress,
  UserGamification,
  SkillCategory,
  UserSkillLevel,
  SkillTaxonomy,
  BadgeRarity,
} from "@/types/interactiveCoach";

interface SkillDashboardProps {
  userId?: string;
}

export default function SkillDashboard({ userId }: SkillDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [skills, setSkills] = useState<SkillProgress[]>([]);
  const [weakestSkills, setWeakestSkills] = useState<SkillProgress[]>([]);
  const [recentBadges, setRecentBadges] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');

  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      loadDashboardData();
    }
  }, [userId]);

  async function loadDashboardData() {
    setLoading(true);

    try {
      // Load gamification data
      const { data: gamData } = await supabase
        .from("user_gamification")
        .select("*")
        .eq("user_id", userId!)
        .single();

      if (gamData) {
        setGamification(gamData);
      } else {
        // Initialize gamification for new user
        const { data: newGam } = await supabase
          .from("user_gamification")
          .insert({
            user_id: userId!,
            total_xp: 0,
            current_level: 1,
            xp_to_next_level: 100,
            study_streak_days: 0,
          })
          .select()
          .single();
        setGamification(newGam);
      }

      // Load skills with taxonomy
      const { data: userSkills } = await supabase
        .from("user_skill_levels")
        .select(`
          *,
          skill_taxonomy (*)
        `)
        .eq("user_id", userId!)
        .order("last_practiced_at", { ascending: false });

      if (userSkills) {
        const skillsWithProgress: SkillProgress[] = userSkills.map((skill: any) => ({
          skill: skill.skill_taxonomy,
          userLevel: skill,
          recentAttempts: skill.total_attempts,
          trend: calculateTrend(skill),
        }));

        setSkills(skillsWithProgress);

        // Find weakest skills (level 1-2 with low confidence)
        const weak = skillsWithProgress
          .filter((s) => s.userLevel.level <= 2 || s.userLevel.confidence_score < 0.6)
          .sort((a, b) => a.userLevel.confidence_score - b.userLevel.confidence_score)
          .slice(0, 5);

        setWeakestSkills(weak);
      }

      // Load recent badges
      const { data: badges } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge_definitions (*)
        `)
        .eq("user_id", userId!)
        .order("earned_at", { ascending: false })
        .limit(3);

      if (badges) {
        setRecentBadges(badges);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  function calculateTrend(skill: UserSkillLevel): 'improving' | 'stable' | 'declining' {
    const accuracy = skill.total_attempts > 0
      ? skill.correct_attempts / skill.total_attempts
      : 0;

    if (accuracy >= 0.7) return 'improving';
    if (accuracy >= 0.5) return 'stable';
    return 'declining';
  }

  function getLevelColor(level: number): string {
    switch (level) {
      case 1: return 'bg-gray-700 text-gray-300';
      case 2: return 'bg-blue-700 text-blue-300';
      case 3: return 'bg-green-700 text-green-300';
      case 4: return 'bg-purple-700 text-purple-300';
      case 5: return 'bg-amber-700 text-amber-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  }

  function getTrendIcon(trend: 'improving' | 'stable' | 'declining'): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'stable': return '➡️';
      case 'declining': return '📉';
    }
  }

  function getBadgeColor(rarity: BadgeRarity): string {
    switch (rarity) {
      case 'common': return 'border-gray-600 bg-gray-900/40';
      case 'rare': return 'border-blue-600 bg-blue-900/40';
      case 'epic': return 'border-purple-600 bg-purple-900/40';
      case 'legendary': return 'border-amber-600 bg-amber-900/40';
    }
  }

  const xpProgress = gamification
    ? ((gamification.total_xp / gamification.xp_to_next_level) * 100)
    : 0;

  const filteredSkills = selectedCategory === 'all'
    ? skills
    : skills.filter(s => s.skill.category === selectedCategory);

  const categoryStats = [
    'heme', 'cards', 'pulm', 'neuro', 'renal', 'endo', 'gi', 'micro', 'psych', 'peds', 'pharm', 'genetics'
  ].map(cat => {
    const catSkills = skills.filter(s => s.skill.category === cat);
    const avgLevel = catSkills.length > 0
      ? catSkills.reduce((sum, s) => sum + s.userLevel.level, 0) / catSkills.length
      : 0;
    return { category: cat, count: catSkills.length, avgLevel };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Level & XP */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Level</span>
            <span className="text-2xl font-bold text-emerald-400">
              {gamification?.current_level || 1}
            </span>
          </div>
          <div className="mb-1 text-xs text-zinc-500">
            {gamification?.total_xp || 0} / {gamification?.xp_to_next_level || 100} XP
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
              style={{ width: `${Math.min(100, xpProgress)}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Study Streak</span>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">
            {gamification?.study_streak_days || 0} days
          </div>
          <div className="text-xs text-zinc-500">
            Best: {gamification?.longest_streak_days || 0} days
          </div>
        </div>

        {/* Skills Mastered */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Mastered Skills</span>
            <span className="text-2xl">⭐</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {skills.filter(s => s.userLevel.level === 5).length}
          </div>
          <div className="text-xs text-zinc-500">
            of {skills.length} skills
          </div>
        </div>

        {/* Recent Badges */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">Badges Earned</span>
            <span className="text-2xl">🏆</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {recentBadges.length}
          </div>
          <div className="flex gap-1 mt-1">
            {recentBadges.slice(0, 3).map((badge, i) => (
              <span key={i} className="text-lg" title={badge.badge_definitions?.name}>
                {badge.badge_definitions?.icon || '🏅'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Weakest Skills Alert */}
      {weakestSkills.length > 0 && (
        <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <h3 className="font-semibold text-amber-300">Focus Areas</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {weakestSkills.map((skill) => (
              <div
                key={skill.skill.skill_id}
                className="rounded-lg border border-amber-700 bg-amber-900/10 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-amber-200">
                    {skill.skill.display_name}
                  </span>
                  <span className="text-xs text-amber-400">
                    {getTrendIcon(skill.trend)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-xs px-2 py-0.5 rounded ${getLevelColor(skill.userLevel.level)}`}>
                    L{skill.userLevel.level}
                  </div>
                  <div className="text-xs text-amber-400">
                    {Math.round(skill.userLevel.confidence_score * 100)}% confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            selectedCategory === 'all'
              ? 'bg-emerald-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          All Skills ({skills.length})
        </button>
        {categoryStats.map((cat) => (
          <button
            key={cat.category}
            onClick={() => setSelectedCategory(cat.category as SkillCategory)}
            className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === cat.category
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {cat.category.toUpperCase()} ({cat.count})
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((skill) => (
          <div
            key={skill.skill.skill_id}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition"
          >
            {/* Skill Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-medium text-zinc-200 mb-1">
                  {skill.skill.display_name}
                </h4>
                <p className="text-xs text-zinc-500">
                  {skill.skill.category.toUpperCase()} • {skill.skill.subcategory}
                </p>
              </div>
              <span className="text-xl">{getTrendIcon(skill.trend)}</span>
            </div>

            {/* Level Badges */}
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`flex-1 h-2 rounded ${
                    level <= skill.userLevel.level
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                      : 'bg-zinc-800'
                  }`}
                  title={`Level ${level}`}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-zinc-500">Confidence</div>
                <div className="font-medium text-zinc-300">
                  {Math.round(skill.userLevel.confidence_score * 100)}%
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Accuracy</div>
                <div className="font-medium text-zinc-300">
                  {skill.userLevel.total_attempts > 0
                    ? Math.round((skill.userLevel.correct_attempts / skill.userLevel.total_attempts) * 100)
                    : 0}%
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Attempts</div>
                <div className="font-medium text-zinc-300">
                  {skill.userLevel.total_attempts}
                </div>
              </div>
              <div>
                <div className="text-zinc-500">Level</div>
                <div className={`font-medium px-2 py-0.5 rounded inline-block ${getLevelColor(skill.userLevel.level)}`}>
                  {skill.userLevel.level}/5
                </div>
              </div>
            </div>

            {/* Last Practiced */}
            {skill.userLevel.last_practiced_at && (
              <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                Last practiced {new Date(skill.userLevel.last_practiced_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredSkills.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <p>No skills in this category yet.</p>
          <p className="text-sm mt-2">Start studying to build your skill profile!</p>
        </div>
      )}
    </div>
  );
}
