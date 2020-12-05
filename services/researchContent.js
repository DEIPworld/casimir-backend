import deipRpc from '@deip/rpc-client';
import ResearchContent from './../schemas/researchContent';
import { RESEARCH_CONTENT_STATUS } from './../constants';


class ResearchContentService {

  constructor() { }

  async mapResearchContents(chainResearchContents) {
    const researchContents = await ResearchContent.find({ _id: { $in: chainResearchContents.map(r => r.external_id) } });

    return chainResearchContents
      .map((chainResearchContent) => {
        const researchContentRef = researchContents.find(r => r._id.toString() == chainResearchContent.external_id);
        return { ...chainResearchContent, researchContentRef: researchContentRef ? researchContentRef.toObject() : null };
      })
      .map((researchContent) => {
        const override = researchContent.researchContentRef ? { title: researchContent.researchContentRef.title } : { title: "Not specified" };
        return { ...researchContent, ...override };
      });
  }

  async getResearchContent(researchContentExternalId) {
    const chainResearchContent = await deipRpc.api.getResearchContentAsync(researchContentExternalId);
    if (!chainResearchContent) return null;
    const result = await this.mapResearchContents([chainResearchContent]);
    const [researchContent] = result;
    return researchContent;
  }

  async getResearchContents(researchContentExternalIds) {
    const chainResearchContents = await deipRpc.api.getResearchContentsAsync(researchContentExternalIds);
    const researchContents = await this.mapResearchContents(chainResearchContents);
    return researchContents;
  }

  async getResearchContentsByResearch(researchExternalId) {
    const chainResearchContents = await deipRpc.api.getResearchContentsByResearchAsync(researchExternalId);
    const researchContents = await this.mapResearchContents(chainResearchContents);
    return researchContents;
  }

  async findPublishedResearchContentRefsByResearch(researchExternalId) {
    let result = await ResearchContent.find({ researchExternalId, status: RESEARCH_CONTENT_STATUS.PUBLISHED });
    return [...result.map(rc => rc.toObject())];
  }

  async findDraftResearchContentRefsByResearch(researchExternalId) {
    let result = await ResearchContent.find({ researchExternalId, $or: [{ status: RESEARCH_CONTENT_STATUS.IN_PROGRESS }, { status: RESEARCH_CONTENT_STATUS.PROPOSED }] });
    return [...result.map(rc => rc.toObject())];
  }

  async findResearchContentRefById(externalId) {
    let result = await ResearchContent.findOne({ _id: externalId });
    return result;
  }

  async removeResearchContentRefById(externalId) {
    let result = await ResearchContent.deleteOne({ _id: externalId });
    return result;
  }

  async findResearchContentRefByHash(researchExternalId, hash) {
    const rc = await ResearchContent.findOne({ researchExternalId, hash });
    return rc;
  }

  async removeResearchContentRefByHash(researchExternalId, hash) {
    const result = await ResearchContent.deleteOne({ researchExternalId, hash });
    return result;
  }

  async createResearchContentRef({
    externalId,
    researchExternalId,
    researchGroupExternalId,
    folder,
    researchId, // legacy internal id
    title,
    hash,
    algo,
    type,
    status,
    packageFiles,
    authors,
    references,
    foreignReferences
  }) {

    const researchContent = new ResearchContent({
      _id: externalId,
      researchExternalId,
      researchGroupExternalId,
      folder,
      researchId, // legacy internal id
      title,
      hash,
      algo,
      type,
      status,
      packageFiles,
      authors,
      references,
      foreignReferences
    });

    return researchContent.save();
  }


  async updateResearchContentRef(externalId, {
    folder,
    title,
    hash,
    algo,
    type,
    status,
    packageFiles,
    authors,
    references,
    foreignReferences
  }) {

    const researchContent = await ResearchContent.findOne({ _id: externalId });

    researchContent.folder = folder || researchContent.folder;
    researchContent.title = title || researchContent.title;
    researchContent.hash = hash || researchContent.hash;
    researchContent.algo = algo || researchContent.algo;
    researchContent.type = type || researchContent.type;
    researchContent.status = status || researchContent.status;
    researchContent.packageFiles = packageFiles || researchContent.packageFiles;
    researchContent.authors = authors || researchContent.authors;
    researchContent.references = references || researchContent.references;
    researchContent.foreignReferences = foreignReferences || researchContent.foreignReferences;

    return researchContent.save();
  }


  async lookupContentProposal(researchGroup, hash) {
    const proposals = await deipRpc.api.getProposalsByCreatorAsync(researchGroup);
    const content = proposals.find(p => {
      const [op_name, op_payload] = p['proposed_transaction']['operations'][0];
      let tag = deipRpc.operations.getOperationTag(op_name);
      return tag == deipRpc.operations.getOperationTag("create_research_content") && op_payload.content == hash;
    });
    return content;
  }

  proposalIsNotExpired(proposal) { return proposal != null; }

}

export default ResearchContentService;