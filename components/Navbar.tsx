import React, { useState } from 'react';
import { View, User } from '../types';
import { Button } from './Button';

interface NavbarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  user: User | null;
  onLogout: () => void;
  pendingRequestCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView, user, onLogout, pendingRequestCount = 0 }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    { label: 'Home', view: View.HOME },
    { label: 'Training Programs', view: View.COURSES },
  ];

  if (user) {
    navItems.push({ label: 'Dashboard', view: View.DASHBOARD });
  }

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div 
              className="flex items-center cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md" 
              onClick={() => onChangeView(View.HOME)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChangeView(View.HOME);
                }
              }}
            >
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                   <span className="text-white font-bold text-xl">D</span>
                </div>
                <span className="font-bold text-xl text-gray-900 hidden sm:block">Deepmetrics</span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onChangeView(item.view)}
                  className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === item.view
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                  {item.view === View.DASHBOARD && pendingRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
                      {pendingRequestCount}
                    </span>
                  )}
                </button>
              ))}
              
              {user ? (
                <div className="flex items-center gap-4 ml-4 border-l pl-4 border-gray-200">
                  <span className="text-sm text-gray-700">Hi, {user.name}</span>
                  <Button variant="outline" size="sm" onClick={() => setShowLogoutConfirm(true)}>Logout</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => onChangeView(View.LOGIN)}>Log In</Button>
                  <Button variant="primary" size="sm" onClick={() => onChangeView(View.REGISTER)}>Get Started</Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                {isMenuOpen ? (
                   <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                   <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onChangeView(item.view);
                    setIsMenuOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium flex items-center justify-between ${
                    currentView === item.view
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.view === View.DASHBOARD && pendingRequestCount > 0 && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {pendingRequestCount}
                    </span>
                  )}
                </button>
              ))}
               {!user && (
                  <div className="mt-4 border-t border-gray-200 pt-4 flex flex-col gap-2">
                    <Button variant="outline" className="w-full" onClick={() => {onChangeView(View.LOGIN); setIsMenuOpen(false)}}>Log In</Button>
                    <Button variant="primary" className="w-full" onClick={() => {onChangeView(View.REGISTER); setIsMenuOpen(false)}}>Get Started</Button>
                  </div>
               )}
               {user && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                     <div className="px-3 py-2 text-gray-700">Signed in as {user.email}</div>
                     <Button variant="danger" className="w-full mt-2" onClick={() => {setShowLogoutConfirm(true); setIsMenuOpen(false)}}>Logout</Button>
                  </div>
               )}
            </div>
          </div>
        )}
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full transform transition-all scale-100">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Sign Out?</h3>
              <p className="text-gray-500 mt-2">Are you sure you want to log out of your account? You'll need to sign in again to access your dashboard.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" className="flex-1" onClick={handleLogoutConfirm}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};