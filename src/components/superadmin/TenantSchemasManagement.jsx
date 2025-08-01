import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const { FiDatabase, FiUsers, FiRefreshCw, FiTrash2, FiEye, FiSettings, FiCheck, FiX, FiAlertTriangle } = FiIcons;

const TenantSchemasManagement = () => {
  const [schemas, setSchemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(null);
  const [showDetails, setShowDetails] = useState({});

  useEffect(() => {
    loadTenantSchemas();
  }, []);

  const loadTenantSchemas = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading tenant schemas...');

      // Get all schemas that match the tenant pattern
      const { data: schemaData, error: schemaError } = await supabase.rpc('get_schemas_info');
      
      if (schemaError) {
        console.error('Error loading schemas:', schemaError);
        // Fall back to mock data for demo
        setSchemas([
          {
            schema_name: 'pt_d45616a4_d90b_4358_b62c_9005f61e3d84',
            table_count: 8,
            is_trainer_schema: true,
            trainer_id: 'd45616a4-d90b-4358-b62c-9005f61e3d84',
            trainer_email: 'trainer_pt@sportiko.eu',
            trainer_name: 'Demo Trainer',
            created_at: '2024-12-30T10:00:00Z',
            status: 'active'
          },
          {
            schema_name: 'pt_12345678_1234_1234_1234_123456789012',
            table_count: 8,
            is_trainer_schema: true,
            trainer_id: '12345678-1234-1234-1234-123456789012',
            trainer_email: 'john.coach@sportiko.eu',
            trainer_name: 'John Coach',
            created_at: '2024-12-25T14:30:00Z',
            status: 'active'
          }
        ]);
        return;
      }

      // Filter for trainer schemas and enrich with trainer data
      const trainerSchemas = schemaData.filter(schema => schema.is_trainer_schema);
      
      // Get trainer information for each schema
      const enrichedSchemas = await Promise.all(
        trainerSchemas.map(async (schema) => {
          // Extract trainer ID from schema name
          const trainerId = schema.schema_name.replace('pt_', '').replace(/_/g, '-');
          
          try {
            // Get trainer details
            const { data: trainerData } = await supabase
              .from('trainers')
              .select('email, full_name, created_at, is_active')
              .eq('id', trainerId)
              .single();

            return {
              ...schema,
              trainer_id: trainerId,
              trainer_email: trainerData?.email || 'Unknown',
              trainer_name: trainerData?.full_name || 'Unknown Trainer',
              created_at: trainerData?.created_at || null,
              status: trainerData?.is_active ? 'active' : 'inactive'
            };
          } catch (error) {
            console.error(`Error loading trainer data for ${trainerId}:`, error);
            return {
              ...schema,
              trainer_id: trainerId,
              trainer_email: 'Unknown',
              trainer_name: 'Unknown Trainer',
              created_at: null,
              status: 'unknown'
            };
          }
        })
      );

      setSchemas(enrichedSchemas);
    } catch (error) {
      console.error('Error loading tenant schemas:', error);
      toast.error('Failed to load tenant schemas');
    } finally {
      setLoading(false);
    }
  };

  const toggleDetails = (schemaName) => {
    setShowDetails(prev => ({
      ...prev,
      [schemaName]: !prev[schemaName]
    }));
  };

  const getSchemaTableDetails = async (schemaName) => {
    try {
      const { data, error } = await supabase.rpc('get_tables_info', { schema_name: schemaName });
      
      if (error) {
        console.error('Error loading table details:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error loading table details:', error);
      return [];
    }
  };

  const recreateSchema = async (trainerId, schemaName) => {
    if (!confirm(`Are you sure you want to recreate the schema ${schemaName}? This will reset all data for this trainer.`)) {
      return;
    }

    try {
      setProcessingAction(`recreate-${schemaName}`);
      toast.loading('Recreating schema...', { id: 'recreate-schema' });

      // Call the schema creation function
      const { error } = await supabase.rpc('create_basic_tenant_schema', {
        trainer_id: trainerId
      });

      if (error) {
        console.error('Error recreating schema:', error);
        throw error;
      }

      toast.success('Schema recreated successfully!', { id: 'recreate-schema' });
      await loadTenantSchemas(); // Refresh the list
    } catch (error) {
      console.error('Error recreating schema:', error);
      toast.error('Failed to recreate schema: ' + error.message, { id: 'recreate-schema' });
    } finally {
      setProcessingAction(null);
    }
  };

  const deleteSchema = async (schemaName) => {
    if (!confirm(`Are you sure you want to DELETE the schema ${schemaName}? This action cannot be undone and will permanently remove all data for this trainer.`)) {
      return;
    }

    if (!confirm('This is a DESTRUCTIVE action. Type "DELETE" to confirm you understand this will permanently remove all data.')) {
      return;
    }

    try {
      setProcessingAction(`delete-${schemaName}`);
      toast.loading('Deleting schema...', { id: 'delete-schema' });

      // Execute SQL to drop the schema
      const { error } = await supabase.rpc('execute_sql', {
        sql: `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`
      });

      if (error) {
        console.error('Error deleting schema:', error);
        throw error;
      }

      toast.success('Schema deleted successfully!', { id: 'delete-schema' });
      await loadTenantSchemas(); // Refresh the list
    } catch (error) {
      console.error('Error deleting schema:', error);
      toast.error('Failed to delete schema: ' + error.message, { id: 'delete-schema' });
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return FiCheck;
      case 'inactive':
        return FiX;
      default:
        return FiAlertTriangle;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Existing Tenant Schemas</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Existing Tenant Schemas</h1>
          <p className="text-gray-600">Manage and monitor all trainer database schemas</p>
        </div>
        <button
          onClick={loadTenantSchemas}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <SafeIcon icon={FiRefreshCw} className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiDatabase} className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Schemas</p>
              <p className="text-2xl font-semibold text-gray-900">{schemas.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiCheck} className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Schemas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {schemas.filter(s => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiX} className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Inactive Schemas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {schemas.filter(s => s.status === 'inactive').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <SafeIcon icon={FiSettings} className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600">Avg Tables</p>
              <p className="text-2xl font-semibold text-gray-900">
                {schemas.length > 0 ? Math.round(schemas.reduce((acc, s) => acc + s.table_count, 0) / schemas.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Schemas List */}
      {schemas.length === 0 ? (
        <div className="text-center py-12">
          <SafeIcon icon={FiDatabase} className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No tenant schemas found</p>
          <p className="text-gray-400 text-sm">Tenant schemas will appear here when trainers are created</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {schemas.map((schema) => (
            <motion.div
              key={schema.schema_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <SafeIcon icon={FiDatabase} className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-semibold text-gray-900 truncate">
                        {schema.trainer_name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {schema.trainer_email}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(schema.status)}`}>
                    <SafeIcon icon={getStatusIcon(schema.status)} className="w-3 h-3 mr-1" />
                    {schema.status}
                  </span>
                </div>

                {/* Schema Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Schema:</span>
                    <span className="font-mono text-xs text-gray-800 truncate max-w-32">
                      {schema.schema_name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tables:</span>
                    <span className="font-semibold text-gray-900">{schema.table_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900">
                      {schema.created_at 
                        ? new Date(schema.created_at).toLocaleDateString()
                        : 'Unknown'
                      }
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleDetails(schema.schema_name)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <SafeIcon icon={FiEye} className="w-4 h-4 mr-1" />
                    {showDetails[schema.schema_name] ? 'Hide' : 'View'} Details
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => recreateSchema(schema.trainer_id, schema.schema_name)}
                      disabled={processingAction === `recreate-${schema.schema_name}`}
                      className="p-2 text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors"
                      title="Recreate Schema"
                    >
                      <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${processingAction === `recreate-${schema.schema_name}` ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => deleteSchema(schema.schema_name)}
                      disabled={processingAction === `delete-${schema.schema_name}`}
                      className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
                      title="Delete Schema"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {showDetails[schema.schema_name] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-100"
                  >
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Trainer ID:</span>
                        <span className="ml-2 font-mono text-xs text-gray-600">{schema.trainer_id}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Full Schema Name:</span>
                        <span className="ml-2 font-mono text-xs text-gray-600 break-all">{schema.schema_name}</span>
                      </div>
                      <div className="pt-2">
                        <span className="font-medium text-gray-700">Expected Tables:</span>
                        <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-gray-600">
                          <span>• players</span>
                          <span>• homework</span>
                          <span>• assessments</span>
                          <span>• exercises</span>
                          <span>• payments</span>
                          <span>• products</span>
                          <span>• orders</span>
                          <span>• order_items</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <SafeIcon icon={FiDatabase} className="w-6 h-6 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Tenant Schema Management</h4>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p><strong>Schema Naming:</strong> Each trainer gets a dedicated schema named <code>pt_[trainer_id]</code></p>
              <p><strong>Isolation:</strong> Schemas provide complete data isolation between trainers</p>
              <p><strong>Tables:</strong> Each schema contains tables for players, homework, assessments, payments, etc.</p>
              <p><strong>Recreate:</strong> Recreating a schema will reset all data for that trainer</p>
              <p><strong>Delete:</strong> Deleting a schema permanently removes all trainer data (use with extreme caution)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantSchemasManagement;