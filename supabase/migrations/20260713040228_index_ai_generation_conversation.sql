create index if not exists ai_generations_conversation_created_idx
  on public.ai_generations(conversation_id, created_at desc);
