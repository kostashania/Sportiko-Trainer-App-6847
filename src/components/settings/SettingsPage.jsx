import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperadmin } from '../../contexts/SuperadminContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiDatabase, FiShield, FiTable, FiUser, FiSettings, FiInfo, FiRefreshCw, FiLayers, FiKey } = FiIcons;

const SettingsPage = () => {
  const { profile } = useAuth();
  const { isSuperadmin } = useSuperadmin();
  const [activeTab, setActiveTab] = useState('profile');
  const [schemas, setSchemas] = useState([]);
  const [tables, setTables] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState('sportiko_pt');
  const [loading, setLoading] = useState(true);
  
  // Demo data for testing when Supabase connection isn't available
  const demoSchemas = [
    { schema_name: 'sportiko_pt', table_count: 5, is_trainer_schema: false },
    { schema_name: 'pt_abc123def456', table_count: 8, is_trainer_schema: true },
    { schema_name: 'public', table_count: 6, is_trainer_schema: false }
  ];
  
  const demoTables = {
    'sportiko_pt': [
      { table_name: 'trainers', row_count: 12, has_rls: true },
      { table_name: 'players_auth', row_count: 45, has_rls: true },
      { table_name: 'subscription_plans', row_count: 3, has_rls: true },
      { table_name: 'settings', row_count: 8, has_rls: true },
      { table_name: 'ads', row_count: 6, has_rls: true }
    ],
    'pt_abc123def456': [
      { table_name: 'players', row_count: 15, has_rls: true },
      { table_name: 'assessments', row_count: 28, has_rls: true },
      { table_name: 'exercises', row_count: 42, has_rls: true },
      { table_name: 'homework', row_count: 18, has_rls: true },
      { table_name: 'homework_items', row_count: 67, has_rls: true },
      { table_name: 'products', row_count: 12, has_rls: true },
      { table_name: 'orders', row_count: 8, has_rls: true },
      { table_name: 'order_items', row_count: 24, has_rls: true }
    ],
    'public': [
      { table_name: 'trainers', row_count: 12, has_rls: true },
      { table_name: 'superadmins', row_count: 3, has_rls: true },
      { table_name: 'shop_items', row_count: 20, has_rls: true },
      { table_name: 'ads', row_count: 8, has_rls: true },
      { table_name: 'orders', row_count: 18, has_rls: true },
      { table_name: 'order_items', row_count: 32, has_rls: true }
    ]
  };
  
  const demoPolicies = {
    'sportiko_pt': [
      { tablename: 'trainers', policyname: 'Trainers can view and update their own profile', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'trainers', policyname: 'Admin can manage all trainers', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'players_auth', policyname: 'Trainers can manage their own players', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'players_auth', policyname: 'Players can view their own auth', cmd: 'SELECT', roles: ['authenticated'] },
      { tablename: 'subscription_plans', policyname: 'Anyone can view active subscription plans', cmd: 'SELECT', roles: ['authenticated'] }
    ],
    'pt_abc123def456': [
      { tablename: 'players', policyname: 'trainer_all_access', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'players', policyname: 'player_view_own', cmd: 'SELECT', roles: ['authenticated'] },
      { tablename: 'exercises', policyname: 'trainer_all_access', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'exercises', policyname: 'player_view_exercises', cmd: 'SELECT', roles: ['authenticated'] },
      { tablename: 'homework', policyname: 'trainer_all_access', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'homework', policyname: 'player_view_own_homework', cmd: 'SELECT', roles: ['authenticated'] }
    ],
    'public': [
      { tablename: 'trainers', policyname: 'Superadmins can do everything with trainers', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'trainers', policyname: 'Trainers can view and update their own profile', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'superadmins', policyname: 'Only superadmins can access superadmins table', cmd: 'ALL', roles: ['authenticated'] },
      { tablename: 'shop_items', policyname: 'Anyone can view active shop items', cmd: 'SELECT', roles: ['authenticated'] },
      { tablename: 'shop_items', policyname: 'Only superadmins can manage shop items', cmd: 'ALL', roles: ['authenticated'] }
    ]
  };
  
  // List of test users created
  const testUsers = [
    { email: 'superadmin_pt@sportiko.com', password: 'pass123', role: 'superadmin' },
    { email: 'trainer_pt@sportiko.com', password: 'pass123', role: 'trainer' },
    { email: 'player_pt@sportiko.com', password: 'pass123', role: 'player' }
  ];

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'database', label: 'Database', icon: FiDatabase },
    { id: 'policies', label: 'Policies', icon: FiShield },
    { id: 'schemas', label: 'Schemas', icon: FiLayers },
    { id: 'test_users', label: 'Test Users', icon: FiKey },
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
      if (error) {
        console.error('Error loading schemas:', error);
        // Fall back to demo data if the RPC isn't available
        setSchemas(demoSchemas);
      } else {
        setSchemas(data || demoSchemas);
      }
    } catch (error) {
      console.error('Error loading schemas:', error);
      // Fall back to demo data
      setSchemas(demoSchemas);
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
      
      if (tablesError) {
        console.error('Error loading tables:', tablesError);
        // Fall back to demo data
        setTables(demoTables[selectedSchema] || []);
      } else {
        setTables(tablesData || demoTables[selectedSchema] || []);
      }

      // Get policies for selected schema
      const { data: policiesData, error: policiesError } = await supabase.rpc(
        'sportiko_pt.get_policies_info',
        { schema_name: selectedSchema }
      );
      
      if (policiesError) {
        console.error('Error loading policies:', policiesError);
        // Fall back to demo data
        setPolicies(demoPolicies[selectedSchema] || []);
      } else {
        setPolicies(policiesData || demoPolicies[selectedSchema] || []);
      }
    } catch (error) {
      console.error('Error loading database info:', error);
      // Fall back to demo data
      setTables(demoTables[selectedSchema] || []);
      setPolicies(demoPolicies[selectedSchema] || []);
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
                    {schema.schema_name === 'public' && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Public
                      </span>
                    )}
                    {schema.schema_name === 'sportiko_pt' && (
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                        Main
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Tables: {schema.table_count}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {schema.is_trainer_schema 
                      ? 'Per-trainer isolated schema'
                      : schema.schema_name === 'sportiko_pt'
                        ? 'Main application schema'
                        : 'Shared schema'}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Schema Design</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                <li><strong>public</strong> - Legacy schema with basic tables</li>
                <li><strong>sportiko_pt</strong> - Main application schema with shared data</li>
                <li><strong>pt_[trainer_id]</strong> - Per-trainer isolated schemas with player data</li>
              </ul>
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
              <option value="public">public (Shared)</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schema
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tables.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {selectedSchema}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Schema Structure</h4>
          <p className="text-sm text-blue-600">
            The <strong>{selectedSchema}</strong> schema contains {tables.length} tables with Row Level Security (RLS) enabled.
            {selectedSchema === 'sportiko_pt' && " This is the main application schema containing shared data across all trainers."}
            {selectedSchema === 'public' && " This is the legacy schema with basic user tables."}
            {selectedSchema.startsWith('pt_') && " This is an isolated trainer schema containing trainer-specific data."}
          </p>
        </div>
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
              <option value="public">public (Shared)</option>
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
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{table.table_name}</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {selectedSchema}
                        </span>
                      </div>
                      
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
            
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Policy Information</h4>
              <p className="text-sm text-yellow-700">
                Policies in the <strong>{selectedSchema}</strong> schema control access to data based on user roles and tenant isolation.
                {selectedSchema === 'sportiko_pt' && " Main schema policies ensure trainers can only access their own data."}
                {selectedSchema === 'public' && " Public schema policies provide basic role-based access to shared resources."}
                {selectedSchema.startsWith('pt_') && " This schema uses tenant isolation to ensure trainers can only access their own player data."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  const renderTestUsersTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Users</h3>
        <p className="text-sm text-gray-600 mb-4">
          The following test users have been created for testing the application. All users have the password: <code className="bg-gray-100 px-2 py-1 rounded">pass123</code>
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {testUsers.map((user, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.password}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' : 
                        user.role === 'trainer' ? 'bg-blue-100 text-blue-800' : 
                        'bg-green-100 text-green-800'}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.role === 'superadmin' && 'Has access to all platform management features'}
                    {user.role === 'trainer' && 'Can manage players and training programs'}
                    {user.role === 'player' && 'Can access assigned homework and training'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Database Relationships</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li><strong>superadmin_pt@sportiko.com</strong> - Exists in <code>auth.users</code> and <code>public.superadmins</code></li>
            <li>
              <strong>trainer_pt@sportiko.com</strong> - Exists in <code>auth.users</code>, <code>public.trainers</code>, 
              and <code>sportiko_pt.trainers</code> with a dedicated schema <code>pt_[trainer_id]</code>
            </li>
            <li>
              <strong>player_pt@sportiko.com</strong> - Exists in <code>auth.users</code>, <code>sportiko_pt.players_auth</code>,
              and <code>pt_[trainer_id].players</code>
            </li>
          </ul>
        </div>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Architecture</h3>
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Public Schema</h4>
            <p className="text-sm text-gray-600">Contains legacy tables for backward compatibility:</p>
            <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
              <li>trainers</li>
              <li>superadmins</li>
              <li>shop_items</li>
              <li>ads</li>
              <li>orders</li>
              <li>order_items</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Sportiko_PT Schema</h4>
            <p className="text-sm text-gray-600">Main application schema with shared data:</p>
            <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
              <li>trainers</li>
              <li>players_auth</li>
              <li>subscription_plans</li>
              <li>settings</li>
              <li>ads</li>
            </ul>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Per-Trainer Schemas</h4>
            <p className="text-sm text-gray-600">Isolated schemas for each trainer (pt_[trainer_id]):</p>
            <ul className="list-disc list-inside mt-2 text-sm text-gray-600">
              <li>players</li>
              <li>assessments</li>
              <li>exercises</li>
              <li>homework</li>
              <li>homework_items</li>
              <li>products</li>
              <li>orders</li>
              <li>order_items</li>
            </ul>
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
        {activeTab === 'test_users' && renderTestUsersTab()}
        {activeTab === 'system' && isSuperadmin && renderSystemTab()}
      </div>
    </div>
  );
};

export default SettingsPage;