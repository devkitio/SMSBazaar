'use strict';

const { buildUrl, createProviderError, getJson, makeOffer } = require('./helpers');

function mergeTiersByPrice(tiers) {
  const byPrice = new Map();

  for (const tier of tiers || []) {
    const price = Number(tier.priceOriginal || 0);
    const key = price.toFixed(8);
    const current = byPrice.get(key) || {
      priceOriginal: price,
      stock: 0,
      providerRef: '',
    };
    current.stock += Number(tier.stock || 0);
    byPrice.set(key, current);
  }

  return Array.from(byPrice.values())
    .sort((left, right) => left.priceOriginal - right.priceOriginal);
}

async function mergeOffersByCountry(offers, exchangeRateService) {
  const grouped = new Map();

  for (const offer of offers) {
    const current = grouped.get(offer.countryIso2) || {
      base: offer,
      tiers: [],
      countryIds: [],
      lastFetchedAt: offer.lastFetchedAt,
    };
    current.tiers.push(...(offer.tiers || []));
    if (offer.metadata?.countryId) current.countryIds.push(offer.metadata.countryId);
    if (offer.lastFetchedAt > current.lastFetchedAt) current.lastFetchedAt = offer.lastFetchedAt;
    grouped.set(offer.countryIso2, current);
  }

  const merged = [];
  for (const group of grouped.values()) {
    merged.push(await makeOffer({
      providerKey: group.base.providerKey,
      providerName: group.base.providerName,
      countryValue: group.base.countryIso2,
      countryName: group.base.countryNameEn || group.base.countryName,
      currency: group.base.currency,
      tiers: mergeTiersByPrice(group.tiers),
      exchangeRateService,
      lastFetchedAt: group.lastFetchedAt,
      metadata: {
        countryIds: Array.from(new Set(group.countryIds)),
      },
    }));
  }

  return merged;
}

async function fetchProviderOffers({ mapping, exchangeRateService, apiKey }) {
  try {
    if (!apiKey) {
      throw new Error('Missing API key');
    }

    const countries = await getJson(buildUrl(`${mapping.baseUrl}/countries`, { apiKey }));
    const services = await getJson(buildUrl(`${mapping.baseUrl}/services`, { apiKey }));
    const service = (services?.data || []).find((entry) => String(entry.code).toLowerCase() === String(mapping.serviceCode).toLowerCase());
    if (!service) {
      throw new Error(`NexSMS service not found: ${mapping.serviceCode}`);
    }

    const now = new Date().toISOString();
    const offers = [];
    for (const country of countries?.data || []) {
      try {
        const payload = await getJson(buildUrl(`${mapping.baseUrl}/getCountryByService`, {
          apiKey,
          serviceCode: mapping.serviceCode,
          countryId: country.id,
        }));
        const data = payload?.data;
        if (!data || !data.priceMap) continue;
        const tiers = Object.entries(data.priceMap).map(([price, stock]) => ({
          priceOriginal: Number(price),
          stock: Number(stock || 0),
          providerRef: '',
        }));

        offers.push(await makeOffer({
          providerKey: mapping.providerKey,
          providerName: mapping.displayName,
          countryValue: data.countryName,
          countryName: data.countryName,
          currency: 'USD',
          tiers,
          exchangeRateService,
          lastFetchedAt: now,
          metadata: {
            countryId: country.id,
          },
        }));
      } catch (error) {
        continue;
      }
    }

    return {
      providerKey: mapping.providerKey,
      providerName: mapping.displayName,
      offers: await mergeOffersByCountry(offers, exchangeRateService),
      error: '',
    };
  } catch (error) {
    return createProviderError(mapping.providerKey, mapping.displayName, error);
  }
}

module.exports = {
  fetchProviderOffers,
  mergeOffersByCountry,
  mergeTiersByPrice,
};
