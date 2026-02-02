/**
 * Department Detail Page
 * Shows assets and users for a specific department
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { apiClient } from '../services/api';
import { Building, ArrowLeft, Users, Mail, AlertTriangle } from 'lucide-react';

interface DepartmentUser {
  email: string;
}

export default function DepartmentDetailPage() {
  const { department } = useParams<{ department: string }>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartmentUsers = async () => {
      if (!department) return;

      try {
        const response = await apiClient.get(`/api/organization/departments/${encodeURIComponent(department)}/users`);
        setUsers(response.data.users);
      } catch (err: any) {
        console.error('Failed to load department users:', err);
        setError(err.response?.data?.message || 'Failed to load department');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartmentUsers();
  }, [department]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !department) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/organization')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Organization</span>
          </button>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Not Found</h3>
            <p className="text-gray-600">{error || 'Could not load department details'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/organization')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Organization</span>
        </button>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <Building className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{department}</h1>
          </div>
          <p className="text-gray-600">{users.length} users in this department</p>
        </div>

        {/* Users List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Users</h2>

          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">No users in this department</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/organization/users/${encodeURIComponent(email)}`)}
                >
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{email}</span>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    View Details →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6">
          <button
            onClick={() => navigate(`/assets?department=${encodeURIComponent(department)}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Department Assets
          </button>
        </div>
      </div>
    </Layout>
  );
}
