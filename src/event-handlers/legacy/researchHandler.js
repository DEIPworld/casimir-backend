import EventEmitter from 'events';
import deipRpc from '@deip/rpc-client';
import { LEGACY_APP_EVENTS, PROPOSAL_STATUS, ATTRIBUTE_TYPE, RESEARCH_STATUS, USER_INVITE_STATUS, RESEARCH_ATTRIBUTE, TOKEN_SALE_STATUS, ATTRIBUTE_SCOPE } from './../../constants';
import { handle, fire, wait } from './utils';
import ProjectDtoService from './../../services/impl/read/ProjectDtoService';
import ProjectDomainService from './../../services/impl/write/ProjectDomainService';

import ProposalService from './../../services/impl/read/ProposalDtoService';
import UserService from './../../services/users';
import UserInviteService from './../../services/userInvites';
import AttributesService from './../../services/attributes'


class ResearchHandler extends EventEmitter { }

const researchHandler = new ResearchHandler();

const projectDomainService = new ProjectDomainService();

researchHandler.on(LEGACY_APP_EVENTS.RESEARCH_UPDATED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchUpdatedEvent } = source;
  
  const projectDtoService = new ProjectDtoService();
  const { researchExternalId, source: { offchain: { attributes } } } = researchUpdatedEvent.getSourceData();

  if (attributes) {
    await projectDomainService.updateProject(researchExternalId, { attributes });
  }

  const updatedResearch = await projectDtoService.getResearch(researchExternalId)
  return updatedResearch;
}));


researchHandler.on(LEGACY_APP_EVENTS.RESEARCH_UPDATE_PROPOSED, (payload, reply) => handle(payload, reply, async ({ event: researchUpdateProposedEvent }) => {
  const projectDtoService = new ProjectDtoService();
  const { researchExternalId } = researchUpdateProposedEvent.getSourceData();
  const updatedResearch = await projectDtoService.getResearch(researchExternalId)
  return updatedResearch;
}));


researchHandler.on(LEGACY_APP_EVENTS.RESEARCH_UPDATE_PROPOSAL_SIGNED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchUpdateProposalSignedEvent } = source;

  const projectDtoService = new ProjectDtoService();
  const proposalsService = new ProposalService();

  const proposalId = researchUpdateProposalSignedEvent.getProposalId();

  const proposal = await proposalsService.getProposal(proposalId);
  const { status } = proposal.proposal;
  const { researchExternalId, source: { offchain: { attributes } } } = proposal.details;

  if (status == PROPOSAL_STATUS.APPROVED) {
    await projectDomainService.updateProject(researchExternalId, {
      attributes: attributes
    });
  }

  const updatedResearch = await projectDtoService.getResearch(researchExternalId);
  return updatedResearch;
}));



researchHandler.on(LEGACY_APP_EVENTS.USER_INVITATION_PROPOSAL_REJECTED, (payload, reply) => handle(payload, reply, async (event) => {
  const { event: userInvitationProposalRejectedEvent } = event;

  const usersService = new UserService();
  const projectDtoService = new ProjectDtoService();
  const userInviteService = new UserInviteService();

  const proposalId = userInvitationProposalRejectedEvent.getProposalId();
  const invite = await userInviteService.findUserInvite(proposalId);
  const members = await usersService.getUsersByResearchGroup(invite.researchGroupExternalId);

  if (!members.some(user => user.account.name == invite.invitee)) { // check if rejecting old invite

    const researches = [];
    if (invite.researches != null) {
      const result = await projectDtoService.getResearches(invite.researches.map(r => r.externalId));
      researches.push(...result);
    }

    const promises = [];
    for (let i = 0; i < researches.length; i++) {
      const research = researches[i];

      let hasUpdate = false;
      
      const researchInvite = invite.researches.find(r => r.externalId == research.external_id);

      if (researchInvite) {
        for (let j = 0; j < researchInvite.attributes.length; j++) {
          const attributeId = researchInvite.attributes[j];
          const rAttr = research.researchRef.attributes.find(rAttr => rAttr.attributeId.toString() == attributeId.toString());
          if (rAttr.value.some(m => m == invite.invitee)) {
            rAttr.value = rAttr.value.filter(m => m != invite.invitee);
            hasUpdate = true;
          }
        }
      }

      if (hasUpdate) {
        promises.push(projectDomainService.updateProject(research.external_id, { attributes: research.researchRef.attributes }));
      }
    }

    await Promise.all(promises);
  }
}));



