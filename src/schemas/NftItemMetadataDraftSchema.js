
import mongoose from 'mongoose';
import { NFT_ITEM_METADATA_DRAFT_STATUS, NFT_ITEM_METADATA_FORMAT, NFT_ITEM_METADATA_TYPES } from '@deip/constants';
import AttributeValueSchema from './AttributeValueSchema';

const Schema = mongoose.Schema;

const NftItemMetadataDraftSchema = new Schema({
  "portalId": { type: String, required: true },
  "nftCollectionId": { type: String, required: true },
  "owner": { type: String, required: true },
  "ownedByTeam": { type: Boolean, default: false },
  "folder": { type: String, required: true },
  "title": { type: String, required: true },
  "attributes": [AttributeValueSchema],
  "hash": { type: String, index: true },
  "algo": { type: String },
  "contentType": {
    type: Number,
    enum: [...Object.values(NFT_ITEM_METADATA_TYPES)],
    default: NFT_ITEM_METADATA_TYPES.ANNOUNCEMENT
  },
  "formatType": {
    type: Number,
    enum: [...Object.values(NFT_ITEM_METADATA_FORMAT)],
    required: true
  },
  "status": {
    type: Number,
    enum: [...Object.values(NFT_ITEM_METADATA_DRAFT_STATUS)],
    required: true
  },
  "packageFiles": [{
    "_id": false,
    "filename": { type: String, required: true },
    "hash": { type: String, required: true },
    "ext": { type: String, required: true },
  }],
  "jsonData": { type: Object },
  "metadata": { type: Object },
  "authors": [{ type: String }],
  "references": [{ type: String }],
  "foreignReferences": [{ type: String }],
  "moderationMessage": { type: String },
}, { timestamps: true });

const model = mongoose.model('nft-item-metadata-draft', NftItemMetadataDraftSchema);

module.exports = model;