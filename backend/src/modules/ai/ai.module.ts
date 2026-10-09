import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiService } from './gemini.service';
import { SupabaseService } from './supabase.service';
import { AiService } from './ai.service';

@Module({
  imports: [ConfigModule],
  providers: [GeminiService, SupabaseService, AiService],
  exports: [GeminiService, SupabaseService, AiService],
})
export class AiModule {}
