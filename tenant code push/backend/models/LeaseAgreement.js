const mongoose = require('mongoose');

// ─── Default Pakistan tenancy clauses (Punjab Rented Premises Act 2009) ───
// Loaded automatically whenever a landlord starts a new agreement.
// The landlord may edit/remove/reorder these while the agreement is in
// "draft" status. Once sent to the tenant, they become permanently locked.
const DEFAULT_PK_TERMS = [
  {
    title: 'Rent Payment',
    text: 'Tenant shall pay rent on time each month, on the agreed due date. Late payments may attract a penalty as mutually agreed.'
  },
  {
    title: 'Security Deposit',
    text: 'A deposit is taken at the start of the agreement (typically 2–3 months\' rent), refundable at the end if there is no damage beyond normal wear and tear.'
  },
  {
    title: 'Agreement Duration',
    text: 'Valid for the duration stated above (commonly 11 months). May be renewed on mutually agreed terms upon expiry.'
  },
  {
    title: 'Maintenance & Repairs',
    text: 'Landlord is responsible for major structural repairs. Tenant is responsible for day-to-day maintenance and must report damages promptly.'
  },
  {
    title: 'Termination Notice',
    text: 'Either party must provide at least 30 days\' written notice before terminating this agreement, unless otherwise agreed.'
  },
  {
    title: 'Right of Entry',
    text: 'Landlord may enter the premises for inspection or repairs with at least 24 hours\' prior notice to the tenant, except in emergencies.'
  },
  {
    title: 'Use of Premises',
    text: 'The premises shall be used for residential purposes only and shall not be used for any illegal or commercial activity.'
  },
  {
    title: 'Utility Bills',
    text: 'Tenant is responsible for payment of electricity, gas, water and other utility bills for the duration of the tenancy, unless otherwise agreed.'
  },
  {
    title: 'Dispute Resolution',
    text: 'Any dispute arising from this agreement shall first be resolved amicably between the parties, and if unresolved, in accordance with the Punjab Rented Premises Act 2009 and applicable law of Pakistan.'
  }
];

const partySnapshotSchema = new mongoose.Schema({
  name:  { type: String, default: '' },
  cnic:  { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' }
}, { _id: false });

const signatureSchema = new mongoose.Schema({
  type: { type: String, enum: ['draw', 'type'] },
  data: { type: String, default: '' }, // dataURL (draw) or typed name (type)
  signedAt: { type: Date, default: null }
}, { _id: false });

const termSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text:  { type: String, required: true }
}, { _id: false });

const agreementVersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  savedAt: { type: Date, default: Date.now },
  changedBy: { type: String, default: 'landlord' },
  changes: { type: [String], default: [] },
  snapshot: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: true });

const leaseAgreementSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rentalRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalRequest', default: null },

  // Snapshots taken at the moment the agreement is created, so the lease
  // text never silently changes even if the profile/property is edited later.
  property: {
    title:   { type: String, default: '' },
    type:    { type: String, default: '' },
    address: { type: String, default: '' },
    area:    { type: String, default: '' },
    city:    { type: String, default: '' },
    rent:    { type: Number, default: 0 }
  },
  landlord: partySnapshotSchema,
  tenant:   partySnapshotSchema,

  terms:             { type: [termSchema], default: () => DEFAULT_PK_TERMS },
  specialConditions:  { type: String, default: '' },

  // Agreement duration — landlord sets these while filling the agreement.
  // Required before it can be sent to the tenant.
  startDate: { type: Date, default: null },
  endDate:   { type: Date, default: null },

  landlordSignature: { type: signatureSchema, default: () => ({}) },
  tenantSignature:   { type: signatureSchema, default: () => ({}) },

  // draft   -> landlord is filling/editing, not visible to tenant yet
  // sent    -> landlord signed & sent, tenant can read (not edit) & sign
  // signed  -> tenant signed too, agreement is locked forever
  status: { type: String, enum: ['draft', 'sent', 'signed'], default: 'draft' },

  sentAt:   { type: Date, default: null },
  signedAt: { type: Date, default: null },

  // Every time a landlord unlocks a signed agreement to revise it, an entry
  // is added here so the tenant can always see that it was changed and when.
  editHistory: {
    type: [{
      at:   { type: Date, default: Date.now },
      note: { type: String, default: '' }
    }],
    default: []
  },

  // Complete, immutable copies of every signed version. The current lease
  // remains the active version while these records preserve older terms.
  agreementVersions: {
    type: [agreementVersionSchema],
    default: []
  }
}, { timestamps: true });

leaseAgreementSchema.statics.DEFAULT_PK_TERMS = DEFAULT_PK_TERMS;

module.exports = mongoose.model('LeaseAgreement', leaseAgreementSchema);
