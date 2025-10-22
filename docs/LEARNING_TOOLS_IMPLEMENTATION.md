# Learning Tools - Complete Implementation Plan

## Overview
14 interactive game-based learning tools for medical students, with AI-powered question generation using Together AI.

---

## Tools Summary

### 1. **Medical Jeopardy** ✅ COMPLETE
- Game-show style questions by specialty
- 5 categories, $100-$500 point values
- Multiplayer support (1-8 players)
- Questions from AI or uploaded materials
- Status: **Fully implemented**

### 2. **Study Notes** ✅ COMPLETE
- Rich text editor with auto-save
- Folder organization, tagging, color coding
- Search and filter capabilities
- Status: **Fully implemented**

### 3. **Trivia Race** ⚡
- **Concept**: Rapid-fire MCQs with 10-second timer per question
- **Features**:
  - Lightning rounds (5-30 questions)
  - Streak bonuses (3x = +50pts, 5x = +100pts)
  - Time bonuses (faster = more points)
  - Difficulty selection (easy/medium/hard/all)
  - Full answer review with explanations
- **AI Integration**: Generate questions on-demand by topic/difficulty
- **Database**: trivia_questions, trivia_sessions, trivia_answers
- **Status**: Ready to implement

### 4. **Diagnosis Detective** 🕵️
- **Concept**: Mystery case puzzle with strategic clue purchasing
- **Features**:
  - Start with limited info (age, chief complaint)
  - "Buy" clues with budget (labs=100pts, imaging=200pts, history=50pts)
  - Make diagnosis with minimal spending
  - Efficiency scoring (fewer clues = higher score)
  - Daily mystery challenges
- **AI Integration**: Generate complete mystery cases with hidden clues
- **Database**: detective_cases, detective_sessions, detective_clues_revealed
- **Status**: Ready to implement

### 5. **Memory Match** 🃏
- **Concept**: Medical concept matching game with timer
- **Features**:
  - Match pairs: Drug↔Mechanism, Disease↔Pathogen, Symptom↔Diagnosis
  - Difficulty levels (8, 16, 24, 32 cards)
  - Timed challenges with leaderboard
  - Categories: Pharm, Micro, Path, Anatomy
  - Multiplayer mode (take turns)
- **AI Integration**: Generate matching pairs by topic
- **Database**: memory_pairs, memory_sessions
- **Status**: Ready to implement

### 6. **Pharmacy Prescriber** 💊
- **Concept**: Realistic prescription writing simulator
- **Features**:
  - Patient scenarios requiring medication
  - Write complete Rx (drug, dose, route, frequency, duration)
  - Check drug interactions, contraindications, allergies
  - Renal dosing adjustments
  - Scoring for correctness and safety
  - Common error feedback
- **AI Integration**: Generate patient scenarios with medication needs
- **Database**: prescriber_cases, prescriber_sessions
- **Status**: Ready to implement

### 7. **Anatomy Speed Label** 🫀
- **Concept**: Drag-and-drop anatomy labeling with timer
- **Features**:
  - Different body systems (heart, brain, kidney, lungs, etc.)
  - Speed bonuses
  - Progressive difficulty
  - Different views (anterior, posterior, cross-section)
  - Daily anatomy challenge
- **AI Integration**: Generate labeling challenges
- **Database**: anatomy_challenges, anatomy_sessions
- **Status**: Ready to implement (requires anatomy images)

### 8. **Medical Taboo** 🗣️
- **Concept**: Describe medical terms without forbidden words
- **Features**:
  - 60-second rounds
  - Multiplayer teams
  - AI judge to verify forbidden words weren't used
  - Categories: diseases, drugs, procedures, anatomy
  - Points for speed and accuracy
- **AI Integration**: Generate term + forbidden words, judge descriptions
- **Database**: taboo_terms, taboo_sessions
- **Status**: Ready to implement

### 9. **Step 1 Battle Royale** ⚔️
- **Concept**: Elimination-style quiz competition
- **Features**:
  - Start with 100 virtual students (or actual users)
  - Same question simultaneously
  - 15 seconds per question
  - Wrong answer = eliminated
  - Progressively harder questions
  - Weekly tournaments with badges
- **AI Integration**: Generate progressive difficulty questions
- **Database**: battle_royale_tournaments, battle_participants
- **Status**: Ready to implement

### 10. **Clinical Connect** 🧩
- **Concept**: Knowledge graph building game
- **Features**:
  - Start with one concept (e.g., "Atrial Fibrillation")
  - Draw connections to related topics
  - Earn points for valid connections
  - Discover hidden connections (bonus points)
  - Build comprehensive knowledge web
- **AI Integration**: Validate connections, suggest related concepts
- **Database**: clinical_concepts, clinical_connections, connection_sessions
- **Status**: Ready to implement

