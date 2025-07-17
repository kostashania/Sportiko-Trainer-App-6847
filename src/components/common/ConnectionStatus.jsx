import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('trainers').select('count').limit(1);
        
        if (error) {
          console.error('Supabase connection error:', error);
          setStatus('error');
          toast.error('Database connection failed. Please check your internet connection.');
          return;
        }
        
        setStatus('connected');
      } catch (error) {
        console.error('Connection check error:', error);
        setStatus('error');
        toast.error('Database connection failed. Please check your internet connection.');
      }
    };

    checkConnection();
  }, []);

  if (status === 'checking' || status === 'connected') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-50 text-red-800 px-4 py-2 rounded-lg shadow-lg border border-red-200 z-50">
      <div className="flex items-center space-x-2">
        <span className="inline-block w-3 h-3 bg-red-500 rounded-full"></span>
        <span className="text-sm font-medium">Connection Error</span>
      </div>
    </div>
  );
};

export default ConnectionStatus;