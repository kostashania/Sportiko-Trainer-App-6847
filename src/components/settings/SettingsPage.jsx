import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperadmin } from '../../contexts/SuperadminContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiDatabase, FiShield, FiTable, FiUser, FiSettings, FiInfo, FiRefreshCw, FiLayers } = FiIcons;

const SettingsPage = () => {
  const { profile } = useAuth();
  const { isSuperadmin } = useSuperadmin();
  const [activeTab, setActiveTab] = useState('profile');
  const [schemas, setSchemas] = useState([]);
  const [tables, setTables] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('sportiko_pt');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'database', label: 'Database', icon: FiDatabase },
    { id: 'policies', label: 'Policies', icon: FiShield },
    { id: 'schemas', label: 'Schemas', icon: FiLayers },
    ...(isSuperadmin ? [{ id: 'system', label: 'System', icon: FiSettings }] : [])
  ];

  useEffect(() => {
    if (activeTab === 'schemas') {
      loadSchemas();
    } else if (activeTab === 'database' || activeTab === 'policies') {
      loadDatabaseInfo();
    }
  }, [activeTab, selectedSchema]);

  const loadSchemas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('sportiko_pt.get_schemas_info');
      if (error) throw error;
      setSchemas(data || []);
    } catch (error) {
      console.error('Error loading schemas:', error);
      toast.error('Failed to load schema information');
    } finally {
      setLoading(false);
    }
  };

  const loadDatabaseInfo = async () => {
    setLoading(true);
    try {
      // Get tables for selected schema
      const { data: tablesData, error: tablesError } = await supabase.rpc(
        'sportiko_pt.get_tables_info',
        { schema_name: selectedSchema }
      );
      
      if (tablesError) throw tablesError;
      setTables(tablesData || []);

      // Get policies for selected schema
      const { data: policiesData, error: policiesError } = await supabase.rpc(
        'sportiko_pt.get_policies_info',
        { schema_name: selectedSchema }
      );
      
      if (policiesError) throw policiesError;
      setPolicies(policiesData || []);
    } catch (error) {
      console.error('Error loading database info:', error);
      toast.error('Failed to load database information');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileTab = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Full Name</label>
          <p className="mt-1 text-sm text-gray-900">{profile?.full_name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <p className="mt-1 text-sm text-gray-900 capitalize">{profile?.role}</p>
        </div>
        {profile?.trial_end && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Trial Ends</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(profile.trial_end).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSchemasTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Database Schemas</h3>
          <button
            onClick={loadSchemas}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schemas.map((schema) => (
                <div
                  key={schema.schema_name}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSchema === schema.schema_name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedSchema(schema.schema_name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <SafeIcon
                        icon={schema.is_trainer_schema ? FiUser : FiDatabase}
                        className={`w-5 h-5 mr-2 ${
                          schema.is_trainer_schema ? 'text-green-600' : 'text-blue-600'
                        }`}
                      />
                      <span className="font-medium">{schema.schema_name}</span>
                    </div>
                    {schema.is_trainer_schema && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Trainer
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Tables: {schema.table_count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderDatabaseTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Tables in {selectedSchema}</h3>
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="sportiko_pt">sportiko_pt (Main)</option>
              {schemas
                .filter(s => s.is_trainer_schema)
                .map(s => (
                  <option key={s.schema_name} value={s.schema_name}>
                    {s.schema_name} (Trainer)
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={loadDatabaseInfo}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Row Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RLS Enabled
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tables.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                      No tables found in this schema
                    </td>
                  </tr>
                ) : (
                  tables.map((table) => (
                    <tr key={table.table_name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {table.table_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.row_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            table.has_rls
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {table.has_rls ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderPoliciesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900">Policies in {selectedSchema}</h3>
            <select
              value={selectedSchema}
              onChange={(e) => setSelectedSchema(e.target.value)}
              className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="sportiko_pt">sportiko_pt (Main)</option>
              {schemas
                .filter(s => s.is_trainer_schema)
                .map(s => (
                  <option key={s.schema_name} value={s.schema_name}>
                    {s.schema_name} (Trainer)
                  </option>
                ))}
            </select>
          </div>
          <button
            onClick={loadDatabaseInfo}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {policies.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No policies found in this schema</p>
            ) : (
              tables
                .filter(table => 
                  policies.some(policy => policy.tablename === table.table_name)
                )
                .map((table) => {
                  const tablePolicies = policies.filter(
                    (policy) => policy.tablename === table.table_name
                  );
                  
                  return (
                    <div key={table.table_name} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">{table.table_name}</h4>
                      
                      <div className="space-y-2">
                        {tablePolicies.map((policy, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                          >
                            <span className="font-medium">{policy.policyname}</span>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {policy.cmd}
                              </span>
                              <span className="text-gray-600 text-xs">
                                {policy.roles.join(', ')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderSystemTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Supabase URL</label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
              {supabase.supabaseUrl}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Environment</label>
            <p className="mt-1 text-sm text-gray-900">Production</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Multi-Tenant Architecture</label>
            <p className="mt-1 text-sm text-gray-900">Enabled - Schema per trainer (pt_[trainer_id])</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>Row Level Security (RLS)</span>
            <span className="text-green-600">✓ Enabled on all tables</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>Tenant Isolation</span>
            <span className="text-green-600">✓ Schema-based per trainer</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>Authentication</span>
            <span className="text-green-600">✓ Supabase Auth with JWT claims</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>API Security</span>
            <span className="text-green-600">✓ JWT + RLS</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <SafeIcon icon={tab.icon} className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'database' && renderDatabaseTab()}
        {activeTab === 'policies' && renderPoliciesTab()}
        {activeTab === 'schemas' && renderSchemasTab()}
        {activeTab === 'system' && isSuperadmin && renderSystemTab()}
      </div>
    </div>
  );
};

export default SettingsPage;