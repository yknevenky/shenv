/**
 * Gmail Email Management Routes
 *
 * API endpoints for Gmail OAuth, email discovery, grouping, and deletion
 */

import { Hono } from 'hono';
import { jwtMiddleware, attachUser, type AuthVariables } from '../middleware/auth.js';
import { GmailOAuthService } from '../services/gmail-oauth-service.js';
import { GmailEmailService } from '../services/gmail-email-service.js';
import { GmailOAuthTokenRepository } from '../db/repositories/gmail-oauth-token.js';
import { EmailSenderRepository } from '../db/repositories/email-sender.js';
import { EmailRepository } from '../db/repositories/email.js';
import { logger } from '../utils/logger.js';

const app = new Hono<{ Variables: AuthVariables }>();

// Apply authentication middleware to all routes except OAuth callback
app.use('*', async (c, next) => {
  // Skip auth for OAuth callback (check both full path and relative path)
  const path = c.req.path;
  if (path === '/oauth/callback' || path.includes('/oauth/callback')) {
    return next();
  }

  // Chain JWT middleware and user attachment
  return jwtMiddleware(c, async () => {
    await attachUser(c, next);
  });
});

/**
 * POST /api/gmail/oauth/authorize
 * Get authorization URL for Gmail OAuth
 */
app.post('/oauth/authorize', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const authUrl = GmailOAuthService.getAuthorizationUrl(user.id);

    return c.json({
      success: true,
      data: {
        authorizationUrl: authUrl,
      },
      message: 'Please visit the authorization URL to grant Gmail access',
    });
  } catch (error: any) {
    logger.error('Failed to generate authorization URL', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to generate authorization URL',
    }, 500);
  }
});

/**
 * GET /api/gmail/oauth/callback
 * OAuth callback endpoint (called by Google after user authorizes)
 */
