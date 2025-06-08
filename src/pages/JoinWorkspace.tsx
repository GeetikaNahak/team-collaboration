import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const JoinWorkspace: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoinWorkspace = async () => {
    if (!token) {
      toast.error('Invalid invite link');
      return;
    }

    setLoading(true);
    
    try {
      const response = await api.post(`/workspaces/join/${token}`);
      const workspace = response.data.workspace;
      
      setJoined(true);
      toast.success(`Successfully joined ${workspace.name}!`);
      
      setTimeout(() => {
        navigate(`/workspace/${workspace._id}`);
      }, 2000);
    } catch (error: any) {
      console.error('Join workspace error:', error);
      toast.error(error.response?.data?.message || 'Failed to join workspace');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <Users className="mx-auto h-16 w-16 text-indigo-600 mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Join Workspace</h1>
            <p className="text-gray-600 mb-6">
              You need to be logged in to join a workspace. Please sign in or create an account to continue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login', { state: { from: location } })}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <CheckCircle className="mx-auto h-16 w-16 text-emerald-600 mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to the team!</h1>
            <p className="text-gray-600 mb-6">
              You've successfully joined the workspace. Redirecting you to start collaborating...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <Users className="mx-auto h-16 w-16 text-indigo-600 mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Join Workspace</h1>
          <p className="text-gray-600 mb-2">Hello, <strong>{user?.name}</strong>!</p>
          <p className="text-gray-600 mb-8">
            You've been invited to join a startup collaboration workspace. Click below to accept the invitation and start collaborating with your team.
          </p>
          
          <button
            onClick={handleJoinWorkspace}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Joining...</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                <span>Join Workspace</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            By joining, you'll be able to collaborate on notes, track activities, and work together with your team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinWorkspace;