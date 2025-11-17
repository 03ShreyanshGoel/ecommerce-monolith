import express, { Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

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

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJDVVNUT01FUiIsImlhdCI6MTc2MzM2NTU3NywiZXhwIjoxNzYzOTcwMzc3fQ.J4WXAORTP_phWdUTYqO9mQTSfYt5XgXTc0Gk5sOd83s

