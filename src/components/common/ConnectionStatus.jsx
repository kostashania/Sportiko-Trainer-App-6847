import React, { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection, dbConfig } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const { FiWifi, FiWifiOff, FiRefreshCw, FiDatabase } = FiIcons;

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');
  const [config, setConfig] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkConnection();
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const result = await checkSupabaseConnection();
      const currentConfig = dbConfig.getCurrent();
      
      setConfig(currentConfig);
      
      if (result.connected) {
        setStatus('connected');
        // Store successful config
        dbConfig.store(currentConfig);
      } else {
        setStatus('error');
        console.error('Connection error:', result.error);
      }
    } catch (error) {
      console.error('Connection check error:', error);
      setStatus('error');
    }
  };

  const handleRetry = async () => {
    setStatus('checking');
    await checkConnection();
  };

  if (status === 'connected') {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <div 
          className="bg-green-50 text-green-800 px-3 py-2 rounded-lg shadow-lg border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiWifi} className="w-4 h-4" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        </div>
        
        {showDetails && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border p-4 min-w-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <SafeIcon icon={FiDatabase} className="w-4 h-4 mr-2" />
                Database Status
              </h3>
              <button
                onClick={handleRetry}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
              </button>
            </div>
            
            {config && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">URL:</span>
                  <span className="font-mono text-xs text-gray-800 truncate max-w-48">
                    {config.url}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Key:</span>
                  <span className="font-mono text-xs text-gray-800">
                    {config.anonKey.substring(0, 20)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin:</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    config.hasServiceRole 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {config.hasServiceRole ? 'Available' : 'Limited'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Check:</span>
                  <span className="text-xs text-gray-600">
                    {new Date(config.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="fixed bottom-4 left-4 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg shadow-lg border border-blue-200 z-50">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiRefreshCw} className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-red-50 text-red-800 px-3 py-2 rounded-lg shadow-lg border border-red-200">
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiWifiOff} className="w-4 h-4" />
          <span className="text-sm font-medium">Connection Error</span>
          <button
            onClick={handleRetry}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            <SafeIcon icon={FiRefreshCw} className="w-3 h-3" />
          </button>
        </div>
      </div>
      
      {showDetails && (
        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border p-4 min-w-80">
          <h3 className="font-semibold text-gray-900 mb-2">Connection Details</h3>
          <div className="text-sm text-gray-600">
            <p>Unable to connect to Supabase database.</p>
            <p className="mt-1">Please check your internet connection.</p>
            {config && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                URL: {config.url}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;