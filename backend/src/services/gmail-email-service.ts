/**
 * Gmail Email Service
 *
 * Handles email discovery, grouping, and deletion using Gmail API
 */

import { logger } from '../utils/logger.js';
import { GmailOAuthService } from './gmail-oauth-service.js';

export interface EmailMessage {
  gmailMessageId: string;
  threadId: string;
  senderEmail: string;
  senderName: string | undefined;
  subject: string | undefined;
  snippet: string | undefined;
  receivedAt: Date;
  isRead: boolean;
  hasAttachment: boolean;
  labels: string[];
}

export interface EmailSenderGroup {
  senderEmail: string;
  senderName: string | undefined;
  emailCount: number;
  firstEmailDate: Date | undefined;
  lastEmailDate: Date | undefined;
  messages: EmailMessage[];
}

export interface LabelStats {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal: number;
  messagesUnread: number;
  threadsTotal: number;
  threadsUnread: number;
  color?: {
    textColor?: string;
    backgroundColor?: string;
  };
}

export interface InboxStats {
  totalMessages: number;
  totalThreads: number;
  labels: LabelStats[];
  systemLabels: LabelStats[];
  userLabels: LabelStats[];
}

export interface PaginatedEmailResult {
  emails: EmailMessage[];
  nextPageToken: string | undefined;
  resultSizeEstimate: number;
  fetchedCount: number;
}

export interface SenderInfo {
  email: string;
  name: string | undefined;
  count: number;
  latestDate: Date | undefined;
  attachmentCount: number;
  unsubscribeLink: string | undefined;
  hasUnsubscribe: boolean;
  isVerified: boolean;
}

export interface FetchSendersResult {
  senders: SenderInfo[];
  nextPageToken: string | undefined;
  messagesProcessed: number;
  hasMore: boolean;
}

export class GmailEmailService {
  /**
   * Get comprehensive email stats by fetching all labels and their stats
   */
  static async getInboxStats(accessToken: string): Promise<InboxStats> {
    try {
      const gmail = GmailOAuthService.getGmailClient(accessToken);

      // Get user profile for totals
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(profile.data);
      const totalMessages = profile.data.messagesTotal || 0;
      const totalThreads = profile.data.threadsTotal || 0;

      // List all labels
      const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
      const labelsList = labelsResponse.data.labels || [];

      logger.info(`Found ${labelsList.length} labels`);

      // Fetch detailed stats for each label in parallel
      const labelStatsPromises = labelsList.map(async (label): Promise<LabelStats | null> => {
        if (!label.id) return null;

        try {
          const details = await gmail.users.labels.get({
            userId: 'me',
            id: label.id,
          });

          const stats: LabelStats = {
            id: label.id,
            name: details.data.name || label.id,
            type: details.data.type === 'system' ? 'system' : 'user',
            messagesTotal: details.data.messagesTotal || 0,
            messagesUnread: details.data.messagesUnread || 0,
            threadsTotal: details.data.threadsTotal || 0,
            threadsUnread: details.data.threadsUnread || 0,
          };

          // Include color for user labels if available
          if (details.data.color) {
            const color: { textColor?: string; backgroundColor?: string } = {};
            if (details.data.color.textColor) {
              color.textColor = details.data.color.textColor;
            }
            if (details.data.color.backgroundColor) {
              color.backgroundColor = details.data.color.backgroundColor;
            }
            if (Object.keys(color).length > 0) {
              stats.color = color;
            }
          }

          return stats;
        } catch (error) {
          logger.warn(`Failed to get details for label ${label.id}`, { error });
          return null;
        }
      });

      const allLabelStats = await Promise.all(labelStatsPromises);
      const labels = allLabelStats.filter((l): l is LabelStats => l !== null);

      // Separate system and user labels
      const systemLabels = labels.filter(l => l.type === 'system');
      const userLabels = labels.filter(l => l.type === 'user');

      logger.info('Retrieved all label stats', {
        totalMessages,
        totalThreads,
        systemLabels: systemLabels.length,
        userLabels: userLabels.length,
      });

      return {
        totalMessages,
        totalThreads,
        labels,
        systemLabels,
        userLabels,
      };
    } catch (error) {
      logger.error('Failed to get inbox stats', { error });
      throw new Error(`Failed to get inbox stats: ${error}`);
    }
  }

