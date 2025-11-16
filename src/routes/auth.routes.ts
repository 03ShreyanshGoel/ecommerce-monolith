import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { RegisterRequest, LoginRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// REGISTER
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name }: RegisterRequest = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: email.endsWith('@admin.com') ? 'ADMIN' : 'CUSTOMER',
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
  const { email, password }: LoginRequest = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, password: true, email: true, name: true, role: true },
    });

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.role);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;