const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });
const createToken = (user) => jwt.sign(
  { sub: user._id.toString(), name: user.name, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
);

const validInput = (name, email, password) => {
  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim() || !password) return "Please complete every field";
  if (name.trim().length < 2 || name.trim().length > 60) return "Name must contain 2 to 60 characters";
  if (!/^\S+@\S+\.\S+$/.test(email)) return "Please enter a valid email address";
  if (password.length < 8) return "Password must contain at least 8 characters";
  return null;
};

const register = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    const error = validInput(name, email, password);
    if (error) return res.status(400).json({ message: error });
    if (await User.exists({ email })) return res.status(409).json({ message: "This email is already registered" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "This email is already registered" });
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email || !password) return res.status(400).json({ message: "Email and password are required" });
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Email or password is incorrect" });
    }
    res.json({ user: publicUser(user), token: createToken(user) });
  } catch (error) { next(error); }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
};

module.exports = { register, login, me };
