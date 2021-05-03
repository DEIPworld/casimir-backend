import multer from 'koa-multer';
import { getFileStorageUploader } from './../storage';

const USERNAME_HEADER = "username";

const destinationHandler = (fileStorage) => function () {
  return async function (req, file, callback) {
    const username = req.headers[USERNAME_HEADER];
    const accountsDirPath = fileStorage.getAccountDirPath(username);

    const exists = await fileStorage.exists(accountsDirPath);
    if (!exists) {
      await fileStorage.mkdir(accountsDirPath);
    }
    callback(null, accountsDirPath)
  };
}


const filenameHandler = () => function () {
  return function (req, file, callback) {
    const username = req.headers[USERNAME_HEADER];
    const ext = file.originalname.substr(file.originalname.lastIndexOf('.') + 1);
    callback(null, `${username}.${ext}`);
  }
}


const fileFilterHandler = (req, file, callback) => {
  // const allowedAvatarMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  // if (!allowedAvatarMimeTypes.some(mime => mime === file.mimetype)) {
  //   return callback(new Error('Only the following mime types are allowed: ' + allowedAvatarMimeTypes.join(', ')), false);
  // }
  callback(null, true);
}


// TODO: Move all user fields here after UI form refactoring
const UserForm = async (ctx) => {

  const filesUploader = multer({
    storage: getFileStorageUploader(destinationHandler, filenameHandler),
    fileFilter: fileFilterHandler
  });

  const formHandler = filesUploader.any();
  return formHandler(ctx, () => new Promise((resolve, reject) => {
    try {
      const filename = ctx.req.files.length ? ctx.req.files[0].filename : '';
      const profile = JSON.parse(ctx.req.body.profile);
      resolve({
        profile,
        filename
      });
    } catch (err) {
      reject(err);
    }
  }));
  
}


export default UserForm;