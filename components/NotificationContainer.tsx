import React from 'react';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'info' | 'email';
}

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: number) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onClose }) => {
  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none max-w-md w-full">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`pointer-events-auto flex items-start p-4 w-full bg-white rounded-lg shadow-lg border-l-4 animate-fade-in transition-all duration-300 transform translate-x-0 ${
            notif.type === 'success' ? 'border-green-500' : 
            notif.type === 'email' ? 'border-indigo-500' : 'border-blue-500'
          }`}
          role="alert"
        >
          <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full mt-0.5 ${
              notif.type === 'success' ? 'text-green-500 bg-green-100' : 
              notif.type === 'email' ? 'text-indigo-500 bg-indigo-100' : 'text-blue-500 bg-blue-100'
          }`}>
            {notif.type === 'email' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    {notif.type === 'success' 
                        ? <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        : <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    }
                </svg>
            )}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${notif.type === 'email' ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {notif.type === 'email' ? 'Email Notification' : 'System Notification'}
              </p>
              <p className="mt-1 text-sm text-gray-500">{notif.message}</p>
          </div>
          <button
            type="button"
            className="ml-4 -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
            onClick={() => onClose(notif.id)}
          >
            <span className="sr-only">Close</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
};