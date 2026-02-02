/**
 * Department Breakdown Component
 * Shows risk breakdown by department
 */

import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';
import { Building, Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DepartmentStats {
  department: string;
  userCount: number;
  assetCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
}

export default function DepartmentBreakdown() {
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await apiClient.get('/api/organization/departments');
        setDepartments(response.data.departments);
      } catch (err) {
        console.error('Failed to load department stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h3>
        <div className="text-center py-8">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">No departments configured</p>
          <p className="text-sm text-gray-500 mt-1">Department data will appear here once configured</p>
        </div>
      </div>
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Building className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Department Breakdown</h2>
        </div>
        <span className="text-sm text-gray-500">{departments.length} departments</span>
      </div>

      <div className="space-y-3">
        {departments.map((dept) => (
          <div
            key={dept.department}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => navigate(`/organization/departments/${encodeURIComponent(dept.department)}`)}
          >
            <div className="flex items-start justify-between">
              {/* Department Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-semibold text-gray-900">{dept.department}</h4>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getRiskColor(dept.averageRiskScore)}`}>
                    {getRiskLevel(dept.averageRiskScore)}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{dept.userCount} users</span>
                  </div>
                  <div>
                    <span className="font-medium">{dept.assetCount}</span> assets
                  </div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">{dept.highRiskCount}</span> high-risk
                  </div>
                </div>
              </div>

              {/* Average Risk Score */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Avg Risk</p>
                  <p className={`text-2xl font-bold ${
                    dept.averageRiskScore >= 61 ? 'text-red-600' :
                    dept.averageRiskScore >= 31 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {dept.averageRiskScore}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            {/* Risk Breakdown Bar */}
            <div className="mt-3">
              <div className="flex h-2 rounded-full overflow-hidden">
                {dept.highRiskCount > 0 && (
                  <div
                    className="bg-red-600"
                    style={{ width: `${(dept.highRiskCount / dept.assetCount) * 100}%` }}
                    title={`${dept.highRiskCount} high-risk`}
                  ></div>
                )}
                {dept.mediumRiskCount > 0 && (
                  <div
                    className="bg-yellow-600"
                    style={{ width: `${(dept.mediumRiskCount / dept.assetCount) * 100}%` }}
                    title={`${dept.mediumRiskCount} medium-risk`}
                  ></div>
                )}
                {dept.lowRiskCount > 0 && (
                  <div
                    className="bg-green-600"
                    style={{ width: `${(dept.lowRiskCount / dept.assetCount) * 100}%` }}
                    title={`${dept.lowRiskCount} low-risk`}
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
