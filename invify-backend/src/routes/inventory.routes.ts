import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { requireCatalogPermission } from '../catalog/catalog-rbac.middleware';

const router = Router();

// Products / Items
router.get('/products', requireCatalogPermission('catalog.view'), InventoryController.searchItems);
router.post('/products/bulk-sync', requireCatalogPermission('catalog.view'), InventoryController.bulkSyncItems); // Mobile bulk web sync — inventory only after first upload
router.get('/products/:id', requireCatalogPermission('catalog.view'), InventoryController.getItem);
router.post('/products', requireCatalogPermission('catalog.create'), InventoryController.createItem);
router.put('/products/:id', requireCatalogPermission('catalog.update'), InventoryController.updateItem);
router.delete('/products/:id', requireCatalogPermission('catalog.delete'), InventoryController.archiveItem);

// Stock
router.get('/stock/low', requireCatalogPermission('catalog.inventory.view'), InventoryController.getLowStock);
router.get('/stock/out', requireCatalogPermission('catalog.inventory.view'), InventoryController.getOutOfStock);
router.get('/stock/summary', requireCatalogPermission('catalog.inventory.view'), InventoryController.getStockSummary);
router.get('/stock/:id/history', requireCatalogPermission('catalog.inventory.view'), InventoryController.getStockHistory);
router.post('/stock/:id/add', requireCatalogPermission('catalog.inventory.adjust'), InventoryController.addStock);

// Categories
router.get('/categories', requireCatalogPermission('catalog.view'), InventoryController.getCategories);
router.post('/categories', requireCatalogPermission('catalog.category.manage'), InventoryController.createCategory);
router.patch('/categories/:id', requireCatalogPermission('catalog.category.manage'), InventoryController.updateCategory);

// Suppliers
router.get('/suppliers', InventoryController.getSuppliers);
router.post('/suppliers', InventoryController.createSupplier);

export default router;
