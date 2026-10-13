import { Router } from 'express';
import { db } from '../database/index.js';
import { faqs } from '../database/schema.js';
import { eq, asc } from 'drizzle-orm';

const router = Router();

// GET /api/faqs
// Public endpoint for user side: returns only visible FAQs ordered by sort_order
router.get('/', async (req, res) => {
  try {
    const list = await db
      .select({
        id: faqs.faqId,
        faqId: faqs.faqId,
        question: faqs.question,
        answer: faqs.answer,
        sortOrder: faqs.sortOrder,
        createdAt: faqs.createdAt,
      })
      .from(faqs)
      .where(eq(faqs.isVisible, true))
      .orderBy(asc(faqs.sortOrder), asc(faqs.faqId));

    res.json({ data: list });
  } catch (error) {
    console.error('Error fetching public FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

export default router;
