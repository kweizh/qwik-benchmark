# Recursive Nested Comment Thread in Qwik City

## Background
In modern web applications, comment threads often require nested replies that can go infinitely deep. Implementing this efficiently in a full-stack meta-framework like Qwik City requires handling recursive rendering on the server, managing nested state, and persisting the data to a database.

You are tasked with building a robust, self-contained recursive comment system for blog posts using Qwik and Qwik City. The application must store comments in a local SQLite database and support retrieving the comment tree as well as adding new replies at any level of nesting.

## Requirements
- **Database**: Use a local SQLite database. The table `Comment` must be automatically created on startup if it does not exist.
  - Table: `Comment`
  - Columns:
    - `id`: INTEGER PRIMARY KEY AUTOINCREMENT
    - `postId`: TEXT NOT NULL
    - `parentId`: INTEGER, NULLABLE, FOREIGN KEY referencing `Comment(id)` ON DELETE CASCADE
    - `text`: TEXT NOT NULL
    - `author`: TEXT NOT NULL
    - `createdAt`: DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
- **Routing & Endpoints**:
  - **GET `/posts/:id/comments`**:
    - Renders the nested comment tree for the post identified by `:id`.
    - Supports content negotiation:
      - If the request contains the header `Accept: application/json`, the endpoint must return a `200 OK` response with the comment tree as a JSON array of top-level comments (where `parentId` is null).
      - Each comment object in the JSON array must recursively include its replies in a `replies` array.
      - If the request does not specify `Accept: application/json` (e.g., standard browser navigation), it must render the comments as an HTML page.
  - **POST `/posts/:id/comments`**:
    - Adds a new comment or a reply to an existing comment for the post identified by `:id`.
    - Accepts a JSON payload with `parentId` (nullable/optional), `text`, and `author`.
    - Returns a `201 Created` response with the newly created comment object as JSON.
- **Sorting**:
  - Both top-level comments and nested replies in the JSON response must be sorted chronologically by `createdAt` in ascending order.
- **HTML Rendering**:
  - The HTML page rendered by GET `/posts/:id/comments` must visually display the nested comments recursively (e.g., indented replies). It must contain a form or interactive elements allowing users to add top-level comments and reply to any existing comment.

## Implementation Hints
- Project path: `/home/user/qwik-app`
- Start command: `npm run dev`
- Port: 3000
- Database path: `/home/user/qwik-app/database.sqlite`
- **GET `/posts/:id/comments` JSON Schema**:
  - Request Header: `Accept: application/json`
  - Response Status: `200 OK`
  - Response Body:
    ```json
    [
      {
        "id": number,
        "postId": string,
        "parentId": number | null,
        "text": string,
        "author": string,
        "createdAt": string, // ISO 8601 string format
        "replies": [
          {
            "id": number,
            "postId": string,
            "parentId": number,
            "text": string,
            "author": string,
            "createdAt": string,
            "replies": [] // and so on...
          }
        ]
      }
    ]
    ```
- **POST `/posts/:id/comments` JSON Schema**:
  - Request Content-Type: `application/json`
  - Request Body:
    ```json
    {
      "parentId": number | null, // null or omitted for top-level comments
      "text": string,
      "author": string
    }
    ```
  - Response Status: `201 Created`
  - Response Body:
    ```json
    {
      "id": number,
      "postId": string,
      "parentId": number | null,
      "text": string,
      "author": string,
      "createdAt": string // ISO 8601 string format
    }
    ```
- **Constraints**:
  - Do not use any mock/in-memory storage that resets across process restarts. Data must be persisted to the SQLite database file at `/home/user/qwik-app/database.sqlite`.
  - Ensure parent-child relationships are correctly validated. A reply with a non-existent `parentId` must return a `400 Bad Request` or `404 Not Found` response.
  - If a post has no comments, GET `/posts/:id/comments` with `Accept: application/json` must return an empty JSON array `[]` with status `200 OK`.

