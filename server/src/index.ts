import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { login, register, getUsers, updateUser, deleteUser, refreshToken, loginSchema, registerSchema } from './controllers/authController';
import { saveSimulation, listSimulations, deleteSimulation } from './controllers/simulationController';
import { sendProposal } from './controllers/webhookController';
import { authenticateToken } from './middleware/authMiddleware';
import { validate } from './middleware/validationMiddleware';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
// Enable trust proxy to allow express-rate-limit to work behind a proxy (like Easypanel/Traefik)
app.set('trust proxy', 1);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://aistudiocdn.com"], // Allow Tailwind CDN and AI Studio CDN
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"], // Allow Tailwind styles
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"], // Allow images from any https source (like DiceBear)
            connectSrc: ["'self'", "https://api.dicebear.com", "https://cdn.tailwindcss.com"], // Allow Tailwind config fetch
        },
    },
    crossOriginEmbedderPolicy: false, // Disable COEP to allow loading cross-origin resources like images
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Auth Routes
app.post('/api/auth/login', validate(loginSchema), login);
app.post('/api/auth/register', validate(registerSchema), register);
app.post('/api/auth/refresh', refreshToken);
app.get('/api/users', authenticateToken, getUsers); // Protected route
app.put('/api/users/:id', authenticateToken, updateUser);
app.delete('/api/users/:id', authenticateToken, deleteUser);

// Simulation Routes
app.post('/api/simulations', authenticateToken, saveSimulation);
app.get('/api/simulations', authenticateToken, listSimulations);
app.delete('/api/simulations/:id', authenticateToken, deleteSimulation);

// Webhook Routes
app.post('/api/webhook/proposal', authenticateToken, sendProposal);

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

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export { prisma };
