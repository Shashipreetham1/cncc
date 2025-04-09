import express from 'express';
import {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    deletePurchaseOrder
} from '../controllers/purchaseOrder.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadPO } from '../middlewares/upload.middleware.js'; // Specific upload middleware

const router = express.Router();

router.use(protect); // Protect all PO routes

// POST /api/purchase-orders - Create new PO (handles file upload with field name 'purchaseOrderFile')
router.post('/', uploadPO.single('purchaseOrderFile'), createPurchaseOrder);

// GET /api/purchase-orders - Get all user's POs
router.get('/', getPurchaseOrders);

// GET /api/purchase-orders/:id - Get single PO
router.get('/:id', getPurchaseOrderById);

// PUT /api/purchase-orders/:id - Update PO (handles file upload with field name 'purchaseOrderFile')
router.put('/:id', uploadPO.single('purchaseOrderFile'), updatePurchaseOrder);

// DELETE /api/purchase-orders/:id - Delete PO
router.delete('/:id', deletePurchaseOrder);


export default router;