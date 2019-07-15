import Koa from 'koa';
import json from 'koa-json';
import logger from 'koa-logger';
import auth from './routes/auth.js';
import api from './routes/api.js';
import pub from './routes/public.js';
import content from './routes/content.js';
import jwtKoa from 'koa-jwt';
import jwt from 'jsonwebtoken';
import path from 'path';
import serve from 'koa-static';
import koa_router from "koa-router";
import koa_bodyparser from "koa-bodyparser";
import cors from '@koa/cors';
import config from './config';
import mongoose from 'mongoose';
import fs from "fs";
import fsExtra from "fs-extra";
import util from 'util';

import deipRpc from '@deip/deip-rpc-client';
deipRpc.api.setOptions({ url: config.blockchain.rpcEndpoint });
deipRpc.config.set('chain_id', config.blockchain.chainId);


import { createFileRef } from './services/fileRef';
import FileContent from './schemas/fileRef';



const app = new Koa();
const router = koa_router();

const PORT = process.env.PORT || 80;
const HOST = process.env.HOST || '0.0.0.0';


app.use(cors());
app.use(koa_bodyparser());
app.use(json());
app.use(logger());

app.use(async function (ctx, next) {
  let start = new Date;
  await next();
  let ms = new Date - start;
  console.log('%s %s - %s', ctx.method, ctx.url, ms);
});

// app.use(async function (ctx, next) {
//   try {
//     await next();
//   } catch (err) {
//     if (401 === err.status) {
//       ctx.status = 401;
//       ctx.body = {
//         success: false,
//         token: null,
//         info: 'Protected resource, use "Authorization" header to get access'
//       };
//     } else {
//       throw err;
//     }
//   }
// });


app.on('error', function (err, ctx) {
  console.log('server error', err);
});

router.use('/auth', auth.routes()); // authentication actions
router.use('/public', pub.routes());
router.use('/content', jwtKoa({ secret: config.jwtSecret }).unless((req) => {
  return req.method == 'GET';
}), content.routes());
router.use('/api', jwtKoa({ secret: config.jwtSecret }), api.routes());

app.use(router.routes());

mongoose.connect(config.mongo['deip-server'].connection);
mongoose.connection.on('connected', () => {
  console.log(`Mongoose default connection open to ${config.mongo['deip-server'].connection}`);
});
mongoose.connection.on('error', (err) => {
  console.log(`Mongoose default connection error: ${err}`);
});
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
});

// app.listen(PORT, HOST, () => {
//     console.log(`Running on http://${HOST}:${PORT}`);
// });

const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);

io.use(function (socket, next) {
  let token = socket.handshake.query.token;
  if (!token) {
    next(new Error('ws_jwt_missed'));
  }

  jwt.verify(token, config.jwtSecret, (err, decoded) => {
    if (err) {
      next(new Error('ws_jwt_invalid'));
    } else {
      let user = decoded;
      socket.user = user;
      next();
    }
  })
});

const uploadSessions = {};

function getSession(filename, uuid) {
  return `${filename}-${uuid}`
    .replace(/ /g, "-")
    .replace(/\W+/g, "-")
    .toLowerCase();
}

