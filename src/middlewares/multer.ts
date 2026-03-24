// middlewares/multer.ts
import multer, { StorageEngine } from "multer";

// Gunakan memory storage
const storage: StorageEngine = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 5120 * 5120, // 5MB
  },
});

export default upload;
