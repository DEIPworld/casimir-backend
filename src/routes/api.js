import koa_router from 'koa-router'
import compose from 'koa-compose';
import users from '../controllers/legacy/users'
import joinRequests from '../controllers/legacy/joinRequests'
import reviewRequests from '../controllers/legacy/reviewRequests'
import expertise from '../controllers/legacy/expertise'
import notifications from '../controllers/legacy/notifications'
import proposals from '../controllers/legacy/proposals'
import researchGroups from '../controllers/legacy/researchGroups'
import invites from '../controllers/legacy/invites'
import assets from '../controllers/legacy/assets'
import reviews from '../controllers/legacy/reviews'
import research from '../controllers/legacy/research'
import investmentPortfolio from '../controllers/legacy/investmentPortfolio'
import grants from '../controllers/legacy/grants'
import expressLicensing from '../controllers/legacy/expressLicensing'
import userTransactions from '../controllers/legacy/userTransactions'
import disciplines from '../controllers/legacy/disciplines'
import fundraising from '../controllers/legacy/fundraising'
import tenant from '../controllers/legacy/tenant';
import researchContent from './../controllers/legacy/researchContent';
import researchNda from './../controllers/legacy/researchNda';
import attributes from './../controllers/legacy/attributes';

import { projectsCtrl, proposalsCtrl } from '../controllers';

import * as blockchainService from './../utils/blockchain';
import ResearchContentProposedEvent from './../events/legacy/researchContentProposedEvent';

import researchContentFileReadAuth from './../middlewares/auth/researchContent/readFileAuth';
import researchContentFileUpdateAuth from './../middlewares/auth/researchContent/updateFileAuth';
import researchContentFileCreateAuth from './../middlewares/auth/researchContent/createFileAuth';
import researchContentFileDeleteAuth from './../middlewares/auth/researchContent/deleteFileAuth';
import researchContentFilePublishAuth from './../middlewares/auth/researchContent/publishFileAuth';

import researchAttributeMetaReadAuth from './../middlewares/auth/research/readAttributeMetaAuth';
import researchAttributeMetaUpdateAuth from './../middlewares/auth/research/updateAttributeMetaAuth';

import readGrantAwardWithdrawalRequestAuth from './../middlewares/auth/grantAwardWithdrawalRequest/readGrantAwardWithdrawalRequestAuth';

import userAvatarFileReadAuth from './../middlewares/auth/user/readAvatarFileAuth';
import userAttributeMetaUpdateAuth from '../middlewares/auth/user/updateAttributeMetaAuth';

import researchGroupLogoFileReadAuth from './../middlewares/auth/researchGroup/readLogoFileAuth';
import researchGroupLogoFileUpdateAuth from './../middlewares/auth/researchGroup/updateLogoFileAuth';

const protected_route = koa_router()
const public_route = koa_router()

async function tenantRoute(ctx, next) {
  ctx.state.isTenantRoute = true;
  await next();
}

async function tenantAdminGuard(ctx, next) {
  ctx.assert(ctx.state.isTenantAdmin, 401);
  await next();
}

public_route.get('/user/profile/:username', users.getUserProfile)
public_route.get('/user/profiles', users.getUsersProfiles)
public_route.get('/user/active', users.getActiveUsersProfiles)
public_route.get('/user/name/:username', users.getUser)
public_route.get('/user/email/:email', users.getUserByEmail)
public_route.get('/users', users.getUsers)
public_route.get('/users/listing', users.getUsersListing)
public_route.get('/users/group/:researchGroupExternalId', users.getUsersByResearchGroup)
public_route.get('/users/tenant/:tenantId', users.getUsersByTenant)

protected_route.put('/user/account/:username', users.updateUserAccount)
protected_route.put('/user/profile/:username', compose([userAttributeMetaUpdateAuth({ userEntityId: (ctx) => ctx.request.header['username'] })]), users.updateUserProfile)
public_route.get('/user/avatar/:username', compose([userAvatarFileReadAuth()]), users.getAvatar)
protected_route.get('/user/transactions/:status', userTransactions.getUserTransactions)

protected_route.get('/bookmarks/user/:username', users.getUserBookmarks)
protected_route.post('/bookmarks/user/:username', users.addUserBookmark)
protected_route.delete('/bookmarks/user/:username/remove/:bookmarkId', users.removeUserBookmark)

protected_route.post('/join-requests', joinRequests.createJoinRequest)
protected_route.put('/join-requests', joinRequests.updateJoinRequest)
protected_route.get('/join-requests/group/:researchGroupExternalId', joinRequests.getJoinRequestsByGroup)
protected_route.get('/join-requests/user/:username', joinRequests.getJoinRequestsByUser)

