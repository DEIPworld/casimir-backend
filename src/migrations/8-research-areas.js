require("@babel/register")({
  "presets": [
    [
      "@babel/env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ]
});

const config = require('./../config');

const mongoose = require('mongoose');
const TenantProfile = require('./../schemas/tenant');

const { ATTR_TYPES } = require('@deip/constants');

mongoose.connect(config.DEIP_MONGO_STORAGE_CONNECTION_URL);


const run = async () => {
  const MULTI_SELECT = "multi-select";

  const tenantsPromises = [];
  const tenants = await TenantProfile.find({});

  for (let i = 0; i < tenants.length; i++) {
    let tenantProfile = tenants[i];

    let researchDetailsRightSidebar = [];
    let researchCard = [];
    let researchDetailsMain = [];

    for (let j = 0; j < tenantProfile.settings.researchAttributes.length; j++) {
      let researchAttribute = tenantProfile.settings.researchAttributes[j];

      if (researchAttribute.type == ATTR_TYPES.STEPPER) {
        researchDetailsRightSidebar.push(researchAttribute._id);
        researchCard.push(researchAttribute._id)
      }

      if (researchAttribute.type == ATTR_TYPES.TEXT || researchAttribute.type == ATTR_TYPES.TEXTAREA) {
        researchDetailsMain.push(researchAttribute._id)
      }

      if (researchAttribute.type == ATTR_TYPES.SELECT || researchAttribute.type == MULTI_SELECT) {
        researchDetailsRightSidebar.push(researchAttribute._id);
      }

      if (researchAttribute.type == ATTR_TYPES.URL || researchAttribute.type == ATTR_TYPES.VIDEO_URL) {
        researchDetailsMain.push(researchAttribute._id);
      }

      if (researchAttribute.type == ATTR_TYPES.SWITCH || researchAttribute.type == ATTR_TYPES.CHECKBOX) {
        researchDetailsRightSidebar.push(researchAttribute._id);
        researchCard.push(researchAttribute._id)
      }

      if (researchAttribute.type == ATTR_TYPES.ROADMAP) {
        researchDetailsMain.push(researchAttribute._id);
      }

      if (researchAttribute.type == ATTR_TYPES.PARTNERS) {
        researchDetailsRightSidebar.push(researchAttribute._id);
      }
    }

    let researchAttributesAreas = {
      researchDetailsRightSidebar: researchDetailsRightSidebar,
      researchDetailsBody: researchDetailsMain,
      researchCard: researchCard,
      researchDetailsHeader: [],
      researchForm: []
    }

    tenantProfile.settings.researchAttributesAreas = researchAttributesAreas;
    tenantsPromises.push(tenantProfile.save());
  }

  await Promise.all(tenantsPromises);

  await TenantProfile.update({}, { $unset: { "settings.researchAttributes.$[].areas": "" } }, { multi: true });
  await TenantProfile.update({}, { $unset: { "settings.researchAttributes.$[].order": "" } }, { multi: true });

};

run()
  .then(() => {
    console.log('Successfully finished');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


