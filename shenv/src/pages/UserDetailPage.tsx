/**
 * User Detail Page
 * Shows detailed statistics for a specific organization user
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { apiClient } from '../services/api';
import {
  Mail,
  Building,
  Shield,
  AlertTriangle,
  FileText,
  Clock,
  Share2,
  Globe,
  ArrowLeft
} from 'lucide-react';

interface UserDetail {
  email: string;
  fullName: string | null;
  department: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  totalAssets: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
  recentActivity: {
    filesCreatedThisWeek: number;
    publicFiles: number;
    externalShares: number;
  };
}

export default function UserDetailPage() {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserDetail = async () => {
      if (!email) return;

      try {
        const response = await apiClient.get(`/api/organization/users/${encodeURIComponent(email)}`);
        setUser(response.data.user);
      } catch (err: any) {
        console.error('Failed to load user detail:', err);
        setError(err.response?.data?.message || 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [email]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !user) {
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Not Found</h3>
            <p className="text-gray-600">{error || 'Could not load user details'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const getRiskColor = (score: number) => {
    if (score >= 61) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 31) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskLevel = (score: number) => {
    if (score >= 61) return 'High';
    if (score >= 31) return 'Medium';
    return 'Low';
  };

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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {user.fullName || user.email}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.department && (
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>{user.department}</span>
                  </div>
                )}
                {user.isAdmin && (
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-600 font-medium">Admin</span>
                  </div>
                )}
                {user.isSuspended && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
                    Suspended
                  </span>
                )}
              </div>
            </div>
            <div className={`px-4 py-2 rounded-lg border ${getRiskColor(user.averageRiskScore)}`}>
              <p className="text-xs font-medium">Average Risk</p>
              <p className="text-2xl font-bold">{user.averageRiskScore}</p>
              <p className="text-xs">{getRiskLevel(user.averageRiskScore)}</p>
            </div>
          </div>
        </div>

        {/* Asset Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Assets */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-600">Total Assets</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{user.totalAssets}</p>
          </div>

          {/* High Risk */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm text-gray-600">High Risk</p>
            </div>
            <p className="text-3xl font-bold text-red-600">{user.highRiskCount}</p>
          </div>

          {/* Medium Risk */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Medium Risk</p>
            <p className="text-3xl font-bold text-yellow-600">{user.mediumRiskCount}</p>
          </div>

          {/* Low Risk */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Low Risk</p>
            <p className="text-3xl font-bold text-green-600">{user.lowRiskCount}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Files Created This Week */}
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {user.recentActivity.filesCreatedThisWeek}
                </p>
                <p className="text-sm text-gray-600">Files created this week</p>
              </div>
            </div>

            {/* Public Files */}
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <Globe className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {user.recentActivity.publicFiles}
                </p>
                <p className="text-sm text-gray-600">Public files</p>
              </div>
            </div>

            {/* External Shares */}
            <div className="flex items-start space-x-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Share2 className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {user.recentActivity.externalShares}
                </p>
                <p className="text-sm text-gray-600">External shares</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center space-x-4">
          <button
            onClick={() => navigate(`/assets?owner=${encodeURIComponent(user.email)}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View All Assets
          </button>
          <button
            onClick={() => window.location.href = `mailto:${user.email}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Contact User
          </button>
        </div>
      </div>
    </Layout>
  );
}
