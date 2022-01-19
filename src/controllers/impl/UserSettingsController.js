import BaseController from '../base/BaseController';
import { UserBookmarkService } from '../../services';
import { BadRequestError, ForbiddenError } from './../../errors';
import { userSettingsCmdHandler } from './../../command-handlers';
import { APP_CMD } from '@deip/constants';

const userBookmarkService = new UserBookmarkService();

class UserSettingsController extends BaseController {
  getUserBookmarks = this.query({
    h: async (ctx) => {
      try {
        const jwtUsername = ctx.state.user.username;
        const username = ctx.params.username;
        const type = ctx.query.type;
        const ref = ctx.query.ref;

        if (username !== jwtUsername) {
          throw new ForbiddenError(`You have no permission to get '${username}' bookmarks`);
        }
        const bookmarks = await userBookmarkService.getUserBookmarks(username, type, ref);
        ctx.successRes(bookmarks);

      } catch (err) {
        console.log(err);
        ctx.errorRes(err);
      }
    }
  });

  createUserBookmark = this.command({
    h: async (ctx) => {
      try {
        const validate = async (appCmds) => {
          const appCmd = appCmds.find(cmd => cmd.getCmdNum() === APP_CMD.CREATE_BOOKMARK);
          if (!appCmd) {
            throw new BadRequestError(`This endpoint accepts protocol cmd`);
          }
          const { username } = appCmd.getCmdPayload();
          const jwtUsername = ctx.state.user.username;
          if (username !== jwtUsername) {
            throw new ForbiddenError(`You have no permission to create '${username}' bookmarks`);
          }
        };

        const msg = ctx.state.msg;
        await userSettingsCmdHandler.process(msg, ctx, validate);

        ctx.successRes();

      } catch (err) {
        ctx.errorRes(err);
      }
    }
  });

  deleteUserBookmark = this.command({
    h: async (ctx) => {
      try {
        const validate = async (appCmds) => {
          const appCmd = appCmds.find(cmd => cmd.getCmdNum() === APP_CMD.DELETE_BOOKMARK);
          if (!appCmd) {
            throw new BadRequestError(`This endpoint accepts protocol cmd`);
          }
          const { username } = appCmd.getCmdPayload();
          const jwtUsername = ctx.state.user.username;
          if (username !== jwtUsername) {
            throw new ForbiddenError(`You have no permission to remove '${username}' bookmarks`);
          }
        };

        const msg = ctx.state.msg;
        await userSettingsCmdHandler.process(msg, ctx, validate);

        ctx.successRes();

      } catch (err) {
        ctx.errorRes(err);
      }
    }
  });
}

const userSettingsCtrl = new UserSettingsController();

module.exports = userSettingsCtrl;