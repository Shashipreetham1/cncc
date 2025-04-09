import { Schema as _Schema, model } from 'mongoose';
const Schema = _Schema;

const ItemSchema = new Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const PurchaseOrderSchema = new Schema({
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  fromAddress: {
    type: String,
    required: true,
    trim: true
  },
  vendorName: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  purchaseOrderNumber: {
    type: String,
    required: true,
    // Consider if this should be unique per user or globally
    // unique: true, // Uncomment if it must be globally unique
    trim: true
  },
  items: {
    type: [ItemSchema],
    required: true,
    validate: [v => Array.isArray(v) && v.length > 0, 'Purchase order must have at least one item.']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseOrderFileUrl: {
    type: String,
    trim: true
  },
  // Reference to the user who created this PO (optional but good practice)
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Optional: Add index if you frequently query by PO number and user
// PurchaseOrderSchema.index({ purchaseOrderNumber: 1, createdBy: 1 }, { unique: true });


const PurchaseOrder = model('PurchaseOrder', PurchaseOrderSchema);

export default PurchaseOrder;