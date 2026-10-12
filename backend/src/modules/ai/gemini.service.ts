import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';

export interface StructuredAiResponse {
  answer: string;
  confidence_score: number;
  citations: string[];
  requires_human_escalation: boolean;
  suggested_actions: string[];
}

export const STRUCTURED_AI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: 'câu trả lời súc tích, rõ ràng cho sinh viên dựa trên tài liệu tham khảo',
    },
    confidence_score: {
      type: Type.NUMBER,
      description: 'thang điểm 0 - 1 đánh giá độ tin cậy dựa trên tài liệu',
    },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'danh sách tiêu đề các tài liệu tham khảo được dùng để trả lời',
    },
    requires_human_escalation: {
      type: Type.BOOLEAN,
      description: 'true nếu câu hỏi nằm ngoài phạm vi tài liệu hoặc điểm tin cậy < 0.6',
    },
    suggested_actions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: 'gợi ý các hành động tiếp theo cho sinh viên',
    },
  },
  required: [
    'answer',
    'confidence_score',
    'citations',
    'requires_human_escalation',
    'suggested_actions',
  ],
};

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      const errorMsg = 'GEMINI_API_KEY is not defined in application configuration.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generates a 768-dimensional vector embedding for the provided text.
   * Uses gemini-embedding-001 by default with fallback to text-embedding-004.
   *
   * @param text The input string to embed
   * @returns Array of numbers representing the 768-dimensional embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === '') {
      const errorMsg = 'Input text for generating embedding cannot be empty.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const primaryModel = this.configService.get<string>(
      'GEMINI_EMBEDDING_MODEL',
      'gemini-embedding-001',
    );
    const fallbackModel =
      primaryModel === 'gemini-embedding-001'
        ? 'text-embedding-004'
        : 'gemini-embedding-001';

    try {
      return await this.executeWithRetry(
        () => this.callEmbedApi(primaryModel, text),
        primaryModel,
      );
    } catch (error: any) {
      if (
        error?.status === 404 ||
        error?.message?.includes('not found') ||
        error?.message?.includes('404')
      ) {
        this.logger.warn(
          `Model '${primaryModel}' not found in current API version. Falling back to '${fallbackModel}'...`,
        );
        try {
          return await this.executeWithRetry(
            () => this.callEmbedApi(fallbackModel, text),
            fallbackModel,
          );
        } catch (fallbackError: any) {
          const fallbackMsg =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);
          this.logger.error(
            `Failed to generate embedding with fallback model: ${fallbackMsg}`,
            fallbackError instanceof Error ? fallbackError.stack : undefined,
          );
          throw fallbackError;
        }
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate embedding with Gemini: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Generates embeddings in batches with concurrency control to prevent rate limiting.
   *
   * @param texts Array of string chunks to embed
   * @param concurrency Number of parallel requests per batch (default: 5)
   * @returns Array of 768-dimensional embedding vectors
   */
  async generateBatchEmbeddings(
    texts: string[],
    concurrency = 5,
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    this.logger.log(
      `Generating batch embeddings for ${texts.length} items (concurrency: ${concurrency})...`,
    );

    const embeddings: number[][] = [];
    for (let i = 0; i < texts.length; i += concurrency) {
      const batch = texts.slice(i, i + concurrency);
      const batchPromises = batch.map((text) => this.generateEmbedding(text));
      const batchResults = await Promise.all(batchPromises);
      embeddings.push(...batchResults);
    }

    this.logger.log(
      `Successfully generated batch embeddings for ${texts.length} items.`,
    );
    return embeddings;
  }

  /**
   * Generates a structured JSON response using Gemini Structured Outputs.
   * Ensures output adheres strictly to StructuredAiResponse schema.
   * Resilient against temporary 503/429 spikes via exponential backoff and fallback model chain.
   *
   * @param prompt The question or user prompt
   * @param contextDocs Array of relevant context text snippets
   * @returns Validated StructuredAiResponse object
   */
  async generateStructuredResponse(
    prompt: string,
    contextDocs: string[] = [],
  ): Promise<StructuredAiResponse> {
    if (!prompt || prompt.trim() === '') {
      const errorMsg = 'Prompt cannot be empty.';
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const primaryModel = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );
    const fallbackModel = this.configService.get<string>(
      'GEMINI_FALLBACK_MODEL',
      'gemini-1.5-flash',
    );
    const modelChain = Array.from(
      new Set([primaryModel, fallbackModel, 'gemini-2.0-flash']),
    );

    const contextText =
      contextDocs && contextDocs.length > 0
        ? contextDocs.join('\n\n---\n\n')
        : 'Không có tài liệu tham khảo nào được tìm thấy.';

    const contents = `Dưới đây là các tài liệu tham khảo được cung cấp:\n${contextText}\n\nCâu hỏi của sinh viên:\n${prompt}`;

    let lastError: any;
    for (const model of modelChain) {
      try {
        return await this.executeWithRetry(
          () => this.callGenerateStructuredContent(model, contents),
          model,
        );
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `Model '${model}' failed: ${error?.message || error}. Falling back to next model in chain...`,
        );
      }
    }

    const errorMessage =
      lastError instanceof Error ? lastError.message : String(lastError);
    this.logger.error(
      `All models in fallback chain failed: ${errorMessage}`,
      lastError instanceof Error ? lastError.stack : undefined,
    );
    throw lastError;
  }

  private isRetryableError(error: any): boolean {
    const status = error?.status || error?.code;
    const msg = error?.message || String(error);
    return (
      status === 503 ||
      status === 429 ||
      msg.includes('503') ||
      msg.includes('429') ||
      msg.includes('UNAVAILABLE') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('high demand')
    );
  }

  private async executeWithRetry<T>(
    action: () => Promise<T>,
    modelName: string,
    maxRetries = 3,
  ): Promise<T> {
    const delays = [1000, 2000, 4000];
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (error: any) {
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delayMs = delays[attempt] ?? 4000;
          this.logger.warn(
            `Gemini API returned retryable error for '${modelName}'. Retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Unreachable retry state');
  }

  private async callGenerateStructuredContent(
    model: string,
    contents: string,
  ): Promise<StructuredAiResponse> {
    const response = await this.ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction:
          'Bạn là trợ lý AI học vụ của VKU. Trả lời chính xác dựa trên tài liệu được cung cấp. Nếu tài liệu không chứa câu trả lời, hãy báo requires_human_escalation = true.',
        responseMimeType: 'application/json',
        responseSchema: STRUCTURED_AI_RESPONSE_SCHEMA,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error(`Empty response returned from Gemini API for model '${model}'.`);
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: StructuredAiResponse = JSON.parse(cleanJson);

    // Business rule: if confidence < 0.6, requires_human_escalation must be true
    const confidence =
      typeof parsed.confidence_score === 'number'
        ? parsed.confidence_score
        : 0;
    const requiresEscalation =
      parsed.requires_human_escalation === true || confidence < 0.6;

    return {
      answer: parsed.answer ?? '',
      confidence_score: confidence,
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      requires_human_escalation: requiresEscalation,
      suggested_actions: Array.isArray(parsed.suggested_actions)
        ? parsed.suggested_actions
        : [],
    };
  }

  private async callEmbedApi(model: string, text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model,
      contents: text,
      config: {
        outputDimensionality: 768,
      },
    });

    const values =
      response.embeddings?.[0]?.values ??
      (response as any).embedding?.values;

    if (!values || values.length === 0) {
      throw new Error(
        `No embedding values returned from Gemini API for model '${model}'.`,
      );
    }

    return values;
  }
}
