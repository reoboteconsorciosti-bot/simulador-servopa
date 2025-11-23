import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { login, register, getUsers, updateUser, deleteUser } from './controllers/authController';
import { saveSimulation, listSimulations } from './controllers/simulationController';
import { authenticateToken } from './middleware/authMiddleware';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth Routes
app.post('/api/auth/login', login);
app.post('/api/auth/register', register);
app.get('/api/users', authenticateToken, getUsers); // Protected route
app.put('/api/users/:id', authenticateToken, updateUser);
app.delete('/api/users/:id', authenticateToken, deleteUser);


// Simulation Routes
app.post('/api/simulations', authenticateToken, saveSimulation);
app.get('/api/simulations', authenticateToken, listSimulations);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Serve static files from the 'public' directory (frontend build)
// In Docker, we copy frontend/dist to /app/public
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Handle SPA routing: return index.html for any unknown route not starting with /api
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API endpoint not found' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { prisma };
