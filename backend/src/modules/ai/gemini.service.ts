import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

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
   * Uses text-embedding-004 model with 768 output dimension, with a fallback
   * to gemini-embedding-001 if text-embedding-004 is retired in the current API version.
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

    try {
      return await this.callEmbedApi('text-embedding-004', text);
    } catch (error: any) {
      // Graceful fallback if text-embedding-004 is not supported or retired (HTTP 404)
      if (
        error?.status === 404 ||
        error?.message?.includes('not found') ||
        error?.message?.includes('404')
      ) {
        this.logger.warn(
          `Model 'text-embedding-004' not found in current API version. Falling back to 'gemini-embedding-001'...`,
        );
        try {
          return await this.callEmbedApi('gemini-embedding-001', text);
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
