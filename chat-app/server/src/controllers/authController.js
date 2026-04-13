import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isOnline: user.isOnline,
  lastSeenAt: user.lastSeenAt,
  authProvider: user.authProvider,
});

export const register = async (req, res, next) => {
  try {
    const allowLocalSignup = process.env.ALLOW_LOCAL_SIGNUP !== "false";
    if (!allowLocalSignup) {
      const error = new Error("Local signup is disabled. Use Google Sign-In.");
      error.status = 403;
      throw error;
    }

    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();

    if (!name || !email || !password) {
      const error = new Error("Name, email and password are required");
      error.status = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const error = new Error("Email already in use");
      error.status = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      authProvider: "local",
      password: hashedPassword,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();

    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }

    if (user.authProvider === "google") {
      const error = new Error("This account uses Google Sign-In.");
      error.status = 400;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid credentials");
      error.status = 401;
      throw error;
    }

    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      const error = new Error("Google auth is not configured on server");
      error.status = 500;
      throw error;
    }

    if (!idToken) {
      const error = new Error("Google idToken is required");
      error.status = 400;
      throw error;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const error = new Error("Failed to verify Google token payload");
      error.status = 401;
      throw error;
    }

    if (!payload.email || !payload.sub || payload.email_verified !== true) {
      const error = new Error("Google account email is not verified");
      error.status = 401;
      throw error;
    }

    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }],
    });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email.toLowerCase(),
        authProvider: "google",
        googleId: payload.sub,
      });
    } else {
      user.authProvider = "google";
      user.googleId = payload.sub;
      if (!user.name && payload.name) {
        user.name = payload.name;
      }
      await user.save();
    }

    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};