  /**
   * Fetch ALL unique senders from entire Gmail inbox
   * Automatically handles pagination to process all messages
   * Processes messages in batches of 500 for efficiency
   * This will process the ENTIRE inbox (potentially 35k+ emails) in one call
   */
  static async fetchAllSenders(
    accessToken: string,
    progressCallback?: (processed: number, total: number, senders: number) => void
  ): Promise<{ senders: SenderInfo[]; totalProcessed: number }> {
    try {
      logger.info('Starting full sender discovery from Gmail (all messages)');

      const senderMap = new Map<string, SenderInfo>();
      let pageToken: string | undefined;
      let totalProcessed = 0;
      let pageCount = 0;

      // Loop through ALL pages until no more nextPageToken
      do {
        pageCount++;
        logger.info(`Processing page ${pageCount}`, { totalProcessed, uniqueSenders: senderMap.size });

        // Fetch 500 messages per page and accumulate senders
        const result = await this.fetchSendersPaginated(accessToken, 500, pageToken, senderMap);

        totalProcessed += result.messagesProcessed;
        pageToken = result.nextPageToken;

        // Call progress callback if provided
        if (progressCallback) {
          progressCallback(totalProcessed, -1, senderMap.size); // -1 means total unknown
        }

        logger.info(`Page ${pageCount} completed`, {
          processedThisPage: result.messagesProcessed,
          totalProcessed,
          uniqueSenders: senderMap.size,
          hasMore: !!pageToken,
        });

        // Small delay to avoid rate limits (100ms between pages)
        if (pageToken) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } while (pageToken); // Continue until no more pages

      const senders = Array.from(senderMap.values()).sort((a, b) => b.count - a.count);

      logger.info('Completed full sender discovery', {
        totalProcessed,
        uniqueSenders: senders.length,
        pages: pageCount,
      });

      return {
        senders,
        totalProcessed,
      };
    } catch (error) {
      logger.error('Failed to fetch all senders', { error });
      throw new Error(`Failed to fetch all senders: ${error}`);
    }
  }

