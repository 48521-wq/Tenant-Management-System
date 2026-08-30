function canCreateFollowUpRequest(existingRequest, newOfferRent) {
  if (!existingRequest) return true;

  const priorStatus = existingRequest.status || '';
  const hasPriorOffer = existingRequest.proposedRent != null && existingRequest.proposedRent !== '';
  const priorOffer = Number(existingRequest.proposedRent || 0);
  const nextOffer = Number(newOfferRent || 0);

  if (priorStatus === 'pending' || priorStatus === 'negotiating') {
    if (!hasPriorOffer) {
      return nextOffer > 0;
    }
    return nextOffer > priorOffer;
  }

  return true;
}

module.exports = { canCreateFollowUpRequest };
