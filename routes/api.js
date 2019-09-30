import koa_router from 'koa-router'
import users from '../controllers/users'
import notifications from '../controllers/notifications'
import proposals from '../controllers/proposals'
import groups from '../controllers/groups'
import invites from '../controllers/invites'
import files from '../controllers/files'
import sharedFiles from '../controllers/sharedFiles'
import pricing from '../controllers/pricing'
import templates from '../controllers/templates'
import contracts from '../controllers/contracts'

const router = koa_router()

router.post('/files/upload-avatar', users.uploadAvatar)

router.get('/user/profile/:username', users.getUserProfile)
router.get('/user/profiles', users.getUsersProfiles)
router.post('/user/profile/:username', users.createUserProfile)
router.put('/user/profile/:username', users.updateUserProfile)

router.get('/notifications/user/:username', notifications.getNotificationsByUser)
router.put('/notifications/:username/mark-read/:notificationId', notifications.markUserNotificationAsRead)
router.put('/notifications/:username/mark-all-read', notifications.markAllUserNotificationAsRead)

router.post('/proposals/research', proposals.createResearchProposal)
router.post('/proposals/invite', proposals.createInviteProposal)
router.post('/proposals/content', proposals.createContentProposal)

router.post('/groups', groups.createResearchGroup)
router.get('/groups/profile/:permlink', groups.getGroupProfile)
router.put('/groups/profile/:permlink', groups.updateGroupProfile)

router.post('/invites/approve', invites.approveInvite)
router.post('/invites/reject', invites.rejectInvite)

router.get('/refs/project/:projectId', files.listFileRefs)
router.get('/refs/project/file-id/:refId', files.getFileRefById)
router.post('/refs/project/file-id/:refId/share', files.shareFile)
router.get('/refs/project/:projectId/file-hash/:hash', files.getFileRefByHash)
router.get('/refs/certificate/:projectId/file-hash/:hash', files.exportCertificate)
router.get('/refs/cyphered-data/:projectId/file-hash/:hash', files.exportCypheredData)

router.get('/pricing/subscription/:username', pricing.getUserSubscription)
router.get('/pricing/regular-plans', pricing.getRegularPricingPlans)
router.get('/pricing/billing-settings', pricing.getBillingSettings)
router.put('/pricing/billing-settings/card', pricing.updateBillingCard)
router.post('/pricing/subscription', pricing.processStripePayment)
router.put('/pricing/cancel/subscription', pricing.cancelStripeSubscription)
router.put('/pricing/reactivate/subscription', pricing.reactivateSubscription)
router.put('/pricing/change/subscription', pricing.changeSubscription)
router.get('/pricing/additional-packages', pricing.getAdditionalPackages)
router.post('/pricing/additional-packages/:id/buy', pricing.buyAdditionalPackage)

router.get('/templates/refs/:refId', templates.getDocumentTemplateRef)
router.get('/templates/refs/organization/:organizationId', templates.getDocumentTemplatesRefsByOrganization)
router.get('/templates/refs/file/:refId', templates.getDocumentTemplateFile)
router.post('/templates', templates.uploadTemplate)
router.delete('/templates/refs/:refId', templates.removeTemplate)

router.get('/contracts/nda/refs/:refId', contracts.getContractRef)
router.post('/contracts/nda/refs/:refId/sign', contracts.signContract)
router.post('/contracts/nda/refs/:refId/decline', contracts.declineContract)
router.post('/contracts/nda/refs', contracts.createContractRef)
router.get('/contracts/nda/refs/:refId/file', contracts.getContractFile)

router.get(`/shared-files`, sharedFiles.getSharedFiles)
router.get(`/shared-files/:id`, sharedFiles.getSharedFile)
router.post(`/shared-files/:id/ask-permission`, sharedFiles.askPermission)
router.post(`/shared-files/:id/unlock`, sharedFiles.unlockFile)

export default router