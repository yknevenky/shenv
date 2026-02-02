/**
 * Action Suggestion Service
 * Analyzes assets and suggests appropriate governance actions
 */

import { logger } from '../utils/logger.js';

export interface SuggestedAction {
  type: 'make_private' | 'review_access' | 'transfer_ownership' | 'delete';
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  icon?: string;
}

export interface Asset {
  id: number;
  name: string;
  assetType: string;
  ownerEmail: string;
  riskScore: number;
  isOrphaned: boolean;
  isInactive: boolean;
  permissionCount: number;
  permissions?: Array<{
    email: string | null;
    role: string;
    type: string;
  }>;
}

export const actionSuggestionService = {
  /**
   * Get suggested actions for an asset based on its risk factors
   */
  getSuggestedActions(asset: Asset): SuggestedAction[] {
    const suggestions: SuggestedAction[] = [];

    // Check for public access
    const hasPublicAccess = asset.permissions?.some(
      (p) => p.type === 'anyone' || p.email === 'anyone'
    );

    // Check for domain-wide access
    const hasDomainAccess = asset.permissions?.some(
      (p) => p.type === 'domain'
    );

    // Check for external users
    const externalUsers = asset.permissions?.filter(
      (p) => p.email && !p.email.includes('@') && p.type === 'user'
    ) || [];

    // Check for external editors/owners
    const externalEditors = asset.permissions?.filter(
      (p) => p.email &&
           !p.email.includes('@') &&
           (p.role === 'writer' || p.role === 'owner')
    ) || [];

    // 1. Make Private - If public or domain-wide
    if (hasPublicAccess || hasDomainAccess) {
      suggestions.push({
        type: 'make_private',
        label: 'Make Private',
        description: 'Remove public and domain-wide access',
        priority: 'high',
        reason: hasPublicAccess
          ? 'File is publicly accessible to anyone with the link'
          : 'File is shared with entire organization',
        icon: '🔒',
      });
    }

    // 2. Review Access - If many permissions or external users
    if (asset.permissionCount > 10 || externalUsers.length > 0) {
      let reason = '';
      if (asset.permissionCount > 50) {
        reason = `Shared with ${asset.permissionCount} people - review who needs access`;
      } else if (externalUsers.length > 0) {
        reason = `Shared with ${externalUsers.length} external user${externalUsers.length > 1 ? 's' : ''}`;
      } else {
        reason = `Shared with ${asset.permissionCount} people - consider removing unnecessary access`;
      }

      suggestions.push({
        type: 'review_access',
        label: 'Review Access',
        description: 'See who has access and remove specific people',
        priority: externalEditors.length > 0 ? 'high' : 'medium',
        reason,
        icon: '👥',
      });
    }

    // 3. Transfer Ownership - If orphaned
    if (asset.isOrphaned) {
      suggestions.push({
        type: 'transfer_ownership',
        label: 'Transfer Ownership',
        description: 'Assign to a new owner',
        priority: 'high',
        reason: 'Owner account no longer exists or has left the organization',
        icon: '👤',
      });
    }

    // 4. Delete - If inactive or low value
    if (asset.isInactive || asset.riskScore >= 80) {
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'low';

      if (asset.isInactive && asset.isOrphaned) {
        reason = 'File is inactive and orphaned - likely no longer needed';
        priority = 'medium';
      } else if (asset.isInactive) {
        reason = 'File has not been accessed in over 6 months';
        priority = 'low';
      } else if (asset.riskScore >= 80) {
        reason = 'Very high risk score - consider deleting if not needed';
        priority = 'medium';
      }

      suggestions.push({
        type: 'delete',
        label: 'Delete',
        description: 'Permanently remove this file',
        priority,
        reason,
        icon: '🗑️',
      });
    }

    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    logger.info(`Generated ${suggestions.length} action suggestions for asset ${asset.id}`);
    return suggestions;
  },

  /**
   * Get batch suggestions for multiple high-risk assets
   */
  getBatchSuggestions(assets: Asset[]): {
    makeAllPrivate?: { count: number; assets: number[] };
    transferAllOrphaned?: { count: number; assets: number[] };
    reviewAllExternal?: { count: number; assets: number[] };
  } {
    const suggestions: any = {};

    // Count assets with public/domain access
    const publicAssets = assets.filter(a =>
      a.permissions?.some(p => p.type === 'anyone' || p.type === 'domain')
    );

    if (publicAssets.length > 0) {
      suggestions.makeAllPrivate = {
        count: publicAssets.length,
        assets: publicAssets.map(a => a.id),
      };
    }

    // Count orphaned assets
    const orphanedAssets = assets.filter(a => a.isOrphaned);
    if (orphanedAssets.length > 0) {
      suggestions.transferAllOrphaned = {
        count: orphanedAssets.length,
        assets: orphanedAssets.map(a => a.id),
      };
    }

    // Count assets with external shares
    const externalAssets = assets.filter(a =>
      a.permissions?.some(p => p.email && !p.email.includes('@'))
    );
    if (externalAssets.length > 0) {
      suggestions.reviewAllExternal = {
        count: externalAssets.length,
        assets: externalAssets.map(a => a.id),
      };
    }

    return suggestions;
  },

  /**
   * Get priority order for actions
   */
  getPriorityMessage(asset: Asset): string {
    const suggestions = this.getSuggestedActions(asset);

    if (suggestions.length === 0) {
      return 'No immediate action needed';
    }

    const highPriority = suggestions.filter(s => s.priority === 'high');

    if (highPriority.length > 0) {
      return `${highPriority.length} high-priority action${highPriority.length > 1 ? 's' : ''} recommended`;
    }

    return `${suggestions.length} suggested action${suggestions.length > 1 ? 's' : ''}`;
  },
};
