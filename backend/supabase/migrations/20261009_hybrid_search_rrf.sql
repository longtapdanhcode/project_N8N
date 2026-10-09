-- ============================================================================
-- CARD 2.2: HYBRID SEARCH (RRF) TRÊN POSTGRESQL & SUPABASE
-- ============================================================================

-- 1. Đảm bảo extension pgvector đã được kích hoạt
create extension if not exists vector;

-- 2. Thêm cột fts (tsvector) tự động sinh từ title và content
-- Sử dụng 'simple' configuration phù hợp cho cả tiếng Việt (không dấu / có dấu) và tiếng Anh
alter table public.documents 
add column if not exists fts tsvector 
generated always as (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
) stored;

-- 3. Tạo chỉ mục GIN trên cột fts để tối ưu tốc độ tìm kiếm full-text
create index if not exists documents_fts_idx 
on public.documents using gin(fts);

-- 4. Tạo chỉ mục HNSW cho vector embedding để tối ưu Vector Cosine Search
create index if not exists documents_embedding_hnsw_idx 
on public.documents using hnsw (embedding vector_cosine_ops);

-- 5. Tạo hàm RPC hybrid_search_rrf áp dụng thuật toán Reciprocal Rank Fusion (RRF)
create or replace function public.hybrid_search_rrf(
  query_text text,
  query_embedding vector(768),
  match_count int default 10,
  rrf_k int default 60,
  full_text_weight float default 1.0,
  semantic_weight float default 1.0
)
returns table (
  id uuid,
  title text,
  content text,
  metadata jsonb,
  score float
)
language sql
stable
as $$
with fts_stage as (
  select
    d.id,
    row_number() over (
      order by ts_rank_cd(d.fts, websearch_to_tsquery('simple', query_text)) desc
    ) as rank_fts
  from public.documents d
  where query_text is not null 
    and trim(query_text) <> ''
    and d.fts @@ websearch_to_tsquery('simple', query_text)
  order by ts_rank_cd(d.fts, websearch_to_tsquery('simple', query_text)) desc
  limit least(match_count * 3, 100)
),
semantic_stage as (
  select
    d.id,
    row_number() over (
      order by d.embedding <=> query_embedding asc
    ) as rank_semantic
  from public.documents d
  where query_embedding is not null
    and d.embedding is not null
  order by d.embedding <=> query_embedding asc
  limit least(match_count * 3, 100)
),
combined as (
  select
    coalesce(f.id, s.id) as id,
    coalesce(full_text_weight / (rrf_k + f.rank_fts), 0.0) +
    coalesce(semantic_weight / (rrf_k + s.rank_semantic), 0.0) as score
  from fts_stage f
  full outer join semantic_stage s on f.id = s.id
)
select
  d.id,
  d.title,
  d.content,
  d.metadata,
  c.score::float as score
from combined c
join public.documents d on d.id = c.id
order by c.score desc
limit match_count;
$$;
