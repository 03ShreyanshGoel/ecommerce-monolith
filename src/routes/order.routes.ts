import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { protect, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// GET user's orders
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: { product: { select: { title: true, price: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// CREATE order from cart (Checkout)
router.post('/checkout', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const transaction = await prisma.$transaction(async (tx) => {
    // 1. Get cart with items
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // 2. Validate stock & calculate total
    let total = 0;
    for (const item of cart.items) {
      const product = item.product;
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.title}`);
      }
      total += product.price * item.quantity;
    }

    // 3. Create order
    const order = await tx.order.create({
      data: {
        userId,
        total,
        status: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    // 4. Reduce stock
    for (const item of cart.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // 5. Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });

  try {
    res.status(201).json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Checkout failed' });
  }
});

export default router;