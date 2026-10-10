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
      return await this.callEmbedApi(primaryModel, text);
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
          return await this.callEmbedApi(fallbackModel, text);
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
   * Generates a structured JSON response using Gemini Structured Outputs.
   * Ensures output adheres strictly to StructuredAiResponse schema.
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

    const modelName = this.configService.get<string>(
      'GEMINI_MODEL',
      'gemini-2.5-flash',
    );

    const contextText =
      contextDocs && contextDocs.length > 0
        ? contextDocs.join('\n\n---\n\n')
        : 'Không có tài liệu tham khảo nào được tìm thấy.';

    const contents = `Dưới đây là các tài liệu tham khảo được cung cấp:\n${contextText}\n\nCâu hỏi của sinh viên:\n${prompt}`;

    try {
      return await this.callGenerateStructuredContent(modelName, contents);
    } catch (error: any) {
      if (
        (error?.status === 404 ||
          error?.message?.includes('not found') ||
          error?.message?.includes('404')) &&
        modelName !== 'gemini-1.5-flash'
      ) {
        this.logger.warn(
          `Model '${modelName}' not found or unsupported. Falling back to 'gemini-1.5-flash'...`,
        );
        return await this.callGenerateStructuredContent(
          'gemini-1.5-flash',
          contents,
        );
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to generate structured response with Gemini: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
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
