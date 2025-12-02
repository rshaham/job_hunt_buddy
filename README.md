# Career Forager

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Try It Live](https://img.shields.io/badge/Try_It_Live-careerforager.com-green.svg)](https://www.careerforager.com)

**Your AI-powered job search companion.** Track applications, get your resume graded, generate tailored cover letters, and prepare for interviews - all in one place. Your data stays on your computer, private and secure.

> [!IMPORTANT]
> By using this tool, you agree to use it ethically and responsibly. See [Disclaimer](#disclaimer) below.

---

## What Can Career Forager Do?

### Core Features

- **Kanban Board** - Drag and drop jobs across stages (Interested → Applied → Interviewing → Offer)
- **JD Analysis** - Paste a job description and AI extracts the key requirements
- **Resume Grading** - See how well your resume matches the job (A-F grade + detailed analysis)
- **Resume Tailoring** - AI rewrites your resume to match job requirements with diff view
- **Keyword Matcher** - See which JD keywords appear in your resume vs what's missing
- **Cover Letters** - AI generates tailored cover letters you can refine through chat
- **Interview Prep** - Chat with AI to practice interview questions

### Additional Features

- **Career Coach** - AI-powered career guidance with skill tracking and personalized advice
- **Emails Tab** - Generate professional emails (Thank You, Follow Up, Withdraw, Negotiate)
- **Interviewer Intel** - Paste interviewer LinkedIn bios to get AI-powered insights
- **Notes & Contacts** - Track notes, contacts, and timeline events for each job
- **Saved Stories** - Save great interview answers to reuse across job applications
- **Context Documents** - Upload PDFs (portfolio, certifications) to enrich AI context
- **CSV Export** - Export all jobs to spreadsheet format for external tracking

---

## Quick Start Guide

This guide will walk you through setting up Career Forager, even if you've never used a terminal before!

### What You'll Need

- A computer (Windows, Mac, or Linux)
- About 15-20 minutes for first-time setup
- An API key from Anthropic, Google, or a local AI setup (we'll help you get one!)

---

### Step 1: Open the Terminal

The **terminal** (also called Command Prompt or PowerShell on Windows) is a text-based way to give your computer instructions. Think of it like texting commands to your computer instead of clicking buttons.

<details>
<summary><strong>Windows Instructions</strong></summary>

1. Press the **Windows key** on your keyboard
2. Type **"PowerShell"** or **"Command Prompt"**
3. Click on the app that appears
4. You'll see a window with text - this is your terminal!

**What you'll see:** A window with text like `C:\Users\YourName>` - this is normal! It's waiting for you to type a command.

</details>

<details>
<summary><strong>Mac Instructions</strong></summary>

1. Press **Command + Space** to open Spotlight
2. Type **"Terminal"**
3. Press **Enter**
4. You'll see a window with text - this is your terminal!

**What you'll see:** Something like `yourname@MacBook ~ %` - this is your terminal waiting for commands.

</details>

<details>
<summary><strong>Linux Instructions</strong></summary>

1. Press **Ctrl + Alt + T** (works on most Linux distributions)
   - Or search for "Terminal" in your applications menu
2. You'll see a window with text

**What you'll see:** A prompt like `username@computer:~$`

</details>

---

### Step 2: Install Node.js

**Node.js** is a program that lets your computer run JavaScript applications like Career Forager. Think of it as installing a "translator" that helps your computer understand the app.

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Click the big green button that says **"LTS"** (Long Term Support - the stable version)
3. Run the downloaded file and follow the installation wizard
4. Accept all the default options - they work great!

**Verify it worked:**

1. Open a **NEW** terminal window (important: open a new one after installing!)
2. Type: `node --version`
3. Press **Enter**
4. You should see a version number like `v20.10.0`

> [!TIP]
> If you see an error like "command not found", try closing and reopening the terminal, or restart your computer.

---

### Step 3: Download Career Forager

**Option A: Download as ZIP (Easiest)**

1. Go to [https://github.com/rshaham/job_hunt_buddy](https://github.com/rshaham/job_hunt_buddy)
2. Click the green **"Code"** button
3. Click **"Download ZIP"**
4. Find the downloaded file (usually in your Downloads folder)
5. **Extract the ZIP:**
   - **Windows:** Right-click and select "Extract All"
   - **Mac:** Double-click the ZIP file
6. Remember where you extracted it - you'll need this location!

**Option B: Using Git (If you have it installed)**

```bash
git clone https://github.com/rshaham/job_hunt_buddy.git
```

---

### Step 4: Navigate to the Folder

You need to tell the terminal where Career Forager is located.

1. In your terminal, type `cd ` (that's "cd" followed by a space)
2. Then type the path to your Career Forager folder

**Examples:**

```bash
# Windows example:
cd C:\Users\YourName\Downloads\job_hunt_buddy-main

# Mac/Linux example:
cd ~/Downloads/job_hunt_buddy-main
```

> [!TIP]
> **Drag and drop trick:** On many systems, you can type `cd ` and then drag the folder from your file explorer into the terminal window - it will automatically fill in the path!

**How to know it worked:** The text before your cursor should change to show you're in the job_hunt_buddy folder.

---

### Step 5: Install Dependencies

Career Forager uses building blocks created by other developers (called "packages"). This command downloads all of them.

In your terminal, type:

```bash
npm install
```

Then press **Enter**.

**What you'll see:**

- Lots of text scrolling by - this is normal!
- It might take 1-2 minutes
- You might see some "warnings" - these are usually fine to ignore
- Wait until you see your terminal prompt again

> [!WARNING]
> If you see `npm: command not found`, go back to Step 2 and make sure Node.js is installed, then open a NEW terminal window.

---

### Step 6: Start the App

In your terminal, type:

```bash
npm run dev
```

**What you'll see:**

- Some text about "VITE" starting up
- A line that says something like: `Local: http://localhost:5173`
- The terminal will stay running - **don't close it!**

Now open your web browser and go to:

```
http://localhost:5173
```

**You should see Career Forager!** The app is running on your own computer.

> [!IMPORTANT]
> Keep the terminal window open while using the app. To stop the app later, press **Ctrl+C** in the terminal.

---

### Step 7: Set Up Your AI Provider

When you first open Career Forager, a **Getting Started** wizard will guide you through setup. You'll need an API key to use AI features.

**Anthropic (Claude) - Recommended:**

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account
3. Go to API Keys
4. Create a new key and copy it

**Google Gemini - Free tier available:**

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Create an API key and copy it

**Local AI (Ollama) - No API key needed:**

1. Install [Ollama](https://ollama.ai/)
2. Run `ollama run llama3.2` to download a model
3. Select "Local / Ollama" in Career Forager

> [!NOTE]
> Using AI features costs a small amount per use (usually pennies). Anthropic and Google give new accounts some free credits to start.

---

## Using Career Forager

### Adding Your First Job

1. Click **"Add Job"** in the top right
2. Paste the job posting URL (optional) and the full job description text
3. Click **"Analyze with AI"** to automatically extract job details
4. Review the AI-extracted information
5. Click **"Save"** to add it to your board

### Getting Your Resume Graded

1. Click on a job card to open the detail view
2. Go to the **"Resume Fit"** tab
3. Upload your resume (PDF) or use your default resume
4. See your grade (A-F) and suggestions for improvement

### Generating a Cover Letter

1. Open a job's detail view
2. Go to the **"Cover Letter"** tab
3. Click **"Generate Cover Letter"**
4. Refine it by chatting with the AI

### Interview Prep

1. Open a job's detail view
2. Go to the **"Prep"** tab
3. Ask questions or request practice interview questions
4. Practice your responses with AI coaching
5. Click **"Save to Profile"** on great answers to reuse them later

### Tailoring Your Resume

1. Grade your resume first (Resume tab)
2. Click **"Tailor Resume"** to open the tailoring view
3. Click **"Auto-Tailor"** for one-click AI optimization
4. Or chat to make specific changes ("emphasize my Python experience")
5. Toggle between **Diff** and **Side-by-side** to see what changed

### Sending Professional Emails

1. Go to the **"Emails"** tab in a job's detail view
2. Choose an email type: Thank You, Follow Up, Withdraw, or Negotiate
3. Click **"Generate"** to create a draft
4. Refine through chat if needed
5. Copy to clipboard when ready

### Tracking Contacts & Timeline

1. Go to the **"Notes"** tab in a job's detail view
2. Add **Contacts** - recruiters, hiring managers with their info
3. Add **Timeline Events** - applied date, interviews, offers
4. Use **Notes** for research, prep notes, or reminders
5. For contacts, click **"Generate Intel"** to get AI insights from their LinkedIn bio

### Building Your Profile (Settings → Profile)

- **Saved Stories** - Your best interview answers, saved from Prep chats
- **Additional Context** - Career goals, skills, projects not on your resume
- **Context Documents** - Upload PDFs (portfolio, certifications) for richer AI context

### Career Coaching (🎯 button in header)

1. Click the **🎯** button in the header to open Career Coach
2. **Coach Tab** - Get AI analysis of your job search patterns and career advice
3. **Skills Tab** - View and manage your skills profile:
   - Technical skills (programming languages, tools, frameworks)
   - Soft skills (leadership, communication, problem-solving)
   - Domain skills (industry-specific knowledge)
4. Use **"Extract from Resume"** to automatically identify skills from your resume

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm: command not found` | Node.js not installed or terminal not restarted. Reinstall Node.js and open a NEW terminal. |
| `ENOENT: no such file or directory` | You're in the wrong folder. Use `cd` to navigate to the job_hunt_buddy folder. |
| Page won't load in browser | Make sure the terminal shows `Local: http://localhost:5173` and copy that URL exactly. |
| API key not working | Make sure you copied the full key. Check for extra spaces at the beginning or end. |
| `npm install` shows errors | Try deleting the `node_modules` folder and running `npm install` again. |
| Port 5173 already in use | Another app is using that port. Close other terminals running `npm run dev` or restart your computer. |

### Stopping and Restarting the App

```bash
# To stop: Press Ctrl+C in the terminal

# To restart: Run this again
npm run dev
```

---

## Privacy & Security

- **All data stays on YOUR computer** - stored in your browser's local database
- **Your API key is stored locally** - never sent anywhere except to your chosen AI provider
- **No data sent to third parties** - PDF parsing, storage, everything happens locally

---

<details>
<summary><strong>For Developers</strong></summary>

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Storage | Dexie.js (IndexedDB) |
| Drag & Drop | @dnd-kit |
| PDF Parsing | pdfjs-dist |
| AI | Claude API / Gemini API / OpenAI-compatible |
| Icons | Lucide React |

### Project Structure

```
src/
├── components/
│   ├── Board/          # Kanban board components
│   ├── JobDetail/      # Job detail tabs (Resume, Cover Letter, Prep, Notes, Emails)
│   ├── AddJob/         # Add job modal
│   ├── Settings/       # Settings modal with Profile tab
│   ├── GettingStarted/ # Onboarding wizard
│   ├── FeatureGuide/   # Feature documentation modal
│   ├── Privacy/        # Privacy & Terms modal
│   └── ui/             # Reusable UI components
├── services/
│   ├── ai.ts           # AI provider integration
│   ├── db.ts           # IndexedDB operations
│   └── pdfParser.ts    # PDF text extraction
├── stores/
│   └── appStore.ts     # Zustand state management
├── types/
│   └── index.ts        # TypeScript interfaces
└── utils/
    ├── helpers.ts      # Utility functions
    └── prompts.ts      # AI prompt templates
```

### Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

</details>

---

## Disclaimer

Career Forager is provided **free and open source** as a service to the job-seeking community. By using this tool, you agree to:

- **Use it ethically and responsibly** — Be honest in your applications. AI-generated content should be reviewed and personalized before sending. Don't misrepresent your qualifications or spam employers.
- **Accept it as-is** — We make no guarantees about effectiveness, accuracy, or job search outcomes. This tool is meant to assist, not replace, your own judgment.
- **Respect the spirit of the project** — This is built to help people, not to game hiring systems or deceive employers.

We do not endorse any specific actions you take using this tool. Your job search decisions and how you represent yourself to employers are your responsibility.

---

## License

MIT - See [LICENSE](LICENSE) for details.

---

**Need help?** Click the **?** button in the app header for the Getting Started guide, or **📖** for the Feature Guide!
