import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole, Profile } from '../types';
import { useToast } from '../contexts/ToastContext';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password?: string, name?: string) => Promise<void>;
  addUser: (profileData: Profile, email: string, password?: string) => Promise<void>;
  updateUser: (uid: string, profileData: Profile, password?: string) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    // Check for a logged-in user in localStorage on initial load
    try {
      const storedUser = localStorage.getItem('sim-pro-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('sim-pro-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('sim-pro-token', data.token);
        localStorage.setItem('sim-pro-user', JSON.stringify(data.user));
        setUser(data.user);
        toast.success('Login realizado com sucesso!');
      } else {
        throw new Error(data.message || 'Login falhou. Verifique suas credenciais.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Erro ao conectar com o servidor.');
      throw error;
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('sim-pro-token');
      if (!token) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('sim-pro-token', data.token);
        return true;
      } else {
        console.error('Failed to refresh session');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('sim-pro-user');
    localStorage.removeItem('sim-pro-token');
    localStorage.removeItem('sim-pro-current-view'); // Reset view to simulator on logout
    setUser(null);
    toast.success('Logout realizado com sucesso!');
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('sim-pro-token');
      if (!token) return;

      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else if (response.status === 401) {
        // Token expired
        logout();
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error('Erro ao buscar usuários.');
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const register = async (email: string, password?: string, name?: string) => {
    // Default profile for self-registration
    const profileData: Profile = {
      name: name || email.split('@')[0],
      role: UserRole.Consultor, // Default role
      teamId: 'Geral', // Default team
      photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name || email}`
    };
    await addUser(profileData, email, password);
  };

  const addUser = async (profileData: Profile, email: string, password?: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: password || 'password123',
          name: profileData.name,
          role: profileData.role,
          teamId: profileData.teamId,
          photoUrl: profileData.photoUrl
        })
      });

      if (response.ok) {
        toast.success('Usuário criado com sucesso!');
        fetchUsers(); // Refresh list
      } else {
        const errorData = await response.json();
        console.error(`Erro ao criar usuário: ${errorData.message}`);
        throw new Error(errorData.message || 'Erro ao criar usuário');
      }
    } catch (error: any) {
      console.error('Add user error:', error);
      toast.error(error.message || 'Erro ao adicionar usuário.');
      throw error;
    }
  };

  const updateUser = async (uid: string, profileData: Profile, password?: string) => {
    try {
      const token = localStorage.getItem('sim-pro-token');
      if (!token) return;

      const body: any = {
        name: profileData.name,
        role: profileData.role,
        teamId: profileData.teamId,
        photoUrl: profileData.photoUrl
      };

      if (password) {
        body.password = password;
      }

      const response = await fetch(`/api/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        toast.success('Usuário atualizado com sucesso!');
        fetchUsers(); // Refresh list

        // If updating self, refresh local user state
        if (user && user.uid === uid) {
          const updatedUser = { ...user, profile: profileData };
          setUser(updatedUser);
          localStorage.setItem('sim-pro-user', JSON.stringify(updatedUser));
        }
      } else {
        const errorData = await response.json();
        console.error(`Erro ao atualizar usuário: ${errorData.message}`);
        toast.error(errorData.message || 'Erro ao atualizar usuário.');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('Erro ao conectar com o servidor para atualizar usuário.');
    }
  };

  const deleteUser = async (uid: string) => {
    try {
      const token = localStorage.getItem('sim-pro-token');
      if (!token) {
        console.error('No token found');
        toast.error('Token de autenticação não encontrado.');
        return;
      }

      const response = await fetch(`/api/users/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove from local state after successful deletion
        setUsers(prevUsers => prevUsers.filter(u => u.uid !== uid));
        toast.success('Usuário excluído com sucesso!');
      } else {
        const errorData = await response.json();

        // Show specific message for last admin protection
        if (response.status === 403) {
          toast.error(errorData.message || 'Não é possível excluir o último administrador do sistema.');
        } else {
          console.error(`Erro ao excluir usuário: ${errorData.message}`);
          toast.error('Erro ao excluir usuário. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Delete user error:', error);
      toast.error('Erro ao conectar com o servidor.');
    }
  };


  const value = useMemo(() => ({ user, users, login, logout, register, addUser, updateUser, deleteUser, refreshSession, loading }), [user, users, loading]);

  // Don't render children until we've checked for a user
  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};