/**
 * Quick Actions Component
 * Displays inline quick action buttons for an asset
 */

interface QuickActionsProps {
  assetId: number;
  riskScore: number;
  isPublic?: boolean;
  isOrphaned?: boolean;
  hasExternalAccess?: boolean;
  onMakePrivate?: () => void;
  onReviewAccess?: () => void;
  onTransferOwnership?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export default function QuickActions({
  assetId,
  riskScore,
  isPublic,
  isOrphaned,
  hasExternalAccess,
  onMakePrivate,
  onReviewAccess,
  onTransferOwnership,
  onDelete,
  compact = false,
}: QuickActionsProps) {
  const actions = [];

  // Make Private - if public
  if (isPublic && onMakePrivate) {
    actions.push({
      label: compact ? 'Private' : 'Make Private',
      icon: '🔒',
      onClick: onMakePrivate,
      variant: 'primary' as const,
    });
  }

  // Review Access - if external access
  if (hasExternalAccess && onReviewAccess) {
    actions.push({
      label: compact ? 'Review' : 'Review Access',
      icon: '👥',
      onClick: onReviewAccess,
      variant: 'secondary' as const,
    });
  }

  // Transfer - if orphaned
  if (isOrphaned && onTransferOwnership) {
    actions.push({
      label: compact ? 'Transfer' : 'Transfer',
      icon: '👤',
      onClick: onTransferOwnership,
      variant: 'secondary' as const,
    });
  }

  // Delete - always show
  if (onDelete) {
    actions.push({
      label: compact ? 'Delete' : 'Delete',
      icon: '🗑️',
      onClick: onDelete,
      variant: 'danger' as const,
    });
  }

  if (actions.length === 0) {
    return null;
  }

  const getButtonStyle = (variant: string) => {
    if (compact) {
      switch (variant) {
        case 'primary':
          return 'bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs px-2 py-1';
        case 'secondary':
          return 'bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs px-2 py-1';
        case 'danger':
          return 'bg-red-100 text-red-700 hover:bg-red-200 text-xs px-2 py-1';
        default:
          return 'bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs px-2 py-1';
      }
    } else {
      switch (variant) {
        case 'primary':
          return 'bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 text-sm';
        case 'secondary':
          return 'border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-sm';
        case 'danger':
          return 'border border-red-300 text-red-700 hover:bg-red-50 px-3 py-1.5 text-sm';
        default:
          return 'border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-sm';
      }
    }
  };

  return (
    <div className={`flex items-center ${compact ? 'space-x-1' : 'space-x-2'}`}>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
          className={`${getButtonStyle(action.variant)} rounded font-medium transition-colors flex items-center space-x-1`}
          title={action.label}
        >
          {!compact && <span>{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
