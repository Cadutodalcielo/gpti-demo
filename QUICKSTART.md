
# Quick Start Guide

Get the PDF Expense Analyzer running in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Node.js 18+ installed

## Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

## Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Create .env file with your OpenAI key
cat > .env << EOF
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=expenses_db
OPENAI_API_KEY=sk-your-actual-key-here
EOF

# Start Docker containers
docker-compose up --build
```

Wait for the message: `Application startup complete`

Backend is now running at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

## Step 3: Setup Frontend

Open a new terminal:

```bash
# Navigate to frontend directory
cd gpti-demo

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend is now running at: http://localhost:3000

## Step 4: Use the App

1. Open your browser to http://localhost:3000
2. Drag and drop a PDF receipt or click to upload
3. Wait for AI analysis (15-30 seconds)
4. See your expense automatically categorized!
5. Edit or delete expenses as needed

## Test PDF

Don't have a receipt handy? You can test with any PDF containing expense information like:
- Restaurant receipts
- Medical bills
- Shopping invoices
- Utility bills

## Troubleshooting

### "Failed to upload PDF"
- Check that backend is running on port 8000
- Verify your OpenAI API key is correct in `backend/.env`

### "Connection refused"
- Make sure Docker containers are running: `docker ps`
- Check backend logs: `docker-compose logs -f api`

### OpenAI API errors
- Verify you have credits in your OpenAI account
- Check rate limits on your account
- Ensure you have access to GPT-4 models

## What's Next?

- Check out the full README.md for advanced features
- Explore the API documentation at http://localhost:8000/docs
- Customize expense categories in `backend/app/services/openai_service.py`

## Stopping the App

### Stop Frontend
Press `Ctrl+C` in the terminal running Next.js

### Stop Backend
```bash
cd backend
docker-compose down
```

To also remove the database:
```bash
docker-compose down -v
```

## Need Help?

- Backend issues: Check `backend/README.md`
- API reference: http://localhost:8000/docs
- Frontend issues: Check browser console for errors

Enjoy analyzing your expenses! 🎉
