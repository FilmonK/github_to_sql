// Similar functionality but writing to CSV instead of a SQL database

import { default as fetch } from 'node-fetch';
import { createObjectCsvWriter } from 'csv-writer';

const owner = 'metabase';
const repo = 'metabase';
const query = `repo:${owner}/${repo} is:issue is:open label:"Type:New Feature"`;
const per_page = 10; // Increase the number of issues per page
const RATE_LIMIT_RESET_BUFFER = 60 * 1000; // 1 minute buffer for rate limit reset

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

async function checkRateLimit() {
  const url = 'https://api.github.com/rate_limit';
  const response = await fetchWithTimeout(url);
  const data = await response.json();
  return data.rate.remaining > 0;
}

async function handleRateLimitExceeded() {
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

async function fetchWithRateLimit(url, options = {}) {
  while (true) {
    if (await checkRateLimit()) {
      return fetchWithTimeout(url, options);
    } else {
      await handleRateLimitExceeded();
    }
  }
}

async function fetchFeatureRequests(page = 1) {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=${per_page}&page=${page}`;

  try {
    console.log(`Fetching feature requests from page ${page}`);
    const response = await fetchWithRateLimit(url);
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

async function fetchReactions(issueNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/reactions`;

  try {
    const response = await fetchWithRateLimit(url, {
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

async function fetchComments(issueNumber) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;

  try {
    const response = await fetchWithRateLimit(url);
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

async function getAllFeatureRequests() {
  let page = 1;
  let allFeatureRequests = [];
  let keepFetching = true;

  while (keepFetching) {
    const featureRequests = await fetchFeatureRequests(page);

    if (!featureRequests.length) break;

    for (const issue of featureRequests) {
      const comments = await fetchComments(issue.number);
      issue.actual_comments = comments;

      const reactions = await fetchReactions(issue.number);
      issue.thumbs_up = reactions.filter(reaction => reaction.content === '+1').length;

      allFeatureRequests.push(issue);
    }

    page += 1;
  }

  return allFeatureRequests;
}

// Function to write feature requests to a CSV file
async function writeToCSV() {
  try {
    const featureRequests = await getAllFeatureRequests();
    console.log(`Found ${featureRequests.length} feature requests`);

    const csvWriter = createObjectCsvWriter({
      path: 'feature_requests.csv',
      header: [
        { id: 'issue_number', title: 'Issue Number' },
        { id: 'title', title: 'Title' },
        { id: 'url', title: 'URL' },
        { id: 'created_at', title: 'Created At' },
        { id: 'comments_count', title: 'Comments Count' },
        { id: 'thumbs_up', title: 'Thumbs Up' },
        { id: 'labels', title: 'Labels' },
        { id: 'comments', title: 'Comments' },
      ],
    });

    const records = featureRequests.map(issue => ({
      issue_number: issue.number,
      title: issue.title,
      url: issue.html_url,
      created_at: issue.created_at,
      comments_count: issue.comments,
      thumbs_up: issue.thumbs_up,
      labels: JSON.stringify(issue.labels.map(label => label.name)),
      comments: JSON.stringify(issue.actual_comments.map(comment => ({
        user: comment.user.login,
        comment: comment.body
      }))),
    }));

    console.log(`Writing ${records.length} records to CSV`);
    await csvWriter.writeRecords(records);
    console.log('CSV file written successfully');
  } catch (error) {
    console.error(`Error in CSV execution: ${error.message}`);
  }
}


(async () => {
  try {
    await writeToCSV();
  } catch (error) {
    console.error(`Error in main execution: ${error.message}`);
  }
})();
