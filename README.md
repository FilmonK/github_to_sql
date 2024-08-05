# Getting list of issues from repo and storing in database

This repo goes through the process of fetching open feature requests in a given repo and writing them to a SQL table with following structure
```
CREATE TABLE feature_requests (
    id SERIAL PRIMARY KEY,
    issue_number INT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    comments_count INT NOT NULL,
    thumbs_up INT NOT NULL,
    labels JSONB NOT NULL,
    comments JSONB NOT NULL
);
```

## Table of Contents
* [Technologies Used](#technologies-used)
* [Room for Improvement](#room-for-improvement)


## Technologies Used
- [Node](https://nodejs.org/))
- [Github](https://github.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [PG](https://www.npmjs.com/package/pg)


## Room for Improvement
- Allow dynamic input so fetches can be opened to more options.
- Actually get rate limiting functioning properly
- Finish integrating CSV option
- Have better logic in place than just comparing timestamps between table entries and github repo


