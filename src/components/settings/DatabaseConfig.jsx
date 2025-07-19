import React, { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection, dbConfig } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiDatabase, FiRefreshCw, FiCheck, FiX, FiEye, FiEyeOff } = FiIcons;

const DatabaseConfig = () => {
  const [config, setConfig] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [showKeys, setShowKeys] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    checkConnection();
  }, []);

  const loadConfig = () => {
    const currentConfig = dbConfig.getCurrent();
    const storedConfig = dbConfig.retrieve();
    
    setConfig({
      ...currentConfig,
      stored: storedConfig,
      lastCheck: storedConfig?.timestamp ? new Date(storedConfig.timestamp) : null
    });
  };

  const checkConnection = async () => {
    setLoading(true);
    try {
      const result = await checkSupabaseConnection();
      setConnectionStatus(result.connected ? 'connected' : 'error');
      
      if (result.connected) {
        toast.success('Database connection successful');
        // Update stored config
        dbConfig.store(dbConfig.getCurrent());
        loadConfig();
      } else {
        toast.error(`Connection failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setConnectionStatus('error');
      toast.error('Connection check failed');
    } finally {
      setLoading(false);
    }
  };

  const clearStoredConfig = () => {
    localStorage.removeItem('sportiko_db_config');
    loadConfig();
    toast.success('Stored configuration cleared');
  };

  const maskKey = (key) => {
    if (!key) return 'Not available';
    return showKeys ? key : `${key.substring(0, 20)}${'*'.repeat(20)}`;
  };

  if (!config) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <SafeIcon icon={FiDatabase} className="w-5 h-5 mr-2" />
            Database Connection
          </h3>
          <button
            onClick={checkConnection}
            disabled={loading}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <SafeIcon 
              icon={FiRefreshCw} 
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} 
            />
            Test Connection
          </button>
        </div>

        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'error' ? 'bg-red-500' :
            'bg-yellow-500 animate-pulse'
          }`}></div>
          <span className={`font-medium ${
            connectionStatus === 'connected' ? 'text-green-700' :
            connectionStatus === 'error' ? 'text-red-700' :
            'text-yellow-700'
          }`}>
            {connectionStatus === 'connected' ? 'Connected' :
             connectionStatus === 'error' ? 'Connection Failed' :
             'Checking Connection...'}
          </span>
        </div>

        {config.lastCheck && (
          <p className="text-sm text-gray-600">
            Last successful connection: {config.lastCheck.toLocaleString()}
          </p>
        )}
      </div>

      {/* Configuration Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowKeys(!showKeys)}
              className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <SafeIcon icon={showKeys ? FiEyeOff : FiEye} className="w-4 h-4 mr-1" />
              {showKeys ? 'Hide' : 'Show'} Keys
            </button>
            <button
              onClick={clearStoredConfig}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supabase URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={config.url}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono"
              />
              <SafeIcon 
                icon={config.url ? FiCheck : FiX} 
                className={`w-5 h-5 ${config.url ? 'text-green-500' : 'text-red-500'}`} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Anonymous Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={maskKey(config.anonKey)}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono"
              />
              <SafeIcon 
                icon={config.anonKey ? FiCheck : FiX} 
                className={`w-5 h-5 ${config.anonKey ? 'text-green-500' : 'text-red-500'}`} 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Role Key
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={config.hasServiceRole ? maskKey('sb_secret_...') : 'Not configured'}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono"
              />
              <SafeIcon 
                icon={config.hasServiceRole ? FiCheck : FiX} 
                className={`w-5 h-5 ${config.hasServiceRole ? 'text-green-500' : 'text-yellow-500'}`} 
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {config.hasServiceRole 
                ? 'Available for admin operations' 
                : 'Limited to anonymous operations only'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Environment Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Environment:</span>
            <span className="ml-2 font-medium">
              {import.meta.env.MODE === 'development' ? 'Development' : 'Production'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">App Version:</span>
            <span className="ml-2 font-medium">
              {import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Build Time:</span>
            <span className="ml-2 font-medium">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Client ID:</span>
            <span className="ml-2 font-mono text-xs">
              {btoa(config.url).substring(0, 12)}...
            </span>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <SafeIcon icon={FiDatabase} className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Security Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Database credentials are stored securely in environment variables and cached locally for performance. 
              The service role key provides admin access and should be kept confidential.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseConfig;