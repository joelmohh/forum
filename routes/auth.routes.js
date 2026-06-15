const Router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require("crypto");

const User = require('../models/User');
const { newSession, updateLastLogin } = require('../modules/auth/AuthManager');

const multer = require('multer');
const upload = multer()

Router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        await updateLastLogin(user._id);
        const token = await newSession(user, req.headers['user-agent'], req.ip);
        res.json({ token });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});


Router.post('/check-availability', async (req, res) => {
    const onlyUsername = req.query.username === 'true';
    const { username, email } = req.body;

    try {
        if (onlyUsername) {
            if (!username) {
                return res.status(400).json({
                    message: 'Username is required.',
                    usernameAvailable: false
                });
            }

            const usernameExists = await User.findOne({ username });

            if (usernameExists) {
                return res.json({
                    message: 'Username already exists.',
                    usernameAvailable: false
                });
            }

            return res.json({
                message: 'Username is available.',
                usernameAvailable: true
            });
        }

        if (!username || !email) {
            return res.status(400).json({
                message: 'Username and email are required.',
                usernameAvailable: false,
                emailAvailable: false
            });
        }

        const usernameExists = await User.findOne({ username });
        const emailExists = await User.findOne({ email });

        const response = {
            usernameAvailable: !usernameExists,
            emailAvailable: !emailExists,
        };

        if (!response.usernameAvailable && !response.emailAvailable) {
            return res.json({
                message: 'Username and email already exist.',
                ...response
            });
        }

        if (!response.usernameAvailable) {
            return res.json({
                message: 'Username already exists.',
                ...response
            });
        }

        if (!response.emailAvailable) {
            return res.json({
                message: 'Email already exists.',
                ...response
            });
        }

        return res.json({
            message: 'Username and email are available.',
            ...response
        });

    } catch (err) {
        console.error('Error checking availability:', err);
        return res.status(500).json({
            message: 'Internal server error.'
        });
    }
});

Router.post("/register", upload.single("profilePicture"), async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const displayName = req.body.displayName || username;
        const bio = req.body.bio || "";

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({
            $or: [{ email: normalizedEmail }, { username }]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "If the email is valid, we will send a code"
            });
        }

        await SignupSession.deleteMany({
            email: normalizedEmail
        });

        const passwordHash = await bcrypt.hash(password, 12);

        const otp = crypto.randomInt(100000, 999999).toString();

        const otpHash = hash(otp);

        const signup = await SignupSession.create({
            email: normalizedEmail,
            username,
            displayName,
            bio,
            passwordHash,
            otpHash,
            expiresAt: Date.now() + 10 * 60 * 1000,
            attempts: 0
        });

        await sendEmail({
            to: normalizedEmail,
            subject: "Seu código de verificação",
            text: `Seu código é: ${otp}`
        });

        return res.status(200).json({
            message: "If the email is valid, we sent a code",
            signupId: signup._id
        });

    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
})

Router.post("/verify-otp", async (req, res) => {
  try {
    const { signupId, code } = req.body;

    if (!signupId || !code) {
      return res.status(400).json({
        message: "Missing fields"
      });
    }

    const signup = await SignupSession.findById(signupId);

    if (!signup) {
      return res.status(400).json({
        message: "Invalid or expired session"
      });
    }

    // check expiry
    if (signup.expiresAt < Date.now()) {
      await SignupSession.deleteOne({ _id: signupId });

      return res.status(400).json({
        message: "Code expired"
      });
    }

    // check attempts
    if (signup.attempts >= 5) {
      await SignupSession.deleteOne({ _id: signupId });

      return res.status(429).json({
        message: "Too many attempts"
      });
    }

    // verify OTP
    const codeHash = hash(code);

    if (codeHash !== signup.otpHash) {
      signup.attempts += 1;
      await signup.save();

      return res.status(400).json({
        message: "Invalid code"
      });
    }

    // OTP OK → criar usuário REAL
    const user = await User.create({
      username: signup.username,
      displayName: signup.displayName,
      email: signup.email,
      password: signup.passwordHash,
      bio: signup.bio,
      verified: true
    });

    // cleanup
    await SignupSession.deleteOne({ _id: signupId });

    return res.status(201).json({
      message: "Account created successfully",
      userId: user._id
    });

  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


module.exports = Router;