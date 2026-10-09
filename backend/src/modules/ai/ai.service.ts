import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import {
  SupabaseService,
  HybridSearchResult,
  HybridSearchOptions,
  DocumentRecord,
  MatchedDocument,
} from './supabase.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /**
   * Performs hybrid search combining full-text search and semantic vector search using RRF.
   * Automatically generates the vector embedding for the query using GeminiService.
   *
   * @param query The search query string
   * @param options Optional tuning parameters for RRF fusion
   * @returns List of matching documents sorted by RRF score descending
   */
  async hybridSearch(
    query: string,
    options?: HybridSearchOptions,
  ): Promise<HybridSearchResult[]> {
    if (!query || query.trim() === '') {
      const errorMsg = 'Search query cannot be empty.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.logger.log(`Executing hybrid search (RRF) for query: "${query}"`);

    // 1. Generate query embedding vector using Gemini
    const queryEmbedding = await this.geminiService.generateEmbedding(query);

    // 2. Perform hybrid search via Supabase RPC
    return await this.supabaseService.hybridSearch(query, queryEmbedding, options);
  }

  /**
   * Helper to index a document by generating its embedding and storing it in Supabase.
   *
   * @param title Title of the document
   * @param content Body content
   * @param metadata Optional metadata
   * @returns Created DocumentRecord
   */
  async addDocument(
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<DocumentRecord> {
    this.logger.log(`Ingesting document: "${title}"`);
    const textToEmbed = `${title}\n${content}`;
    const embedding = await this.geminiService.generateEmbedding(textToEmbed);
    return await this.supabaseService.insertDocument(title, content, embedding, metadata);
  }

  /**
   * Helper to perform pure semantic vector search.
   *
   * @param query Search query text
   * @param matchThreshold Cosine similarity threshold (default: 0.5)
   * @param matchCount Max matches (default: 5)
   * @returns Matched documents with similarity
   */
  async semanticSearch(
    query: string,
    matchThreshold = 0.5,
    matchCount = 5,
  ): Promise<MatchedDocument[]> {
    const queryEmbedding = await this.geminiService.generateEmbedding(query);
    return await this.supabaseService.searchSimilarDocuments(
      queryEmbedding,
      matchThreshold,
      matchCount,
    );
  }
}
