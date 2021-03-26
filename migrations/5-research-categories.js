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
const Research = require('./../schemas/research');

const deipRpc = require('@deip/rpc-client');
const RESEARCH_ATTRIBUTE_TYPE = require('./../constants/researchAttributeTypes').default;


deipRpc.api.setOptions({ url: config.DEIP_FULL_NODE_URL });
deipRpc.config.set('chain_id', config.CHAIN_ID);
mongoose.connect(config.DEIP_MONGO_STORAGE_CONNECTION_URL);


const run = async () => {
  const MULTI_SELECT = "multi-select";

  const tenantPromises = [];
  const tenants = await TenantProfile.find({});
  
  const categoriesAttribute = {
    _id: mongoose.Types.ObjectId("5f68be1d54f1da26e538b996"),
    type: MULTI_SELECT,
    isVisible: true,
    isEditable: true,
    isFilterable: true,
    title: "Categories",
    shortTitle: "Categories",
    description: "",
    valueOptions: [],
    defaultValue: null
  };


  for (let i = 0; i < tenants.length; i++) {
    let tenantProfile = tenants[i];

    for (let j = 0; j < tenantProfile.settings.researchCategories.length; j++) {
      let cat = tenantProfile.settings.researchCategories[j];

      categoriesAttribute.valueOptions.push({
        "value" : cat._id,
        "title" : cat.text,
        "shortTitle" : cat.text,
        "description" : ""
      });
    }

    tenantProfile.settings.researchAttributes.push(categoriesAttribute);
    tenantPromises.push(tenantProfile.save());
  }
  
  
  const researchPromises = [];
  const researches = await Research.find({});

  for (let i = 0; i < researches.length; i++) {
    let research = researches[i];
    
    if (research.tenantCategory) {
      let opt = categoriesAttribute.valueOptions.find(c => c.value.toString() == research.tenantCategory._id.toString());
      
      research.attributes.push({
        value: [opt.value],
        researchAttributeId: categoriesAttribute._id
      });
    }

    researchPromises.push(research.save());
  }

  await Promise.all(tenantPromises);
  await Promise.all(researchPromises);

  await Research.update({}, { $unset: { "tenantCategory": "" } }, { multi: true });
  await TenantProfile.update({}, { $unset: { "settings.researchCategories": "" } }, { multi: true });

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


