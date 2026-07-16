"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventory_controller_1 = require("../controllers/inventory.controller");
const router = (0, express_1.Router)();
// Products / Items
router.get('/products', inventory_controller_1.InventoryController.searchItems);
router.get('/products/:id', inventory_controller_1.InventoryController.getItem);
router.post('/products', inventory_controller_1.InventoryController.createItem);
router.put('/products/:id', inventory_controller_1.InventoryController.updateItem);
router.delete('/products/:id', inventory_controller_1.InventoryController.archiveItem);
// Stock
router.get('/stock/low', inventory_controller_1.InventoryController.getLowStock);
router.get('/stock/out', inventory_controller_1.InventoryController.getOutOfStock);
router.get('/stock/summary', inventory_controller_1.InventoryController.getStockSummary);
router.get('/stock/:id/history', inventory_controller_1.InventoryController.getStockHistory);
// Categories
router.get('/categories', inventory_controller_1.InventoryController.getCategories);
// Suppliers
router.get('/suppliers', inventory_controller_1.InventoryController.getSuppliers);
exports.default = router;
//# sourceMappingURL=inventory.routes.js.map