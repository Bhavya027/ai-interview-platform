# AI Interview Platform

A full-stack web app for practising coding interviews. An interviewer opens a time slot, a candidate books it, and both join a private room with a shared live code editor. When the interviewer ends the round, the code is sent to the Google Gemini API, which returns a score out of 10 with strengths and improvements.

**Live site:** https://ai-interview-platform-stgg.onrender.com
(Hosted on the free Render plan, so the first load can take about 50 seconds while the server wakes up.)

Course project: Full Stack Development – II (24CSP-304), BE-CSE, Chandigarh University
Student: Bhavya Sharma (UID 24BCS12397), Section 24BCS804-B
Faculty: Ms. Muskan Deswal

## Features

- Register and log in as a **candidate** or an **interviewer** (JWT, passwords hashed with bcrypt)
- Role-based access: 401 for a missing or bad token, 403 for the wrong role
- Interviewers open future slots, candidates book them (one atomic update, a second booking gets 409)
- Booking confirmation email (Nodemailer with the Brevo SMTP relay)
- Live room with a shared code editor (Socket.io, one room per interview)
- AI review after the interview (Gemini API) with a retry option
- Dashboards for both roles, with summary numbers from a GraphQL endpoint
- 15 Jest tests, run automatically by GitHub Actions on every push

## Tech stack

| Part | Technology |
|---|---|
| Backend | Node.js, Express 5 |
| Database | MySQL (local), TiDB Cloud (online), Sequelize |
| Real time | Socket.io |
| APIs | REST and GraphQL (GraphQL Yoga) |
| AI | Google Gemini API (`@google/genai`) |
| Email | Nodemailer, Brevo SMTP |
| Frontend | HTML, CSS, JavaScript |
| Testing and CI | Jest, GitHub Actions |
| Hosting | Render |

## Run it locally

1. Install Node.js and MySQL, then create an empty database (for example `ai_interview`).
2. Clone the repo and install packages:
   ```
   git clone https://github.com/Bhavya027/ai-interview-platform.git
   cd ai-interview-platform
   npm install
   ```
3. Create a `.env` file in the project folder (use your own values):
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASS=your_mysql_password
   DB_NAME=ai_interview
   JWT_SECRET=any_long_random_text
   GEMINI_API_KEY=your_gemini_key
   GEMINI_MODEL=model_name_you_want_to_use
   ```
   Optional, only for the booking email:
   ```
   MAIL_HOST=smtp-relay.brevo.com
   MAIL_PORT=2525
   MAIL_USER=your_brevo_login
   MAIL_PASS=your_brevo_smtp_key
   MAIL_FROM=your_verified_sender_email
   ```
   For an online database such as TiDB Cloud, also set `DB_SSL=true`.
4. Start the server:
   ```
   npm start
   ```
   Open http://localhost:3000. The tables are created automatically on the first run.
5. Run the tests:
   ```
   npm test
   ```

The `.env` file is not in the repository on purpose, because it holds secret keys.

## Main API routes

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | /api/auth/register | Anyone | Create an account |
| POST | /api/auth/login | Anyone | Log in, get a JWT |
| GET | /api/auth/me | Logged in | Current user |
| POST | /api/interviews | Interviewer | Create a slot |
| GET | /api/interviews/available | Candidate | Open slots |
| GET | /api/interviews/my | Both | My interviews |
| POST | /api/interviews/:id/book | Candidate | Book a slot |
| POST | /api/interviews/:id/feedback | Interviewer | Generate or regenerate the AI review |
| GET | /api/interviews/:id/result | Members | Saved code, score and feedback |
| POST | /graphql | Logged in | me, myInterviews, interview, availableSlots, stats |

## Folder structure

```
config/        database connection
controllers/   auth and interview logic
gql/           GraphQL schema and resolvers
middleware/    JWT check and role check
models/        User, Job, Interview, Result
public/        HTML pages, CSS, JavaScript
routes/        REST routes
services/      AI feedback and mail
sockets/       Socket.io interview room
tests/         Jest tests
.github/       GitHub Actions workflow
server.js      entry point
```

## Known limits

- The free Render plan sleeps when idle, so the first request is slow.
- The free Gemini tier is rate limited, so the review can fail now and then. The interviewer can retry.
- The code is only reviewed by the AI, it is not executed.
