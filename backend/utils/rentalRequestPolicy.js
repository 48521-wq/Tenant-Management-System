// A tenant may send another request for the SAME property, but the new
// offer must beat their previous (highest) bid by at least MIN_RAISE rupees.
const MIN_RAISE = 2000;

function highestPriorBid(requests) {
  let best = null;
  (requests || []).forEach(r => {
    const v = Number(r && r.proposedRent);
    if (v > 0 && (best === null || v > best)) best = v;
  });
  return best;
}

// priorRequests: this tenant's earlier requests for the same property (any status)
function evaluateFollowUp(priorRequests, newOfferRent) {
  const prior = highestPriorBid(priorRequests);
  const next = Number(newOfferRent || 0);
  if (!priorRequests || !priorRequests.length) return { allowed: true, priorBid: null, minimumOffer: null };

  if (prior === null) {
    return { allowed: next > 0, priorBid: null, minimumOffer: 1,
      message: 'Please enter your rent offer to send another request for this property.' };
  }
  const minimumOffer = prior + MIN_RAISE;
  return { allowed: next >= minimumOffer, priorBid: prior, minimumOffer,
    message: `You already offered Rs. ${prior.toLocaleString('en-US')} for this property. A new request needs an offer of at least Rs. ${minimumOffer.toLocaleString('en-US')} (Rs. ${MIN_RAISE.toLocaleString('en-US')} more than your previous bid).` };
}

// Backwards-compatible helper (single previous request)
function canCreateFollowUpRequest(existingRequest, newOfferRent) {
  return evaluateFollowUp(existingRequest ? [existingRequest] : [], newOfferRent).allowed;
}

module.exports = { MIN_RAISE, highestPriorBid, evaluateFollowUp, canCreateFollowUpRequest };
