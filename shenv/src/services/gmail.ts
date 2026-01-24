/**
 * Gmail Management API Service
 */
import { apiClient } from './api';

export interface GmailAuthStatus {
  isConnected: boolean;
}

export interface GmailSender {
  id: number;
  userId: number;
  senderEmail: string;
  senderName: string | null;
  emailCount: number;
  firstEmailDate: string;
  lastEmailDate: string;
  lastSyncedAt: string;
}

export interface GmailEmail {
  id: number;
  gmailMessageId: string;
  threadId: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  isRead: boolean;
  hasAttachment: boolean;
  labels: string[];
}

export interface SendersListResponse {
  success: boolean;
  data: {
    senders: GmailSender[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SenderEmailsResponse {
  success: boolean;
  data: {
    sender: GmailSender;
    emails: GmailEmail[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const gmailApi = {
  // OAuth
  authorize: async () => {
    const response = await apiClient.post('/api/gmail/oauth/authorize');
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get<{ success: boolean; data: GmailAuthStatus }>('/api/gmail/oauth/status');
    return response.data;
  },

  revoke: async () => {
    const response = await apiClient.delete('/api/gmail/oauth/revoke');
    return response.data;
  },

  // Discovery
  discover: async () => {
    const response = await apiClient.post('/api/gmail/emails/discover');
    return response.data;
  },

  // Senders
  getSenders: async (limit: number = 20, offset: number = 0) => {
    const response = await apiClient.get<SendersListResponse>('/api/gmail/senders', {
      params: { limit, offset },
    });
    return response.data;
  },

  getSenderEmails: async (senderId: number, limit: number = 10, offset: number = 0) => {
    const response = await apiClient.get<SenderEmailsResponse>(`/api/gmail/senders/${senderId}/emails`, {
      params: { limit, offset },
    });
    return response.data;
  },

  // Actions
  deleteSender: async (senderId: number) => {
    const response = await apiClient.delete(`/api/gmail/senders/${senderId}`);
    return response.data;
  },

  bulkDeleteSenders: async (senderIds: number[]) => {
    const response = await apiClient.post('/api/gmail/senders/bulk-delete', { senderIds });
    return response.data;
  },
};
