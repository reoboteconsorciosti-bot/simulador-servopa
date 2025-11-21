import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, UserRole, Profile } from '../types';

// Converte os dados mock para uma lista inicial de usuários
const createInitialUsers = (): User[] => {
  const initialProfiles: { email: string; profile: Omit<Profile, 'photoUrl'> }[] = [
    { email: 'consultor@servopa.com.br', profile: { name: 'João Consultor', role: UserRole.Consultor, teamId: 'A1' } },
    { email: 'supervisor@servopa.com.br', profile: { name: 'Maria Supervisora', role: UserRole.Supervisor, teamId: 'A' } },
    { email: 'admin@servopa.com.br', profile: { name: 'Carlos Admin', role: UserRole.Admin } },
  ];

  return initialProfiles.map((p, index) => ({
    uid: `mock-uid-${index + 1}`,
    email: p.email,
    profile: {
      ...p.profile,
      photoUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${p.profile.name.replace(/\s/g, '')}`
    }
  }));
};


interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, password?: string) => void;
  logout: () => void;
  addUser: (profileData: Profile, email: string, password?: string) => void;
  updateUser: (uid: string, profileData: Profile, password?: string) => void;
  deleteUser: (uid: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(createInitialUsers());
  const [loading, setLoading] = useState(true);

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

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('sim-pro-token', data.token);
        localStorage.setItem('sim-pro-user', JSON.stringify(data.user));
        setUser(data.user);
      } else {
        alert('Login falhou. Verifique suas credenciais.');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Erro ao conectar com o servidor.');
    }
  };

  const logout = () => {
    localStorage.removeItem('sim-pro-user');
    localStorage.removeItem('sim-pro-token');
    setUser(null);
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
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

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
        // alert('Usuário criado com sucesso!');
        fetchUsers(); // Refresh list
        return { success: true };
      } else {
        const errorData = await response.json();
        console.error(`Erro ao criar usuário: ${errorData.message}`);
        throw new Error(errorData.message || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('Add user error:', error);
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
        // alert('Usuário atualizado com sucesso!');
        fetchUsers(); // Refresh list

        // If updating self, refresh local user state
        if (user && user.uid === uid) {
          setUser(prev => prev ? { ...prev, profile: profileData } : null);
        }
      } else {
        const errorData = await response.json();
        console.error(`Erro ao atualizar usuário: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Update user error:', error);
    }
  };

  const deleteUser = async (uid: string) => {
    try {
      const token = localStorage.getItem('sim-pro-token');
      if (!token) {
        console.error('No token found');
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
      } else {
        const errorData = await response.json();

        // Show specific message for last admin protection
        if (response.status === 403) {
          alert(errorData.message || 'Não é possível excluir o último administrador do sistema.');
        } else {
          console.error(`Erro ao excluir usuário: ${errorData.message}`);
          alert('Erro ao excluir usuário. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Erro ao conectar com o servidor.');
    }
  };


  const value = useMemo(() => ({ user, users, login, logout, addUser, updateUser, deleteUser, loading }), [user, users, loading]);

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