import { default as fetch } from 'node-fetch';
import { RATE_LIMIT_RESET_BUFFER } from '../config.js';

export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

export async function checkRateLimit() {
  const url = 'https://api.github.com/rate_limit';
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return data.rate.remaining > 0;
}

export async function handleRateLimitExceeded() {
  const url = 'https://api.github.com/rate_limit';
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  const resetTime = data.rate.reset * 1000 + RATE_LIMIT_RESET_BUFFER;
  const currentTime = Date.now();
  const waitTime = resetTime - currentTime;

  if (waitTime > 0) {
    console.log(`Rate limit exceeded. Waiting for ${Math.ceil(waitTime / 1000 / 60)} minutes before retrying...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

export async function fetchWithRateLimit(url, options = {}) {
  while (true) {
    if (await checkRateLimit()) {
      return fetchWithTimeout(url, options);
    } else {
      await handleRateLimitExceeded();
    }
  }
}