protected_route.post('/review-requests', reviewRequests.createReviewRequest);
protected_route.post('/review-requests/:id/deny', reviewRequests.denyReviewRequest);
protected_route.get('/review-requests/expert/:username', reviewRequests.getReviewRequestsByExpert);
protected_route.get('/review-requests/requestor/:username', reviewRequests.getReviewRequestsByRequestor);


public_route.get('/expertise/user/:username/tokens', expertise.getAccountExpertiseTokens)
public_route.get('/expertise/discipline/:disciplineExternalId/tokens', expertise.getDisciplineExpertiseTokens)

public_route.get('/expertise/user/:username/history', expertise.getAccountEciHistory)
public_route.get('/expertise/user/:username/stats', expertise.getAccountEciStats)
public_route.get('/expertise/users/stats', expertise.getAccountsEciStats)
public_route.get('/expertise/research/:research/history', expertise.getResearchEciHistory)
public_route.get('/expertise/research/:research/stats', expertise.getResearchEciStats)
public_route.get('/expertise/research/stats', expertise.getResearchesEciStats)
public_route.get('/expertise/research-content/:researchContent/history', expertise.getResearchContentEciHistory)
public_route.get('/expertise/research-content/:researchContent/stats', expertise.getResearchContentEciStats)
public_route.get('/expertise/research-content/stats', expertise.getResearchContentsEciStats)
public_route.get('/expertise/disciplines/history', expertise.getDisciplineEciHistory)
public_route.get('/expertise/disciplines/stats-history', expertise.getDisciplinesEciStatsHistory)
public_route.get('/expertise/disciplines/stats', expertise.getDisciplinesEciLastStats)
public_route.get('/expertise/content/:contentId/discipline/:disciplineId/history', expertise.getEciHistoryByResearchContentAndDiscipline)
public_route.get('/expertise/research/:researchId', expertise.getExpertiseContributionsByResearch)
public_route.get('/expertise/research/:researchId/discipline/:disciplineId', expertise.getExpertiseContributionsByResearchAndDiscipline)
public_route.get('/expertise/content/:contentId/discipline/:disciplineId', expertise.getExpertiseContributionByResearchContentAndDiscipline)
public_route.get('/expertise/content/:contentId', expertise.getExpertiseContributionsByResearchContent)

protected_route.get('/notifications/user/:username', notifications.getNotificationsByUser)
protected_route.put('/notifications/:username/mark-read/:notificationId', notifications.markUserNotificationAsRead)
protected_route.put('/notifications/:username/mark-all-read', notifications.markAllUserNotificationAsRead)


protected_route.get('/proposals/:proposalExternalId', proposals.getProposalById)
protected_route.post('/proposals', proposals.createProposal)
protected_route.put('/proposals', proposals.updateProposal)
protected_route.put('/proposals/delete', proposals.deleteProposal)

protected_route.put('/v2/proposals/update', proposalsCtrl.updateProposal)
protected_route.put('/v2/proposals/decline', proposalsCtrl.declineProposal)

protected_route.get('/proposals/:username/:status', proposals.getAccountProposals)

protected_route.post('/groups', researchGroups.createResearchGroup)
protected_route.put('/groups', researchGroups.updateResearchGroup)
public_route.get('/groups/listing', researchGroups.getResearchGroupsListing)
public_route.get('/groups/:researchGroupExternalId', researchGroups.getResearchGroup)
public_route.get('/groups/logo/:researchGroupExternalId', compose([researchGroupLogoFileReadAuth()]), researchGroups.getResearchGroupLogo)
protected_route.post('/groups/logo', compose([researchGroupLogoFileUpdateAuth({ researchGroupEnitytId: (ctx) => ctx.request.headers['research-group-external-id'] } )]), researchGroups.uploadResearchGroupLogo)
protected_route.post('/groups/leave', researchGroups.leaveResearchGroup)
public_route.get('/groups/member/:username', researchGroups.getResearchGroupsByUser)
public_route.get('/groups/tenant/:tenantId', researchGroups.getResearchGroupsByTenant)


protected_route.get('/invites/:username', invites.getUserInvites)
protected_route.get('/invites/group/:researchGroupExternalId', invites.getResearchGroupPendingInvites)
protected_route.get('/invites/research/:researchExternalId', invites.getResearchPendingInvites)
protected_route.post('/invites', invites.createUserInvite)


public_route.get('/reviews/:reviewExternalId', reviews.getReview)
public_route.get('/reviews/votes/:reviewExternalId', reviews.getReviewVotes)
public_route.get('/reviews/research/:researchExternalId', reviews.getReviewsByResearch)
public_route.get('/reviews/research-content/:researchContentExternalId', reviews.getReviewsByResearchContent)
public_route.get('/reviews/author/:author', reviews.getReviewsByAuthor)
protected_route.post('/reviews', reviews.createReview)


