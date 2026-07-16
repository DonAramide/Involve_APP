import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';

const router = Router();

router.get('/customers', CustomerController.searchCustomers);
router.post('/customers', CustomerController.createCustomer);
router.get('/customers/:id/summary', CustomerController.getCustomerSummary);
router.put('/customers/:id', CustomerController.updateCustomer);
router.post('/finance/customer-virtual-account/:customerId', CustomerController.getVirtualAccount);

export default router;
