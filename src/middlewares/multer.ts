// middlewares/multer.ts
import multer, { StorageEngine } from "multer";

// Gunakan memory storage
const storage: StorageEngine = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export default upload;
