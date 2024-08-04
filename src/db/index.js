import client from './client.js';

export async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to the database');
  } catch (error) {
    console.error(`Error connecting to the database: ${error.message}`);
  }
}

export async function disconnectFromDatabase() {
  try {
    await client.end();
    console.log('Disconnected from the database');
  } catch (error) {
    console.error(`Error disconnecting from the database: ${error.message}`);
  }
}

export async function getLatestTimestamp() {
  const query = 'SELECT MAX(created_at) AS latest FROM feature_requests';

  try {
    const res = await client.query(query);
    return res.rows[0].latest;
  } catch (error) {
    console.error(`Error fetching latest timestamp: ${error.message}`);
    return null;
  }
}

export async function insertFeatureRequest(issue) {
  const query = `
    INSERT INTO feature_requests (
      issue_number,
      title,
      url,
      created_at,
      comments_count,
      thumbs_up,
      labels,
      comments
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8
    )
  `;

  const values = [
    issue.number,
    issue.title,
    issue.html_url,
    issue.created_at,
    issue.comments,
    issue.thumbs_up,
    JSON.stringify(issue.labels.map(label => label.name)),
    JSON.stringify(issue.actual_comments.map(comment => ({
      user: comment.user.login,
      comment: comment.body
    })))
  ];

  try {
    await client.query(query, values);
    console.log(`Inserted issue #${issue.number}: ${issue.title}`);
  } catch (error) {
    console.error(`Error inserting issue #${issue.number}: ${error.message}`);
  }
}
