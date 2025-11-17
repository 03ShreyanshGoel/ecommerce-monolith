import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { protect, adminOnly, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// GET all products (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, title: true, description: true, price: true, image: true, stock: true },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET one product
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      select: { id: true, title: true, description: true, price: true, image: true, stock: true },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// CREATE product (admin only)
router.post('/', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const { title, description, price, image, stock } = req.body;

  if (!title || !price) {
    return res.status(400).json({ error: 'Title and price are required' });
  }

  try {
    const product = await prisma.product.create({
      data: { title, description, price, image, stock },
      select: { id: true, title: true, price: true, stock: true },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// UPDATE product (admin only)
router.put('/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, price, image, stock } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: { title, description, price, image, stock },
      select: { id: true, title: true, price: true, stock: true },
    });
    res.json(product);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE product (admin only)
router.delete('/:id', protect, adminOnly, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({ where: { id: Number(id) } });
    res.json({ message: 'Product deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;