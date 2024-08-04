import { default as fetch } from 'node-fetch';
import { fetchWithTimeout } from '../utils/rateLimit.js';
import { GITHUB_QUERY, PER_PAGE, GITHUB_OWNER, GITHUB_REPO } from '../config.js';

export async function fetchFeatureRequests(page = 1) {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(GITHUB_QUERY)}&per_page=${PER_PAGE}&page=${page}`;

  try {
    console.log(`Fetching feature requests from page ${page}`);
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Error fetching feature requests: ${response.statusText}`);
    }
    const data = await response.json();
    console.log(`Fetched ${data.items.length} items from page ${page}`);
    return data.items;
  } catch (error) {
    console.error(error.message);
    return [];
  }
}

export async function fetchReactions(issueNumber) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/reactions`;

  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        Accept: 'application/vnd.github.squirrel-girl-preview+json'
      }
    });
    if (!response.ok) {
      throw new Error(`Error fetching reactions for issue #${issueNumber}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error.message);
    return [];
  }
}

export async function fetchComments(issueNumber) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      throw new Error(`Error fetching comments for issue #${issueNumber}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error.message);
    return [];
  }
}
