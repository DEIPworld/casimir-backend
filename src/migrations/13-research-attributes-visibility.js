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
  const RESEARCH_GROUPS_LIST = "research-groups-list";
  const DISCIPLINES_LIST = "disciplines-list";

  const tenantPromises = [];
  const tenants = await TenantProfile.find({});

  for (let i = 0; i < tenants.length; i++) {
    let tenantProfile = tenants[i];

    tenantProfile.researchCategories = undefined;
    tenantProfile.researchComponents = undefined;

    for (let j = 0; j < tenantProfile.settings.researchAttributes.length; j++) {
      let researchAttribute = tenantProfile.settings.researchAttributes[j];

      researchAttribute.isPublished = researchAttribute.isVisible;

      researchAttribute.isVisible = undefined
      researchAttribute.isBlockchainMeta = undefined;
      researchAttribute.component = undefined;

      if (researchAttribute.type == RESEARCH_GROUPS_LIST || researchAttribute.type == ATTR_TYPES.RESEARCH_GROUP) {
        researchAttribute.isHidden = true;
      } else {
        researchAttribute.isHidden = false;
      }

      if (researchAttribute.type == DISCIPLINES_LIST || researchAttribute.type == ATTR_TYPES.DISCIPLINE || researchAttribute.type == RESEARCH_GROUPS_LIST || researchAttribute.type == ATTR_TYPES.RESEARCH_GROUP) {
        researchAttribute.isEditable = false;
      } else {
        researchAttribute.isEditable = true;
      }
    }

    for (let j = 0; j < tenantProfile.settings.faq.length; j++) {
      let qa = tenantProfile.settings.faq[j];
      qa.isPublished = qa.isVisible;
      qa.isVisible = undefined;
    }

    tenantPromises.push(tenantProfile.save());
  }

  await Promise.all(tenantPromises);

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