public_route.get('/research/listing', research.getPublicResearchListing)
public_route.get('/research/:researchExternalId', research.getResearch)
protected_route.delete('/research/:researchExternalId', research.deleteResearch)
public_route.get('/researches', research.getResearches)
public_route.get('/research/:researchExternalId/attribute/:attributeId/file/:filename', compose([researchAttributeMetaReadAuth()]), research.getResearchAttributeFile)
protected_route.get('/research/user/listing/:username', research.getUserResearchListing)
protected_route.get('/research/group/listing/:researchGroupExternalId', research.getResearchGroupResearchListing)
public_route.get('/research/tenant/listing/:tenantId', research.getTenantResearchListing)

protected_route.post('/research', research.createResearch)
protected_route.post('/v2/project', projectsCtrl.createProject)
protected_route.put('/research', compose([researchAttributeMetaUpdateAuth({ researchEnitytId: (ctx) => ctx.request.header['research-external-id']})]), research.updateResearch)
public_route.get('/fundraising/research/:researchExternalId', fundraising.getResearchTokenSalesByResearch)
protected_route.post('/fundraising', fundraising.createResearchTokenSale)
protected_route.post('/fundraising/contributions', fundraising.createResearchTokenSaleContribution)
protected_route.get('/fundraising/:researchTokenSaleExternalId/contributions', fundraising.getResearchTokenSaleContributions)
protected_route.get('/fundraising/research/:researchExternalId/contributions', fundraising.getResearchTokenSaleContributionsByResearch)

protected_route.get('/history/account/:account/:symbol/:step/:cursor/asset/:targetAsset', fundraising.getAccountRevenueHistoryByAsset)
protected_route.get('/history/account/:account/:cursor', fundraising.getAccountRevenueHistory)
protected_route.get('/history/symbol/:symbol/:cursor', fundraising.getAssetRevenueHistory)
protected_route.get('/contributions/researchId/:researchId', fundraising.getCurrentTokenSaleByResearch)

protected_route.post('/research/application', research.createResearchApplication)
protected_route.put('/research/application/:proposalId', research.editResearchApplication)
protected_route.get('/research/application/listing', research.getResearchApplications)
protected_route.get('/research/application/:proposalId/attachment', research.getResearchApplicationAttachmentFile)
protected_route.post('/research/application/approve', research.approveResearchApplication)
protected_route.post('/research/application/reject', research.rejectResearchApplication)
protected_route.post('/research/application/delete', research.deleteResearchApplication)

public_route.get('/research-content/listing', researchContent.getPublicResearchContentListing)
public_route.get('/research-content/:researchContentExternalId', researchContent.getResearchContent)
public_route.get('/research-content/research/:researchExternalId', researchContent.getResearchContentAndDraftsByResearch)
public_route.get('/research-content/tenant/:tenantId', researchContent.getResearchContentsByTenant)
public_route.get('/research-content/ref/:refId', researchContent.getResearchContentRef)
public_route.get('/research-content/ref/graph/:contentId', researchContent.getResearchContentReferencesGraph)

protected_route.post('/research-content/ref/publish', compose([researchContentFilePublishAuth({ researchEnitytId: (ctx) => {  // TODO: replace with protected_route
  const researchContentProposedEvent = new ResearchContentProposedEvent(blockchainService.extractOperations(ctx.request.body.tx), {});
  const { researchExternalId } = researchContentProposedEvent.getSourceData();
  return researchExternalId;
 } })]), researchContent.createResearchContent)
protected_route.put('/research-content/ref/unlock/:refId', compose([researchContentFilePublishAuth({ researchContentEnitytId: 'refId' })]), researchContent.unlockResearchContentDraft)
protected_route.delete('/research-content/ref/:refId', compose([researchContentFileDeleteAuth({ researchContentEnitytId: 'refId'})]), researchContent.deleteResearchContentDraft)
protected_route.get('/research-content/texture/:researchContentExternalId', compose([researchContentFileReadAuth()]), researchContent.readResearchContentDarArchive)
protected_route.get('/research-content/texture/:researchContentExternalId/assets/:file', compose([researchContentFileReadAuth()]), researchContent.readResearchContentDarArchiveStaticFiles)
protected_route.put('/research-content/texture/:researchContentExternalId', compose([researchContentFileUpdateAuth()]), researchContent.updateResearchContentDarArchive)
protected_route.post('/research-content/texture/:researchExternalId', compose([researchContentFileCreateAuth()]), researchContent.createResearchContentDarArchive)
protected_route.post('/research-content/package', compose([researchContentFileCreateAuth({ researchEnitytId: (ctx) => ctx.request.header['research-external-id'] })]), researchContent.uploadResearchContentPackage)
protected_route.get('/research-content/package/:researchContentExternalId/:fileHash', compose([researchContentFileReadAuth()]), researchContent.getResearchContentPackageFile)

