import React, {useState, useEffect} from 'react';
import {useTenant} from '../../contexts/TenantContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import {motion} from 'framer-motion';
import PlayerCard from './PlayerCard';
import PlayerModal from './PlayerModal';
import toast from 'react-hot-toast';

const {FiPlus, FiSearch, FiFilter} = FiIcons;

const PlayersPage = () => {
  const {queryTenantTable, tenantReady} = useTenant();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (tenantReady) {
      loadPlayers();
    }
  }, [tenantReady]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const {data, error} = await queryTenantTable('players')
        .select('*')
        .order('created_at', {ascending: false});
      
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast.error('Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = () => {
    setSelectedPlayer(null);
    setShowModal(true);
  };

  const handleEditPlayer = (player) => {
    setSelectedPlayer(player);
    setShowModal(true);
  };

  const handleDeletePlayer = async (playerId) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    
    try {
      const {error} = await queryTenantTable('players')
        .delete()
        .eq('id', playerId);
      
      if (error) throw error;
      setPlayers(players.filter(p => p.id !== playerId));
      toast.success('Player deleted successfully');
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('Failed to delete player');
    }
  };

  const handlePlayerSaved = (savedPlayer) => {
    if (selectedPlayer) {
      setPlayers(players.map(p => p.id === savedPlayer.id ? savedPlayer : p));
    } else {
      setPlayers([savedPlayer, ...players]);
    }
    setShowModal(false);
    loadPlayers(); // Refresh the list
  };

  const filteredPlayers = players.filter(player => 
    player.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    player.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
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
        <h1 className="text-2xl font-bold text-gray-900">Players</h1>
        <button 
          onClick={handleAddPlayer}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <SafeIcon icon={FiPlus} className="w-5 h-5 mr-2" />
          Add Player
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <SafeIcon icon={FiFilter} className="w-5 h-5 mr-2" />
          Filter
        </button>
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No players found</p>
          <button 
            onClick={handleAddPlayer}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add your first player
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={handleEditPlayer}
              onDelete={handleDeletePlayer}
            />
          ))}
        </div>
      )}

      {/* Player Modal */}
      {showModal && (
        <PlayerModal
          player={selectedPlayer}
          onClose={() => setShowModal(false)}
          onSave={handlePlayerSaved}
        />
      )}
    </div>
  );
};

export default PlayersPage;