import React, { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const { FiUser, FiBookOpen, FiCreditCard, FiClipboard } = FiIcons;

const RecentActivity = () => {
  const { queryTenantTable, tenantReady } = useTenant();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantReady) {
      loadRecentActivity();
    }
  }, [tenantReady]);

  const loadRecentActivity = async () => {
    try {
      setLoading(true);
      
      // This is a simplified example - in a real app, you'd have an activities table
      // For now, we'll simulate recent activities
      const mockActivities = [
        {
          id: 1,
          type: 'player_added',
          message: 'New player John Doe was added',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          icon: FiUser,
          color: 'blue'
        },
        {
          id: 2,
          type: 'homework_assigned',
          message: 'Homework assigned to Sarah Smith',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          icon: FiBookOpen,
          color: 'green'
        },
        {
          id: 3,
          type: 'payment_received',
          message: 'Payment received from Mike Johnson',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          icon: FiCreditCard,
          color: 'purple'
        },
        {
          id: 4,
          type: 'assessment_completed',
          message: 'Assessment completed for Emma Wilson',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          icon: FiClipboard,
          color: 'yellow'
        }
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color) => {
    const classes = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      yellow: 'bg-yellow-50 text-yellow-600'
    };
    return classes[color] || classes.blue;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getColorClasses(activity.color)}`}>
              <SafeIcon icon={activity.icon} className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{activity.message}</p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;