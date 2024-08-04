import 'dotenv/config';
import { connectToDatabase, disconnectFromDatabase, getLatestTimestamp, insertFeatureRequest } from './db/index.js';
import { fetchFeatureRequests, fetchReactions, fetchComments } from './helpers/github.js';

async function getAllFeatureRequests(latestTimestamp) {
  let page = 1;
  let allFeatureRequests = [];
  let keepFetching = true;

  while (keepFetching) {
    const featureRequests = await fetchFeatureRequests(page);

    if (!featureRequests.length) break;

    for (const issue of featureRequests) {
      const issueTimestamp = new Date(issue.created_at);
      console.log(`Issue #${issue.number} created at ${issueTimestamp}`);
      if (latestTimestamp && issueTimestamp <= new Date(latestTimestamp)) {
        console.log(`Stopping fetch because issue #${issue.number} is older than or equal to latest timestamp`);
        keepFetching = false;
        break;
      }

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

// Main function to write feature requests to the SQL database
(async () => {
  try {
    await connectToDatabase();

    const latestTimestamp = await getLatestTimestamp();
    console.log(`Latest timestamp in database: ${latestTimestamp}`);

    const featureRequests = await getAllFeatureRequests(latestTimestamp || new Date(0));
    console.log(`Found ${featureRequests.length} new feature requests`);

    for (const issue of featureRequests) {
      await insertFeatureRequest(issue);
    }

    await disconnectFromDatabase();
  } catch (error) {
    console.error(`Error in main execution: ${error.message}`);
  }
})();
