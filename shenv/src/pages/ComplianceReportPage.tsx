/**
 * Compliance Report Page
 * Business-tier compliance reporting
 */

import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { apiClient } from '../services/api';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Building,
  Users,
  Shield
} from 'lucide-react';

interface ComplianceReport {
  metadata: {
    organizationEmail: string;
    reportPeriod: {
      startDate: string;
      endDate: string;
    };
    generatedAt: string;
  };
  executiveSummary: {
    totalAssets: number;
    totalUsers: number;
    complianceScore: number;
    previousComplianceScore: number | null;
    changePercent: number | null;
    highRiskCount: number;
    securedThisMonth: number;
  };
  riskBreakdown: {
    high: number;
    medium: number;
    low: number;
    highPercent: number;
    mediumPercent: number;
    lowPercent: number;
  };
  departmentBreakdown: Array<{
    department: string;
    totalAssets: number;
    highRiskCount: number;
    complianceScore: number;
  }>;
  topRisks: Array<{
    name: string;
    type: string;
    ownerEmail: string;
    department: string | null;
    riskScore: number;
    riskFactors: string[];
  }>;
  remediationActivity: {
    actionsCreated: number;
    actionsExecuted: number;
    actionsFailed: number;
    assetsSecured: number;
  };
  monthOverMonth: {
    assetsChange: number;
    highRiskChange: number;
    complianceScoreChange: number;
  } | null;
}

export default function ComplianceReportPage() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await apiClient.get('/api/organization/compliance/current');
        setReport(response.data.report);
      } catch (err: any) {
        console.error('Failed to load compliance report:', err);
        setError(err.response?.data?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const downloadPDF = () => {
    // TODO: Implement PDF generation
    alert('PDF download coming soon!');
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !report) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Report</h3>
            <p className="text-gray-600">{error || 'Could not generate compliance report'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance Report</h1>
            <p className="text-gray-600">
              {formatDate(report.metadata.reportPeriod.startDate)} -{' '}
              {formatDate(report.metadata.reportPeriod.endDate)}
            </p>
          </div>
          <button
            onClick={downloadPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-5 w-5" />
            <span>Download PDF</span>
          </button>
        </div>

        {/* Executive Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-6">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Executive Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Compliance Score */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Compliance Score</p>
              <div className="flex items-end space-x-2">
                <p className="text-3xl font-bold text-blue-600">
                  {report.executiveSummary.complianceScore}%
                </p>
                {report.executiveSummary.changePercent !== null && (
                  <div className={`flex items-center space-x-1 mb-1 ${
                    report.executiveSummary.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {report.executiveSummary.changePercent >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs(report.executiveSummary.changePercent).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Assets */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-gray-900">
                {report.executiveSummary.totalAssets.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">{report.executiveSummary.totalUsers} users</p>
            </div>

            {/* High Risk */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">High-Risk Assets</p>
              <p className="text-3xl font-bold text-red-600">
                {report.executiveSummary.highRiskCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {((report.executiveSummary.highRiskCount / report.executiveSummary.totalAssets) * 100).toFixed(1)}% of total
              </p>
            </div>

            {/* Secured This Month */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Assets Secured</p>
              <p className="text-3xl font-bold text-green-600">
                {report.executiveSummary.securedThisMonth}
              </p>
              <p className="text-xs text-gray-500 mt-1">This period</p>
            </div>
          </div>
        </div>

        {/* Risk Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Distribution</h2>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">High Risk</span>
                <span className="text-sm text-gray-600">
                  {report.riskBreakdown.high} ({report.riskBreakdown.highPercent}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${report.riskBreakdown.highPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Medium Risk</span>
                <span className="text-sm text-gray-600">
                  {report.riskBreakdown.medium} ({report.riskBreakdown.mediumPercent}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ width: `${report.riskBreakdown.mediumPercent}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Low Risk</span>
                <span className="text-sm text-gray-600">
                  {report.riskBreakdown.low} ({report.riskBreakdown.lowPercent}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${report.riskBreakdown.lowPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Department Breakdown */}
        {report.departmentBreakdown.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Department Breakdown</h2>
            </div>
            <div className="space-y-3">
              {report.departmentBreakdown.map(dept => (
                <div key={dept.department} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{dept.department}</h4>
                    <span className="text-sm font-medium text-gray-600">
                      Compliance: {dept.complianceScore}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{dept.totalAssets}</span> assets
                    </div>
                    <div className="text-red-600">
                      <span className="font-medium">{dept.highRiskCount}</span> high-risk
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 10 Risks */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Top 10 Risky Assets</h2>
          </div>
          <div className="space-y-3">
            {report.topRisks.map((asset, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{asset.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>{asset.type}</span>
                      <span>{asset.ownerEmail}</span>
                      {asset.department && <span>{asset.department}</span>}
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{asset.riskScore}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {asset.riskFactors.map((factor, i) => (
                    <span key={i} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remediation Activity */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Remediation Activity</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Actions Created</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.remediationActivity.actionsCreated}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actions Executed</p>
              <p className="text-2xl font-bold text-green-600">
                {report.remediationActivity.actionsExecuted}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Actions Failed</p>
              <p className="text-2xl font-bold text-red-600">
                {report.remediationActivity.actionsFailed}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Assets Secured</p>
              <p className="text-2xl font-bold text-blue-600">
                {report.remediationActivity.assetsSecured}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
