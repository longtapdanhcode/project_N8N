import { Injectable, Logger } from '@nestjs/common';

export interface TextSplitterOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

@Injectable()
export class TextSplitterService {
  private readonly logger = new Logger(TextSplitterService.name);

  /**
   * Splits a long text recursively into overlapping chunks based on a hierarchy of separators.
   * Priority: '\n\n' -> '\n' -> '. ' -> ' '
   *
   * @param text The input text to be split
   * @param options Tuning parameters for chunkSize, chunkOverlap, and custom separators
   * @returns Array of chunk strings
   */
  splitText(text: string, options?: TextSplitterOptions): string[] {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return [];
    }

    const chunkSize = options?.chunkSize ?? 800;
    const chunkOverlap = options?.chunkOverlap ?? 150;
    const separators = options?.separators ?? ['\n\n', '\n', '. ', ' '];

    const trimmed = text.trim();
    if (trimmed.length <= chunkSize) {
      return [trimmed];
    }

    const chunks = this.recursiveSplit(trimmed, separators, chunkSize, chunkOverlap);
    this.logger.log(
      `Text of length ${trimmed.length} split into ${chunks.length} chunks (chunkSize: ${chunkSize}, overlap: ${chunkOverlap}).`,
    );
    return chunks;
  }

  private recursiveSplit(
    text: string,
    separators: string[],
    chunkSize: number,
    chunkOverlap: number,
  ): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    if (separators.length === 0) {
      // Base case: hard split by characters with overlap
      return this.hardSplit(text, chunkSize, chunkOverlap);
    }

    const [currentSep, ...remainingSeps] = separators;
    const splits = text.split(currentSep);

    if (splits.length === 1) {
      // Separator not present, continue with remaining separators
      return this.recursiveSplit(text, remainingSeps, chunkSize, chunkOverlap);
    }

    const chunks: string[] = [];
    let currentChunk = '';

    for (let i = 0; i < splits.length; i++) {
      const piece = splits[i].trim();
      if (!piece) continue;

      // If a single piece is larger than chunkSize, recursively split it with remaining separators
      if (piece.length > chunkSize) {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        const subChunks = this.recursiveSplit(
          piece,
          remainingSeps,
          chunkSize,
          chunkOverlap,
        );
        chunks.push(...subChunks);
        continue;
      }

      const candidate = currentChunk
        ? `${currentChunk}${currentSep}${piece}`
        : piece;

      if (candidate.length <= chunkSize) {
        currentChunk = candidate;
      } else {
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }

        // Apply clean overlap from currentChunk
        const overlap = this.extractOverlap(currentChunk, chunkOverlap);
        currentChunk = overlap ? `${overlap}${currentSep}${piece}` : piece;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private extractOverlap(chunk: string, overlapSize: number): string {
    if (!chunk || overlapSize <= 0) return '';
    if (chunk.length <= overlapSize) return chunk.trim();

    const rawOverlap = chunk.slice(chunk.length - overlapSize);
    // Try to find the first whitespace to avoid cutting a word in half
    const spaceIndex = rawOverlap.indexOf(' ');
    if (spaceIndex !== -1 && spaceIndex < rawOverlap.length / 2) {
      return rawOverlap.slice(spaceIndex + 1).trim();
    }
    return rawOverlap.trim();
  }

  private hardSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      if (end >= text.length) break;
      start += Math.max(1, chunkSize - chunkOverlap);
    }
    return chunks;
  }
}
