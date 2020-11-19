import deipRpc from '@deip/rpc-client';
import mongoose from 'mongoose';
import ProposalRef from './../schemas/proposal';
import { PROPOSAL_TYPE } from './../constants';

class ProposalService {

  constructor(usersService, researchGroupService, researchService) {
    this.usersService = usersService;
    this.researchService = researchService;
    this.researchGroupService = researchGroupService;
  }

  async mapProposals(chainProposals, extended = true) {

    const proposalsRefs = await this.getProposalRefs(chainProposals.map(p => p.external_id));
    const names = chainProposals.reduce((names, chainProposal) => {

      if (!names.some((n) => n == chainProposal.proposer)) {
        names.push(chainProposal.proposer);
      }

      for (let i = 0; i < chainProposal.required_approvals.length; i++) {
        let name = chainProposal.required_approvals[i];
        if (!names.some((n) => n == name)) {
          names.push(name);
        }
      }

      for (let i = 0; i < chainProposal.approvals.length; i++) {
        let [name, txInfo] = chainProposal.approvals[i];
        if (!names.some((n) => n == name)) {
          names.push(name);
        }
      }

      for (let i = 0; i < chainProposal.rejectors.length; i++) {
        let [name, txInfo] = chainProposal.rejectors[i];
        if (!names.some((n) => n == name)) {
          names.push(name);
        }
      }

      return names;
    }, []);


    const chainAccounts = await deipRpc.api.getAccountsAsync(names);
    const chainResearchGroupAccounts = chainAccounts.filter(a => a.is_research_group);
    const chainUserAccounts = chainAccounts.filter(a => !a.is_research_group);

    const researchGroups = await this.researchGroupService.getResearchGroups(chainResearchGroupAccounts.map(a => a.name))
    const users = await this.usersService.getUsers(chainUserAccounts.map(a => a.name));

    const proposals = [];

    for (let i = 0; i < chainProposals.length; i++) {
      let chainProposal = chainProposals[i];
      let proposalRef = proposalsRefs.find(p => p._id == chainProposal.external_id);
      if (!proposalRef) continue;

      let parties = {};
      for (let j = 0; j < chainProposal.required_approvals.length; j++) {
        let party = chainProposal.required_approvals[j];
        let key = `party${j + 1}`;

        let chainAccount = chainAccounts.find(chainAccount => chainAccount.name == party);
        let ownerAuth = chainAccount.active.account_auths.map(([name, threshold]) => name);
        let activeAuth = chainAccount.owner.account_auths.map(([name, threshold]) => name);
        let members = [...ownerAuth, ...activeAuth].reduce((acc, name) => {
          if (!acc.some(n => n == name)) {
            return [...acc, name];
          }
          return [...acc];
        }, []);

        parties[key] = {
          isProposer: party == chainProposal.proposer,
          account: chainAccount.is_research_group ? researchGroups.find(rg => rg.external_id == party) : users.find(user => user.account.name == party),
          signers: [
            ...users.filter((u) => members.some(member => u.account.name == member) || u.account.name == party),
            ...researchGroups.filter((rg) => members.some(member => rg.external_id == member) || rg.external_id == party),
          ]
            .filter((signer) => {
              let id = signer.account.is_research_group ? signer.external_id : signer.account.name;
              return chainProposal.approvals.some(([name, txInfo]) => name == id) || chainProposal.rejectors.some(([name, txInfo]) => name == id);
            })
            .map((signer) => {
              let id = signer.account.is_research_group ? signer.external_id : signer.account.name;

              let approval = chainProposal.approvals.find(([name, txInfo]) => name == id);
              let reject = chainProposal.rejectors.find(([name, txInfo]) => name == id);

              let txInfo = reject ? reject[1] : approval ? approval[1] : null;
              return {
                signer: signer,
                txInfo: txInfo
              }
            })
        }
      }

      proposals.push({
        parties: parties,
        proposal: chainProposal,
        type: proposalRef.type,
        details: proposalRef.details
      })
    }

    if (!extended) return proposals;

    const extendedProposals = await this.extendProposalsDetails(proposals);
    return extendedProposals;
  }


  async extendProposalsDetails(proposals) {
    const result = [];
    const grouped = proposals.reduce((acc, proposal) => {
      acc[proposal.type] = acc[proposal.type] || [];
      acc[proposal.type].push(proposal);
      return acc;
    }, {});

    const licenseRequests = await this.extendExpressLicenseRequests(grouped[PROPOSAL_TYPE.EXPRESS_LICENSE_REQUEST] || []);
    result.push(...licenseRequests);

    return result;
  }


  async extendExpressLicenseRequests(requests) {
    const accountNames = requests.reduce((acc, req) => {
      if (!acc.some(a => a == req.details.requester)) {
        acc.push(req.details.requester);
      }
      return acc;
    }, []);

    const researchExternalIds = requests.reduce((acc, req) => {
      if (!acc.some(r => r == req.details.researchExternalId)) {
        acc.push(req.details.researchExternalId);
      }
      return acc;
    }, []);

    const chainAccounts = await deipRpc.api.getAccountsAsync(accountNames);
    const chainResearches = await deipRpc.api.getResearchesAsync(researchExternalIds);

    const chainResearchGroupAccounts = chainAccounts.filter(a => a.is_research_group);
    const chainUserAccounts = chainAccounts.filter(a => !a.is_research_group);

    // currently we allow to buy the license only for user account
    const users = await this.usersService.getUsers(chainUserAccounts.map(a => a.name));
    const researches = await this.researchService.getResearches(chainResearches.map(r => r.external_id));

    return requests.map((req) => {
      const extendedDetails = {
        requester: users.find(u => u.account.name == req.details.requester),
        research: researches.find(r => r.external_id == req.details.researchExternalId)
      }
      return { ...req, extendedDetails };
    })
  }



  async getProposalRef(externalId) {
    let proposal = await ProposalRef.findOne({ _id: externalId });
    return proposal ? proposal.toObject() : null;
  }

  async getProposalRefs(externalIds) {
    let proposals = await ProposalRef.find({ _id: { $in: externalIds }});
    return proposals.map(p => p.toObject());
  }

  async getProposalRefsByType(status) {
    let proposals = await ProposalRef.find({ status: status });
    return proposals.map(p => p.toObject());
  }

  async createProposalRef(externalId, {
    type,
    details
  }) {

    const proposal = new ProposalRef({
      _id: externalId,
      type: type,
      details: details
    });

    const savedProposal = await proposal.save();
    return savedProposal.toObject();
  }

  async getAccountProposals(username) {
    const chainResearchGroups = await deipRpc.api.getResearchGroupsByMemberAsync(username);
    const signers = [username, ...chainResearchGroups.map(rg => rg.external_id)];
    const allProposals = await deipRpc.api.getProposalsBySignersAsync(signers);
    const chainProposals = allProposals.reduce((unique, chainProposal) => {
      if (unique.some((p) => p.external_id == chainProposal.external_id))
        return unique;
      return [chainProposal, ...unique];
    }, []);

    const result = await this.mapProposals(chainProposals);
    return result;
  }

  async getProposal(externalId) {
    const chainProposal = await deipRpc.api.getProposalStateAsync(externalId);
    if (!chainProposal) return null;
    const result = await this.mapProposals([chainProposal]);
    const [proposal] = result;
    return proposal;
  }

}

export default ProposalService;