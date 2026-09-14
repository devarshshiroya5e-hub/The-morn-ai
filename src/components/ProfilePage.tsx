import React, { useState } from 'react';
import { User } from '../types';
import { Camera, Save, LogOut } from 'lucide-react';

interface ProfilePageProps {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onUpdateUser, onLogout }) => {
  const [name, setName] = useState(currentUser.name);
  const [description, setDescription] = useState(currentUser.bio || '');

  const handleSave = () => {
    onUpdateUser({ ...currentUser, name, bio: description });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
      
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-24 h-24 rounded-2xl object-cover" />
            <button className="absolute -bottom-2 -right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <h2 className="text-xl font-bold">{currentUser.name}</h2>
            <p className="text-sm text-slate-500 capitalize">{currentUser.role}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold"
          >
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm">
        <h3 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h3>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};
