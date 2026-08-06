import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';

const router = Router();

// Products / Items
router.get('/products', InventoryController.searchItems);
router.post('/products/bulk-sync', InventoryController.bulkSyncItems); // Mobile bulk web sync
router.get('/products/:id', InventoryController.getItem);
router.post('/products', InventoryController.createItem);
router.put('/products/:id', InventoryController.updateItem);
router.delete('/products/:id', InventoryController.archiveItem);

// Stock
router.get('/stock/low', InventoryController.getLowStock);
router.get('/stock/out', InventoryController.getOutOfStock);
router.get('/stock/summary', InventoryController.getStockSummary);
router.get('/stock/:id/history', InventoryController.getStockHistory);
router.post('/stock/:id/add', InventoryController.addStock);

// Categories
router.get('/categories', InventoryController.getCategories);

// Suppliers
router.get('/suppliers', InventoryController.getSuppliers);
router.post('/suppliers', InventoryController.createSupplier);

export default router;
