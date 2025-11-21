import React, { useState } from 'react';
import Card from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { User, UserRole, Profile } from '../types';
import Input from '../components/Input';
import Select from '../components/Select';


import UserModal from '../components/UserModal';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';



const AdminView: React.FC = () => {
    const { users, addUser, updateUser, deleteUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userData: any) => {
        try {
            if (userData.uid) {
                // Update
                updateUser(userData.uid, userData.profile, userData.password);
            } else {
                // Create
                const { email, password, photoUrl, ...profileData } = userData;
                await addUser({ ...profileData, photoUrl }, email, password);
            }
            handleCloseModal();
        } catch (error: any) {
            setErrorMessage(error.message || 'Erro ao salvar usuário');
            setErrorModalOpen(true);
        }
    };

    const handleDeleteUser = (uid: string) => {
        setUserToDelete(uid);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (userToDelete) {
            deleteUser(userToDelete);
        }
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
    };

    const cancelDelete = () => {
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
    };

    // Check if a user is the last admin
    const isLastAdmin = (user: User): boolean => {
        const adminCount = users.filter(u => u.profile.role === UserRole.Admin).length;
        return user.profile.role === UserRole.Admin && adminCount === 1;
    };

    return (
        <>
            <Card className="!p-0">
                <div className="flex justify-between items-center p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Usuários</h1>
                    </div>
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white p-2 sm:px-4 sm:py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Adicionar Usuário</span>
                    </button>
                </div>
                {/* Mobile View - Cards */}
                <div className="md:hidden space-y-4 p-4">
                    {users.map(user => (
                        <div key={user.uid} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center space-x-3 mb-3">
                                <img src={user.profile.photoUrl} alt={user.profile.name} className="h-12 w-12 rounded-full flex-shrink-0 object-cover border-2 border-white dark:border-slate-600 shadow-sm" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-lg text-slate-900 dark:text-white truncate">{user.profile.name}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded">
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Cargo</span>
                                    <span className={`font-semibold ${user.profile.role === UserRole.Admin ? 'text-purple-600' : user.profile.role === UserRole.Gerente ? 'text-indigo-600' : user.profile.role === UserRole.Supervisor ? 'text-orange-600' : 'text-blue-600'}`}>
                                        {user.profile.role}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded">
                                    <span className="block text-xs text-slate-500 dark:text-slate-400">Equipe</span>
                                    <span className="font-semibold">{user.profile.teamId || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleOpenModal(user)} className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-2 rounded-md font-medium text-sm">
                                    Editar
                                </button>
                                {isLastAdmin(user) ? (
                                    <button disabled className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-400 py-2 rounded-md font-medium text-sm cursor-not-allowed">
                                        Excluir
                                    </button>
                                ) : (
                                    <button onClick={() => handleDeleteUser(user.uid)} className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded-md font-medium text-sm">
                                        Excluir
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Usuário</th>
                                <th className="p-4 font-semibold">Cargo</th>
                                <th className="p-4 font-semibold">Equipe</th>
                                <th className="p-4 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.uid} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3">
                                            <img src={user.profile.photoUrl} alt={user.profile.name} className="h-10 w-10 rounded-full" />
                                            <div>
                                                <div className="font-bold">{user.profile.name}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.profile.role === UserRole.Admin ? 'bg-purple-200 text-purple-800' : user.profile.role === UserRole.Gerente ? 'bg-indigo-200 text-indigo-800' : user.profile.role === UserRole.Supervisor ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'}`}>
                                            {user.profile.role}
                                        </span>
                                    </td>
                                    <td className="p-4">{user.profile.teamId || 'N/A'}</td>
                                    <td className="p-4">
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleOpenModal(user)} className="text-blue-500 hover:underline font-medium">Editar</button>
                                            {isLastAdmin(user) ? (
                                                <span
                                                    className="text-slate-400 cursor-not-allowed"
                                                    title="Não é possível excluir o último administrador"
                                                >
                                                    Excluir
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeleteUser(user.uid)}
                                                    className="text-red-500 hover:underline font-medium"
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && <UserModal userToEdit={editingUser} onClose={handleCloseModal} onSave={handleSaveUser} />}

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                title="Excluir Usuário"
                message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                variant="danger"
            />

            <AlertModal
                isOpen={errorModalOpen}
                title="Erro ao Criar Usuário"
                message={errorMessage}
                onClose={() => setErrorModalOpen(false)}
                variant="error"
            />
        </>
    );
};

export default AdminView;
