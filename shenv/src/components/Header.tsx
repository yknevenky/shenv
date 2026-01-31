/**
 * Header component with navigation
 */

import { Link, useLocation } from 'react-router-dom';
import { Shield, Package, FileText, Mail, HardDrive, LogOut } from 'lucide-react';

export function Header() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/signin';
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/assets" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold text-gray-900">Shenv</span>
          </Link>

          <nav className="flex items-center gap-1">
            {/* Primary: Assets */}
            <Link
              to="/assets"
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/assets')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package className="w-4 h-4" />
              Assets
            </Link>

            {/* Separator */}
            <div className="mx-2 h-6 w-px bg-gray-200" />

            {/* Secondary: Legacy pages */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/dashboard') || isActive('/sheets')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Sheets
            </Link>
            <Link
              to="/drive"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/drive')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              Drive
            </Link>
            <Link
              to="/gmail"
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive('/gmail')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Mail className="w-4 h-4" />
              Gmail
            </Link>

            {/* Separator */}
            <div className="mx-2 h-6 w-px bg-gray-200" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
