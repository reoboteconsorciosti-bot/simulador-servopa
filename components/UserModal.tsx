import React, { useState, useEffect } from 'react';
import { User, UserRole, Profile } from '../types';
import Input from './Input';
import Select from './Select';
import PasswordInput from './PasswordInput';
import TeamAutocomplete from './TeamAutocomplete';

interface UserModalProps {
    userToEdit: User | null;
    onClose: () => void;
    onSave: (user: User | (Omit<Profile, 'photoUrl'> & { email: string; password?: string; photoUrl?: string })) => void;
    isProfileMode?: boolean; // If true, restricts editing role/team/email
    users: User[]; // List of all users for team autocomplete
}

const UserModal: React.FC<UserModalProps> = ({ userToEdit, onClose, onSave, isProfileMode = false, users }) => {
    const [formData, setFormData] = useState({
        name: userToEdit?.profile.name || '',
        email: userToEdit?.email || '',
        role: userToEdit?.profile.role || UserRole.Consultor,
        teamId: userToEdit?.profile.teamId || '',
        password: '',
        photoUrl: userToEdit?.profile.photoUrl || ''
    });

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                name: userToEdit.profile.name || '',
                email: userToEdit.email || '',
                role: userToEdit.profile.role || UserRole.Consultor,
                teamId: userToEdit.profile.teamId || '',
                password: '',
                photoUrl: userToEdit.profile.photoUrl || ''
            });
        }
    }, [userToEdit]);

    const handleChange = (name: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userToEdit) {
            onSave({
                ...userToEdit,
                email: formData.email,
                profile: {
                    ...userToEdit.profile,
                    name: formData.name,
                    role: formData.role,
                    teamId: formData.teamId,
                    photoUrl: formData.photoUrl
                },
                ...(formData.password ? { password: formData.password } : {})
            } as any);
        } else {
            onSave({
                name: formData.name,
                email: formData.email,
                role: formData.role,
                teamId: formData.teamId,
                password: formData.password || 'password123',
                photoUrl: formData.photoUrl
            });
        }
    };

    const roleOptions = Object.values(UserRole).map(role => ({ value: role, label: role }));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end sm:items-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-slate-800 w-full sm:w-full sm:max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-lg shadow-xl overflow-y-auto flex flex-col">
                <div className="p-6 flex-1 overflow-y-auto">
                    <h2 className="text-xl sm:text-2xl font-bold mb-6 text-slate-900 dark:text-white">{userToEdit ? (isProfileMode ? 'Editar Meu Perfil' : 'Editar Usuário') : 'Adicionar Usuário'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex justify-center mb-4">
                            <div className="relative w-24 h-24">
                                <img
                                    src={formData.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.name.replace(/\s/g, '')}`}
                                    alt="Preview"
                                    className="w-24 h-24 rounded-full object-cover border-4 border-slate-200 dark:border-slate-600"
                                />
                                <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </label>
                                <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                            </div>
                        </div>

                        <Input label="Nome Completo" name="name" value={formData.name} onChange={handleChange} required />
                        <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!!userToEdit} />

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                            <PasswordInput
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                placeholder={userToEdit ? "Deixe em branco para manter a atual" : "Senha inicial"}
                                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {!isProfileMode && (
                            <>
                                <Select label="Cargo" name="role" value={formData.role} onChange={(name, value) => handleChange(name, value as UserRole)} options={roleOptions} />
                                <TeamAutocomplete
                                    label="Equipe"
                                    name="teamId"
                                    value={formData.teamId}
                                    onChange={handleChange}
                                    users={users}
                                    currentUserRole={formData.role}
                                />
                            </>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 mt-auto">
                            <button type="button" onClick={onClose} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancelar</button>
                            <button type="submit" className="w-full sm:w-auto px-6 py-3 sm:py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default UserModal;