  /**
   * Fetch unique senders from Gmail with pagination
   * This is more efficient than fetching full emails - only gets From header
   * Uses Google Batch API to fetch up to 100 messages per batch request
   */
  static async fetchSendersPaginated(
    accessToken: string,
    maxMessages: number = 500,
    pageToken?: string,
    existingSenders?: Map<string, SenderInfo>
  ): Promise<FetchSendersResult> {
    try {
      logger.info('Fetching senders from Gmail', { maxMessages, hasPageToken: !!pageToken });

      const gmail = GmailOAuthService.getGmailClient(accessToken);
      const senderMap = existingSenders || new Map<string, SenderInfo>();

      // Cap at 500 per request (Gmail limit)
      const cappedMax = Math.min(maxMessages, 500);

      const listParams: any = {
        userId: 'me',
        maxResults: cappedMax,
        q: 'in:inbox',
      };

      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(listParams);
      const messages = response.data.messages || [];
      console.log(response.data);

      // Process all messages with internal rate limiting in batchGetMessages
      let processedCount = 0;

      logger.info(`Processing ${messages.length} messages with rate limiting`);

      if (messages.length > 0) {
        const messageIds = messages.filter((m) => m.id).map((m) => m.id!);

        if (messageIds.length > 0) {
          try {
            // Use batch request with rate limiting
            const batchResults = await this.batchGetMessages(gmail, messageIds);

            // Process the batch results
            for (const msgData of batchResults) {
              if (!msgData) continue;

              const headers = msgData.payload?.headers || [];
              const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
              const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value;
              const unsubscribeHeader = headers.find((h: any) => h.name.toLowerCase() === 'list-unsubscribe')?.value;
              const authResultsHeader = headers.find((h: any) => h.name.toLowerCase() === 'authentication-results')?.value;

              // Check if message has attachments
              const hasAttachment = msgData.labelIds?.includes('HAS_ATTACHMENT') || false;

              const { email, name } = this.parseEmailAddress(fromHeader);

              if (email) {
                const existing = senderMap.get(email);
                const msgDate = dateHeader ? new Date(dateHeader) : undefined;

                // Extract unsubscribe link
                const unsubscribeLink = this.extractUnsubscribeLink(unsubscribeHeader);

                // Check email verification (SPF/DKIM)
                const isVerified = this.checkEmailVerification(authResultsHeader);

                if (existing) {
                  existing.count++;
                  if (hasAttachment) {
                    existing.attachmentCount++;
                  }
                  if (msgDate && (!existing.latestDate || msgDate > existing.latestDate)) {
                    existing.latestDate = msgDate;
                  }
                  // Update name if we didn't have one
                  if (!existing.name && name) {
                    existing.name = name;
                  }
                  // Update unsubscribe link if found and we don't have one
                  if (!existing.unsubscribeLink && unsubscribeLink) {
                    existing.unsubscribeLink = unsubscribeLink;
                    existing.hasUnsubscribe = true;
                  }
                  // Mark as unverified if any email fails verification
                  if (!isVerified) {
                    existing.isVerified = false;
                  }
                } else {
                  senderMap.set(email, {
                    email,
                    name,
                    count: 1,
                    latestDate: msgDate,
                    attachmentCount: hasAttachment ? 1 : 0,
                    unsubscribeLink,
                    hasUnsubscribe: !!unsubscribeLink,
                    isVerified,
                  });
                }
              }

              processedCount++;
            }

            logger.info(`Processed ${processedCount}/${messages.length} messages successfully`);
          } catch (error) {
            logger.error('Failed to process messages', { error });
            // Continue even if batch fails
          }
        }
      }

      // Convert map to sorted array (by count descending)
      const senders = Array.from(senderMap.values()).sort((a, b) => b.count - a.count);

      logger.info(`Processed ${processedCount} messages, found ${senders.length} unique senders`, {
        hasMore: !!response.data.nextPageToken,
      });

      return {
        senders,
        nextPageToken: response.data.nextPageToken || undefined,
        messagesProcessed: processedCount,
        hasMore: !!response.data.nextPageToken,
      };
    } catch (error) {
      logger.error('Failed to fetch senders from Gmail', { error });
      throw new Error(`Failed to fetch senders: ${error}`);
    }
  }

