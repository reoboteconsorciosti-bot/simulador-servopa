import { Request, Response } from 'express';
import { prisma } from '../index';

interface AuthRequest extends Request {
    user?: any;
}

import { z } from 'zod';

const simulationInputSchema = z.object({
    clienteNome: z.string().optional(),
    consultorNome: z.string().optional(),
    tipoBem: z.string().optional(),
    credito: z.union([z.number(), z.string()]),
    qtdMeses: z.union([z.number(), z.string()]),
    taxa: z.union([z.number(), z.string()]),
    planoLight: z.union([z.number(), z.string()]), // Frontend sends number, but loose validation is safer for now
    seguroPrestamista: z.union([z.number(), z.string()]),
    percentualOfertado: z.union([z.number(), z.string()]).optional(),
    percentualEmbutido: z.union([z.number(), z.string()]).optional(),
    qtdParcelasOfertado: z.union([z.number(), z.string()]).optional(),
    diluirLance: z.union([z.number(), z.string()]).optional(),
    lanceNaAssembleia: z.union([z.number(), z.string()]).optional(),
}).passthrough(); // Allow other fields if schema evolves but validate core structure

export const saveSimulation = async (req: AuthRequest, res: Response) => {
    const { inputs, outputs } = req.body;
    const userId = req.user.userId;

    // Validate inputs structure
    const validationResult = simulationInputSchema.safeParse(inputs);

    if (!validationResult.success) {
        return res.status(400).json({
            message: 'Invalid simulation data format',
            details: validationResult.error.issues
        });
    }

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
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Filters from query params
    const filterUserId = req.query.userId as string;
    const filterTeamId = req.query.teamId as string;

    try {
        let whereClause: any = {};

        // Role-based Access Control for Filters
        if (requestingUserRole === 'Admin') {
            // Admin can see everything
            if (filterUserId) whereClause.userId = filterUserId;
            if (filterTeamId) whereClause.user = { teamId: filterTeamId }; // Optimized relational filter
        } else if (requestingUserRole === 'Gerente' || requestingUserRole === 'Supervisor') {
            // Managers/Supervisors can see their own data and their team's data
            const requester = await prisma.user.findUnique({
                where: { id: requestingUserId },
                select: { teamId: true }
            });
            const myTeamId = requester?.teamId;

            if (!myTeamId) {
                whereClause.userId = requestingUserId;
            } else {
                // Optimized: Filter by My Team OR My Own ID (redundant if I am in my team)
                // If filterUserId is provided, ensure it's in the team
                if (filterUserId) {
                    // We still need to check if target user is in team for security, 
                    // or we can rely on the query: userId = target AND user.teamId = myTeam
                    whereClause.userId = filterUserId;
                    whereClause.user = { teamId: myTeamId };
                } else {
                    // Show all team data
                    whereClause.user = { teamId: myTeamId };
                }
            }
        } else {
            // Consultants can ONLY see their own data
            whereClause.userId = requestingUserId;
        }

        const simulations = await prisma.simulation.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                userId: true,
                inputs: true,
                // Exclude 'outputs' to save bandwidth
                user: { // Include consultant name for display if needed (HistoryView uses user list context, but this is helpful)
                    select: {
                        name: true,
                        teamId: true
                    }
                }
            }
        });

        // Map to frontend format
        const formattedSimulations = simulations.map((sim: any) => ({
            ...sim.inputs as object,
            id: sim.id,
            timestamp: sim.createdAt.toISOString(),
            consultorNome: sim.inputs.consultorNome || sim.user?.name // Fallback or override
        }));

        res.json(formattedSimulations);
    } catch (error) {
        console.error('List simulations error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteSimulation = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    try {
        const simulation = await prisma.simulation.findUnique({
            where: { id }
        });

        if (!simulation) {
            return res.status(404).json({ message: 'Simulation not found' });
        }

        // Check permissions: Admin or Owner
        if (requestingUserRole !== 'Admin' && simulation.userId !== requestingUserId) {
            return res.status(403).json({ message: 'You do not have permission to delete this simulation' });
        }

        await prisma.simulation.delete({
            where: { id }
        });

        res.json({ message: 'Simulation deleted successfully' });
    } catch (error) {
        console.error('Delete simulation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
