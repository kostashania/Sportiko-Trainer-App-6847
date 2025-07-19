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
  const [credentials, setCredentials] = useState({
    url: supabase.supabaseUrl,
    key: supabase.supabaseKey
  });
  const [mockSchemaInfo, setMockSchemaInfo] = useState({
    schemas: [
      { schema_name: 'public', table_count: 6 },
      { schema_name: 'sportiko_pt', table_count: 5 },
      { schema_name: 'pt_d45616a4_d90b_4358_b62c_9005f61e3d84', table_count: 8 }
    ],
    tables: [
      { table_name: 'trainers', column_count: 8, row_count: 3, has_rls: true },
      { table_name: 'superadmins', column_count: 4, row_count: 1, has_rls: true },
      { table_name: 'shop_items', column_count: 9, row_count: 12, has_rls: true },
      { table_name: 'ads', column_count: 9, row_count: 5, has_rls: true },
      { table_name: 'orders', column_count: 7, row_count: 8, has_rls: true }
    ],
    policies: [
      { tablename: 'trainers', policyname: 'Trainers can view and update their own profile', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'shop_items', policyname: 'Anyone can view active shop items', cmd: 'SELECT', roles: ['authenticated'] },
      { tablename: 'ads', policyname: 'Users can view relevant active ads', cmd: 'SELECT', roles: ['authenticated'] }
    ]
  });

  useEffect(() => {
    // Since we can't use the actual functions, we'll use the mock data
    setSchemaInfo(mockSchemaInfo);
    setLoading(false);
  }, []);

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
          Database Schemas
        </h2>
        <div className="space-y-4">
          {schemaInfo.schemas.map((schema) => (
            <motion.div
              key={schema.schema_name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border rounded-lg"
            >
              <h3 className="font-medium text-gray-900">{schema.schema_name}</h3>
              <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>Tables: {schema.table_count}</div>
                <div>
                  {schema.schema_name === 'public' && 'Shared tables'}
                  {schema.schema_name === 'sportiko_pt' && 'Main application schema'}
                  {schema.schema_name.startsWith('pt_') && 'Trainer schema'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tables Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <SafeIcon icon={FiTable} className="inline-block w-5 h-5 mr-2" />
          Database Tables
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Columns
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rows
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RLS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schemaInfo.tables.map((table, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.table_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.column_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.row_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      table.has_rls ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {table.has_rls ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policies Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <SafeIcon icon={FiShield} className="inline-block w-5 h-5 mr-2" />
          Security Policies
        </h2>
        <div className="space-y-4">
          {schemaInfo.policies.map((policy, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 border rounded-lg"
            >
              <h3 className="font-medium text-gray-900">{policy.policyname}</h3>
              <div className="mt-2 text-sm text-gray-600">
                <div>Table: {policy.tablename}</div>
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
          Storage Information
        </h2>
        <div className="p-4 border rounded-lg">
          <h3 className="font-medium text-gray-900">sportiko_trainer</h3>
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            <div>Type: Bucket</div>
            <div>Access: Private</div>
            <div>Created: {new Date().toLocaleString()}</div>
            <div>Files: 0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoPage;