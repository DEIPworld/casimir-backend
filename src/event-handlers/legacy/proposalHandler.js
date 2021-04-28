import EventEmitter from 'events';
import deipRpc from '@deip/rpc-client';
import { APP_PROPOSAL } from '@deip/command-models';
import { LEGACY_APP_EVENTS } from './../../constants';
import { handle, fire, wait } from './utils';
import ResearchGroupService from './../../services/researchGroup';
import ProposalDtoService from './../../services/impl/read/ProposalDtoService';
import UserService from './../../services/users';


class ProposalHandler extends EventEmitter { }

const proposalHandler = new ProposalHandler();

const usersService = new UserService({ scoped: false });
const researchGroupService = new ResearchGroupService({ scoped: false });
const proposalDtoService = new ProposalDtoService({ scoped: false });

async function createProposalDto(event, chainContractType) {

  const proposalId = event.getProposalId();
  const eventModel = event.getSourceData();
  const chainProposal = await deipRpc.api.getProposalStateAsync(proposalId);

  const chainAccounts = await deipRpc.api.getAccountsAsync(chainProposal.required_approvals);

  const researchGroupsNames = chainAccounts.filter(a => a.is_research_group).map(a => a.name);
  const usersNames = chainAccounts.filter(a => !a.is_research_group).map(a => a.name);

  const involvedUsers = await usersService.getUsers(usersNames);
  const involvedResearchGroups = await researchGroupService.getResearchGroups(researchGroupsNames);

  const multiTenantIds = [...involvedUsers, ...involvedResearchGroups].reduce((acc, item) => {
    if (!acc.some(id => id == item.tenantId)) {
      acc.push(item.tenantId);
    }
    return acc;
  }, []);
  
  const proposalRef = await proposalDtoService.createProposalDto(proposalId, {
    type: chainContractType,
    details: {
      ...eventModel
    },
    multiTenantIds: multiTenantIds
  });

  return proposalRef;
}

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchProposedEvent } = source;
  const proposalRef = await createProposalDto(researchProposedEvent, APP_PROPOSAL.PROJECT_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_UPDATE_PROPOSED, (payload, reply) => handle(payload, reply, async ({ event: researchUpdateProposedEvent }) => {
  const proposalRef = await createProposalDto(researchUpdateProposedEvent, APP_PROPOSAL.PROJECT_UPDATE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.ASSET_EXCHANGE_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: assetExchangeProposedEvent } = source;
  const proposalRef = await createProposalDto(assetExchangeProposedEvent, APP_PROPOSAL.ASSET_EXCHANGE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.ASSET_TRANSFER_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: assetTransferProposedEvent } = source;
  const proposalRef = await createProposalDto(assetTransferProposedEvent, APP_PROPOSAL.ASSET_TRANSFER_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_GROUP_UPDATE_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchGroupUpdateProposedEvent } = source;
  const proposalRef = await createProposalDto(researchGroupUpdateProposedEvent, APP_PROPOSAL.TEAM_UPDATE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_CONTENT_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchContentProposedEvent } = source;
  const proposalRef = await createProposalDto(researchContentProposedEvent, APP_PROPOSAL.PROJECT_CONTENT_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_TOKEN_SALE_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchTokenSaleProposedEvent } = source;
  const proposalRef = await createProposalDto(researchTokenSaleProposedEvent, APP_PROPOSAL.PROJECT_FUNDRASE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_EXPRESS_LICENSE_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchExpressLicenseProposedEvent } = source;
  const proposalRef = await createProposalDto(researchExpressLicenseProposedEvent, APP_PROPOSAL.EXPRESS_LICENSE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.USER_INVITATION_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: userInvitationProposedEvent } = source;
  const proposalRef = await createProposalDto(userInvitationProposedEvent, APP_PROPOSAL.PROJECT_INVITE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.USER_RESIGNATION_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: userResignationProposedEvent } = source;
  const proposalRef = await createProposalDto(userResignationProposedEvent, APP_PROPOSAL.PROJECT_LEAVE_PROPOSAL);
  return proposalRef;
}));

proposalHandler.on(LEGACY_APP_EVENTS.RESEARCH_NDA_PROPOSED, (payload, reply) => handle(payload, reply, async (source) => {
  const { event: researchNdaProposedEvent } = source;
  const proposalRef = await createProposalDto(researchNdaProposedEvent, APP_PROPOSAL.PROJECT_NDA_PROPOSAL);
  return proposalRef;
}));

export default proposalHandler;