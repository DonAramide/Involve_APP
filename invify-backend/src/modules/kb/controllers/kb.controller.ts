import { Request, Response } from 'express';
import { KBService } from '../services/kb.service';

const kbService = new KBService();

export class KBController {
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await kbService.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getArticles(req: Request, res: Response) {
    try {
      const articles = await kbService.getArticles();
      res.json(articles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getArticleById(req: Request, res: Response) {
    try {
      const article = await kbService.getArticleById(req.params.id);
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
