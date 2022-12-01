import multer from 'koa-multer';
import BaseForm from '../base/BaseForm';
import { getFileStorageUploader } from '../storage';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const NFT_COLLECTION_ID = "nft-collection-id";
const NFT_ITEM_ID = "nft-item-id";
const ATTRIBUTE_ID_SPLITTER = '-';

const destinationHandler = (fileStorage) => function () {
  return async function (req, file, callback) {
    const nftCollectionId = req.headers[NFT_COLLECTION_ID];
    const nftItemId = req.headers[NFT_ITEM_ID];
    let folderPath = "";
    let filePath = "";
    const parts = file.originalname.split(ATTRIBUTE_ID_SPLITTER);

    const attrId = parts[0];

    if (parts.length > 1 && mongoose.Types.ObjectId.isValid(attrId)) {
      folderPath = fileStorage.getNFTItemMetadataAttributeDirPath(nftCollectionId, nftItemId, attrId);

      const name = file.originalname.substring(`${attrId}${ATTRIBUTE_ID_SPLITTER}`.length, file.originalname.length);
      filePath = fileStorage.getNFTItemMetadataAttributeFilePath(nftCollectionId, nftItemId, attrId, name);

    } else {
      folderPath = fileStorage.getNFTItemMetadataDirPath(nftCollectionId, nftItemId);
      filePath = fileStorage.getNFTItemMetadataFilePath(nftCollectionId, nftItemId, file.originalname);
    }

    const folderExists = await fileStorage.exists(folderPath);
    if (folderExists) {
      const fileExists = await fileStorage.exists(filePath);
      if (fileExists) {
        await fileStorage.delete(filePath);
      }
    } else {
      await fileStorage.mkdir(folderPath);
    }

    callback(null, folderPath);
  };
}


const filenameHandler = () => function () {
  return function (req, file, callback) {
    let name = "";
    const parts = file.originalname.split(ATTRIBUTE_ID_SPLITTER);
    const attrId = parts[0];

    if (parts.length > 1 && mongoose.Types.ObjectId.isValid(attrId)) {
      name = file.originalname.substring(`${attrId}${ATTRIBUTE_ID_SPLITTER}`.length, file.originalname.length);
    } else {
      name = file.originalname;
    }

    callback(null, name);
  }
}


const fileFilterHandler = (req, file, callback) => {
  callback(null, true);
}

class NFTItemMetadataForm extends BaseForm {

  constructor(nextHandler) {
    const sessionId = uuidv4();

    console.log("sessionId  -->", sessionId)

    const filesUploader = multer({
      storage: getFileStorageUploader(destinationHandler, filenameHandler, sessionId),
      fileFilter: fileFilterHandler
    });

    const multerHandler = filesUploader.any();

    const formHandler = (ctx) => multerHandler(ctx, () => new Promise((resolve, reject) => {
      try {
        resolve({ files: ctx.req.files });
      } catch (err) {
        reject(err);
      }
    }));

    return super(formHandler, nextHandler);
  }

}


export default NFTItemMetadataForm;