import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller';
import { checkTenantAccess } from '../middleware/rbac.middleware';
import { requireCatalogPermission } from '../catalog/catalog-rbac.middleware';

const router = Router();

router.use(checkTenantAccess);

router.get('/categories', requireCatalogPermission('catalog.view'), CatalogController.listCategories);
router.post('/categories', requireCatalogPermission('catalog.category.manage'), CatalogController.createCategory);
router.patch('/categories/:id', requireCatalogPermission('catalog.category.manage'), CatalogController.updateCategory);

router.get('/items', requireCatalogPermission('catalog.view'), CatalogController.listItems);
router.post('/items', requireCatalogPermission('catalog.create'), CatalogController.createItem);
router.patch('/items/:id', requireCatalogPermission('catalog.update'), CatalogController.updateItem);
router.get('/items/:id', requireCatalogPermission('catalog.view'), CatalogController.getItem);

router.get('/changes', requireCatalogPermission('catalog.view'), CatalogController.getChanges);
router.post('/devices/ack', requireCatalogPermission('catalog.view'), CatalogController.ackDevice);
router.get('/devices/sync-status', requireCatalogPermission('catalog.sync.view'), CatalogController.syncStatus);

export default router;
