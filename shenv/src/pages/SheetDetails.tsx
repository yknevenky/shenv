/**
 * Sheet Details page - View single sheet with permissions
 */

import { useParams, Link } from 'react-router-dom';
import { useSheetDetails } from '../hooks/useSheets';
import { ArrowLeft, ExternalLink, User, Calendar, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PermissionRole } from '../types';

const ROLE_COLORS: Record<PermissionRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  writer: 'bg-blue-100 text-blue-800',
  commenter: 'bg-yellow-100 text-yellow-800',
  reader: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS: Record<PermissionRole, string> = {
  owner: 'Owner',
  writer: 'Editor',
  commenter: 'Commenter',
  reader: 'Viewer',
};

export function SheetDetails() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useSheetDetails(id!);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-600">Loading sheet details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sheets
        </Link>
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">
            Failed to load sheet details. The sheet may not exist or you may not have access.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { sheet, permissions } = data;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sheets
      </Link>

      {/* Sheet Info */}
      <div className="rounded-md border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{sheet.name}</h1>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>
                  <strong className="text-gray-900">Owner:</strong> {sheet.owner}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  <strong className="text-gray-900">Modified:</strong>{' '}
                  {formatDistanceToNow(new Date(sheet.modifiedTime), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>
                  <strong className="text-gray-900">Permissions:</strong>{' '}
                  {permissions.length}
                </span>
              </div>
            </div>
          </div>
          <a
            href={sheet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Open Sheet
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Permissions Table */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Permissions ({permissions.length})
        </h2>

        {permissions.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-600">No permissions found</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User/Group
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {permissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {permission.displayName || permission.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="capitalize">{permission.type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          ROLE_COLORS[permission.role]
                        }`}
                      >
                        {ROLE_LABELS[permission.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {permission.email || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
