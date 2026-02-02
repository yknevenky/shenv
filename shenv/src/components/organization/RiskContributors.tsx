/**
 * Risk Contributors Component
 * Shows users with most high-risk assets
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { UserX, Mail, Building, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RiskContributor {
  email: string;
  fullName: string | null;
  department: string | null;
  totalAssets: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
}

export default function RiskContributors() {
  const [contributors, setContributors] = useState<RiskContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const response = await apiClient.get('/api/organization/risk-contributors?limit=10');
        setContributors(response.data.contributors);
      } catch (err) {
        console.error('Failed to load risk contributors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (contributors.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Risk Contributors</h3>
        <div className="text-center py-8">
          <UserX className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">No risk contributors found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-semibold text-gray-900">Top Risk Contributors</h2>
        </div>
        <span className="text-sm text-gray-500">Top {contributors.length} users</span>
      </div>

      <div className="space-y-3">
        {contributors.map((contributor, index) => (
          <div
            key={contributor.email}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => navigate(`/organization/users/${encodeURIComponent(contributor.email)}`)}
          >
            <div className="flex items-start justify-between">
              {/* User Info */}
              <div className="flex items-start space-x-3 flex-1">
                {/* Rank Badge */}
                <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                  index === 0 ? 'bg-red-100 text-red-600' :
                  index === 1 ? 'bg-orange-100 text-orange-600' :
                  index === 2 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                } font-bold text-sm`}>
                  {index + 1}
                </div>

                {/* User Details */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900">
                      {contributor.fullName || contributor.email}
                    </h4>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-4 w-4" />
                      <span>{contributor.email}</span>
                    </div>
                    {contributor.department && (
                      <div className="flex items-center space-x-1">
                        <Building className="h-4 w-4" />
                        <span>{contributor.department}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm mt-2">
                    <div>
                      <span className="text-gray-500">Assets:</span>{' '}
                      <span className="font-medium text-gray-900">{contributor.totalAssets}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">High-Risk:</span>{' '}
                      <span className="font-medium text-red-600">{contributor.highRiskCount}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Risk:</span>{' '}
                      <span className={`font-medium ${
                        contributor.averageRiskScore >= 61 ? 'text-red-600' :
                        contributor.averageRiskScore >= 31 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {contributor.averageRiskScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <ChevronRight className="h-5 w-5 text-gray-400 ml-2 mt-2" />
            </div>

            {/* Risk Bar */}
            <div className="mt-3">
              <div className="flex h-2 rounded-full overflow-hidden">
                {contributor.highRiskCount > 0 && (
                  <div
                    className="bg-red-600"
                    style={{ width: `${(contributor.highRiskCount / contributor.totalAssets) * 100}%` }}
                  ></div>
                )}
                {contributor.mediumRiskCount > 0 && (
                  <div
                    className="bg-yellow-600"
                    style={{ width: `${(contributor.mediumRiskCount / contributor.totalAssets) * 100}%` }}
                  ></div>
                )}
                {contributor.lowRiskCount > 0 && (
                  <div
                    className="bg-green-600"
                    style={{ width: `${(contributor.lowRiskCount / contributor.totalAssets) * 100}%` }}
                  ></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
