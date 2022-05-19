import { APP_EVENT } from '@deip/constants';
import { UserBookmarkService } from '../../../services';
import PortalAppEventHandler from '../../base/PortalAppEventHandler';


class UserSettingsEventHandler extends PortalAppEventHandler {

  constructor() {
    super();
  }

}

const userSettingsEventHandler = new UserSettingsEventHandler();
const userBookmarkService = new UserBookmarkService();

userSettingsEventHandler.register(APP_EVENT.BOOKMARK_CREATED, async (event) => {
  const { username, type, ref } = event.getEventPayload();

  await userBookmarkService.createUserBookmark({
    username,
    type,
    ref
  });
});

userSettingsEventHandler.register(APP_EVENT.BOOKMARK_DELETED, async (event) => {
  const { bookmarkId } = event.getEventPayload();

  await userBookmarkService.deleteUserBookmark(bookmarkId);
});

module.exports = userSettingsEventHandler;