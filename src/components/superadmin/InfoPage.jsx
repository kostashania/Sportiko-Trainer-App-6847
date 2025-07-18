import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiDatabase, FiTable, FiShield, FiFolder } = FiIcons;

const InfoPage = () => {
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bucketInfo, setBucketInfo] = useState(null);
  const [credentials, setCredentials] = useState({
    url: supabase.supabaseUrl,
    key: supabase.supabaseKey
  });

  useEffect(() => {
    loadSchemaInfo();
    loadBucketInfo();
  }, []);

  const loadSchemaInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_schema_info');
      if (error) throw error;
      setSchemaInfo(data);
    } catch (error) {
      console.error('Error loading schema info:', error);
      toast.error('Failed to load schema information');
    } finally {
      setLoading(false);
    }
  };

  const loadBucketInfo = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .getBucket('sportiko_trainer');
      if (error) throw error;
      setBucketInfo(data);
    } catch (error) {
      console.error('Error loading bucket info:', error);
      toast.error('Failed to load storage information');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Information</h1>

      {/* Credentials Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <SafeIcon icon={FiDatabase} className="inline-block w-5 h-5 mr-2" />
          Database Credentials
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Supabase URL</label>
            <input
              type="text"
              value={credentials.url}
              readOnly
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Anon Key</label>
            <input
              type="text"
              value={credentials.key}
              readOnly
              className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Schema Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <SafeIcon icon={FiTable} className="inline-block w-5 h-5 mr-2" />
          Schema: sportiko_trainer
        </h2>
        <div className="space-y-4">
          {schemaInfo?.tables?.map((table) => (
            <motion.div
              key={table.table_name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border rounded-lg"
            >
              <h3 className="font-medium text-gray-900">{table.table_name}</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Columns: {table.column_count}</div>
                <div>Rows: {table.row_count}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Policies Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <SafeIcon icon={FiShield} className="inline-block w-5 h-5 mr-2" />
          Security Policies
        </h2>
        <div className="space-y-4">
          {schemaInfo?.policies?.map((policy, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border rounded-lg"
            >
              <h3 className="font-medium text-gray-900">{policy.policy_name}</h3>
              <div className="mt-2 text-sm text-gray-600">
                <div>Table: {policy.table_name}</div>
                <div>Command: {policy.cmd}</div>
                <div>Roles: {policy.roles.join(', ')}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Storage Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <SafeIcon icon={FiFolder} className="inline-block w-5 h-5 mr-2" />
          Storage Bucket: sportiko_trainer
        </h2>
        {bucketInfo && (
          <div className="space-y-2 text-sm text-gray-600">
            <div>ID: {bucketInfo.id}</div>
            <div>Name: {bucketInfo.name}</div>
            <div>Created at: {new Date(bucketInfo.created_at).toLocaleString()}</div>
            <div>Public: {bucketInfo.public ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoPage;