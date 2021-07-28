import config from './../../config';
import qs from 'qs';
import crypto from '@deip/lib-crypto';
import deipRpc from '@deip/rpc-client';
import { TextEncoder } from 'util';
import * as blockchainService from './../../utils/blockchain';
import { DEPOSIT_REQUEST_STATUS } from './../../constants';
import AssetDepositRequest from './../../schemas/AssetDepositRequestSchema';
import { ChainService } from '@deip/chain-service';

function Encodeuint8arr(seed) {
  return new TextEncoder("utf-8").encode(seed);
}

const SUPPORTED_CURRENCIES = ["USD", "EUR", "CAD", "CNY", "GBP"];
const MIN_AMOUNT = 100; // cents


const createAssetDepositRequest = async (ctx) => {
  try {
    const {
      currency,
      amount,
      timestamp,
      account,
      redirectUrl,
      sigHex
    } = ctx.request.body;
    const username = ctx.state.user.username;

    if (!currency || !SUPPORTED_CURRENCIES.includes(currency)) {
      ctx.status = 400;
      ctx.body = `${currency} is not supported`;
      return;
    }

    if (!amount || amount < MIN_AMOUNT) {
      ctx.status = 400;
      ctx.body = `Amount to deposit is less than min required amount which is ${(MIN_AMOUNT / 100).toFixed(2)} ${currency}`;
      return;
    }

    // separate queries as api returns a set of accounts
    const chainService = await ChainService.getInstanceAsync(config);
    const chainApi = chainService.getChainApi();

    const [depositor] = await chainApi.getAccountsAsync([username]);
    const [balanceOwner] = await chainApi.getAccountsAsync([account]);
    
    if (!depositor || !balanceOwner) {
      ctx.status = 404;
      ctx.body = `${username} or ${account} account is not found`;
      return;
    }

    try {
      const pubKey = depositor.owner.key_auths[0][0];
      const publicKey = crypto.PublicKey.from(pubKey);
      const payload = {
        amount,
        currency,
        account,
        timestamp,
      };
      const payloadStr = JSON.stringify(payload, Object.keys(payload).sort())
      publicKey.verify(Encodeuint8arr(payloadStr).buffer, crypto.unhexify(sigHex).buffer);
    } catch (err) {
      ctx.status = 400;
      ctx.body = `Provided sigHex is not valid for '${username}' account`;
      return;
    }

    const depositRequestDoc = await (new AssetDepositRequest({
      currency,
      amount,
      timestamp,
      account,
      username,
      requestToken: sigHex
    })).save();
    const depositRequest = depositRequestDoc.toObject();
    
    const query = qs.stringify({
      amount,
      currency,
      username,
      account,
      requestToken: depositRequest.requestToken,
      serverUrl: config.DEIP_SERVER_URL,
      referrerUrl: config.DEIP_CLIENT_URL,
      redirectUrl
     });

    const redirectToPaymentUrl = `${config.DEIP_PAYMENT_SERVICE_URL}?${query}`;
   
    ctx.status = 200;
    ctx.body = {
      redirectUrl: redirectToPaymentUrl,
      depositRequest
    }
  }

  catch (err) {
    ctx.status = 500;
    ctx.body = err.message;
  }
}


const confirmAssetDepositRequest = async (ctx) => {
  const {
    sig,
    invoice
  } = ctx.request.body;

  let depositRequestDoc;
  
  try {

    const {
      amount_paid: amount, // cents
      currency: currency,
      metadata: {
        account,
        username,
        requestToken
      }
    } = invoice;

    depositRequestDoc = await AssetDepositRequest.findOne({ requestToken });
    if (!depositRequestDoc) {
      ctx.status = 404;
      ctx.body = `Deposit request with ${requestToken} is not found`;
      return;
    }

    const depositRequest = depositRequestDoc.toObject();
    if (depositRequest.status != DEPOSIT_REQUEST_STATUS.PENDING) {
      ctx.status = 400;
      ctx.body = `Deposit request with ${requestToken} has been already resolved`;
      return;
    }

    try {
      const publicKey = crypto.PublicKey.from(config.DEIP_PAYMENT_SERVICE_PUB_KEY);
      const payloadStr = JSON.stringify(invoice, Object.keys(invoice).sort())
      publicKey.verify(Encodeuint8arr(payloadStr).buffer, crypto.unhexify(sig).buffer);
    }
    catch (err) {
      ctx.status = 401;
      ctx.body = `Provided signature is not valid for provided invoice`;
      return;
    }
  
    const { username: regacc, wif: regaccPrivKey } = config.FAUCET_ACCOUNT;
    const issue_asset_op = ['issue_asset', {
      issuer: regacc,
      amount: `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`,
      recipient: account,
      memo: undefined,
      extensions: []
    }];

    let signedTx = await blockchainService.signOperations([issue_asset_op], regaccPrivKey);
    signedTx = deipRpc.auth.signTransaction(signedTx, {}, { tenant: config.TENANT, tenantPrivKey: config.TENANT_PRIV_KEY }); // affirm by tenant
    const txInfo = await blockchainService.sendTransactionAsync(signedTx);

    depositRequestDoc.status = DEPOSIT_REQUEST_STATUS.APPROVED;
    depositRequestDoc.txInfo = txInfo;
    depositRequestDoc.invoice = invoice;
    const approvedDepositRequest = await depositRequestDoc.save();

    ctx.status = 200;
    ctx.body = "OK";
  }
  catch(err) {

    if (depositRequestDoc) {
      depositRequestDoc.status = DEPOSIT_REQUEST_STATUS.REJECTED;
      depositRequestDoc.invoice = invoice;
      const rejectedDepositRequest = await depositRequestDoc.save();
    }

    ctx.status = 500;
    ctx.body = err.message;
  }
}


const getDepositRequestByToken = async (ctx) => {
  try {
    const requestToken = ctx.params.requestToken;

    if (!requestToken) {
      ctx.status = 400;
      ctx.body = `Request token is not specified`;
      return;
    }

    const depositRequestDoc = await AssetDepositRequest.findOne({ requestToken });
    if (!depositRequestDoc) {
      ctx.status = 404;
      ctx.body = `Deposit request with ${requestToken} is not found`;
      return;
    }

    const depositRequest = depositRequestDoc.toObject();
    ctx.status = 200;
    ctx.body = depositRequest;
  }
  catch (err) {
    ctx.status = 500;
    ctx.body = err.message;
  }
}

module.exports = {
  getDepositRequestByToken,
  createAssetDepositRequest,
  confirmAssetDepositRequest
}