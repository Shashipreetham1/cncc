import { Schema as _Schema, model } from 'mongoose';
const Schema = _Schema;

const StockRegisterSchema = new Schema({
  articleName: {
    type: String,
    required: true,
    trim: true
  },
  entryDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  particulars: {
    companyName: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    productDetails: {
      type: String,
      trim: true
    }
  },
  voucherOrBillNumber: {
    type: String,
    required: true,
    trim: true
  },
  rate: {
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    cgst: {
      type: Number,
      default: 0,
      min: 0
    },
    sgst: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRate: { // Storing calculated total as requested
      type: Number,
      required: true,
      min: 0
    }
  },
  receiptNumber: {
    type: String, // Using String for flexibility (e.g., R001) though image says Number
    trim: true
  },
  pageNumber: {
    type: Number,
    min: 1
  },
  billingDate: {
    type: Date,
    required: true
  },
  photoUrl: { // Storing the URL/path from Multer
    type: String,
    trim: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Optional: Middleware to calculate totalRate before saving
StockRegisterSchema.pre('save', function(next) {
  if (this.isModified('rate.cost') || this.isModified('rate.cgst') || this.isModified('rate.sgst') || this.isNew) {
    this.rate.totalRate = (this.rate.cost || 0) + (this.rate.cgst || 0) + (this.rate.sgst || 0);
  }
  next();
});


const StockRegister = model('StockRegister', StockRegisterSchema);

export default StockRegister;