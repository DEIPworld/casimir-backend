import BaseEventHandler from './../base/BaseEventHandler';
import crypto from '@deip/lib-crypto';
import APP_EVENT from './../../events/base/AppEvent';
import { RESEARCH_STATUS, TOKEN_SALE_STATUS, RESEARCH_ATTRIBUTE } from './../../constants';
import { ProjectService } from './../../services';
import { TextEncoder } from 'util';
import config from './../../config';
import { ChainService } from '@deip/chain-service';

class ProjectEventHandler extends BaseEventHandler {

  constructor() {
    super();
  }

}

const projectEventHandler = new ProjectEventHandler();

const projectService = new ProjectService();


projectEventHandler.register(APP_EVENT.PROJECT_CREATED, async (event) => {
  const {
    projectId,
    teamId,
    description,
    attributes,
    status,
    isDefault
  } = event.getEventPayload();

  await projectService.createProject({
    projectId: projectId,
    teamId: teamId,
    attributes: attributes,
    status: status,
    isDefault: isDefault
  });

});


projectEventHandler.register(APP_EVENT.PROJECT_UPDATED, async (event) => {
  const {
    projectId,
    attributes
  } = event.getEventPayload();

  await projectService.updateProject(projectId, {
    attributes: attributes
  });
});


projectEventHandler.register(APP_EVENT.PROJECT_DELETED, async (event) => {
  const {
    projectId
  } = event.getEventPayload();

  await projectService.updateProject(projectId, { status: RESEARCH_STATUS.DELETED });

});


projectEventHandler.register(APP_EVENT.PROJECT_MEMBER_JOINED, async (event) => {
  // TODO: handle project read schema
});


projectEventHandler.register(APP_EVENT.PROJECT_MEMBER_LEFT, async (event) => {
  // TODO: handle project read schema
});


projectEventHandler.register(APP_EVENT.ATTRIBUTE_UPDATED, async (event) => {
  const { attribute } = event.getEventPayload();
  await projectService.updateAttributeInResearches({
    attributeId: attribute._id,
    type: attribute.type,
    valueOptions: attribute.valueOptions,
    defaultValue: attribute.defaultValue || null
  });
});


projectEventHandler.register(APP_EVENT.ATTRIBUTE_DELETED, async (event) => {
  const { attributeId } = event.getEventPayload();

  await projectService.removeAttributeFromResearches({
    attributeId
  });
});

projectEventHandler.register(APP_EVENT.PROJECT_TOKEN_SALE_CREATED, async (event) => {
  const { projectId } = event.getEventPayload();

  const project = await projectService.getProject(projectId);
  const investmentOpportunityAttr = project.attributes.find(rAttr => rAttr.attributeId.toString() == RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY.toString());

  let hasUpdate = false;
  if (!investmentOpportunityAttr) {
    project.attributes.push({
      attributeId: RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY,
      value: true
    });
    hasUpdate = true;
  } else if (!investmentOpportunityAttr.value) {
    investmentOpportunityAttr.value = true;
    hasUpdate = true;
  }

  if (hasUpdate) {
    await projectService.updateProject(project._id, { attributes: project.attributes });
  }

});

projectEventHandler.register(APP_EVENT.PROJECT_TOKEN_SALE_CONTRIBUTED, async (event) => {
  const { tokenSaleId } = event.getEventPayload();
  const chainService = await ChainService.getInstanceAsync(config);
  const chainApi = chainService.getChainApi();
  const projectTokenSale = await chainApi.getProjectTokenSaleAsync(tokenSaleId);

  const project = await projectService.getProject(projectTokenSale.research_external_id);
  
  if (projectTokenSale.status != TOKEN_SALE_STATUS.ACTIVE) {
    const investmentOpportunityAttr = project.attributes.find(rAttr => rAttr.attributeId.toString() == RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY.toString());
    let hasUpdate = false;

    if (!investmentOpportunityAttr) {
      project.attributes.push({
        attributeId: RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY,
        value: false
      });
      hasUpdate = true;
    } else if (investmentOpportunityAttr.value) {
      investmentOpportunityAttr.value = false;
      hasUpdate = true;
    }

    if (hasUpdate) {
      await projectService.updateProject(project._id, { attributes: project.attributes });
    }
  }
});

module.exports = projectEventHandler;