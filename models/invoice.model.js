import { Schema as _Schema, model } from 'mongoose';
const Schema = _Schema;

const ProductSchema = new Schema({
  productName: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    trim: true
  },
  warrantyYears: {
    type: Number,
    min: 0,
    default: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1 // Assuming quantity must be at least 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false }); // No separate ID for sub-documents unless needed

const InvoiceSchema = new Schema({
  purchaseDate: { // Renamed from 'Date of Purchase'
    type: Date,
    required: true,
    default: Date.now
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  orderOrSerialNumber: { // Combined as per image note
    type: String, // Use String as serial numbers can be alphanumeric
    trim: true
  },
  vendorName: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String, // String is better for phone numbers
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  invoiceFileUrl: { // For the path/URL from Multer
    type: String,
    trim: true
  },
  additionalDetails: {
    type: String,
    trim: true
  },
  allowEditing: {
    type: Boolean,
    default: false // Defaulting to not allowed seems safer
  },
  products: {
    type: [ProductSchema],
    required: true,
    validate: [v => Array.isArray(v) && v.length > 0, 'Invoice must have at least one product.']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Reference to the user who created this invoice (optional but good practice)
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

const Invoice = model('Invoice', InvoiceSchema);

export default Invoice;