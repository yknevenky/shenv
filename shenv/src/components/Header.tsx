/**
 * Header component with navigation
 */

import { Link } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">Shenv</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sheets
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
