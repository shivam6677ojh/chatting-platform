# Realtime MERN Chat App

Build a full-stack real-time chat application using the MERN stack with the following features:

Frontend:
- Use React.js with a clean and responsive UI
- Implement user authentication (Google OAuth + optional login/register)
- Show online/offline users
- Display chat messages in real-time
- Add typing indicator feature
- Support private one-to-one chat
- Use Axios for API calls and Context API for state management

Backend:
- Use Node.js and Express.js
- Implement REST APIs for authentication and user management
- Use JWT for authentication and protected routes
- Use bcrypt for password hashing
- Integrate Socket.io for real-time messaging
- Handle user connections and disconnections
- Broadcast messages in real-time
- Implement typing indicators using sockets

Database:
- Use MongoDB with Mongoose
- Create schemas for Users and Messages
- Store chat history and user data

Additional Features:
- Show timestamps for messages
- Maintain chat history
- Handle errors and edge cases
- Use environment variables for configuration

Authentication Policy:
- Google OAuth is enabled for verified identities
- Local signup can be disabled with `ALLOW_LOCAL_SIGNUP=false` to prevent fake accounts

Project Structure:
- client (React frontend)
- server (Node.js backend)

Ensure clean code, modular structure, and proper separation of concerns.
Add comments explaining key parts of the implementation.

## Enhancements Included
- Online/offline user status with Socket.io
- Typing indicators
- Read receipts (seen/unseen)
- Auto-scroll to latest message

## Folder Structure

```text
chat-app/
  client/
  server/
```

## Setup

1. Copy environment templates:

```bash
cd server && copy .env.example .env
cd ../client && copy .env.example .env
```

2. Configure Google OAuth:

- Create a Web OAuth client in Google Cloud Console
- Add `http://localhost:5173` to authorized JavaScript origins
- Set the same client ID in:
  - `server/.env` -> `GOOGLE_CLIENT_ID`
  - `client/.env` -> `VITE_GOOGLE_CLIENT_ID`

3. Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

4. Start backend:

```bash
cd server
npm run dev
```

5. Start frontend:

```bash
cd client
npm run dev
```

6. Open the app:
- http://localhost:5173

## Backend API (Summary)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- GET /api/auth/me
- GET /api/users
- GET /api/messages/:userId
- POST /api/messages
- PATCH /api/messages/:userId/seen

## Notes
- Socket authentication uses JWT passed in socket handshake auth.
- Chat history is persisted in MongoDB.
- Read receipts are derived from Message.readBy.
- Message timestamps are shown in chat bubbles.

## Docker (Full App)

Docker files added:
- client/Dockerfile
- server/Dockerfile
- docker-compose.yml

Run with Docker Compose:

```bash
docker compose up --build
```

App URLs:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

Stop containers:

```bash
docker compose down
```

## GitHub Actions (Automated CI/CD)

Workflow files:
- `.github/workflows/ci.yml`
- `.github/workflows/docker-publish.yml`
- `.github/workflows/deploy.yml`

### 1) CI (`ci.yml`)
Runs on pull requests and pushes to `main`/`develop`.

Checks included:
- Frontend install + production build (`npm ci`, `npm run build`)
- Backend install + syntax validation of all server source files
- Docker Compose validation + container build for all services

### 2) Docker Image Publish (`docker-publish.yml`)
Runs on pushes to `main`, version tags (`v*`), or manual trigger.

What it does:
- Builds `client` and `server` images with Buildx cache
- Tags images (`branch`, `tag`, `sha`, and `latest` for default branch)
- Pushes images to GitHub Container Registry (`ghcr.io`)

Published image names:
- `ghcr.io/<owner>/chatsphere-client`
- `ghcr.io/<owner>/chatsphere-server`

### 3) Deploy (`deploy.yml`)
Manual trigger (`workflow_dispatch`) for controlled production deploy.

What it does:
- SSH into deployment server
- Log in to GHCR
- Pull latest images using Docker Compose
- Restart services with zero-manual shell steps in GitHub UI

### Required GitHub Secrets
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT` (optional, defaults to `22`)
- `GHCR_USERNAME`
- `GHCR_TOKEN` (must have package read permissions)

### Required GitHub Variables
- `DEPLOY_APP_DIR` (example: `/opt/chat-app`)
- `VITE_API_BASE_URL`
- `VITE_SOCKET_URL`
- `VITE_GOOGLE_CLIENT_ID`

This setup provides end-to-end CI/CD automation on top of existing Docker containerization, significantly reducing manual deployment effort while improving release consistency and reliability.
