import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma/client';
import { protect, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Mock Stripe secret key (in real app this comes from env)
const MOCK_STRIPE_KEY = 'sk_test_mock_12345';

// Simple mock delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// POST /api/payments/orders/:orderId/pay
router.post('/orders/:orderId/pay', protect, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { orderId } = req.params;
  const { paymentMethodId, shouldFail = false } = req.body; // for testing failure

  const order = await prisma.order.findFirst({
    where: { id: Number(orderId), userId },
    include: { items: { include: { product: true } } },
  });

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  if (order.status !== 'PENDING') {
    return res.status(400).json({ error: `Order is already ${order.status}` });
  }

  try {
    // Simulate network delay
    await delay(1200);

    // MOCK STRIPE BEHAVIOR
    if (shouldFail || !paymentMethodId) {
      throw new Error('Card declined (mock)');
    }

    // SUCCESS PATH — everything inside a transaction
    const paidOrder = await prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
        include: {
          items: { include: { product: { select: { title: true } } } },
        },
      });

      // 2. (Later here we'll publish Kafka event)
      console.log(`Order ${order.id} PAID! Emitting OrderPaid event...`);

      return updatedOrder;
    });

    return res.json({
      success: true,
      message: 'Payment successful! Order is now PAID',
      order: paidOrder,
    });

  } catch (error: any) {
    // FAILURE PATH — rollback stock
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      // Return stock
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    return res.status(400).json({
      success: false,
      error: 'Payment failed (mock Stripe): ' + error.message,
    });
  }
});

export default router;