### 11. **Micro ID Lab** 🦠
- **Concept**: Virtual microbiology identification
- **Features**:
  - Virtual gram stains, cultures, biochemical tests
  - Order tests strategically (cost points)
  - Identify organism efficiently
  - Time pressure scenarios (ICU patient!)
  - Antibiotic susceptibility challenges
- **AI Integration**: Generate organism cases with test results
- **Database**: micro_cases, micro_sessions, micro_tests_ordered
- **Status**: Ready to implement

### 12. **ECG Rhythm Master** 💓
- **Concept**: Rapid ECG rhythm interpretation
- **Features**:
  - Identify rhythm in 10 seconds
  - Progressive difficulty
  - "Treat or Not" decision mode
  - ACLS scenarios
  - Streak tracking and achievements
- **AI Integration**: Generate rhythm descriptions (or use image library)
- **Database**: ecg_rhythms, ecg_sessions
- **Status**: Ready to implement (requires ECG images)

### 13. **Drug Interaction Simulator** ⚗️
- **Concept**: Build safe medication regimens
- **Features**:
  - Patient with multiple conditions
  - Add medications one by one
  - Real-time interaction warnings
  - QTc prolongation risk meter
  - Renal dosing calculator
  - Points for safe, effective regimens
- **AI Integration**: Generate complex patient scenarios
- **Database**: drug_interaction_cases, drug_sessions
- **Status**: Ready to implement

### 14. **Pathology Casino** 🎰
- **Concept**: Bet on histology slide diagnoses
- **Features**:
  - Shown microscopy image
  - Choose confidence level (1x, 2x, 5x multiplier)
  - Higher bet = higher stakes
  - Build "points bank"
  - Progressive reveal (starts blurry, gets clearer)
- **AI Integration**: Generate case descriptions (requires path images)
- **Database**: pathology_slides, casino_sessions
- **Status**: Ready to implement (requires histology images)

---

## AI Integration Strategy

### Together AI Usage:
All tools will use Together AI's Llama 3.1 70B for:
1. **Question Generation**: Generate MCQs, cases, scenarios on-demand
2. **Content Validation**: Check answers, validate connections
3. **Explanation Generation**: Provide detailed explanations
4. **Difficulty Scaling**: Adjust difficulty based on performance

### Generation Scripts:
Create one script per tool type:
- `scripts/generateTriviaQuestions.ts`
- `scripts/generateDetectiveCases.ts`
- `scripts/generateMemoryPairs.ts`
- `scripts/generatePrescriberCases.ts`
- `scripts/generateTabooTerms.ts`
- `scripts/generateMicroCases.ts`
- `scripts/generateDrugInteractionCases.ts`

Each script will:
1. Use Together AI to generate content in batches
2. Store in Supabase
3. Support filtering by topic, difficulty, system

---

## Database Schema

### Universal Game Session Tracking:
```sql
create table learning_tool_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  tool_type text not null, -- 'trivia', 'detective', 'memory', etc.

  -- Performance
  score integer default 0,
  questions_answered integer default 0,
  questions_correct integer default 0,
  accuracy_percentage integer,

  -- Timing
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_time_seconds integer,

  -- Metadata
  difficulty text,
  settings jsonb -- Tool-specific settings
);
```

### Tool-Specific Tables:
Each tool gets its own content table (trivia_questions, detective_cases, etc.)

---

## Implementation Order

### Batch 1 (Simple, High-Impact):
1. ✅ Trivia Race - Rapid MCQs
2. Memory Match - Card matching
3. Medical Taboo - Word game

### Batch 2 (Medium Complexity):
4. Diagnosis Detective - Mystery cases
5. Pharmacy Prescriber - Prescription sim
6. Drug Interaction Simulator - Safety game

### Batch 3 (Complex):
7. Micro ID Lab - Lab simulation
8. ECG Rhythm Master - Rhythm interpretation
9. Battle Royale - Multiplayer elimination

### Batch 4 (Advanced):
10. Clinical Connect - Knowledge graphs
11. Anatomy Labeling - Image-based (needs images)
12. Pathology Casino - Histology game (needs images)

---

## Next Steps

1. **Apply learning tools migration** to Supabase
2. **Generate initial content** using Together AI for each tool
3. **Build components** in batches
4. **Test and iterate**
5. **Add leaderboards and achievements**

---

## Estimated Timeline

- **Week 1**: Trivia, Memory Match, Taboo (Batch 1)
- **Week 2**: Detective, Prescriber, Drug Interaction (Batch 2)
- **Week 3**: Micro Lab, ECG, Battle Royale (Batch 3)
- **Week 4**: Clinical Connect, Anatomy, Pathology (Batch 4)
- **Week 5**: Polish, test, deploy

**Total**: 5 weeks for all 12 new tools + existing 2 (Jeopardy, Notes)
