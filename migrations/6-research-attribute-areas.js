require("babel-core/register")({
  "presets": [
    ["env", {
      "targets": {
        "node": true
      }
    }]
  ]
});
const config = require('./../config');

const mongoose = require('mongoose');
const bluebird = require('bluebird');
const TenantProfile = require('./../schemas/tenant');

const deipRpc = require('@deip/rpc-client');
const RESEARCH_ATTRIBUTE_TYPE = require('./../constants/researchAttributeTypes').default;
const RESEARCH_ATTRIBUTE_AREA = require('./../constants/researchAttributeArea').default;


deipRpc.api.setOptions({ url: config.DEIP_FULL_NODE_URL });
deipRpc.config.set('chain_id', config.CHAIN_ID);
mongoose.connect(config.DEIP_MONGO_STORAGE_CONNECTION_URL);


const run = async () => {
  const MULTI_SELECT = "multi-select";

  const tenantPromises = [];
  const tenants = await TenantProfile.find({});

  for (let i = 0; i < tenants.length; i++) {
    let tenantProfile = tenants[i];

    for (let j = 0; j < tenantProfile.settings.researchAttributes.length; j++) {
      let attr = tenantProfile.settings.researchAttributes[j];

      if (attr.type == RESEARCH_ATTRIBUTE_TYPE.STEPPER) {
        attr.areas = [RESEARCH_ATTRIBUTE_AREA.SIDEBAR, RESEARCH_ATTRIBUTE_AREA.CARD];
      } else if (attr.type == RESEARCH_ATTRIBUTE_TYPE.PARTNERS || attr.type == RESEARCH_ATTRIBUTE_TYPE.SELECT || attr.type == MULTI_SELECT) {
        attr.areas = [RESEARCH_ATTRIBUTE_AREA.SIDEBAR];
      } else {
        attr.areas = [RESEARCH_ATTRIBUTE_AREA.MAIN];
      }

      attr.order = j + 1;
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


