/**
 * Progress Page
 * Shows workspace improvement metrics and activity timeline
 */

import { Layout } from '../components/Layout';
import ProgressCard from '../components/progress/ProgressCard';
import BeforeAfterComparison from '../components/progress/BeforeAfterComparison';
import ActivityTimeline from '../components/progress/ActivityTimeline';

export default function ProgressPage() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Progress & History</h1>
          <p className="text-gray-600">
            Track your workspace security improvements over time
          </p>
        </div>

        {/* Progress Card */}
        <div className="mb-6">
          <ProgressCard />
        </div>

        {/* Before/After Comparison */}
        <div className="mb-6">
          <BeforeAfterComparison />
        </div>

        {/* Activity Timeline */}
        <div>
          <ActivityTimeline />
        </div>
      </div>
    </Layout>
  );
}
