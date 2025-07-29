import type { Agent } from '@/lib/db/schema';
import type { ChatModel } from '@/lib/ai/models';

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  modelId: ChatModel['id'];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  systemPrompt: string;
  modelId: ChatModel['id'];
}

export interface UpdateAgentRequest {
  id: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  modelId?: ChatModel['id'];
}

export type AgentWithoutTimestamps = Omit<Agent, 'createdAt' | 'updatedAt'>;

// Default system agents that come with the app
export const DEFAULT_AGENTS: Omit<CreateAgentRequest, 'userId'>[] = [
  {
    name: 'General Assistant',
    description: 'A helpful AI assistant for general tasks and conversations',
    systemPrompt:
      'You are a friendly and helpful AI assistant. Keep your responses concise and helpful.',
    modelId: 'chat-model',
  },
  {
    name: 'Content Creator',
    description: 'Specialized in generating creative content and ideas',
    systemPrompt:
      'You are a creative content specialist. Focus on generating engaging, original ideas and helping with creative writing, brainstorming, and content strategy.',
    modelId: 'chat-model',
  },
  {
    name: 'Script Writer',
    description:
      'Expert at writing scripts, screenplays, and structured content',
    systemPrompt:
      'You are a professional script writer and storytelling expert. Help users craft compelling scripts, dialogue, and narrative structures. Focus on proper formatting, character development, and engaging storytelling.',
    modelId: 'chat-model',
  },
  {
    name: 'Technical Advisor',
    description: 'Focused on technical problem-solving and code assistance',
    systemPrompt:
      'You are a senior software engineer and technical advisor. Provide clear, accurate technical guidance, code examples, and help with programming challenges. Focus on best practices and practical solutions.',
    modelId: 'chat-model',
  },
  {
    name: 'Reasoning Expert',
    description: 'Uses advanced reasoning for complex problem analysis',
    systemPrompt:
      'You are an expert in logical reasoning and complex problem analysis. Break down complex problems systematically, show your reasoning process, and provide thorough analysis.',
    modelId: 'chat-model-reasoning',
  },
];
