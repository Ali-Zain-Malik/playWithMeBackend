import sharp from "sharp";
import path from "path";

import Attachment from "../models/Attachment.js";

import { getRandomString } from "../utils/functions.js";

export async function uploadPhoto(req, type = "primary") {

    const { path: filePath, filename } = req.file;
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const folder = req.uploadFolder;

    const randFileName = getRandomString(10);

    // Paths
    const iOrg = `${randFileName}${ext}`;
    const iMain = `${randFileName}_main${ext}`;
    const iProfile = `${randFileName}_profile${ext}`;
    const iIcon = `${randFileName}_icon${ext}`;

    // Process images
    await sharp(filePath).toFile(path.join(folder, iOrg));
    await sharp(filePath).resize(720).toFile(path.join(folder, iMain));
    await sharp(filePath).resize(370).toFile(path.join(folder, iProfile));
    await sharp(filePath).resize(80, 80).toFile(path.join(folder, iIcon));

    const params = {
        owner_id: req.user?._id,
        extension: ext.replace('.', ''),
        type: type,
        name: filename,
        file_url: path.join(folder, iOrg).replace(/\\/g, "/"),
        thumb_main: path.join(folder, iMain).replace(/\\/g, "/"),
        thumb_profile: path.join(folder, iProfile).replace(/\\/g, "/"),
        thumb_icon: path.join(folder, iIcon).replace(/\\/g, "/"),
        creation_date: new Date(),
        modified_date: new Date(),
    };
    const attachment = await Attachment.create(params);
    return attachment._id;
}