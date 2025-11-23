import { Request, Response } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email("Por favor, insira um e-mail válido"),
    password: z.string().min(5, "A senha deve ter no mínimo 5 caracteres")
});

export const registerSchema = z.object({
    email: z.string().email("Por favor, insira um e-mail válido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
    name: z.string().min(2, "O nome deve ter no mínimo 2 caracteres"),
    role: z.enum(['Admin', 'Gerente', 'Supervisor', 'Consultor']).optional(),
    teamId: z.string().optional().nullable(),
    photoUrl: z.string().url("A URL da foto deve ser válida").optional().nullable()
});

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos. Por favor, tente novamente.' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);

        if (!validPassword) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos. Por favor, tente novamente.' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '30min' }
        );

        res.json({
            token,
            user: {
                uid: user.id,
                email: user.email,
                profile: {
                    name: user.name,
                    role: user.role,
                    teamId: user.teamId,
                    photoUrl: user.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name.replace(/\s/g, '')}`
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const register = async (req: Request, res: Response) => {
    const { email, password, name, role, teamId, photoUrl } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ message: 'Já existe um usuário cadastrado com este e-mail.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name,
                role: role || 'Consultor',
                teamId,
                photoUrl
            }
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                teamId: true,
                photoUrl: true
            }
        });

        const formattedUsers = users.map((user: { id: string; email: string; name: string; role: string; teamId: string | null; photoUrl: string | null }) => ({
            uid: user.id,
            email: user.email,
            profile: {
                name: user.name,
                role: user.role,
                teamId: user.teamId,
                photoUrl: user.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name.replace(/\s/g, '')}`
            }
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, role, teamId, photoUrl, password } = req.body;

    try {
        const dataToUpdate: any = {
            name,
            role,
            teamId,
            photoUrl
        };

        if (password) {
            dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
        }

        // Remove undefined keys
        Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

        const user = await prisma.user.update({
            where: { id },
            data: dataToUpdate
        });

        res.json({ message: 'User updated successfully', user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deletion of the last admin
        if (user.role === 'Admin') {
            const adminCount = await prisma.user.count({
                where: { role: 'Admin' }
            });

            if (adminCount <= 1) {
                return res.status(403).json({
                    message: 'Não é possível excluir o último administrador do sistema.'
                });
            }
        }

        // Delete user
        await prisma.user.delete({
            where: { id }
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