researchHandler.on(LEGACY_APP_EVENTS.USER_RESIGNATION_PROPOSAL_SIGNED, (payload, reply) => handle(payload, reply, async (event) => {
  const { event: userResignationProposalSignedEvent, tenant } = event;

  const projectDtoService = new ProjectDtoService();
  const proposalsService = new ProposalService();
  const attributesService = new AttributesService();

  const proposalId = userResignationProposalSignedEvent.getProposalId();
  const proposal = await proposalsService.getProposal(proposalId);
  const { member, researchGroupExternalId } = proposal.details;

  const researchAttributes = await attributesService.getAttributesByScope(ATTRIBUTE_SCOPE.RESEARCH);

  const researches = await projectDtoService.getResearchesByResearchGroup(researchGroupExternalId);

  const promises = [];
  for (let i = 0; i < researches.length; i++) {
    const research = researches[i];

    let hasUpdate = false;

    const membersAttributes = researchAttributes.filter(attr => attr.type == ATTRIBUTE_TYPE.USER);
    for (let j = 0; j < membersAttributes.length; j++) {
      const membersAttribute = membersAttributes[j];
      const rAttr = research.researchRef.attributes.find(rAttr => rAttr.attributeId.toString() == membersAttribute._id.toString());

      if (rAttr.value.some(m => m == member)) {
        rAttr.value = rAttr.value.filter(m => m != member);
        hasUpdate = true;
      }
    }

    if (hasUpdate) {
      promises.push(projectDomainService.updateProject(research.external_id, { attributes: research.researchRef.attributes }));
    }
  }

  await Promise.all(promises);

}));

researchHandler.on(LEGACY_APP_EVENTS.RESEARCH_TOKEN_SALE_CREATED, (payload, reply) => handle(payload, reply, async (event) => {
  const { event: researchTokenSaleCreatedEvent } = event;
  const projectDtoService = new ProjectDtoService();

  const { researchExternalId } = researchTokenSaleCreatedEvent.getSourceData();

  const research = await projectDtoService.getResearch(researchExternalId);
  const investmentOpportunityAttr = research.researchRef.attributes.find(rAttr => rAttr.attributeId.toString() == RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY.toString());

  let hasUpdate = false;
  if (!investmentOpportunityAttr) {
    research.researchRef.attributes.push({
      attributeId: RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY,
      value: true
    });
    hasUpdate = true;
  } else if (!investmentOpportunityAttr.value) {
    investmentOpportunityAttr.value = true;
    hasUpdate = true;
  }

  if (hasUpdate) {
    await projectDomainService.updateProject(research.external_id, { attributes: research.researchRef.attributes });
  }

}));



researchHandler.on(LEGACY_APP_EVENTS.RESEARCH_TOKEN_SALE_PROPOSAL_SIGNED, (payload, reply) => handle(payload, reply, async (event) => {
  const { event: researchTokenSaleProposalSignedEvent } = event;
  
  const projectDtoService = new ProjectDtoService();
  const proposalsService = new ProposalService();

  const proposalId = researchTokenSaleProposalSignedEvent.getProposalId();
  const proposal = await proposalsService.getProposal(proposalId);
  const { researchExternalId } = proposal.details;

  const research = await projectDtoService.getResearch(researchExternalId);
  const investmentOpportunityAttr = research.researchRef.attributes.find(rAttr => rAttr.attributeId.toString() == RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY.toString());

  let hasUpdate = false;

  if (!investmentOpportunityAttr) {
    research.researchRef.attributes.push({
      attributeId: RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY,
      value: true
    });
    hasUpdate = true;
  } else if (!investmentOpportunityAttr.value) {
    investmentOpportunityAttr.value = true;
    hasUpdate = true;
  }

  if (hasUpdate) {
    await projectDomainService.updateProject(research.external_id, { attributes: research.researchRef.attributes });
  }

}));


researchHandler.on(LEGACY_APP_EVENTS.RESEARCH_TOKEN_SALE_CONTRIBUTED, (payload, reply) => handle(payload, reply, async (event) => {
  const { event: researchTokenSaleContributedEvent } = event;
  const projectDtoService = new ProjectDtoService();

  const { tokenSaleExternalId } = researchTokenSaleContributedEvent.getSourceData();
  const researchTokenSale = await deipRpc.api.getResearchTokenSaleAsync(tokenSaleExternalId);

  const research = await projectDtoService.getResearch(researchTokenSale.research_external_id);
  
  if (researchTokenSale.status != TOKEN_SALE_STATUS.ACTIVE) {
    const investmentOpportunityAttr = research.researchRef.attributes.find(rAttr => rAttr.attributeId.toString() == RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY.toString());
    let hasUpdate = false;

    if (!investmentOpportunityAttr) {
      research.researchRef.attributes.push({
        attributeId: RESEARCH_ATTRIBUTE.INVESTMENT_OPPORTUNITY,
        value: false
      });
      hasUpdate = true;
    } else if (investmentOpportunityAttr.value) {
      investmentOpportunityAttr.value = false;
      hasUpdate = true;
    }

    if (hasUpdate) {
      await projectDomainService.updateProject(research.external_id, { attributes: research.researchRef.attributes });
    }
  }


}));


export default researchHandler;