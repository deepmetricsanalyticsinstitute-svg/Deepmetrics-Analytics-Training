import React, { useState } from 'react';
import { Button } from './Button';
import { View } from '../types';

interface AuthProps {
  view: View.LOGIN | View.REGISTER;
  onSwitch: (view: View) => void;
  onAuthSuccess: (name: string, email: string, isAdmin: boolean) => void;
}

export const Auth: React.FC<AuthProps> = ({ view, onSwitch, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      const isAdmin = email.toLowerCase() === 'deepmetricsanalyticsinstitute@gmail.com';

      if (view === View.LOGIN) {
        // Mock Login - for demo purposes accept any email with password > 3 chars
        if (password.length > 3) {
            onAuthSuccess(isAdmin ? 'Institute Owner' : 'Demo User', email, isAdmin);
        } else {
            alert('Invalid credentials (use password > 3 chars)');
        }
      } else {
        // Mock Register
        if (name && email && password.length > 3) {
            onAuthSuccess(name, email, isAdmin);
        } else {
            alert('Please fill all fields (password > 3 chars)');
        }
      }
    }, 1000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto">
            <span className="text-white font-bold text-2xl">D</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {view === View.LOGIN ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {view === View.LOGIN ? 'Or' : 'Already have an account?'}{' '}
          <button
            onClick={() => onSwitch(view === View.LOGIN ? View.REGISTER : View.LOGIN)}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {view === View.LOGIN ? 'start a new journey' : 'sign in'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {view === View.REGISTER && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={view === View.LOGIN ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded text-xs text-blue-800">
               <strong>Tip:</strong> Use <code>deepmetricsanalyticsinstitute@gmail.com</code> to log in as the Institute Owner and edit courses.
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
              >
                {view === View.LOGIN ? 'Sign in' : 'Register'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};