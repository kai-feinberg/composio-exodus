import type { UserType } from '@/lib/auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 1000, // Increased for development
    availableChatModelIds: [
      'chat-model',
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
