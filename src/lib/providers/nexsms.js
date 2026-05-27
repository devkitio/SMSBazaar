'use strict';

const { buildUrl, createProviderError, getJson, makeOffer } = require('./helpers');

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
        }));
      } catch (error) {
        continue;
      }
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
