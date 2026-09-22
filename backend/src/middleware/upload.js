import multer from 'multer';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

/*
 * Files are held in memory and written by the controller under a generated
 * UUID path, so nothing multer receives ever lands on disk at a
 * client-supplied name.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

/*
 * Multer reports failures by passing an error into the middleware chain, which
 * would otherwise surface as a generic 500. Translating them here keeps the
 * user-facing wording exact ("File must be under 10MB" / the allowed-types
 * list) instead of leaking framework internals.
 */
export function uploadSingle(fieldName = 'file') {
  const handler = upload.single(fieldName);

  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File must be under 10MB' });
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Only one file may be uploaded at a time' });
        }
        return res.status(400).json({ error: `Upload failed: ${err.message}` });
      }

      if (err.message === 'INVALID_FILE_TYPE') {
        return res
          .status(400)
          .json({ error: 'Only PDF, images, Word, and Excel files allowed' });
      }

      return res.status(400).json({ error: 'Upload failed' });
    });
  };
}

export default upload;
