import { usersCtrl } from '../controllers';
import auth from '../controllers/legacy/auth.js'
import koa_router from 'koa-router'

const public_route = koa_router()

public_route.post('/sign-in', auth.signIn)
public_route.post('/v2/sign-up', usersCtrl.createUser)
public_route.post('/portal/sign-in', auth.chunkPortalAccessToken)


const routes = {
  public: koa_router().use('/auth', public_route.routes())
}


module.exports = routes;