import { customProvider } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
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
        'chat-model': anthropic('claude-sonnet-4-20250514'),
        'chat-model-reasoning': anthropic('claude-sonnet-4-20250514'),
        'title-model': anthropic('claude-sonnet-4-20250514'),
        'artifact-model': anthropic('claude-sonnet-4-20250514'),
        // 'chat-model': anthropic('claude-3-haiku-20240307'),
        // 'chat-model-reasoning': anthropic('claude-3-haiku-20240307'),
        // 'title-model': anthropic('claude-3-haiku-20240307'),
        // 'artifact-model': anthropic('claude-3-haiku-20240307'),
      },
    });
