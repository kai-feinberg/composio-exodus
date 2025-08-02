import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { xai } from '@ai-sdk/xai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': gateway('xai/grok-2-vision-1212'),
        'chat-model-reasoning': wrapLanguageModel({
          model: gateway('xai/grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': gateway('xai/grok-2-1212'),
        'artifact-model': gateway('xai/grok-2-1212'),
        // Requested gateway models
        'anthropic-claude-4-sonnet': gateway('anthropic/claude-4-sonnet'),
        'openai-o3': gateway('openai/o3'),
        'openai-gpt4-1-mini': gateway('openai/gpt-4.1-mini'),
        'moonshotai-kimi-k2': gateway('moonshotai/kimi-k2'),
      },
      imageModels: {
        'small-model': xai.imageModel('grok-2-image'),
      },
      fallbackProvider: xai, // Keep xAI as fallback if gateway fails
    });
