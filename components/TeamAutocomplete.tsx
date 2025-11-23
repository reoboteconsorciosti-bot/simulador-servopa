import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';

interface TeamAutocompleteProps {
    label: string;
    name: string;
    value: string;
    onChange: (name: string, value: string) => void;
    users: User[];
    currentUserRole?: UserRole;
}

const TeamAutocomplete: React.FC<TeamAutocompleteProps> = ({
    label,
    name,
    value,
    onChange,
    users,
    currentUserRole
}) => {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Get existing teams from users
    const existingTeams = Array.from(
        new Set(users.map(u => u.profile.teamId).filter(Boolean))
    ) as string[];

    // Get available supervisors (supervisors without a team)
    const availableSupervisors = users.filter(
        u => u.profile.role === UserRole.Supervisor && !u.profile.teamId
    );

    // Filter teams based on input
    const filteredTeams = existingTeams.filter(team =>
        team.toLowerCase().includes(inputValue.toLowerCase())
    );

    // Check if input matches an existing team
    const isExistingTeam = existingTeams.some(
        team => team.toLowerCase() === inputValue.toLowerCase()
    );

    // Show "Create team" option if input doesn't match existing team and has value
    const showCreateOption = inputValue.trim() !== '' && !isExistingTeam;

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setError('');
        setIsOpen(true);
    };

    const handleSelectTeam = (team: string) => {
        setInputValue(team);
        onChange(name, team);
        setIsOpen(false);
        setError('');
    };

    const handleCreateTeam = () => {
        const teamName = inputValue.trim();

        if (!teamName) {
            setError('O nome da equipe não pode estar vazio');
            return;
        }

        if (availableSupervisors.length === 0) {
            setError('Não há supervisores disponíveis. Crie um supervisor sem equipe primeiro.');
            return;
        }

        // Team will be created when the form is submitted
        onChange(name, teamName);
        setIsOpen(false);
        setError('');
    };

    const handleFocus = () => {
        setIsOpen(true);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <div className="flex items-center space-x-2 mb-2">
                <label htmlFor={name} className="block text-sm sm:text-base font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </label>
            </div>

            <input
                id={name}
                name={name}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                placeholder="Digite ou selecione uma equipe..."
                className={`w-full px-4 py-3 sm:py-2.5 bg-white dark:bg-slate-900 border rounded-md focus:outline-none focus:ring-2 text-slate-900 dark:text-white transition-colors text-base min-h-[48px] sm:min-h-[44px]
                    ${error
                        ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                        : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
            />

            {error && (
                <p className="mt-1.5 text-sm sm:text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredTeams.length > 0 && (
                        <div className="py-1">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Equipes Existentes
                            </div>
                            {filteredTeams.map((team) => (
                                <button
                                    key={team}
                                    type="button"
                                    onClick={() => handleSelectTeam(team)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <span>{team}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {showCreateOption && (
                        <div className="py-1 border-t border-slate-200 dark:border-slate-700">
                            <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Nova Equipe
                            </div>
                            <button
                                type="button"
                                onClick={handleCreateTeam}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-2 font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Criar equipe "{inputValue}"</span>
                            </button>
                            {availableSupervisors.length > 0 && (
                                <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
                                    {availableSupervisors.length} {availableSupervisors.length === 1 ? 'supervisor disponível' : 'supervisores disponíveis'}
                                </div>
                            )}
                        </div>
                    )}

                    {filteredTeams.length === 0 && !showCreateOption && inputValue.trim() !== '' && (
                        <div className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Nenhuma equipe encontrada
                        </div>
                    )}

                    {inputValue.trim() === '' && existingTeams.length === 0 && (
                        <div className="px-4 py-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                            Nenhuma equipe cadastrada ainda
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamAutocomplete;
