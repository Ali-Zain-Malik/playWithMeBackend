import multer from "multer";
import path from "path";
import fs from "fs";
import { getRandomString } from "./functions.js";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const randFolderName = getRandomString(4);
        const uploadPath = path.join("upload", "images", randFolderName);
        fs.mkdirSync(uploadPath, { recursive: true });
        req.uploadFolder = uploadPath;
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const randFileName = getRandomString(10);
        cb(null, randFileName + ext);
    }
});

const upload = multer({ storage });
export default upload;