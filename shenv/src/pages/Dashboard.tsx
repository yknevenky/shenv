/**
 * Dashboard page - List all sheets with authentication
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceAccountApi, fetchSheets } from '../services/api';
import type { Sheet } from '../types';

export function Dashboard() {
  const [hasServiceAccount, setHasServiceAccount] = useState(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setSheetsError] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkServiceAccountStatus();
  }, []);

  useEffect(() => {
    if (hasServiceAccount) {
      loadSheets();
    }
  }, [hasServiceAccount, search]);

  const checkServiceAccountStatus = async () => {
    try {
      const status = await serviceAccountApi.getStatus();
      setHasServiceAccount(status.hasServiceAccount);
      setServiceAccountEmail(status.email);
    } catch (err) {
      console.error('Failed to check service account status', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonContent = JSON.parse(event.target?.result as string);
          await serviceAccountApi.upload(jsonContent);
          setHasServiceAccount(true);
          await checkServiceAccountStatus();
          await loadSheets();
        } catch (err: any) {
          setUploadError(err.response?.data?.message || 'Invalid JSON file');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setUploadError('Failed to read file');
      setUploading(false);
    }
  };

  const loadSheets = async () => {
    setIsLoading(true);
    setSheetsError('');
    try {
      const data = await fetchSheets({ search, limit: 100 });
      setSheets(data.sheets);
    } catch (err: any) {
      setSheetsError(err.response?.data?.message || 'Failed to load sheets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin');
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Shenv - Google Sheets Governance</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/gmail')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 mr-4"
            >
              Gmail Manager
            </button>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Service Account Upload */}
        {!hasServiceAccount ? (
          <div className="bg-white p-8 border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Upload Service Account
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              To view your Google Sheets, please upload your service account JSON file.
            </p>

            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                {uploadError}
              </div>
            )}

            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:border file:border-gray-300 file:bg-white file:text-gray-700 hover:file:bg-gray-50"
            />
            {uploading && <p className="mt-2 text-sm text-gray-600">Uploading...</p>}
          </div>
        ) : (
          <>
            {/* Service Account Info */}
            <div className="bg-white p-4 border border-gray-200 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Service Account Connected</p>
                  <p className="text-sm font-medium text-gray-900">{serviceAccountEmail}</p>
                </div>
                <button
                  onClick={async () => {
                    await serviceAccountApi.delete();
                    setHasServiceAccount(false);
                    setSheets([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search sheets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sheets Table */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12 text-gray-600">Loading sheets...</div>
            ) : sheets.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                No sheets found. Make sure your service account has access to Google Sheets.
              </div>
            ) : (
              <div className="bg-white border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Owner
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Permissions
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Modified
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sheets.map((sheet) => (
                      <tr key={sheet.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{sheet.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sheet.owner}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sheet.permissionCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(sheet.modifiedTime).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={sheet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
