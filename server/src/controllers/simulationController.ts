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
    const requestingUserId = req.user.userId;
    const requestingUserRole = req.user.role;

    // Filters from query params
    const filterUserId = req.query.userId as string;
    const filterTeamId = req.query.teamId as string;

    try {
        let whereClause: any = {};

        // Role-based Access Control for Filters
        if (requestingUserRole === 'Admin') {
            // Admin can see everything and filter by anything
            if (filterUserId) whereClause.userId = filterUserId;

            // For team filtering, we need to find users in that team first
            if (filterTeamId) {
                const usersInTeam = await prisma.user.findMany({
                    where: { teamId: filterTeamId },
                    select: { id: true }
                });
                const userIds = usersInTeam.map((u: { id: string }) => u.id);

                // If filtering by both user and team, ensure user belongs to team
                if (filterUserId) {
                    if (!userIds.includes(filterUserId)) {
                        return res.json([]); // User not in team
                    }
                    whereClause.userId = filterUserId;
                } else {
                    whereClause.userId = { in: userIds };
                }
            }
        } else if (requestingUserRole === 'Gerente' || requestingUserRole === 'Supervisor') {
            // Managers/Supervisors can see their own data and their team's data
            // First, get the requester's team
            const requester = await prisma.user.findUnique({
                where: { id: requestingUserId },
                select: { teamId: true }
            });

            const myTeamId = requester?.teamId;

            if (!myTeamId) {
                // If no team assigned, can only see own data
                whereClause.userId = requestingUserId;
            } else {
                // Can see data from users in my team
                const usersInMyTeam = await prisma.user.findMany({
                    where: { teamId: myTeamId },
                    select: { id: true }
                });
                const teamUserIds = usersInMyTeam.map((u: { id: string }) => u.id);

                if (filterUserId) {
                    // Can only filter by users within their team
                    if (teamUserIds.includes(filterUserId)) {
                        whereClause.userId = filterUserId;
                    } else {
                        return res.status(403).json({ message: 'Access denied to this user data' });
                    }
                } else {
                    // Show all team data
                    whereClause.userId = { in: teamUserIds };
                }
            }
        } else {
            // Consultants can ONLY see their own data
            whereClause.userId = requestingUserId;
        }

        const simulations = await prisma.simulation.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 100 // Increased limit for insights
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
