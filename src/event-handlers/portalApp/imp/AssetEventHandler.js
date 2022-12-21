import {
  APP_EVENT,
  AssetType,
  NftItemMetadataDraftStatus
} from '@casimir.one/platform-core';
import {
  FTClassService,
  CollectionService,
  ItemService,
  PortalService
} from '../../../services';
import { genSha256Hash } from '@casimir.one/toolbox';
import PortalAppEventHandler from '../../base/PortalAppEventHandler';
import config from '../../../config';

const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const USER = config.GMAIL_USER;
const CLIENT_ID = config.GMAIL_CLIENT_ID;
const CLIENT_SECRET = config.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = config.GMAIL_REFRESH_TOKEN;

const sendEmailNotification = (to, subject, html) => {
  const OAuth2 = google.auth.OAuth2;
  const oauth2Client = new OAuth2(
        CLIENT_ID, // ClientID
        CLIENT_SECRET, // Client Secret
       "https://developers.google.com/oauthplayground" // Redirect URL
  );

  oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
  });
  const accessToken = oauth2Client.getAccessToken()


  const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
            type: "OAuth2",
            user: USER, 
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: accessToken
      }
  });


  const mailOptions = {
      from: USER,
      to: to,
      subject: subject,
      generateTextFromHTML: true,
      html: html
  };

  smtpTransport.sendMail(mailOptions, (error, response) => {
      error ? console.log(error) : console.log(response);
      smtpTransport.close();
  });

};



class AssetEventHandler extends PortalAppEventHandler {

  constructor() {
    super();
  }

}

const assetEventHandler = new AssetEventHandler();
const ftClassService = new FTClassService();
const collectionService = new CollectionService();
const itemService = new ItemService();
const portalService = new PortalService();

assetEventHandler.register(APP_EVENT.FT_CREATED, async (event) => {

  const {
    _id,
    issuer,
    symbol,
    precision,
    maxSupply,
    minBallance,
    description
  } = event.getEventPayload();

  const settings = {
    maxSupply,
    minBallance
  };

  await ftClassService.createFTClass({
    _id,
    symbol,
    precision,
    issuer,
    description,
    type: AssetType.FT,
    metadata: settings
  });

  await assetService.createAsset({
    _id,
    symbol,
    precision,
    issuer,
    description,
    type: AssetType.FT
  });
});


assetEventHandler.register(APP_EVENT.NFT_COLLECTION_CREATED, async (event) => {
  const {
    _id,
    attributes,
    ownerId,
  } = event.getEventPayload();

  await collectionService.createCollection({
    _id: _id,
    attributes,
    ownerId
  });
});


assetEventHandler.register(APP_EVENT.NFT_COLLECTION_UPDATED, async (event) => {
  const {
    _id,
    attributes
  } = event.getEventPayload();

  await collectionService.updateCollection({
    _id,
    attributes
  });
});

assetEventHandler.register(APP_EVENT.NFT_ITEM_CREATED, async (event) => {

  const {
    _id: nftItemId,
    nftCollectionId,
    ownerId,
    creatorId,
    attributes,
    status
  } = event.getEventPayload();

  const nftItem = {
    _id: nftItemId,
    nftCollectionId,
    ownerId,
    creatorId,
    status,
    attributes,
    hash: genSha256Hash(JSON.stringify(attributes)),
    algo: 'sha256'
  }

  await itemService.createItem(nftItem);
  // sendEmailNotification(ownerId, "Your asset has been uploaded", `<p>Thank you for uploading the asset, we will contact to you after the reviewing step</p>`);
});

assetEventHandler.register(APP_EVENT.NFT_ITEM_UPDATED, async (event) => {
  const {
    _id: nftItemId,
    status,
    attributes,
  } = event.getEventPayload();

  const packageHash = genSha256Hash(JSON.stringify(attributes));
  await itemService.updateItem(nftItemId, {
    status,
    hash: packageHash,
    attributes,
  })
});

assetEventHandler.register(APP_EVENT.NFT_ITEM_DELETED, async (event) => {
  const { _id } = event.getEventPayload();
  await itemService.deleteItem(_id);
});

assetEventHandler.register(APP_EVENT.NFT_ITEM_MODERATED, async (event) => {
  const { _id: nftItemId, status } = event.getEventPayload();

  if (status == NftItemMetadataDraftStatus.APPROVED) {
    const queueNumber = await portalService.increasePortalMaxQueueNumber(config.TENANT);
    await itemService.updateItem(nftItemId, {
      status,
      queueNumber
    });

    // sendEmailNotification(updatedDraft.ownerId, 
    //   `Your asset has been approved`, 
    //   `<p>Congratulations, <a href="${config.APP_ASSET_DETAILS_BASE_URL}/${_id}">your asset</a> has been approved ! Your queue number is <b>${queueNumber}</b></p>`
    // );
  } else {
    await itemService.updateItem(nftItemId, {
      status,
    });
    // sendEmailNotification(updatedDraft.ownerId, 
    //   `Your asset has been declined`, 
    //   `<p>Unfortunately, <a href="${config.APP_ASSET_DETAILS_BASE_URL}/${_id}">your asset</a> has been declined</p>`
    // );
  }

});

module.exports = assetEventHandler;