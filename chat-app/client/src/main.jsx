import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import "./styles/global.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const AppTree = (
  <BrowserRouter>
    <AuthProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </AuthProvider>
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{AppTree}</GoogleOAuthProvider>
    ) : (
      AppTree
    )}
  </React.StrictMode>
);
