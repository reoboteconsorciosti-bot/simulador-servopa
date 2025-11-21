import { SimulationInputs, SavedSimulation } from '../types';

const MAX_HISTORY_ITEMS = 10;

const getHistoryKey = (userId: string): string => `simulationHistory_${userId}`;

export const getHistory = async (): Promise<SavedSimulation[]> => {
    try {
        const token = localStorage.getItem('sim-pro-token');
        if (!token) return [];

        const response = await fetch('/api/simulations', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch simulation history:", error);
        return [];
    }
};

export const addToHistory = async (userId: string, inputs: SimulationInputs): Promise<void> => {
    try {
        const token = localStorage.getItem('sim-pro-token');
        if (!token) return;

        await fetch('/api/simulations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                inputs,
                outputs: {} // We might want to save outputs too, but for now inputs are enough to reload
            })
        });
    } catch (error) {
        console.error("Failed to save simulation:", error);
    }
};

export const clearHistory = (userId: string): void => {
    // Not implemented in API yet, but could be added
};
