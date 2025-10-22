-- Grant permissions for service role to insert learning tool content

-- Service role can insert into all question/content tables
create policy "Service role can insert trivia questions" on trivia_questions
  for insert with check (true);

create policy "Service role can insert detective cases" on detective_cases
  for insert with check (true);

create policy "Service role can insert memory pairs" on memory_pairs
  for insert with check (true);

create policy "Service role can insert prescriber cases" on prescriber_cases
  for insert with check (true);

create policy "Service role can insert taboo terms" on taboo_terms
  for insert with check (true);

create policy "Service role can insert micro cases" on micro_cases
  for insert with check (true);

create policy "Service role can insert ecg rhythms" on ecg_rhythms
  for insert with check (true);

create policy "Service role can insert drug interaction cases" on drug_interaction_cases
  for insert with check (true);

create policy "Service role can insert clinical concepts" on clinical_concepts
  for insert with check (true);

create policy "Service role can insert clinical connections" on clinical_connections
  for insert with check (true);

create policy "Service role can insert pathology slides" on pathology_slides
  for insert with check (true);

create policy "Service role can insert battle royale tournaments" on battle_royale_tournaments
  for insert with check (true);