protected_route.get('/investment-portfolio/:username', investmentPortfolio.getUserInvestmentPortfolio)
protected_route.put('/investment-portfolio/:username', investmentPortfolio.updateInvestmentPortfolio)

protected_route.get('/award-withdrawal-requests/:awardNumber/:paymentNumber', grants.getAwardWithdrawalRequestRefByHash)
public_route.get('/award-withdrawal-requests/:awardNumber/:paymentNumber/:fileHash', compose([readGrantAwardWithdrawalRequestAuth()]), grants.getAwardWithdrawalRequestAttachmentFile)
protected_route.post('/award-withdrawal-requests/upload-attachments', grants.createAwardWithdrawalRequest)

protected_route.post('/express-licensing', expressLicensing.createExpressLicenseRequest)
protected_route.get('/express-licensing/externalId/:externalId', expressLicensing.getResearchLicense)
protected_route.get('/express-licensing/licensee/:licensee', expressLicensing.getResearchLicensesByLicensee)
protected_route.get('/express-licensing/licenser/:licenser', expressLicensing.getResearchLicensesByLicenser)
protected_route.get('/express-licensing/researchId/:researchId', expressLicensing.getResearchLicensesByResearch)
protected_route.get('/express-licensing/licensee/:licensee/researchId/:researchId', expressLicensing.getResearchLicensesByLicenseeAndResearch)
protected_route.get('/express-licensing/licensee/:licensee/licenser/:licenser', expressLicensing.getResearchLicensesByLicenseeAndLicenser)

protected_route.post('/assets/transfer', assets.createAssetTransferRequest)
protected_route.post('/assets/exchange', assets.createAssetExchangeRequest)
public_route.get('/assets/id/:assetId', assets.getAssetById)
public_route.get('/assets/symbol/:symbol', assets.getAssetBySymbol)
public_route.get('/assets/type/:type', assets.getAssetsByType)
public_route.get('/assets/issuer/:issuer', assets.getAssetsByIssuer)
public_route.get(['/assets/limit/:limit/', '/assets/limit/:limit/:lowerBoundSymbol'], assets.lookupAssets)
protected_route.get('/assets/owner/:owner/symbol/:symbol', assets.getAccountAssetBalance)
protected_route.get('/assets/owner/:owner', assets.getAccountAssetsBalancesByOwner)
public_route.get('/assets/accounts/symbol/:symbol', assets.getAccountsAssetBalancesByAsset)

public_route.get('/disciplines', disciplines.getDomainDisciplines)
public_route.get('/disciplines/research/:researchExternalId', disciplines.getDisciplinesByResearch)

public_route.get('/network/tenants/listing', tenant.getNetworkTenants)
public_route.get('/network/tenants/:tenant', tenant.getNetworkTenant)

protected_route.post('/infrastructure/tenant/sign', tenant.signTxByTenant)
protected_route.post('/infrastructure/tenant/affirm', tenant.affirmTxByTenant)

protected_route.post('/nda', researchNda.createResearchNonDisclosureAgreement);
public_route.get('/nda/:ndaExternalId', researchNda.getResearchNonDisclosureAgreement);
public_route.get('/nda/creator/:username', researchNda.getResearchNonDisclosureAgreementsByCreator);
public_route.get('/nda/research/:researchExternalId', researchNda.getResearchNonDisclosureAgreementsByResearch);

public_route.get('/attributes', attributes.getAttributes);
public_route.get('/attributes/scope/:scope', attributes.getAttributesByScope);
public_route.get('/attributes/scope/network/:scope', attributes.getNetworkAttributesByScope);
public_route.get('/attribute/:id', attributes.getAttribute);
public_route.get('/attributes/network', attributes.getNetworkAttributes);
public_route.get('/attributes/system', attributes.getSystemAttributes);
protected_route.post('/attribute', compose([tenantRoute, tenantAdminGuard]), attributes.createAttribute);
protected_route.put('/attribute', compose([tenantRoute, tenantAdminGuard]), attributes.updateAttribute);
protected_route.delete('/attribute/:id', compose([tenantRoute, tenantAdminGuard]), attributes.deleteAttribute);

const routes = {
  protected: koa_router().use('/api', protected_route.routes()),
  public: koa_router().use('/api', public_route.routes())
}

module.exports = routes;