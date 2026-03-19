import bcrypt from "bcryptjs";

import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const error = new Error("Name, email and password are required");
      error.status = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error("Email already in use");
      error.status = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error("Email and password are required");
      error.status = 400;
      throw error;
    }

    const user = await User.findOne({ email });
    if (!user) {
      const error = new Error("Invalid credentials");
      error.status = 401;
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
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isOnline: user.isOnline,
        lastSeenAt: user.lastSeenAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};
