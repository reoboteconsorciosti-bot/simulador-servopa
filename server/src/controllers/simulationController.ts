import { Request, Response } from 'express';
import { prisma } from '../index';

interface AuthRequest extends Request {
    user?: any;
}

export const saveSimulation = async (req: AuthRequest, res: Response) => {
    const { inputs, outputs } = req.body;
    const userId = req.user.userId;

    try {
        const simulation = await prisma.simulation.create({
            data: {
                userId,
                inputs,
                outputs
            }
        });

        res.status(201).json(simulation);
    } catch (error) {
        console.error('Save simulation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const listSimulations = async (req: AuthRequest, res: Response) => {
    const userId = req.user.userId;

    try {
        const simulations = await prisma.simulation.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        // Map to frontend format
        const formattedSimulations = simulations.map((sim: any) => ({
            ...sim.inputs as object,
            id: sim.id,
            timestamp: sim.createdAt.toISOString()
        }));

        res.json(formattedSimulations);
    } catch (error) {
        console.error('List simulations error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
