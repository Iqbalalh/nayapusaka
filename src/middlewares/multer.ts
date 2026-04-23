// middlewares/multer.ts
import multer, { StorageEngine } from "multer";

// Gunakan memory storage
const storage: StorageEngine = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export default upload;
