import BaseController from '../base/BaseController';
import { PortalService, PortalDtoService, UserDtoService } from '../../services';
import { APP_CMD } from '@casimir.one/platform-core';
import { BadRequestError, NotFoundError } from '../../errors';
import { portalCmdHandler } from '../../command-handlers';
import sharp from 'sharp';
import FileStorage from '../../storage';
import { PortalSettingsForm } from './../../forms';

const portalService = new PortalService();
const portalDtoService = new PortalDtoService();
const userDtoService = new UserDtoService();

class PortalController extends BaseController {
  getPortalImgs = this.query({
    h: async (ctx) => {
      try {
        const portalId = ctx.state.portal.id;
        const portal = await portalService.getPortal(portalId);
        const width = ctx.query.width ? parseInt(ctx.query.width) : 200;
        const height = ctx.query.height ? parseInt(ctx.query.height) : 200;
        const noCache = ctx.query.noCache ? ctx.query.noCache === 'true' : false;
        const isRound = ctx.query.round ? ctx.query.round === 'true' : false;
      
        let src;
        let buff;
        const resizeParams = [];

        if (ctx.originalUrl.includes('/portal/logo')) {
          const defaultLogo = FileStorage.getPortalDefaultLogoFilePath(); // logo
          
          if (portal.logo) {
            const filepath = FileStorage.getPortalLogoFilePath(portalId, portal.logo);
            const exists = await FileStorage.exists(filepath);
            if (exists) {
              buff = await FileStorage.get(filepath);
            } else {
              src = defaultLogo;
            }
          } else {
            src = defaultLogo;
          }
        } else if (ctx.originalUrl.includes('/portal/banner')) {
          const defaultBanner = FileStorage.getPortalDefaultBannerFilePath(); //banner
    
          if (portal.banner) {
            const filepath = FileStorage.getPortalBannerFilePath(portalId, portal.banner);
            const exists = await FileStorage.exists(filepath);
            if (exists) {
              buff = await FileStorage.get(filepath);
            } else {
              src = defaultBanner;
            }
          } else {
            src = defaultBanner;
          }
          resizeParams.push(width, height)
        }
    
        let resize = (w, h) => {
          return new Promise((resolve, reject) => {
            sharp.cache(!noCache);
            sharp(buff || src)
              .rotate()
              .resize(w, h)
              .png()
              .toBuffer()
              .then(data => {
                resolve(data)
              })
              .catch(err => {
                reject(err)
              });
          })
        }
    
        let img = await resize(...resizeParams);
    
        if (isRound) {
          let round = (w) => {
            let r = w / 2;
            let circleShape = Buffer.from(`<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`);
            return new Promise((resolve, reject) => {
              img = sharp(img)
                .overlayWith(circleShape, { cutout: true })
                .png()
                .toBuffer()
                .then(data => {
                  resolve(data)
                })
                .catch(err => {
                  reject(err)
                });
            });
          }
    
          img = await round(width);
        }
    
        ctx.type = 'image/png';
        ctx.successRes(img, { withoutWrap: true });
    
      } catch (err) {
        console.log(err);
        ctx.errorRes(err);
      }
    }
  });

  getPortal = this.query({
    h: async (ctx) => {
      try {
        const portalId = ctx.state.portal.id;
        const portal = await portalDtoService.getPortal(portalId);
        if (!portal) {
          throw new NotFoundError(`Portal '${portalId}' does not exist`);
        }
        ctx.successRes(portal);
      } catch (err) {
        console.log(err);
        ctx.errorRes(err);
      }
    }
  });

  updatePortal = this.command({
    h: async (ctx) => {
      try {
        const validate = async (appCmds) => {
          const updatePortalProfileSettings = {
            cmdNum: APP_CMD.UPDATE_PORTAL_PROFILE
          };
          
          const validCmdsOrder = [updatePortalProfileSettings];
          
          await this.validateCmds(appCmds, validCmdsOrder);
        };
        
        const msg = ctx.state.msg;
        await portalCmdHandler.process(msg, ctx, validate);

        ctx.successRes();

      } catch (err) {
        ctx.errorRes(err);
      }
    }
  });

  getPortalCustomFields = this.query({
    h: async (ctx) => {
      try {
        const portalId = ctx.state.portal.id;
        const result = await portalDtoService.getPortalCustomFields(portalId);
        ctx.successRes(result);
      } catch (err) {
        console.log(err);
        ctx.errorRes(err);
      }
    }
  });

  getPortalAttributeMappings = this.query({
    h: async (ctx) => {
      try {
        const portalId = ctx.state.portal.id;
        const result = await portalDtoService.getPortalAttributeMappings(portalId);
        ctx.successRes(result);
      } catch (err) {
        console.log(err);
        ctx.errorRes(err);
      }
    }
  });
  
  getPortalLayoutMappings = this.query({
    h: async (ctx) => {
      try {
        const portalId = ctx.state.portal.id;
        const result = await portalDtoService.getPortalLayoutMappings(portalId);
        ctx.successRes(result);
      } catch (err) {
        console.log(err);
        ctx.errorRes(err);
      }
    }
  });

  updatePortalCustomFields = this.command({
    h: async (ctx) => {
      try {
        const validate = async (appCmds) => {
          const cmd1 = {
            cmdNum: APP_CMD.UPDATE_PORTAL_SETTINGS
          };
          const validCmdsOrder = [cmd1];
          await this.validateCmds(appCmds, validCmdsOrder);
        };
        
        const msg = ctx.state.msg;
        await portalCmdHandler.process(msg, ctx, validate);
        ctx.successRes();

      } catch (err) {
        ctx.errorRes(err);
      }
    }
  });

  updatePortalAttributeMappings = this.command({
    h: async (ctx) => {
      try {
        const validate = async (appCmds) => {
          const updatePortalAttributeMappings = {
            cmdNum: APP_CMD.UPDATE_ATTRIBUTE_SETTINGS
          };
          
          const validCmdsOrder = [updatePortalAttributeMappings];
          
          await this.validateCmds(appCmds, validCmdsOrder);
        };
        
        const msg = ctx.state.msg;
        await portalCmdHandler.process(msg, ctx, validate);

        ctx.successRes();

      } catch (err) {
        ctx.errorRes(err);
      }
    }
  });

  updatePortalLayoutMappings = this.command({
    h: async (ctx) => {
      try {

        const validate = async (appCmds) => {
          const updatePortalLayoutMappings = {
            cmdNum: APP_CMD.UPDATE_LAYOUT_SETTINGS
          };
          const validCmdsOrder = [updatePortalLayoutMappings];
          await this.validateCmds(appCmds, validCmdsOrder);
        };
        
        const msg = ctx.state.msg;
        await portalCmdHandler.process(msg, ctx, validate);
        ctx.successRes();

      } catch (err) {
        ctx.errorRes(err);
      }
    }
  });

}

const portalCtrl = new PortalController();

module.exports = portalCtrl;