app.get('/oauth/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state'); // Contains user ID
    const error = c.req.query('error');

    if (error) {
      return c.json({
        error: true,
        message: `OAuth authorization failed: ${error}`,
      }, 400);
    }

    if (!code || !state) {
      return c.json({
        error: true,
        message: 'Missing authorization code or state',
      }, 400);
    }

    const userId = parseInt(state);
    if (isNaN(userId)) {
      return c.json({
        error: true,
        message: 'Invalid user ID in state',
      }, 400);
    }

    // Exchange code for tokens
    const tokens = await GmailOAuthService.exchangeCodeForTokens(code);

    // Encrypt and store tokens
    const { encryptedAccessToken, encryptedRefreshToken } = GmailOAuthService.encryptTokens(tokens);
    await GmailOAuthTokenRepository.upsert(
      userId,
      encryptedAccessToken,
      encryptedRefreshToken,
      tokens.expiresAt,
      tokens.scope
    );

    logger.info('Gmail OAuth tokens stored successfully', { userId });

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/gmail/auth-success`);
  } catch (error: any) {
    logger.error('OAuth callback failed', { error });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/gmail/auth-error?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/gmail/oauth/status
 * Check if user has Gmail OAuth connected
 */
app.get('/oauth/status', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const hasTokens = await GmailOAuthTokenRepository.hasTokens(user.id);

    return c.json({
      success: true,
      data: {
        isConnected: hasTokens,
      },
    });
  } catch (error: any) {
    logger.error('Failed to check OAuth status', { error });
    return c.json({
      error: true,
      message: 'Failed to check OAuth status',
    }, 500);
  }
});

/**
 * DELETE /api/gmail/oauth/revoke
 * Revoke Gmail OAuth access and delete stored tokens
 */
app.delete('/oauth/revoke', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'No Gmail connection found',
      }, 404);
    }

    // Decrypt and revoke tokens
    const { accessToken } = GmailOAuthService.decryptTokens(
      tokens.accessToken,
      tokens.refreshToken
    );

    try {
      await GmailOAuthService.revokeTokens(accessToken);
    } catch (error) {
      logger.warn('Failed to revoke tokens with Google, continuing with local deletion', { error });
    }

    // Delete from database
    await GmailOAuthTokenRepository.deleteByUserId(user.id);
    await EmailRepository.deleteAllByUser(user.id);
    await EmailSenderRepository.deleteAllByUser(user.id);

    logger.info('Gmail OAuth revoked and data deleted', { userId: user.id });

    return c.json({
      success: true,
      message: 'Gmail access revoked successfully',
    });
  } catch (error: any) {
    logger.error('Failed to revoke OAuth', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to revoke Gmail access',
    }, 500);
  }
});

/**
 * GET /api/gmail/inbox/stats
 * Get inbox email count and stats (fast endpoint)
 */
app.get('/inbox/stats', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    // Get tokens
    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'Gmail not connected. Please authorize first.',
      }, 400);
    }

    // Get valid access token
    let accessToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).accessToken;

    if (new Date() >= tokens.expiresAt) {
      const refreshToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).refreshToken;
      const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);

      const { encryptedAccessToken } = GmailOAuthService.encryptTokens({
        accessToken: refreshed.accessToken,
        refreshToken,
        expiresAt: refreshed.expiresAt,
        scope: tokens.scope,
      });
      await GmailOAuthTokenRepository.upsert(
        user.id,
        encryptedAccessToken,
        tokens.refreshToken,
        refreshed.expiresAt,
        tokens.scope
      );

      accessToken = refreshed.accessToken;
    }

    const stats = await GmailEmailService.getInboxStats(accessToken);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Failed to get inbox stats', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to get inbox stats',
    }, 500);
  }
});

/**
 * POST /api/gmail/emails/discover
 * Discover and store emails from Gmail inbox with pagination support
 *
 * Body params:
 * - maxResults: number (default 100, max 500) - emails to fetch per page
 * - pageToken: string (optional) - token for next page from previous response
 */
app.post('/emails/discover', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    // Parse request body
    const body = await c.req.json().catch(() => ({}));
    const maxResults = Math.min(Math.max(body.maxResults || 100, 1), 500);
    const pageToken = body.pageToken as string | undefined;

    // Get tokens
    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'Gmail not connected. Please authorize first.',
      }, 400);
    }

    // Check if token is expired and refresh if needed
    let accessToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).accessToken;

    if (new Date() >= tokens.expiresAt) {
      logger.info('Access token expired, refreshing', { userId: user.id });
      const refreshToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).refreshToken;
      const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);

      // Update token in database
      const { encryptedAccessToken } = GmailOAuthService.encryptTokens({
        accessToken: refreshed.accessToken,
        refreshToken,
        expiresAt: refreshed.expiresAt,
        scope: tokens.scope,
      });
      await GmailOAuthTokenRepository.upsert(
        user.id,
        encryptedAccessToken,
        tokens.refreshToken,
        refreshed.expiresAt,
        tokens.scope
      );

      accessToken = refreshed.accessToken;
    }

    // Fetch emails with pagination
    logger.info('Starting paginated email discovery', { userId: user.id, maxResults, hasPageToken: !!pageToken });
    const result = await GmailEmailService.fetchEmailsPaginated(accessToken, maxResults, pageToken);

    // Group by sender and store
    const senderGroups = GmailEmailService.groupEmailsBySender(result.emails);
    let storedEmails = 0;

    for (const group of senderGroups) {
      // Create/update sender
      const sender = await EmailSenderRepository.upsert(
        user.id,
        group.senderEmail,
        group.senderName || null,
        group.emailCount,
        group.firstEmailDate || null,
        group.lastEmailDate || null
      );

      // Store individual emails
      for (const email of group.messages) {
        await EmailRepository.upsert({
          userId: user.id,
          senderId: sender!.id,
          gmailMessageId: email.gmailMessageId,
          threadId: email.threadId,
          subject: email.subject || null,
          snippet: email.snippet || null,
          receivedAt: email.receivedAt,
          isRead: email.isRead,
          hasAttachment: email.hasAttachment,
          labels: email.labels,
        });
        storedEmails++;
      }
    }

    logger.info('Paginated email discovery completed', {
      userId: user.id,
      fetchedEmails: result.fetchedCount,
      storedEmails,
      uniqueSenders: senderGroups.length,
      hasMore: !!result.nextPageToken,
    });

    return c.json({
      success: true,
      data: {
        fetchedEmails: result.fetchedCount,
        storedEmails,
        uniqueSenders: senderGroups.length,
        nextPageToken: result.nextPageToken,
        hasMore: !!result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate,
      },
      message: `Fetched ${result.fetchedCount} emails from ${senderGroups.length} senders`,
    });
  } catch (error: any) {
    logger.error('Email discovery failed', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to discover emails',
    }, 500);
  }
});

/**
 * POST /api/gmail/senders/fetch-all
 * Fetch ALL unique senders from entire Gmail inbox in one request
 * WARNING: This processes the ENTIRE inbox (35k+ emails) and may take 3-5 minutes
 * Automatically handles pagination internally
 *
 * Body params:
 * - saveToDb: boolean (default true) - whether to save senders to database
 */
app.post('/senders/fetch-all', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const saveToDb = body.saveToDb !== false; // default true

    // Get tokens
    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'Gmail not connected. Please authorize first.',
      }, 400);
    }

    // Get valid access token
    let accessToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).accessToken;

    if (new Date() >= tokens.expiresAt) {
      const refreshToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).refreshToken;
      const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);

      const { encryptedAccessToken } = GmailOAuthService.encryptTokens({
        accessToken: refreshed.accessToken,
        refreshToken,
        expiresAt: refreshed.expiresAt,
        scope: tokens.scope,
      });
      await GmailOAuthTokenRepository.upsert(
        user.id,
        encryptedAccessToken,
        tokens.refreshToken,
        refreshed.expiresAt,
        tokens.scope
      );

      accessToken = refreshed.accessToken;
    }

    logger.info('Starting full inbox sender fetch', { userId: user.id });

    // Fetch ALL senders from entire inbox (this will loop through all pages)
    const result = await GmailEmailService.fetchAllSenders(
      accessToken,
      (processed, _total, senders) => {
        logger.info('Sender fetch progress', { userId: user.id, processed, uniqueSenders: senders });
      }
    );

    logger.info('Full inbox sender fetch completed', {
      userId: user.id,
      totalProcessed: result.totalProcessed,
      uniqueSenders: result.senders.length,
    });

    // Optionally save to database
    if (saveToDb) {
      logger.info('Saving all senders to database', { userId: user.id, count: result.senders.length });

      for (const sender of result.senders) {
        await EmailSenderRepository.upsert(
          user.id,
          sender.email,
          sender.name || null,
          sender.count,
          null, // firstEmailDate - not tracked in quick fetch
          sender.latestDate || null,
          sender.attachmentCount,
          sender.unsubscribeLink || null,
          sender.hasUnsubscribe,
          sender.isVerified
        );
      }

      logger.info('All senders saved to database', { userId: user.id, count: result.senders.length });
    }

    return c.json({
      success: true,
      data: {
        senders: result.senders,
        totalMessagesProcessed: result.totalProcessed,
        uniqueSendersFound: result.senders.length,
        savedToDb: saveToDb,
      },
      message: `Processed entire inbox: ${result.totalProcessed} messages, found ${result.senders.length} unique senders`,
    });
  } catch (error: any) {
    logger.error('Failed to fetch all senders from Gmail', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to fetch all senders',
    }, 500);
  }
});

/**
 * POST /api/gmail/senders/fetch
 * Fetch unique senders directly from Gmail (paginated)
 * Use this to discover senders without storing all emails
 *
 * Body params:
 * - maxMessages: number (default 500, max 500) - messages to scan per page
 * - pageToken: string (optional) - for pagination
 * - saveToDb: boolean (default true) - whether to save senders to database
 */
app.post('/senders/fetch', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));
    const maxMessages = Math.min(body.maxMessages || 500, 500);
    const pageToken = body.pageToken as string | undefined;
    const saveToDb = body.saveToDb !== false; // default true

    // Get tokens
    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'Gmail not connected. Please authorize first.',
      }, 400);
    }

    // Get valid access token
    let accessToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).accessToken;

    if (new Date() >= tokens.expiresAt) {
      const refreshToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).refreshToken;
      const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);

      const { encryptedAccessToken } = GmailOAuthService.encryptTokens({
        accessToken: refreshed.accessToken,
        refreshToken,
        expiresAt: refreshed.expiresAt,
        scope: tokens.scope,
      });
      await GmailOAuthTokenRepository.upsert(
        user.id,
        encryptedAccessToken,
        tokens.refreshToken,
        refreshed.expiresAt,
        tokens.scope
      );

      accessToken = refreshed.accessToken;
    }

    // Fetch senders from Gmail
    const result = await GmailEmailService.fetchSendersPaginated(accessToken, maxMessages, pageToken);

    // Optionally save to database
    if (saveToDb) {
      for (const sender of result.senders) {
        await EmailSenderRepository.upsert(
          user.id,
          sender.email,
          sender.name || null,
          sender.count,
          null, // firstEmailDate - not tracked in quick fetch
          sender.latestDate || null,
          sender.attachmentCount,
          sender.unsubscribeLink || null,
          sender.hasUnsubscribe,
          sender.isVerified
        );
      }
      logger.info('Saved senders to database', { count: result.senders.length });
    }

    return c.json({
      success: true,
      data: {
        senders: result.senders,
        messagesProcessed: result.messagesProcessed,
        uniqueSendersFound: result.senders.length,
        nextPageToken: result.nextPageToken,
        hasMore: result.hasMore,
        savedToDb: saveToDb,
      },
      message: `Found ${result.senders.length} unique senders from ${result.messagesProcessed} messages`,
    });
  } catch (error: any) {
    logger.error('Failed to fetch senders from Gmail', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to fetch senders',
    }, 500);
  }
});

/**
 * GET /api/gmail/senders
 * Get all email senders from database with sorting, filtering, and pagination
 *
 * Query params:
 * - limit: number (default 100)
 * - offset: number (default 0)
 * - sortBy: 'emailCount' | 'lastEmailDate' | 'firstEmailDate' | 'senderEmail' | 'senderName'
 * - sortOrder: 'asc' | 'desc' (default 'desc')
 * - search: string (searches email and name)
 */
app.get('/senders', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const sortBy = (c.req.query('sortBy') || 'emailCount') as 'emailCount' | 'lastEmailDate' | 'firstEmailDate' | 'senderEmail' | 'senderName';
    const sortOrder = (c.req.query('sortOrder') || 'desc') as 'asc' | 'desc';
    const search = c.req.query('search') || undefined;

    const senders = await EmailSenderRepository.findAllByUser(user.id, {
      limit,
      offset,
      sortBy,
      sortOrder,
      ...(search && { search }),
    });
    const totalCount = await EmailSenderRepository.countByUser(user.id, search);
    const stats = await EmailSenderRepository.getStats(user.id);

    return c.json({
      success: true,
      data: {
        senders,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: totalCount > offset + limit,
        },
        stats: {
          totalSenders: stats.totalSenders,
          totalEmails: stats.totalEmails,
        },
        filters: {
          sortBy,
          sortOrder,
          search: search || null,
        },
      },
    });
  } catch (error: any) {
    logger.error('Failed to get senders', { error });
    return c.json({
      error: true,
      message: 'Failed to retrieve senders',
    }, 500);
  }
});

/**
 * GET /api/gmail/senders/:senderId/emails
 * Get all emails from a specific sender
 */
app.get('/senders/:senderId/emails', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const senderId = parseInt(c.req.param('senderId'));
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    // Verify sender belongs to user
    const sender = await EmailSenderRepository.findById(senderId);
    if (!sender || sender.userId !== user.id) {
      return c.json({
        error: true,
        message: 'Sender not found',
      }, 404);
    }

    const emails = await EmailRepository.findAllBySender(senderId, limit, offset);
    const totalCount = await EmailRepository.countBySender(senderId);

    return c.json({
      success: true,
      data: {
        sender,
        emails,
        total: totalCount,
        limit,
        offset,
        hasMore: totalCount > offset + limit,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get emails for sender', { error });
    return c.json({
      error: true,
      message: 'Failed to retrieve emails',
    }, 500);
  }
});

/**
 * DELETE /api/gmail/senders/:senderId
 * Delete all emails from a specific sender (both from Gmail and database)
 */
app.delete('/senders/:senderId', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const senderId = parseInt(c.req.param('senderId'));

    // Verify sender belongs to user
    const sender = await EmailSenderRepository.findById(senderId);
    if (!sender || sender.userId !== user.id) {
      return c.json({
        error: true,
        message: 'Sender not found',
      }, 404);
    }

    // Get tokens
    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'Gmail not connected',
      }, 400);
    }

    // Decrypt access token
    let accessToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).accessToken;

    // Check if token expired and refresh
    if (new Date() >= tokens.expiresAt) {
      const refreshToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).refreshToken;
      const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
    }

    // Delete from Gmail
    logger.info('Deleting emails from Gmail', { userId: user.id, senderEmail: sender.senderEmail });
    const result = await GmailEmailService.deleteEmailsFromSender(accessToken, sender.senderEmail);

    // Delete from database
    await EmailRepository.deleteBySender(senderId);
    await EmailSenderRepository.deleteById(senderId);

    logger.info('Emails deleted successfully', { userId: user.id, senderEmail: sender.senderEmail, deleted: result.deleted });

    return c.json({
      success: true,
      data: {
        deleted: result.deleted,
        failed: result.failed,
      },
      message: `Deleted ${result.deleted} emails from ${sender.senderEmail}`,
    });
  } catch (error: any) {
    logger.error('Failed to delete emails from sender', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to delete emails',
    }, 500);
  }
});

/**
 * POST /api/gmail/senders/bulk-delete
 * Delete all emails from multiple senders
 */
app.post('/senders/bulk-delete', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const { senderIds } = await c.req.json();

    if (!Array.isArray(senderIds) || senderIds.length === 0) {
      return c.json({
        error: true,
        message: 'senderIds must be a non-empty array',
      }, 400);
    }

    // Get tokens
    const tokens = await GmailOAuthTokenRepository.findByUserId(user.id);
    if (!tokens) {
      return c.json({
        error: true,
        message: 'Gmail not connected',
      }, 400);
    }

    // Decrypt access token
    let accessToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).accessToken;

    // Check if token expired and refresh
    if (new Date() >= tokens.expiresAt) {
      const refreshToken = GmailOAuthService.decryptTokens(tokens.accessToken, tokens.refreshToken).refreshToken;
      const refreshed = await GmailOAuthService.refreshAccessToken(refreshToken);
      accessToken = refreshed.accessToken;
    }

    let totalDeleted = 0;
    let totalFailed = 0;

    // Delete emails from each sender
    for (const senderId of senderIds) {
      try {
        const sender = await EmailSenderRepository.findById(senderId);
        if (!sender || sender.userId !== user.id) {
          logger.warn('Sender not found or unauthorized', { senderId });
          continue;
        }

        // Delete from Gmail
        const result = await GmailEmailService.deleteEmailsFromSender(accessToken, sender.senderEmail);
        totalDeleted += result.deleted;
        totalFailed += result.failed;

        // Delete from database
        await EmailRepository.deleteBySender(senderId);
        await EmailSenderRepository.deleteById(senderId);
      } catch (error) {
        logger.error('Failed to delete emails from sender', { senderId, error });
      }
    }

    logger.info('Bulk delete completed', { userId: user.id, totalDeleted, totalFailed });

    return c.json({
      success: true,
      data: {
        deleted: totalDeleted,
        failed: totalFailed,
      },
      message: `Deleted ${totalDeleted} emails from ${senderIds.length} senders`,
    });
  } catch (error: any) {
    logger.error('Bulk delete failed', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to delete emails',
    }, 500);
  }
});

/**
 * POST /api/gmail/senders/:senderId/unsubscribe
 * Unsubscribe from a sender (opens unsubscribe link and marks as unsubscribed)
 */
app.post('/senders/:senderId/unsubscribe', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const senderId = parseInt(c.req.param('senderId'));

    // Verify sender belongs to user
    const sender = await EmailSenderRepository.findById(senderId);
    if (!sender || sender.userId !== user.id) {
      return c.json({
        error: true,
        message: 'Sender not found',
      }, 404);
    }

    // Check if sender has unsubscribe capability
    if (!sender.hasUnsubscribe || !sender.unsubscribeLink) {
      return c.json({
        error: true,
        message: 'This sender does not provide an unsubscribe option',
      }, 400);
    }

    // Mark as unsubscribed in database
    await EmailSenderRepository.markAsUnsubscribed(senderId);

    logger.info('Marked sender as unsubscribed', { userId: user.id, senderId, senderEmail: sender.senderEmail });

    return c.json({
      success: true,
      data: {
        unsubscribeLink: sender.unsubscribeLink,
        message: 'Please visit the unsubscribe link to complete the process',
      },
      message: `Marked ${sender.senderEmail} as unsubscribed. Please visit the unsubscribe link to complete.`,
    });
  } catch (error: any) {
    logger.error('Failed to unsubscribe from sender', { error });
    return c.json({
      error: true,
      message: error.message || 'Failed to unsubscribe',
    }, 500);
  }
});

/**
 * GET /api/gmail/senders/unverified
 * Get all unverified senders (failed SPF/DKIM checks)
 */
app.get('/senders/unverified', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: true, message: 'Unauthorized' }, 401);
    }

    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get all senders and filter for unverified
    const allSenders = await EmailSenderRepository.findAllByUser(user.id, {
      limit: 10000, // Get all to filter
    });

    const unverifiedSenders = allSenders.filter((s) => !s.isVerified);
    const paginatedSenders = unverifiedSenders.slice(offset, offset + limit);

    return c.json({
      success: true,
      data: {
        senders: paginatedSenders,
        total: unverifiedSenders.length,
        limit,
        offset,
        hasMore: unverifiedSenders.length > offset + limit,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get unverified senders', { error });
    return c.json({
      error: true,
      message: 'Failed to retrieve unverified senders',
    }, 500);
  }
});

export default app;
