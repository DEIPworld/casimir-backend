
import mongoose from 'mongoose';
import { RESEARCH_COMPONENT_TYPE } from './../constants';

const Schema = mongoose.Schema;

const ResearchCriteriaValue = new Schema({
  "_id": false,
  "type": { type: String, enum: [RESEARCH_COMPONENT_TYPE.STEPPER], required: true },
  "component": { type: String, required: true },
  "value": { type: Object, required: false, default: null }
});

const Research = new Schema({
  "_id": { type: String, required: true },
  "researchGroupExternalId": { type: String, required: true },
  "researchGroupId": { type: Number, required: true }, // legacy internal id
  "milestones": [{
    "_id": false,
    "goal": { type: String, required: true },
    "budget": { type: String, defaul: null },
    "purpose": { type: String, defaul: null },
    "details": { type: String, default: null },
    "eta": { type: Date, required: true },
    "isActive": { type: Boolean, default: false },
  }],
  "videoSrc": { type: String, default: null },
  "partners": [{
    "_id": false,
    "type": { type: String, required: true },
    "title": { type: String, required: true }
  }],
  "tenantCriterias": [ResearchCriteriaValue]

}, { timestamps: { createdAt: 'created_at', 'updatedAt': 'updated_at' } });

const model = mongoose.model('research', Research);

module.exports = model;