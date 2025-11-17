import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { protect, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// GET user's cart
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  try {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: { select: { id: true, title: true, price: true, stock: true } } },
        },
      },
    });

    // Create cart if not exists
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: true } } },
      });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// ADD item to cart
router.post('/items', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { productId, quantity = 1 } = req.body;

  if (!productId || quantity < 1) {
    return res.status(400).json({ error: 'Valid productId and quantity required' });
  }

  try {
    // Check product exists and has stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, stock: true },
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    // Upsert cart item
    const cartItem = await prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      include: {
        product: { select: { id: true, title: true, price: true } },
      },
    });

    res.json(cartItem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// UPDATE item quantity
router.put('/items/:productId', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { productId } = req.params;
  const { quantity } = req.body;

  if (quantity < 1) {
    return res.status(400).json({ error: 'Quantity must be >= 1' });
  }

  try {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const updatedItem = await prisma.cartItem.update({
      where: {
        cartId_productId: { cartId: cart.id, productId: Number(productId) },
      },
      data: { quantity },
      include: { product: { select: { title: true, price: true } } },
    });

    res.json(updatedItem);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Item not in cart' });
    }
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// REMOVE item from cart
router.delete('/items/:productId', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { productId } = req.params;

  try {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    await prisma.cartItem.delete({
      where: {
        cartId_productId: { cartId: cart.id, productId: Number(productId) },
      },
    });

    res.json({ message: 'Item removed from cart' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Item not in cart' });
    }
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

export default router;