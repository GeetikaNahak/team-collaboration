import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, FileText, Activity, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  members: any[];
  userRole: string;
  joinedAt: string;
}

interface ActivityItem {
  _id: string;
  user: { name: string; email: string };
  action: string;
  details: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [workspacesRes] = await Promise.all([
        api.get('/workspaces')
      ]);

      setWorkspaces(workspacesRes.data.workspaces);

      // Fetch recent activity from all workspaces
      if (workspacesRes.data.workspaces.length > 0) {
        const activityPromises = workspacesRes.data.workspaces.map((ws: Workspace) =>
          api.get(`/workspaces/${ws._id}/activities?limit=5`)
        );
        
        const activityResponses = await Promise.all(activityPromises);
        const allActivities = activityResponses.flatMap(res => res.data.activities);
        
        // Sort by date and take the most recent 10
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        
        setRecentActivity(sortedActivities);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your startup collaborations
            </p>
          </div>
          
          <button
            onClick={() => navigate('/workspaces/create')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workspace</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Workspaces</p>
              <p className="text-2xl font-semibold text-gray-900">{workspaces.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {workspaces.reduce((total, ws) => total + ws.members.length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Activities</p>
              <p className="text-2xl font-semibold text-gray-900">{recentActivity.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Workspaces */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Workspaces</h2>
          </div>
          
          <div className="p-6">
            {workspaces.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No workspaces</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating a new workspace or joining an existing one.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/workspaces/create')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    Create workspace
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaces.map((workspace) => (
                  <div
                    key={workspace._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors cursor-pointer"
                    onClick={() => navigate(`/workspace/${workspace._id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{workspace.name}</h3>
                        {workspace.description && (
                          <p className="text-sm text-gray-500 mt-1">{workspace.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {workspace.userRole}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Activity will appear here as you and your team collaborate.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity._id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user.name}</span>{' '}
                        {activity.details}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(activity.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;