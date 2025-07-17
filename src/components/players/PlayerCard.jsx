import React from 'react';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const { FiEdit, FiTrash2, FiMail, FiPhone, FiCalendar } = FiIcons;

const PlayerCard = ({ player, onEdit, onDelete }) => {
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'P';
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {getInitials(player.name)}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{player.name}</h3>
            <p className="text-sm text-gray-500">{player.position}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(player)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <SafeIcon icon={FiEdit} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(player.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
          >
            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {player.birth_date && (
          <div className="flex items-center text-sm text-gray-600">
            <SafeIcon icon={FiCalendar} className="w-4 h-4 mr-2" />
            <span>Age: {calculateAge(player.birth_date)}</span>
          </div>
        )}
        {player.contact && (
          <div className="flex items-center text-sm text-gray-600">
            <SafeIcon icon={FiMail} className="w-4 h-4 mr-2" />
            <span className="truncate">{player.contact}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Member since</span>
          <span className="text-gray-900">
            {player.created_at ? format(new Date(player.created_at), 'MMM yyyy') : 'N/A'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default PlayerCard;