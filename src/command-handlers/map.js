import { APP_CMD } from '@deip/constants';
import { 
  projectCmdHandler, 
  proposalCmdHandler,
  accountCmdHandler,
  attributeCmdHandler,
  investmentOppCmdHandler,
  assetCmdHandler,
  documentTemplateCmdHandler
} from './index';


module.exports = {
  [APP_CMD.CREATE_PROJECT]: projectCmdHandler,
  [APP_CMD.UPDATE_PROJECT]: projectCmdHandler,
  [APP_CMD.DELETE_PROJECT]: projectCmdHandler,
  [APP_CMD.JOIN_PROJECT_TEAM]: projectCmdHandler,
  [APP_CMD.LEAVE_PROJECT_TEAM]: projectCmdHandler,
  [APP_CMD.CREATE_ACCOUNT]: accountCmdHandler,
  [APP_CMD.UPDATE_ACCOUNT]: accountCmdHandler,
  [APP_CMD.CREATE_PROPOSAL]: proposalCmdHandler,
  [APP_CMD.UPDATE_PROPOSAL]: proposalCmdHandler,
  [APP_CMD.DECLINE_PROPOSAL]: proposalCmdHandler,
  [APP_CMD.CREATE_ATTRIBUTE]: attributeCmdHandler,
  [APP_CMD.UPDATE_ATTRIBUTE]: attributeCmdHandler,
  [APP_CMD.DELETE_ATTRIBUTE]: attributeCmdHandler,
  [APP_CMD.CREATE_PROJECT_TOKEN_SALE]: investmentOppCmdHandler,
  [APP_CMD.CONTRIBUTE_PROJECT_TOKEN_SALE]: investmentOppCmdHandler,
  [APP_CMD.ASSET_TRANSFER]: assetCmdHandler,
  [APP_CMD.CREATE_DOCUMENT_TEMPLATE]: documentTemplateCmdHandler,
  [APP_CMD.UPDATE_DOCUMENT_TEMPLATE]: documentTemplateCmdHandler,
  [APP_CMD.DELETE_DOCUMENT_TEMPLATE]: documentTemplateCmdHandler,
};