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
  attachmentCount: number;
  firstEmailDate: string;
  lastEmailDate: string;
  unsubscribeLink: string | null;
  hasUnsubscribe: boolean;
  isVerified: boolean;
  isUnsubscribed: boolean;
  unsubscribedAt: string | null;
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

export interface LabelStats {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  color?: { textColor?: string; backgroundColor?: string };
}

export interface InboxStats {
  totalMessages: number;
  totalThreads: number;
  labels: LabelStats[];
  systemLabels: LabelStats[];
  userLabels: LabelStats[];
}

export interface DiscoverResponse {
  success: boolean;
  data: {
    fetchedEmails: number;
    storedEmails: number;
    uniqueSenders: number;
    nextPageToken?: string;
    hasMore: boolean;
    resultSizeEstimate?: number;
  };
}

export interface FetchSendersResponse {
  success: boolean;
  data: {
    senders: GmailSender[];
    messagesProcessed: number;
    uniqueSendersFound: number;
    nextPageToken?: string;
    hasMore: boolean;
  };
}

export interface SendersListResponse {
  success: boolean;
  data: {
    senders: GmailSender[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    stats: {
      totalSenders: number;
      totalEmails: number;
    };
    filters: {
      sortBy: string;
      sortOrder: string;
      search?: string;
    };
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

export interface DeleteResult {
  success: boolean;
  data: {
    deleted: number;
    failed: number;
    errors?: string[];
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
  discover: async (maxResults?: number, pageToken?: string) => {
    const response = await apiClient.post<DiscoverResponse>('/api/gmail/emails/discover', {
      maxResults,
      pageToken,
    });
    return response.data;
  },

  // Inbox stats
  getInboxStats: async () => {
    const response = await apiClient.get<{ success: boolean; data: InboxStats }>('/api/gmail/inbox/stats');
    return response.data;
  },

  // Fetch senders (quick scan)
  fetchSenders: async (maxMessages?: number, pageToken?: string) => {
    const response = await apiClient.post<FetchSendersResponse>('/api/gmail/senders/fetch', {
      maxMessages,
      pageToken,
    });
    return response.data;
  },

  // Senders
  getSenders: async (
    limit: number = 20,
    offset: number = 0,
    sortBy?: string,
    sortOrder?: string,
    search?: string
  ) => {
    const response = await apiClient.get<SendersListResponse>('/api/gmail/senders', {
      params: { limit, offset, sortBy, sortOrder, search },
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
  deleteSender: async (senderId: number): Promise<DeleteResult> => {
    const response = await apiClient.delete(`/api/gmail/senders/${senderId}`);
    return response.data;
  },

  bulkDeleteSenders: async (senderIds: number[]): Promise<DeleteResult> => {
    const response = await apiClient.post('/api/gmail/senders/bulk-delete', { senderIds });
    return response.data;
  },

  // Fetch all senders (entire inbox)
  fetchAllSenders: async () => {
    const response = await apiClient.post('/api/gmail/senders/fetch-all', {
      saveToDb: true,
    });
    return response.data;
  },

  // Unsubscribe
  unsubscribe: async (senderId: number) => {
    const response = await apiClient.post(`/api/gmail/senders/${senderId}/unsubscribe`);
    return response.data;
  },

  // Get unverified senders
  getUnverifiedSenders: async (limit: number = 100, offset: number = 0) => {
    const response = await apiClient.get<SendersListResponse>('/api/gmail/senders/unverified', {
      params: { limit, offset },
    });
    return response.data;
  },
};
