'use strict';

const { buildUrl, createProviderError, fetchClassicCountryLookup, getMaybeJson, makeOffer } = require('./helpers');

async function fetchProviderOffers({ mapping, exchangeRateService, apiKey }) {
  try {
    if (!apiKey) {
      throw new Error('Missing API key');
    }

    const [countryLookup, payload] = await Promise.all([
      fetchClassicCountryLookup(),
      getMaybeJson(buildUrl(mapping.baseUrl, {
        action: 'getPrices',
        api_key: apiKey,
        service: mapping.serviceCode,
      })),
    ]);

    const now = new Date().toISOString();
    const offers = [];
    for (const [countryId, serviceMap] of Object.entries(payload || {})) {
      const serviceNode = serviceMap?.[mapping.serviceCode];
      if (!serviceNode) continue;
      offers.push(await makeOffer({
        providerKey: mapping.providerKey,
        providerName: mapping.displayName,
        countryValue: countryLookup.get(String(countryId)) || String(countryId),
        countryName: countryLookup.get(String(countryId)) || String(countryId),
        currency: 'USD',
        tiers: [{
          priceOriginal: Number(serviceNode.cost || 0),
          stock: Number(serviceNode.count || 0),
          providerRef: '',
        }],
        exchangeRateService,
        lastFetchedAt: now,
      }));
    }

    return {
      providerKey: mapping.providerKey,
      providerName: mapping.displayName,
      offers,
      error: '',
    };
  } catch (error) {
    return createProviderError(mapping.providerKey, mapping.displayName, error);
  }
}

module.exports = {
  fetchProviderOffers,
};
