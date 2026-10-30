"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const catalog_rbac_middleware_1 = require("../catalog/catalog-rbac.middleware");
const router = (0, express_1.Router)();
// Products / Items
router.get('/products', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.view'), inventory_controller_1.InventoryController.searchItems);
router.post('/products/bulk-sync', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.view'), inventory_controller_1.InventoryController.bulkSyncItems); // Mobile bulk web sync — inventory only after first upload
router.get('/products/:id', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.view'), inventory_controller_1.InventoryController.getItem);
router.post('/products', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.create'), inventory_controller_1.InventoryController.createItem);
router.put('/products/:id', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.update'), inventory_controller_1.InventoryController.updateItem);
router.delete('/products/:id', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.delete'), inventory_controller_1.InventoryController.archiveItem);
// Stock
router.get('/stock/low', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.inventory.view'), inventory_controller_1.InventoryController.getLowStock);
router.get('/stock/out', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.inventory.view'), inventory_controller_1.InventoryController.getOutOfStock);
router.get('/stock/summary', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.inventory.view'), inventory_controller_1.InventoryController.getStockSummary);
router.get('/stock/:id/history', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.inventory.view'), inventory_controller_1.InventoryController.getStockHistory);
router.post('/stock/:id/add', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.inventory.adjust'), inventory_controller_1.InventoryController.addStock);
// Categories
router.get('/categories', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.view'), inventory_controller_1.InventoryController.getCategories);
router.post('/categories', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.category.manage'), inventory_controller_1.InventoryController.createCategory);
router.patch('/categories/:id', (0, catalog_rbac_middleware_1.requireCatalogPermission)('catalog.category.manage'), inventory_controller_1.InventoryController.updateCategory);
// Suppliers
router.get('/suppliers', inventory_controller_1.InventoryController.getSuppliers);
router.post('/suppliers', inventory_controller_1.InventoryController.createSupplier);
exports.default = router;
//# sourceMappingURL=inventory.routes.js.map