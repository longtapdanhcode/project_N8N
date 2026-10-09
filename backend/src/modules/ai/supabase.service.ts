import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  embedding?: number[] | string;
  created_at?: string;
}

export interface MatchedDocument {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  similarity: number;
}

export interface HybridSearchResult {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  score: number;
}

export interface HybridSearchOptions {
  matchCount?: number;
  rrfK?: number;
  fullTextWeight?: number;
  semanticWeight?: number;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl) {
      const errorMsg = 'SUPABASE_URL is not defined in application configuration.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!supabaseServiceKey) {
      const errorMsg = 'SUPABASE_SERVICE_ROLE_KEY is not defined in application configuration.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.client = createClient(supabaseUrl, supabaseServiceKey);
    this.logger.log(`Supabase client initialized for URL: ${supabaseUrl}`);
  }

  /**
   * Getter method to access the raw SupabaseClient instance.
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Property getter for convenience.
   */
  get supabaseClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Inserts a document with its vector embedding into the public.documents table.
   *
   * @param title Title of the document
   * @param content Text content of the document
   * @param embedding 768-dimensional float embedding vector
   * @param metadata Optional metadata object (JSONB)
   * @returns The newly created DocumentRecord
   */
  async insertDocument<T = DocumentRecord>(
    title: string,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {},
  ): Promise<T> {
    try {
      const { data, error } = await this.client
        .from('documents')
        .insert({
          title,
          content,
          embedding,
          metadata: metadata ?? {},
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to insert document into Supabase: ${error.message}`, error);
        throw error;
      }

      this.logger.log(`Document "${title}" inserted successfully with ID: ${(data as any)?.id}`);
      return data as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in insertDocument: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Searches for similar documents using cosine similarity via match_documents RPC.
   *
   * @param queryEmbedding Vector embedding of the search query
   * @param matchThreshold Minimum cosine similarity threshold (default: 0.5)
   * @param matchCount Maximum number of matching documents to return (default: 5)
   * @returns List of matching documents including their similarity score
   */
  async searchSimilarDocuments<T = MatchedDocument>(
    queryEmbedding: number[],
    matchThreshold = 0.5,
    matchCount = 5,
  ): Promise<T[]> {
    try {
      const { data, error } = await this.client.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
      });

      if (error) {
        this.logger.error(`Failed to execute match_documents RPC: ${error.message}`, error);
        throw error;
      }

      this.logger.log(`Found ${(data as any[])?.length ?? 0} similar documents (threshold: ${matchThreshold})`);
      return (data as T[]) ?? [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in searchSimilarDocuments: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Performs hybrid search using Reciprocal Rank Fusion (RRF) on PostgreSQL via hybrid_search_rrf RPC.
   *
   * @param queryText Text search query for full-text search
   * @param queryEmbedding 768-dimensional float embedding vector for semantic search
   * @param options Tuning parameters: matchCount (default: 10), rrfK (default: 60), fullTextWeight (default: 1.0), semanticWeight (default: 1.0)
   * @returns List of matching documents sorted by RRF fusion score descending
   */
  async hybridSearch<T = HybridSearchResult>(
    queryText: string,
    queryEmbedding: number[],
    options?: HybridSearchOptions,
  ): Promise<T[]> {
    const matchCount = options?.matchCount ?? 10;
    const rrfK = options?.rrfK ?? 60;
    const fullTextWeight = options?.fullTextWeight ?? 1.0;
    const semanticWeight = options?.semanticWeight ?? 1.0;

    try {
      const { data, error } = await this.client.rpc('hybrid_search_rrf', {
        query_text: queryText,
        query_embedding: queryEmbedding,
        match_count: matchCount,
        rrf_k: rrfK,
        full_text_weight: fullTextWeight,
        semantic_weight: semanticWeight,
      });

      if (error) {
        this.logger.error(`Failed to execute hybrid_search_rrf RPC: ${error.message}`, error);
        throw error;
      }

      this.logger.log(
        `Hybrid search completed: retrieved ${(data as any[])?.length ?? 0} results for "${queryText}"`,
      );
      return (data as T[]) ?? [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in hybridSearch: ${errorMessage}`);
      throw error;
    }
  }
}
