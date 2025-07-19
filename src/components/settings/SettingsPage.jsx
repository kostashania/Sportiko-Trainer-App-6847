import React, {useState, useEffect} from 'react';
import {supabase} from '../../lib/supabase';
import {useAuth} from '../../contexts/AuthContext';
import {useSuperadmin} from '../../contexts/SuperadminContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import {motion} from 'framer-motion';
import toast from 'react-hot-toast';

const {FiDatabase, FiShield, FiTable, FiUser, FiSettings, FiInfo, FiRefreshCw} = FiIcons;

const SettingsPage = () => {
  const {profile} = useAuth();
  const {isSuperadmin} = useSuperadmin();
  const [activeTab, setActiveTab] = useState('profile');
  const [tables, setTables] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    {id: 'profile', label: 'Profile', icon: FiUser},
    {id: 'database', label: 'Database', icon: FiDatabase},
    {id: 'policies', label: 'Policies', icon: FiShield},
    ...(isSuperadmin ? [{id: 'system', label: 'System', icon: FiSettings}] : [])
  ];

  useEffect(() => {
    if (activeTab === 'database' || activeTab === 'policies') {
      loadDatabaseInfo();
    }
  }, [activeTab]);

  const loadDatabaseInfo = async () => {
    setLoading(true);
    try {
      // Get tables
      const {data: tablesData, error: tablesError} = await supabase.rpc('get_tables_info');
      if (!tablesError) setTables(tablesData || []);

      // Get policies
      const {data: policiesData, error: policiesError} = await supabase.rpc('get_policies_info');
      if (!policiesError) setPolicies(policiesData || []);
    } catch (error) {
      console.error('Error loading database info:', error);
    }
    setLoading(false);
  };

  const createMissingPolicies = async () => {
    setLoading(true);
    try {
      const {error} = await supabase.rpc('create_missing_policies');
      if (error) throw error;
      toast.success('Missing policies created successfully');
      loadDatabaseInfo();
    } catch (error) {
      console.error('Error creating policies:', error);
      toast.error('Failed to create policies');
    }
    setLoading(false);
  };

  const expectedTables = [
    'trainers',
    'superadmins', 
    'shop_items',
    'ads',
    'orders',
    'order_items',
    'players',
    'homework',
    'homework_items',
    'assessments',
    'payments'
  ];

  const expectedPolicies = [
    // Trainers policies
    {table: 'trainers', name: 'superadmin_full_access', command: 'ALL'},
    {table: 'trainers', name: 'trainer_own_profile', command: 'SELECT'},
    {table: 'trainers', name: 'trainer_update_own', command: 'UPDATE'},
    
    // Superadmins policies
    {table: 'superadmins', name: 'superadmin_only_access', command: 'ALL'},
    
    // Shop items policies
    {table: 'shop_items', name: 'public_read_active_items', command: 'SELECT'},
    {table: 'shop_items', name: 'superadmin_manage_items', command: 'ALL'},
    
    // Ads policies
    {table: 'ads', name: 'users_view_relevant_ads', command: 'SELECT'},
    {table: 'ads', name: 'superadmin_manage_ads', command: 'ALL'},
    
    // Orders policies
    {table: 'orders', name: 'users_own_orders', command: 'SELECT'},
    {table: 'orders', name: 'users_create_orders', command: 'INSERT'},
    {table: 'orders', name: 'superadmin_view_all_orders', command: 'SELECT'},
    
    // Order items policies
    {table: 'order_items', name: 'users_own_order_items', command: 'SELECT'},
    {table: 'order_items', name: 'users_create_order_items', command: 'INSERT'},
    {table: 'order_items', name: 'superadmin_view_all_order_items', command: 'SELECT'},
    
    // Tenant table policies (these would be in tenant schemas)
    {table: 'players', name: 'tenant_isolation_policy', command: 'ALL'},
    {table: 'homework', name: 'tenant_isolation_policy', command: 'ALL'},
    {table: 'homework_items', name: 'tenant_isolation_policy', command: 'ALL'},
    {table: 'assessments', name: 'tenant_isolation_policy', command: 'ALL'},
    {table: 'payments', name: 'tenant_isolation_policy', command: 'ALL'}
  ];

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

  const renderDatabaseTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Database Tables</h3>
          <button
            onClick={loadDatabaseInfo}
            className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expectedTables.map((tableName) => {
            const tableExists = tables.some(t => t.table_name === tableName);
            return (
              <div
                key={tableName}
                className={`p-4 border rounded-lg ${
                  tableExists ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <SafeIcon icon={FiTable} className="w-5 h-5 mr-2 text-gray-600" />
                    <span className="font-medium">{tableName}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tableExists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {tableExists ? 'EXISTS' : 'MISSING'}
                  </span>
                </div>
                {tableExists && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Schema: {tables.find(t => t.table_name === tableName)?.table_schema || 'public'}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Functions</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>is_superadmin(user_id UUID)</span>
            <span className="text-green-600">✓ Required for admin access</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>is_trainer(user_id UUID)</span>
            <span className="text-green-600">✓ Required for trainer access</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span>create_tenant_schema(schema_name TEXT, trainer_id UUID)</span>
            <span className="text-green-600">✓ Required for multi-tenancy</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPoliciesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Row Level Security Policies</h3>
          <button
            onClick={createMissingPolicies}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <SafeIcon icon={FiShield} className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Missing Policies'}
          </button>
        </div>

        <div className="space-y-4">
          {expectedTables.map((tableName) => {
            const tablePolicies = expectedPolicies.filter(p => p.table === tableName);
            const existingPolicies = policies.filter(p => p.tablename === tableName);
            
            return (
              <div key={tableName} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{tableName}</h4>
                  <span className="text-sm text-gray-500">
                    {existingPolicies.length}/{tablePolicies.length} policies
                  </span>
                </div>
                
                <div className="space-y-2">
                  {tablePolicies.map((expectedPolicy) => {
                    const exists = existingPolicies.some(p => p.policyname === expectedPolicy.name);
                    return (
                      <div
                        key={expectedPolicy.name}
                        className={`flex items-center justify-between p-2 rounded text-sm ${
                          exists ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}
                      >
                        <span>{expectedPolicy.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-gray-200 rounded text-xs">
                            {expectedPolicy.command}
                          </span>
                          <span className={exists ? 'text-green-600' : 'text-red-600'}>
                            {exists ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
            <p className="mt-1 text-sm text-gray-900">Enabled - Schema per trainer</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Features</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>Row Level Security (RLS)</span>
            <span className="text-green-600">✓ Enabled</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>Tenant Isolation</span>
            <span className="text-green-600">✓ Schema-based</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <span>Authentication</span>
            <span className="text-green-600">✓ Supabase Auth</span>
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
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
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
        {activeTab === 'system' && isSuperadmin && renderSystemTab()}
      </div>
    </div>
  );
};

export default SettingsPage;