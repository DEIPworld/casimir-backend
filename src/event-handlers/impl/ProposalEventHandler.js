import BaseEventHandler from './../base/BaseEventHandler';
import APP_EVENT from './../../events/base/AppEvent';
import APP_PROPOSAL_EVENT from './../../events/base/AppProposalEvent';
import { TeamDtoService, DraftService, ProposalService } from './../../services';
import config from './../../config';
import { ChainService } from '@deip/chain-service';
import { RESEARCH_CONTENT_STATUS } from './../../constants';


class ProposalEventHandler extends BaseEventHandler {

  constructor() {
    super();
  }

}

const proposalEventHandler = new ProposalEventHandler();

const proposalService = new ProposalService();
const teamDtoService = new TeamDtoService();
const draftService = new DraftService();


proposalEventHandler.register(APP_EVENT.PROPOSAL_CREATED, async (event) => {
  const { proposalId, creator, status, proposalCmd, type } = event.getEventPayload();
  const chainService = await ChainService.getInstanceAsync(config);
  const chainApi = chainService.getChainApi();

  // This handler should be replaced with handlers for multisig transactions below

  // Currently this collection includes 'personal' spaces that are being created for every standalone user.
  // We should replace this call after removing 'personal' spaces from domain logic
  const chainProposal = await chainApi.getProposalStateAsync(proposalId);
  const teams = await teamDtoService.getTeams(chainProposal.required_approvals);
  const tenantIdsScope = teams.reduce((acc, item) => {
    return acc.some(id => id == item.tenantId) ? acc : [...acc, item.tenantId];
  }, []);

  let details = {}; // TEMP support for legacy 'details' field, must be removed after schema separation
  const ProposalCreatedHookEvent = APP_PROPOSAL_EVENT[type]['CREATED'];
  if (ProposalCreatedHookEvent) {
    const proposedCmds = proposalCmd.getProposedCmds();
    const typedEvent = new ProposalCreatedHookEvent({
      proposalCmd: proposalCmd,
      proposalCtx: { proposalId, type, proposedCmds }
    });
    details = typedEvent.getEventPayload();
  } 

  await proposalService.createProposal({
    proposalId: proposalId,
    proposalCmd: proposalCmd,
    status: status,
    type: type,
    details: details,
    tenantIdsScope: tenantIdsScope,
    creator: creator
  });
  
});

proposalEventHandler.register(APP_EVENT.PROPOSAL_UPDATED, async (event) => {
  const { proposalId, status } = event.getEventPayload();
  const proposal = await proposalService.updateProposal(proposalId, {
    status: status
  });
});

proposalEventHandler.register(APP_EVENT.PROPOSAL_DECLINED, async (event) => {
  const { proposalId, status } = event.getEventPayload();
  const proposal = await proposalService.updateProposal(proposalId, {
    status: status
  });
});

proposalEventHandler.register(APP_EVENT.TEAM_INVITE_CREATED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.PROJECT_PROPOSAL_CREATED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.PROJECT_UPDATE_PROPOSAL_CREATED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.TEAM_UPDATE_PROPOSAL_ACCEPTED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.TEAM_UPDATE_PROPOSAL_CREATED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.TEAM_UPDATE_PROPOSAL_DECLINED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.PROJECT_TOKEN_SALE_PROPOSAL_CREATED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.PROJECT_TOKEN_SALE_PROPOSAL_ACCEPTED, async (event) => {
  // TODO: create multisig transaction read schema
});

proposalEventHandler.register(APP_EVENT.PROJECT_TOKEN_SALE_PROPOSAL_DECLINED, async (event) => {
  // TODO: create multisig transaction read schema
});

module.exports = proposalEventHandler;