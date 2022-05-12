
import mongoose from 'mongoose';
import { PROJECT_CONTENT_FORMAT, PROJECT_CONTENT_TYPES } from '@deip/constants';

const Schema = mongoose.Schema;

const ProjectContentSchema = new Schema({
  "_id": { type: String },
  "portalId": { type: String, required: true },
  "projectId": { type: String, required: true },
  "teamId": { type: String, required: true },
  "folder": { type: String, required: true },
  "title": { type: String, required: true },
  "hash": { type: String, index: true },
  "algo": { type: String },
  "contentType": {
    type: Number,
    enum: [...Object.values(PROJECT_CONTENT_TYPES)],
    default: PROJECT_CONTENT_TYPES.ANNOUNCEMENT
  },
  "formatType": {
    type: Number,
    enum: [...Object.values(PROJECT_CONTENT_FORMAT)],
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
}, { timestamps: true });

const model = mongoose.model('project-content', ProjectContentSchema);

module.exports = model;