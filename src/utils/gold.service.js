import axios from 'axios';
import cron from 'node-cron';
import { getIO } from '../config/socket.js';

// --- Configuration ---
// Note: You need a provider that supports multiple metals (e.g., metalpriceapi.com, goldapi.io)
const GOLD_API_URL = 'https://api.metalpriceapi.com/v1/latest'; 
const API_KEY = process.env.GOLD_API_KEY; 
const BASE_CURRENCY = 'USD';
const TARGET_CURRENCY = 'KWD';

// Constants
const OUNCE_IN_GRAMS = 31.1034768;
const USD_TO_KWD_FIXED = 0.308; // Fallback exchange rate

// Mock Data for Development
const IS_MOCK = true; 

// Store last prices in memory
let currentPrices = {
  timestamp: Date.now(),
  source: 'Initializing...',
  currency: 'KWD',
  exchange_rate: USD_TO_KWD_FIXED,
  gold: {},
  silver: {},
  platinum: {}
};

/**
 * Core Calculation Logic
 * Converts Ounce Price (USD) -> Gram Price (KWD) -> Different Karats
 */
const calculatePrices = (pricesUSD, exchangeRate) => {
  // 1. Calculate Base Prices per Gram in KWD
  const goldGram24k_KWD = (pricesUSD.gold / OUNCE_IN_GRAMS) * exchangeRate;
  const silverGramRaw_KWD = (pricesUSD.silver / OUNCE_IN_GRAMS) * exchangeRate;
  const platinumGramRaw_KWD = (pricesUSD.platinum / OUNCE_IN_GRAMS) * exchangeRate;

  return {
    gold: {
      karat24: parseFloat(goldGram24k_KWD.toFixed(3)),
      karat22: parseFloat((goldGram24k_KWD * (22 / 24)).toFixed(3)),
      karat21: parseFloat((goldGram24k_KWD * (21 / 24)).toFixed(3)), // Most common in Kuwait
      karat18: parseFloat((goldGram24k_KWD * (18 / 24)).toFixed(3)),
      karat14: parseFloat((goldGram24k_KWD * (14 / 24)).toFixed(3)),
      karat12: parseFloat((goldGram24k_KWD * (12 / 24)).toFixed(3)),
      karat10: parseFloat((goldGram24k_KWD * (10 / 24)).toFixed(3)),
      karat09: parseFloat((goldGram24k_KWD * (9 / 24)).toFixed(3)),
      ounce_price_kwd: parseFloat((pricesUSD.gold * exchangeRate).toFixed(3))
    },
    silver: {
      raw: parseFloat(silverGramRaw_KWD.toFixed(3)),
      sterling_925: parseFloat((silverGramRaw_KWD * 0.925).toFixed(3)), // Sterling Silver
      ounce_price_kwd: parseFloat((pricesUSD.silver * exchangeRate).toFixed(3))
    },
    platinum: {
      raw: parseFloat(platinumGramRaw_KWD.toFixed(3)),
      pure_950: parseFloat((platinumGramRaw_KWD * 0.950).toFixed(3)), // Common jewelry grade
      ounce_price_kwd: parseFloat((pricesUSD.platinum * exchangeRate).toFixed(3))
    }
  };
};

export const fetchGoldPrice = async () => {
  try {
    let rawPricesUSD = { gold: 0, silver: 0, platinum: 0 };
    let exchangeRate = USD_TO_KWD_FIXED;
    let source = 'Live API';

    if (IS_MOCK) {
      // --- SIMULATION MODE ---
      source = 'Simulated Market';
      // Random fluctuation logic for realism
      const flux = () => (Math.random() * 2) - 1; 
      
      rawPricesUSD = {
        gold: 2035.50 + flux(),   // Gold Ounce Price ~$2035
        silver: 23.10 + (flux()/10), // Silver Ounce Price ~$23
        platinum: 920.00 + flux() // Platinum Ounce Price ~$920
      };
    } else {
      // --- REAL API MODE ---
      // Requesting XAU (Gold), XAG (Silver), XPT (Platinum), and KWD
      const url = `${GOLD_API_URL}?api_key=${API_KEY}&base=${BASE_CURRENCY}&currencies=XAU,XAG,XPT,${TARGET_CURRENCY}`;
      const response = await axios.get(url);

      if (response.data && response.data.rates) {
         const rates = response.data.rates;
         
         // Note: Most Exchange Rate APIs return "1 USD = X Metal". 
         // So Price of 1 Metal = 1 / Rate.
         // IF your API returns price directly, remove "1 /".
         
         rawPricesUSD.gold = 1 / rates.XAU; 
         rawPricesUSD.silver = 1 / rates.XAG;
         rawPricesUSD.platinum = 1 / rates.XPT;

         exchangeRate = rates.KWD || USD_TO_KWD_FIXED;
      }
    }

    // Perform Calculations
    const calculatedRates = calculatePrices(rawPricesUSD, exchangeRate);

    // Update State
    currentPrices = {
      timestamp: Date.now(),
      source,
      currency: 'KWD',
      exchange_rate: exchangeRate,
      ...calculatedRates
    };

    // Broadcast via Socket.io
    const io = getIO();
    io.emit('price_update', currentPrices);
    
    // Server Log (Optional - for debugging)
    // console.log(`📈 Market Update: Gold 21K=${currentPrices.gold.karat21} | Silver=${currentPrices.silver.raw}`);

  } catch (error) {
    console.error('❌ Gold Price Fetch Error:', error.message);
  }
};

export const startGoldScheduler = () => {
  console.log('⏳ Metal Price Scheduler Started (Gold, Silver, Platinum)...');
  
  // 1. Fetch immediately
  fetchGoldPrice();

  // 2. Schedule every 60 seconds
  cron.schedule('*/60 * * * * *', () => {
    fetchGoldPrice();
  });
};

export const getLastPrice = () => currentPrices;