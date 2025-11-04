import React, { useState } from 'react';
import { User } from '../types';
import { changePassword } from '../services/studentService';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

interface ForcePasswordChangeProps {
    user: User;
    onSuccess: (updatedUser: User) => void;
}

const ForcePasswordChange: React.FC<ForcePasswordChangeProps> = ({ user, onSuccess }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        setIsLoading(true);
        try {
            const updatedUser = changePassword(user.studentId, newPassword);
            onSuccess(updatedUser);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to change password.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white font-sans">
          <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-xl">
              <h1 className="text-2xl font-bold text-center text-cyan-400">Change Your Password</h1>
              <p className="text-center text-gray-400">For your security, you must change your temporary password before you can continue.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1">New Password</label>
                      <input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-4 py-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-400" />
                  </div>
                  <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">Confirm New Password</label>
                      <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-4 py-2 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-400" />
                  </div>
                  <PasswordStrengthIndicator password={newPassword} />
                  {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md">{error}</div>}
                  <button type="submit" disabled={isLoading} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-md font-semibold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
                    {isLoading ? 'Changing...' : 'Set New Password'}
                  </button>
              </form>
          </div>
      </div>
    );
};

export default ForcePasswordChange;