  /**
   * Batch get multiple messages with rate limiting and retry logic
   * Processes messages in smaller chunks to respect Gmail API quota limits
   * Gmail API: 250 quota units/user/second, messages.get costs 5 units = max 50 calls/sec
   */
  private static async batchGetMessages(gmail: any, messageIds: string[]): Promise<any[]> {
    try {
      // Process in chunks of 40 to stay well under the 50 requests/sec limit
      const CHUNK_SIZE = 40;
      const DELAY_MS = 1000; // 1 second delay between chunks
      const allResults: any[] = [];

      for (let i = 0; i < messageIds.length; i += CHUNK_SIZE) {
        const chunk = messageIds.slice(i, i + CHUNK_SIZE);

        // Fetch chunk concurrently with retry logic
        const chunkPromises = chunk.map(async (messageId) => {
          return this.fetchMessageWithRetry(gmail, messageId, 3);
        });

        const chunkResults = await Promise.all(chunkPromises);
        allResults.push(...chunkResults.filter((r) => r !== null));

        // Add delay between chunks to respect rate limits (except for last chunk)
        if (i + CHUNK_SIZE < messageIds.length) {
          logger.info(`Rate limiting: waiting ${DELAY_MS}ms before next chunk`, {
            processed: i + CHUNK_SIZE,
            total: messageIds.length,
          });
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      logger.info(`Batch fetched ${allResults.length}/${messageIds.length} messages successfully with rate limiting`);
      return allResults;
    } catch (error) {
      logger.error('Batch get messages failed', { error });
      throw error;
    }
  }

  /**
   * Fetch a single message with exponential backoff retry
   */
  private static async fetchMessageWithRetry(
    gmail: any,
    messageId: string,
    maxRetries: number = 3
  ): Promise<any> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'metadata',
          metadataHeaders: ['From', 'Date', 'List-Unsubscribe', 'Authentication-Results'],
        });
        return response.data;
      } catch (error: any) {
        const isRateLimitError = error?.message?.includes('Quota exceeded') ||
                                 error?.code === 429 ||
                                 error?.errors?.[0]?.reason === 'rateLimitExceeded';

        if (isRateLimitError && attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const backoffMs = Math.pow(2, attempt + 1) * 1000;
          logger.warn(`Rate limit hit for message ${messageId}, retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})`, { error: error.message });
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        } else if (attempt === maxRetries) {
          logger.error(`Failed to fetch message ${messageId} after ${maxRetries} retries`, { error: error.message });
          return null;
        } else {
          logger.warn(`Failed to fetch message ${messageId}`, { error: error.message });
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Fetch emails with pagination support
   */
  static async fetchEmailsPaginated(
    accessToken: string,
    maxResults: number = 100,
    pageToken?: string
  ): Promise<PaginatedEmailResult> {
    try {
      logger.info('Fetching emails with pagination', { maxResults, hasPageToken: !!pageToken });

      const gmail = GmailOAuthService.getGmailClient(accessToken);
      const emails: EmailMessage[] = [];

      // Cap maxResults at 500 (Gmail API limit)
      const cappedMaxResults = Math.min(maxResults, 500);

      const listParams: any = {
        userId: 'me',
        maxResults: cappedMaxResults,
        q: 'in:inbox',
      };

      if (pageToken) {
        listParams.pageToken = pageToken;
      }

      const response = await gmail.users.messages.list(listParams);
      const messages = response.data.messages || [];

      // Fetch message details for each message in this page
      for (const message of messages) {
        if (!message.id) continue;

        try {
          const fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date'],
          });

          const email = this.parseEmailMessage(fullMessage.data);
          if (email) {
            emails.push(email);
          }
        } catch (error) {
          logger.warn(`Failed to fetch message ${message.id}`, { error });
        }
      }

      logger.info(`Fetched ${emails.length} emails`, {
        hasMore: !!response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
      });

      return {
        emails,
        nextPageToken: response.data.nextPageToken || undefined,
        resultSizeEstimate: response.data.resultSizeEstimate || 0,
        fetchedCount: emails.length,
      };
    } catch (error) {
      logger.error('Failed to fetch emails with pagination', { error });
      throw new Error(`Gmail email fetch failed: ${error}`);
    }
  }

  /**
   * Parse Gmail message into EmailMessage
   */
  private static parseEmailMessage(message: any): EmailMessage | null {
    try {
      const headers = message.payload?.headers || [];

      // Extract sender from 'From' header
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const { email: senderEmail, name: senderName } = this.parseEmailAddress(fromHeader);

      if (!senderEmail) {
        return null;
      }

      // Extract subject
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';

      // Extract date
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value;
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate || '0'));

      // Check if read
      const isRead = !message.labelIds?.includes('UNREAD');

      // Check for attachments
      const hasAttachment = message.labelIds?.includes('HAS_ATTACHMENT') || false;

      return {
        gmailMessageId: message.id,
        threadId: message.threadId,
        senderEmail,
        senderName,
        subject,
        snippet: message.snippet || '',
        receivedAt,
        isRead,
        hasAttachment,
        labels: message.labelIds || [],
      };
    } catch (error) {
      logger.error('Failed to parse email message', { messageId: message.id, error });
      return null;
    }
  }

  /**
   * Parse email address from "Name <email@example.com>" format
   */
  private static parseEmailAddress(from: string): { email: string; name: string | undefined } {
    // Format: "Display Name <email@example.com>" or just "email@example.com"
    const match = from.match(/(?:"?([^"]*)"?\s)?(?:<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?)/);

    if (match && match[2]) {
      return {
        email: match[2].toLowerCase(),
        name: match[1]?.trim() || undefined,
      };
    }

    return { email: from.toLowerCase(), name: undefined };
  }

  /**
   * Extract unsubscribe link from List-Unsubscribe header
   * Format: <mailto:unsubscribe@example.com>, <http://example.com/unsubscribe>
   */
  private static extractUnsubscribeLink(listUnsubscribeHeader: string | undefined): string | undefined {
    if (!listUnsubscribeHeader) return undefined;

    // Extract HTTP/HTTPS URLs from the header
    const urlMatch = listUnsubscribeHeader.match(/<(https?:\/\/[^>]+)>/);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }

    // If no HTTP URL, try mailto
    const mailtoMatch = listUnsubscribeHeader.match(/<mailto:([^>]+)>/);
    if (mailtoMatch && mailtoMatch[1]) {
      return `mailto:${mailtoMatch[1]}`;
    }

    return undefined;
  }

  /**
   * Check if email passed SPF/DKIM verification
   * Parse Authentication-Results header to check for PASS status
   */
  private static checkEmailVerification(authResultsHeader: string | undefined): boolean {
    if (!authResultsHeader) return true; // Assume verified if no header (benefit of doubt)

    const headerLower = authResultsHeader.toLowerCase();

    // Check for SPF and DKIM pass
    const spfPass = headerLower.includes('spf=pass');
    const dkimPass = headerLower.includes('dkim=pass');

    // Check for failures
    const spfFail = headerLower.includes('spf=fail') || headerLower.includes('spf=softfail');
    const dkimFail = headerLower.includes('dkim=fail');

    // Consider verified if either SPF or DKIM passes and neither fails
    if ((spfPass || dkimPass) && !spfFail && !dkimFail) {
      return true;
    }

    // If there are explicit failures, mark as unverified
    if (spfFail || dkimFail) {
      return false;
    }

    // Default to verified if authentication headers exist but are inconclusive
    return true;
  }

  /**
   * Group emails by sender
   */
  static groupEmailsBySender(emails: EmailMessage[]): EmailSenderGroup[] {
    const senderMap = new Map<string, EmailMessage[]>();

    // Group by sender email
    for (const email of emails) {
      const senderEmail = email.senderEmail.toLowerCase();
      if (!senderMap.has(senderEmail)) {
        senderMap.set(senderEmail, []);
      }
      senderMap.get(senderEmail)!.push(email);
    }

    // Convert to array of groups
    const groups: EmailSenderGroup[] = [];
    for (const [senderEmail, messages] of senderMap.entries()) {
      // Sort messages by date (oldest first)
      messages.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

      const firstEmail = messages[0];
      const lastEmail = messages[messages.length - 1];

      if (!firstEmail || !lastEmail) {
        logger.warn('Empty message array for sender', { senderEmail });
        continue;
      }

      groups.push({
        senderEmail,
        senderName: firstEmail.senderName,
        emailCount: messages.length,
        firstEmailDate: firstEmail.receivedAt,
        lastEmailDate: lastEmail.receivedAt,
        messages,
      });
    }

    // Sort groups by email count (descending)
    groups.sort((a, b) => b.emailCount - a.emailCount);

    return groups;
  }

  /**
   * Delete emails by message IDs
   */
  static async deleteEmails(accessToken: string, messageIds: string[]): Promise<{ deleted: number; failed: number }> {
    try {
      logger.info(`Deleting ${messageIds.length} emails from Gmail`);

      const gmail = GmailOAuthService.getGmailClient(accessToken);

      let deleted = 0;
      let failed = 0;

      // Gmail API allows batch delete up to 1000 messages
      const batchSize = 1000;

      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);

        try {
          // Use batchDelete for efficiency
          await gmail.users.messages.batchDelete({
            userId: 'me',
            requestBody: {
              ids: batch,
            },
          });

          deleted += batch.length;
          logger.info(`Deleted batch of ${batch.length} emails`);
        } catch (error) {
          logger.error(`Failed to delete batch of emails`, { batchSize: batch.length, error });
          failed += batch.length;
        }
      }

      logger.info(`Gmail email deletion complete`, { deleted, failed });

      return { deleted, failed };
    } catch (error) {
      logger.error('Failed to delete Gmail emails', { error });
      throw new Error(`Gmail email deletion failed: ${error}`);
    }
  }

  /**
   * Delete all emails from a specific sender
   */
  static async deleteEmailsFromSender(
    accessToken: string,
    senderEmail: string
  ): Promise<{ deleted: number; failed: number }> {
    try {
      logger.info(`Finding emails from sender: ${senderEmail}`);

      const gmail = GmailOAuthService.getGmailClient(accessToken);

      // Search for all emails from this sender
      const messageIds: string[] = [];
      let pageToken: string | undefined;

      do {
        const listParams: any = {
          userId: 'me',
          maxResults: 500,
          q: `from:${senderEmail}`,
        };

        if (pageToken) {
          listParams.pageToken = pageToken;
        }

        const response = await gmail.users.messages.list(listParams);
        const messages = response.data.messages || [];

        messageIds.push(...messages.map((m: any) => m.id).filter(Boolean));

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info(`Found ${messageIds.length} emails from ${senderEmail}`);

      if (messageIds.length === 0) {
        return { deleted: 0, failed: 0 };
      }

      // Delete all found emails
      return await this.deleteEmails(accessToken, messageIds);
    } catch (error) {
      logger.error('Failed to delete emails from sender', { senderEmail, error });
      throw new Error(`Failed to delete emails from sender: ${error}`);
    }
  }

  /**
   * Get email count by sender (without fetching full messages)
   */
  static async getEmailCountBySender(accessToken: string): Promise<Map<string, number>> {
    try {
      logger.info('Counting emails by sender');

      const gmail = GmailOAuthService.getGmailClient(accessToken);
      const senderCounts = new Map<string, number>();
      let pageToken: string | undefined;

      do {
        const listParams: any = {
          userId: 'me',
          maxResults: 500,
          q: 'in:inbox',
        };

        if (pageToken) {
          listParams.pageToken = pageToken;
        }

        const response = await gmail.users.messages.list(listParams);
        const messages = response.data.messages || [];

        // Fetch metadata for each message (lighter than full message)
        for (const message of messages) {
          if (!message.id) continue;

          try {
            const fullMessage = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'metadata',
              metadataHeaders: ['From'],
            });

            const headers = fullMessage.data.payload?.headers || [];
            const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
            const { email: senderEmail } = this.parseEmailAddress(fromHeader);

            if (senderEmail) {
              senderCounts.set(senderEmail, (senderCounts.get(senderEmail) || 0) + 1);
            }
          } catch (error) {
            logger.warn(`Failed to fetch message ${message.id}`, { error });
          }
        }

        pageToken = response.data.nextPageToken || undefined;
      } while (pageToken);

      logger.info(`Counted emails from ${senderCounts.size} unique senders`);
      return senderCounts;
    } catch (error) {
      logger.error('Failed to count emails by sender', { error });
      throw new Error(`Email counting failed: ${error}`);
    }
  }
}
