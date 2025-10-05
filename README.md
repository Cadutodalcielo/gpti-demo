# PDF Expense Analyzer with AI

A full-stack application for analyzing expense receipts from PDFs using OpenAI's GPT-4 and Vision APIs. Upload your receipts, and the AI automatically extracts and categorizes expense information.

## Features

- 📤 **PDF Upload**: Drag-and-drop or click to upload expense receipts
- 🤖 **AI Analysis**: Automatic extraction of expense data using OpenAI
- 🏷️ **Smart Categorization**: Auto-categorize expenses (Health, Food, Transport, etc.)
- 💰 **Expense Management**: View, edit, and delete expenses
- 🔍 **Filtering**: Filter expenses by category
- 📊 **Total Calculation**: Automatic total amount calculation
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **PostgreSQL** - Robust relational database
- **OpenAI API** - GPT-4 and Vision for expense analysis
- **Docker** - Containerization

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React version
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- Node.js 18+ (for local frontend development)

### 1. Clone and Setup

```bash
cd /home/cadutodalcielo/desarrollo/gpti-demo
```

### 2. Backend Setup

```bash
cd backend

# Create environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here

# Start backend services
docker-compose up --build
```

Backend will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 3. Frontend Setup

Open a new terminal:

```bash
cd gpti-demo

# Install dependencies
npm install

# Create environment file (if not blocked)
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:3000

## Usage

1. **Open the app** at http://localhost:3000
2. **Upload a PDF** expense receipt by dragging or clicking
3. **Wait for AI analysis** - the system will extract:
   - Expense category
   - Amount
   - Date
   - Vendor/business name
   - Description
4. **Review the results** in the expenses table
5. **Edit if needed** - click "Editar" to modify any field
6. **Filter by category** using the dropdown
7. **Delete expenses** with the "Eliminar" button

## How It Works

### Analysis Process

1. **PDF Upload**: User uploads an expense receipt (PDF)
2. **Image Conversion**: PDF is converted to images (up to 3 pages)
3. **AI Analysis**: GPT-4o analyzes all images with vision capabilities
4. **Data Extraction**: AI extracts structured data from the complete document:
   - Category (from predefined list)
   - Amount (numeric value)
   - Date (YYYY-MM-DD format)
   - Vendor (business name)
   - Description (brief summary)
5. **Storage**: Data saved to PostgreSQL, PDF stored in uploads folder
6. **Display**: Results shown in the frontend with edit capabilities

### Expense Categories

The system categorizes expenses into 8 categories:

- 🏥 **Salud** (Health)
- 🍔 **Comida** (Food)
- 🚗 **Transporte** (Transportation)
- 🏠 **Vivienda** (Housing)
- 🎮 **Entretenimiento** (Entertainment)
- 💡 **Servicios** (Utilities)
- 📚 **Educación** (Education)
- 📦 **Otros** (Other)

## Project Structure

```
gpti-demo/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # API endpoints
│   │   ├── models.py          # Database models
│   │   ├── schemas.py         # Pydantic schemas
│   │   ├── database.py        # DB configuration
│   │   └── services/
│   │       └── openai_service.py  # AI integration
│   ├── uploads/               # PDF storage
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── requirements.txt
│
└── gpti-demo/                 # Next.js frontend
    ├── app/
    │   ├── page.tsx           # Main page
    │   ├── layout.tsx         # Root layout
    │   └── globals.css        # Global styles
    ├── components/
    │   ├── PDFUploader.tsx    # Upload component
    │   └── ExpensesList.tsx   # Expenses table
    ├── lib/
    │   └── api.ts             # API client
    ├── types/
    │   └── expense.ts         # TypeScript types
    └── package.json
```

## API Endpoints

### Expenses

- `POST /expenses/upload` - Upload and analyze PDF
- `GET /expenses/` - List all expenses (with optional category filter)
- `GET /expenses/{id}` - Get single expense
- `PUT /expenses/{id}` - Update expense
- `DELETE /expenses/{id}` - Delete expense and PDF
- `GET /expenses/categories/list` - Get available categories

### General

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

## Development

### Backend Development

```bash
cd backend

# View logs
docker-compose logs -f api

# Access database
docker-compose exec postgres psql -U postgres -d expenses_db

# Rebuild after changes
docker-compose down
docker-compose up --build
```

### Frontend Development

```bash
cd gpti-demo

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=expenses_db
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Frontend Environment Variables

The frontend uses `NEXT_PUBLIC_API_URL=http://localhost:8000` by default.

## Troubleshooting

### OpenAI API Issues

- Verify your API key is valid and has credits
- Check rate limits on your OpenAI account
- Ensure you have access to GPT-4 models

### PDF Analysis Fails

- Some PDFs are protected or have no extractable text
- The Vision API fallback should handle most cases
- Check the `analysis_method` field to see which method was used

### Database Connection Issues

- Wait for PostgreSQL to fully initialize (health check)
- Verify credentials in `.env` file
- Check if port 5432 is available

### CORS Errors

- Backend CORS is set to allow all origins in development
- For production, update allowed origins in `backend/app/main.py`

### Upload Failures

- Check file is actually a PDF
- Verify uploads directory has correct permissions
- Ensure backend has enough disk space

## Production Deployment

### Backend

1. Use proper secrets management for API keys
2. Update CORS settings for your domain
3. Use cloud storage (S3/GCS) instead of local files
4. Set up proper logging and monitoring
5. Enable rate limiting
6. Use production-grade PostgreSQL
7. Set up SSL/TLS

### Frontend

1. Build optimized production bundle
2. Set correct API URL in environment
3. Deploy to Vercel, Netlify, or similar
4. Enable caching strategies
5. Set up error tracking (Sentry)

## Cost Considerations

OpenAI API costs (approximate):
- **GPT-4o** (vision): ~$0.01-0.03 per analysis

The system uses GPT-4o directly with vision capabilities for maximum accuracy. It can analyze multi-page documents (up to 3 pages) in a single request.

## Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Export expenses to CSV/Excel
- [ ] Monthly/yearly expense reports
- [ ] Budget tracking and alerts
- [ ] Receipt image preview
- [ ] Bulk upload support
- [ ] Mobile app
- [ ] OCR-only option (without AI)
- [ ] Custom category creation
- [ ] Expense analytics and charts

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation at http://localhost:8000/docs
3. Check OpenAI API status
4. Review Docker logs

## Acknowledgments

- OpenAI for GPT-4 and Vision APIs
- FastAPI framework
- Next.js and React teams
- All open-source contributors

---

Built with ❤️ using FastAPI, Next.js, and OpenAI
