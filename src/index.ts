import express, { Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'E-commerce Monolith API 🛒' });
});

// Test DB
app.get('/test-db', async (req: Request, res: Response) => {
  try {
    await prisma.$connect();
    res.json({ message: 'DB connected!' });
  } catch (error) {
    res.status(500).json({ error: 'DB connection failed' });
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});