io.on('connection', (socket) => {

  socket.on('pong', async (msg) => {
    console.log(`------ ${msg}`);
    socket.emit('ping', { ball: "server" })
  });

  socket.on('upload_encrypted_chunk', async (msg) => {
    const session = getSession(msg.uuid, msg.filename);

    console.log(uploadSessions)

    console.log(session);


    if (!uploadSessions[session]) {
      let { organizationId, projectId, filename, size, hash, chunkSize, iv, filetype, fileAccess } = msg;

      console.log("11111111");

      if (organizationId !== undefined &&
        projectId !== undefined &&
        filename !== undefined &&
        hash !== undefined &&
        size !== undefined &&
        chunkSize !== undefined &&
        iv !== undefined &&
        filetype !== undefined &&
        fileAccess !== undefined) {

        console.log("2222222");

        let name = `${iv}_${chunkSize}_${session}`;
        const filepath = `files/${projectId}/${name.length <= 250 ? name : name.substr(0, 250)}.aes`;
        const stat = util.promisify(fs.stat);

        console.log("333333333333");

        try {
          console.log("444444444");

          const check = await stat(filepath);
          console.log(`Session ${session} has expired`);
          return;

        } catch (err) {
          console.log("555555555");

          const ensureDir = util.promisify(fsExtra.ensureDir);
          console.log("66666666");

          await ensureDir(`files/${projectId}`);

          console.log("77777777");

          let ws = fs.createWriteStream(filepath, { 'flags': 'a' });
          uploadSessions[session] = {
            ws,
            organizationId,
            projectId,
            filename,
            filetype,
            filepath,
            size,
            hash,
            iv,
            chunkSize,
            fileAccess,
            isEnded: false
          };

          console.log("88888");

          ws.on('close', function (err) {
            console.log("999999");
            console.log(uploadSessions);

            delete uploadSessions[session];
            console.log('Writable Stream has been closed');
          });
        }

      } else {
        console.log("Message malformed");
        console.log(msg);
        return;
      }
    }

    console.log("1010101010101");

    if (msg.index != msg.lastIndex) {
      console.log("121212121212");


      uploadSessions[session].ws.write(new Buffer(new Uint8Array(msg.data)), (err) => {
        if (err) {
          console.log("31313131313131");

          console.log(err);
        } else {
          console.log("43434441414134343");

          socket.emit('uploaded_encrypted_chunk', { filename: msg.filename, uuid: msg.uuid, index: msg.index, lastIndex: msg.lastIndex });
          console.log("121515151515151");

        }
      });
    } else {
      console.log("1161616161166161");

      uploadSessions[session].ws.end(new Buffer(new Uint8Array(msg.data)), async (err) => {
        console.log("171717171171");

        uploadSessions[session].isEnded = true;
        console.log(uploadSessions);

        if (err) {
          console.log("181818188811");

          console.log(err);
        } else {
          console.log("1119199191919191");

          let { organizationId, projectId, filename, filetype, filepath, size, hash, iv, chunkSize, fileAccess } = uploadSessions[session];
          await createFileRef(organizationId, projectId, filename, filetype, filepath, size, hash, iv, chunkSize, fileAccess, "timestamped");
          console.log("200 0 0 02020 0 ");

          socket.emit('uploaded_encrypted_chunk', { filename: msg.filename, uuid: msg.uuid, index: msg.index, lastIndex: msg.lastIndex });
          console.log("21 21 21 2 1 21 2 1 ");

        }
      })
    }

  }); // listen to the event


  async function readable(rs) {
    return new Promise(r => rs.on('readable', r));
  }

  async function readBytes(rs, num = 2 * 1024 * 1024) {
    let buf = rs.read(num);
    if (buf) {
      return new Promise(r => r(buf));
    }
    else {
      return new Promise(r => {
        readable(rs).then(() => {
          readBytes(rs, num).then(b => r(b));
        });
      });
    }
  }

  const downloadSessions = {};
  socket.on('download_encrypted_chunk', async (msg) => {
    const session = getSession(msg.uuid, msg.filename);

    if (!downloadSessions[session]) {
      let { filename, filepath, chunkSize } = msg;

      const stat = util.promisify(fs.stat);

      try {

        if (filepath !== undefined &&
          chunkSize !== undefined &&
          filename !== undefined) {

          const stats = await stat(filepath);
          let fileSizeInBytes = stats.size;
          let index = -1;
          let lastIndex = Math.ceil(fileSizeInBytes / chunkSize) - 1;

          let rs = fs.createReadStream(filepath, { highWaterMark: 2 * 1024 * 1024 });
          downloadSessions[session] = { rs, isEnded: false, index, filepath, filename, lastIndex, chunkSize };

          rs.on('end', function () {
            downloadSessions[session].isEnded = true;
          })
            .on('close', function (err) {
              delete downloadSessions[session];
              console.log('Readable Stream has been closed');
            });

        } else {
          console.log("Message malformed");
          console.log(msg);
          return;
        }

      } catch (err) {
        console.log(err);
        return;
      }
    }

    let data = await readBytes(downloadSessions[session].rs, downloadSessions[session].chunkSize);
    let lastIndex = downloadSessions[session].lastIndex;
    let index = ++downloadSessions[session].index;

    socket.emit('downloaded_encrypted_chunk', { filename: msg.filename, uuid: msg.uuid, data: data, filetype: msg.filetype, index, lastIndex });
  });



});


server.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose default connection closed through app termination');
    process.exit(0);
  });
});

console.log(config)
export default app;