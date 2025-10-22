"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import {
  DailyChallenge,
  SpeedRoundTemplate,
  BossBattleTemplate,
  ChallengeType,
  UserChallengeAttempt,
} from "@/types/interactiveCoach";
import SpeedRound from "./SpeedRound";
import BossBattle from "./BossBattle";
import DailyChallengeView from "./DailyChallengeView";

interface ChallengeModesProps {
  userId?: string;
  onComplete?: (xpEarned: number, badgeEarned?: string) => void;
}

type ActiveChallenge = {
  type: ChallengeType;
  data: DailyChallenge | SpeedRoundTemplate | BossBattleTemplate;
} | null;

export default function ChallengeModes({ userId, onComplete }: ChallengeModesProps) {
  const [loading, setLoading] = useState(true);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [speedRounds, setSpeedRounds] = useState<SpeedRoundTemplate[]>([]);
  const [bossBattles, setBossBattles] = useState<BossBattleTemplate[]>([]);
  const [userAttempts, setUserAttempts] = useState<UserChallengeAttempt[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge>(null);
  const [userLevel, setUserLevel] = useState(1);

  const supabase = createClient();

  useEffect(() => {
    if (userId) {
      loadChallenges();
    }
  }, [userId]);

  async function loadChallenges() {
    setLoading(true);

    try {
      // Load user level
      const { data: gamData } = await supabase
        .from("user_gamification")
        .select("current_level")
        .eq("user_id", userId!)
        .single();

      setUserLevel(gamData?.current_level || 1);

      // Load today's daily challenge
      const today = new Date().toISOString().split('T')[0];
      const { data: daily } = await supabase
        .from("daily_challenges")
        .select("*")
        .eq("challenge_date", today)
        .single();

      if (daily) {
        setDailyChallenge(daily);

        // Check if completed
        const { data: dailyAttempt } = await supabase
          .from("user_challenge_attempts")
          .select("*")
          .eq("user_id", userId!)
          .eq("challenge_id", daily.id)
          .single();

        setDailyCompleted(!!dailyAttempt);
      }

      // Load speed round templates
      const { data: speeds } = await supabase
        .from("speed_round_templates")
        .select("*")
        .order("difficulty_level", { ascending: true });

      setSpeedRounds(speeds || []);

      // Load boss battles
      const { data: bosses } = await supabase
        .from("boss_battle_templates")
        .select("*")
        .order("difficulty_level", { ascending: true });

      setBossBattles(bosses || []);

      // Load user attempts
      const { data: attempts } = await supabase
        .from("user_challenge_attempts")
        .select("*")
        .eq("user_id", userId!)
        .order("started_at", { ascending: false });

      setUserAttempts(attempts || []);
    } catch (error) {
      console.error("Error loading challenges:", error);
    } finally {
      setLoading(false);
    }
  }

  function getChallengeAttempts(challengeId: string, challengeType: ChallengeType) {
    return userAttempts.filter(
      (a) => a.challenge_id === challengeId && a.challenge_type === challengeType
    );
  }

  function getBestScore(challengeId: string, challengeType: ChallengeType) {
    const attempts = getChallengeAttempts(challengeId, challengeType);
    if (attempts.length === 0) return null;
    return Math.max(...attempts.map((a) => a.score || 0));
  }

  function getDifficultyColor(level: number): string {
    if (level === 1) return 'border-green-600 bg-green-900/20 text-green-300';
    if (level === 2) return 'border-blue-600 bg-blue-900/20 text-blue-300';
    if (level === 3) return 'border-purple-600 bg-purple-900/20 text-purple-300';
    if (level === 4) return 'border-orange-600 bg-orange-900/20 text-orange-300';
    return 'border-red-600 bg-red-900/20 text-red-300';
  }

  function isUnlocked(requiredLevel: number): boolean {
    return userLevel >= requiredLevel;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading challenges...</p>
        </div>
      </div>
    );
  }

  // If a challenge is active, show it
  if (activeChallenge) {
    switch (activeChallenge.type) {
      case 'daily':
        return (
          <DailyChallengeView
            challenge={activeChallenge.data as DailyChallenge}
            userId={userId!}
            onComplete={(xp, badge) => {
              setActiveChallenge(null);
              loadChallenges(); // Reload to update completion status
              onComplete?.(xp, badge);
            }}
            onExit={() => setActiveChallenge(null)}
          />
        );
      case 'speed_round':
        return (
          <SpeedRound
            template={activeChallenge.data as SpeedRoundTemplate}
            userId={userId!}
            onComplete={(xp) => {
              setActiveChallenge(null);
              loadChallenges();
              onComplete?.(xp);
            }}
            onExit={() => setActiveChallenge(null)}
          />
        );
      case 'boss_battle':
        return (
          <BossBattle
            template={activeChallenge.data as BossBattleTemplate}
            userId={userId!}
            onComplete={(xp, badge) => {
              setActiveChallenge(null);
              loadChallenges();
              onComplete?.(xp, badge);
            }}
            onExit={() => setActiveChallenge(null)}
          />
        );
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-200 mb-2">Challenge Modes</h2>
        <p className="text-zinc-400">
          Test your knowledge with timed challenges, daily quests, and epic boss battles
        </p>
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <section>
          <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
            <span>📅</span>
            Daily Challenge
            {dailyCompleted && <span className="text-sm text-green-400">(✓ Completed)</span>}
          </h3>

          <div
            className={`rounded-xl border-2 p-6 transition ${
              dailyCompleted
                ? 'border-zinc-800 bg-zinc-900/20 opacity-75'
                : 'border-emerald-600 bg-emerald-900/20 hover:bg-emerald-900/30 cursor-pointer'
            }`}
            onClick={() => {
              if (!dailyCompleted) {
                setActiveChallenge({ type: 'daily', data: dailyChallenge });
              }
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-xl font-semibold text-emerald-300 mb-2">
                  {dailyChallenge.theme}
                </h4>
                <p className="text-zinc-400 text-sm mb-3">{dailyChallenge.description}</p>

                {/* Target skills */}
                <div className="flex flex-wrap gap-2">
                  {dailyChallenge.target_skills.slice(0, 5).map((skill, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                    >
                      {skill}
                    </span>
                  ))}
                  {dailyChallenge.target_skills.length > 5 && (
                    <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                      +{dailyChallenge.target_skills.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Reward */}
              <div className="text-right">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-sm text-amber-400 font-semibold">
                  +{dailyChallenge.xp_reward} XP
                </div>
                {dailyChallenge.badge_reward && (
                  <div className="text-xs text-purple-400 mt-1">+ Badge</div>
                )}
              </div>
            </div>

            {!dailyCompleted && (
              <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-lg transition">
                Start Daily Challenge
              </button>
            )}
          </div>
        </section>
      )}

      {/* Speed Rounds */}
      <section>
        <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <span>⚡</span>
          Speed Rounds
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {speedRounds.map((template) => {
            const attempts = getChallengeAttempts(template.id, 'speed_round');
            const bestScore = getBestScore(template.id, 'speed_round');
            const unlocked = isUnlocked(template.difficulty_level);

            return (
              <div
                key={template.id}
                className={`rounded-xl border-2 p-5 transition ${
                  unlocked
                    ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 cursor-pointer'
                    : 'border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (unlocked) {
                    setActiveChallenge({ type: 'speed_round', data: template });
                  }
                }}
              >
                {/* Lock overlay */}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 rounded-xl">
                    <div className="text-center">
                      <div className="text-3xl mb-2">🔒</div>
                      <div className="text-sm text-zinc-400">
                        Requires Level {template.difficulty_level}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-zinc-200">{template.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded border ${getDifficultyColor(template.difficulty_level)}`}>
                    L{template.difficulty_level}
                  </span>
                </div>

                <p className="text-sm text-zinc-400 mb-4">{template.description}</p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-zinc-300">
                    <span>Questions:</span>
                    <span className="font-medium">{template.question_count}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Time Limit:</span>
                    <span className="font-medium">{template.time_limit_seconds}s</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Attempts:</span>
                    <span className="font-medium">{attempts.length}</span>
                  </div>
                  {bestScore !== null && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Best Score:</span>
                      <span className="font-bold">{bestScore}%</span>
                    </div>
                  )}
                </div>

                {unlocked && (
                  <button className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition text-sm">
                    {attempts.length > 0 ? 'Try Again' : 'Start Challenge'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Boss Battles */}
      <section>
        <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
          <span>⚔️</span>
          Boss Battles
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bossBattles.map((template) => {
            const attempts = getChallengeAttempts(template.id, 'boss_battle');
            const bestScore = getBestScore(template.id, 'boss_battle');
            const unlocked = isUnlocked(template.difficulty_level * 2); // Boss battles require higher level

            return (
              <div
                key={template.id}
                className={`rounded-xl border-2 p-6 relative ${
                  unlocked
                    ? 'border-purple-800 bg-purple-900/20 hover:bg-purple-900/30 cursor-pointer'
                    : 'border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (unlocked) {
                    setActiveChallenge({ type: 'boss_battle', data: template });
                  }
                }}
              >
                {/* Lock overlay */}
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/70 rounded-xl z-10">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🔒</div>
                      <div className="text-sm text-zinc-300 font-medium">
                        Requires Level {template.difficulty_level * 2}
                      </div>
                      {template.unlock_requirement && (
                        <div className="text-xs text-zinc-500 mt-1">
                          Additional requirements apply
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className={`inline-block px-3 py-1 rounded mb-2 ${getDifficultyColor(template.difficulty_level)}`}>
                      <span className="text-xs font-bold">BOSS BATTLE</span>
                    </div>
                    <h4 className="text-xl font-bold text-purple-300 mb-2">{template.name}</h4>
                    <p className="text-sm text-zinc-400">{template.description}</p>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-3xl mb-1">👑</div>
                    <div className="text-sm text-amber-400 font-semibold">
                      +{template.xp_reward} XP
                    </div>
                  </div>
                </div>

                {/* Required Skills */}
                <div className="mb-4">
                  <div className="text-xs text-zinc-500 mb-2">Required Skills:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.required_skills.map((skill, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex justify-between text-zinc-300">
                    <span>Duration:</span>
                    <span className="font-medium">{template.estimated_duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Attempts:</span>
                    <span className="font-medium">{attempts.length}</span>
                  </div>
                </div>

                {bestScore !== null && (
                  <div className="mb-4 p-3 rounded-lg bg-purple-900/30 border border-purple-700">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-300">Best Performance:</span>
                      <span className="text-lg font-bold text-purple-200">{bestScore}%</span>
                    </div>
                  </div>
                )}

                {unlocked && (
                  <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition">
                    {attempts.length > 0 ? 'Challenge Again' : 'Begin Boss Battle'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats Summary */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-lg font-semibold text-zinc-200 mb-4">Your Challenge Stats</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-emerald-400">
              {userAttempts.filter((a) => a.was_successful).length}
            </div>
            <div className="text-sm text-zinc-400">Challenges Won</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-400">{userAttempts.length}</div>
            <div className="text-sm text-zinc-400">Total Attempts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {userAttempts
                .filter((a) => a.challenge_type === 'boss_battle' && a.was_successful)
                .length}
            </div>
            <div className="text-sm text-zinc-400">Bosses Defeated</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">
              {userAttempts.reduce((sum, a) => sum + a.xp_earned, 0)}
            </div>
            <div className="text-sm text-zinc-400">Challenge XP Earned</div>
          </div>
        </div>
      </section>
    </div>
  );
}
