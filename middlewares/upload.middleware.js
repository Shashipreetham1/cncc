import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Function to ensure directory exists
const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true }); // recursive: true creates parent directories if needed
  }
};

// --- Invoice Storage ---
const invoiceStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/invoices/';
    ensureDirExists(uploadPath); // Ensure the directory exists
    cb(null, uploadPath); // Directory to save files
  },
  filename: function (req, file, cb) {
    // Create a unique filename: fieldname-timestamp.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// --- Purchase Order Storage ---
const poStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/purchaseOrders/';
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// --- Stock Photo Storage ---
const stockPhotoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/stockPhotos/';
    ensureDirExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// --- File Filter (Example: Allow common image and PDF types) ---
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf/; // Adjust as needed
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes), false);
  }
};

// --- Specific Image Filter (for stock photos) ---
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/; // Only images
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Image upload only supports the following filetypes - ' + allowedTypes), false);
  }
};


// --- Multer Instances ---
// Adjust limits and filters as needed
const uploadInvoice = multer({
  storage: invoiceStorage,
  fileFilter: fileFilter, // Use general filter for invoices (PDFs might be common)
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

const uploadPO = multer({
  storage: poStorage,
  fileFilter: fileFilter, // Use general filter for POs
  limits: { fileSize: 1024 * 1024 * 5 } // 5MB limit
});

const uploadStockPhoto = multer({
  storage: stockPhotoStorage,
  fileFilter: imageFileFilter, // Use image-only filter for stock photos
  limits: { fileSize: 1024 * 1024 * 2 } // 2MB limit for photos
});


export { uploadInvoice, uploadPO, uploadStockPhoto };