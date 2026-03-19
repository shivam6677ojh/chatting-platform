# Realtime MERN Chat App

Build a full-stack real-time chat application using the MERN stack with the following features:

Frontend:
- Use React.js with a clean and responsive UI
- Implement user authentication (login/register)
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

2. Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

3. Start backend:

```bash
cd server
npm run dev
```

4. Start frontend:

```bash
cd client
npm run dev
```

5. Open the app:
- http://localhost:5173

## Backend API (Summary)
- POST /api/auth/register
- POST /api/auth/login
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
