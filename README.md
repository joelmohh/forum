# Forum App

A simple forum application built with **Node.js**, **Express**, and **MongoDB**. It uses **EJS** for server-side rendering and includes features such as user authentication, questions, answers, tags, notifications, and image uploads.

![Time spent in the project](https://hackatime.hackclub.com/api/v1/badge/U0A19UWEN3G/joelmohh/forum)

> [!NOTE]
> **Try the live demo:** https://forum.joelmo.dev
>
> If you don't want to create an account, you can use the demo credentials below:
>
> **Email:** `test@example.com`  
> **Password:** `12345678aA@`

## Features

- User registration and login (OTP + JWT)
- Create, edit, and delete questions
- Answer on and vote for questions
- Browse questions by tags
- Image uploads with automatic resizing
- Email notifications (SMTP)
- Server-side rendering with EJS

## Tech Stack

- Node.js
- Express
- MongoDB
- EJS
- Multer
- Nodemailer
- bcrypt
- jsonwebtoken

## Requirements

> [!IMPORTANT]
> If you're developing without an SMTP server, you can disable it by setting the `SMTP` variable to `false` in the `.env` file.
>
> If this variable is not set, SMTP will remain enabled.

Before running the project, you'll need:

- Node.js
- A MongoDB database
- A Hack Club CDN API key
- An SMTP service

## Environment Variables

Create a `.env` file in the project root:

```env
MONGO_URI=YOUR_MONGO_DB_URI

SMTP_HOST=smtp.joelmo.dev
SMTP_PORT=444
SMTP_USER=mail@yourdomain.com
SMTP_PASS=ULTRA_SECURE_PASS

JWT_SECRET=ULTRA_SECRET_KEY
NODE_ENV=development

# If undefined, all users will use the default profile picture
HC_CDN=super_secure_key
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/joelmohh/forum.git
cd forum
```

2. Install the dependencies:

```bash
npm install
```

3. Create a `.env` file using the variables above.

4. Start the application:

```bash
npm start
```

The application will be available at **http://localhost:3000** (or the port specified by the `PORT` environment variable).

## Contributing

Contributions are always welcome!

If you have an idea, found a bug, or want to improve the project, feel free to open an issue or submit a pull request.
