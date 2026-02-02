/**
 * Organization Dashboard Page
 * Business-tier organization-wide analytics view
 */

import { Layout } from '../components/Layout';
import OrganizationOverview from '../components/organization/OrganizationOverview';
import DepartmentBreakdown from '../components/organization/DepartmentBreakdown';
import RiskContributors from '../components/organization/RiskContributors';

export default function OrganizationPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Dashboard</h1>
          <p className="text-gray-600">
            Organization-wide visibility and risk analytics
          </p>
        </div>

        {/* Organization Overview */}
        <div className="mb-6">
          <OrganizationOverview />
        </div>

        {/* Department Breakdown */}
        <div className="mb-6">
          <DepartmentBreakdown />
        </div>

        {/* Top Risk Contributors */}
        <div>
          <RiskContributors />
        </div>
      </div>
    </Layout>
  );
}
