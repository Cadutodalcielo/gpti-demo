# PDF Expense Analyzer - Backend

FastAPI backend for analyzing expense PDFs using OpenAI's GPT-4 and Vision APIs.

## Features

- 📄 PDF upload and processing
- 🤖 OpenAI GPT-4 for text-based expense analysis
- 👁️ OpenAI Vision API as fallback for image-based analysis
- 🗂️ Automatic expense categorization (Salud, Comida, Transporte, etc.)
- 💾 PostgreSQL database for expense storage
- 🔄 Full CRUD operations for expenses

## Quick Start

### 1. Environment Setup

Create a `.env` file (copy from `.env.example`):

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=expenses_db
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Important:** Add your OpenAI API key to the `.env` file.

### 2. Start Services

```bash
docker-compose up --build
```

The API will be available at:
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 3. Test the API

Visit http://localhost:8000/docs to test the API endpoints interactively.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app and endpoints
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   └── services/
│       ├── __init__.py
│       └── openai_service.py # OpenAI integration
├── uploads/                 # PDF storage (created automatically)
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

## API Endpoints

### Expense Endpoints

#### Upload PDF
- **POST** `/expenses/upload`
- Upload a PDF expense receipt for analysis
- Request: `multipart/form-data` with PDF file
- Response: Analyzed expense data

#### List Expenses
- **GET** `/expenses/`
- Query params: `skip`, `limit`, `category`
- Returns list of expenses with optional filtering

#### Get Expense
- **GET** `/expenses/{expense_id}`
- Returns a single expense by ID

#### Update Expense
- **PUT** `/expenses/{expense_id}`
- Update expense details (category, amount, date, vendor, description)

#### Delete Expense
- **DELETE** `/expenses/{expense_id}`
- Deletes expense and associated PDF file

#### Get Categories
- **GET** `/expenses/categories/list`
- Returns list of available expense categories

## Expense Categories

The system categorizes expenses into:

- **Salud** (Health)
- **Comida** (Food)
- **Transporte** (Transportation)
- **Vivienda** (Housing)
- **Entretenimiento** (Entertainment)
- **Servicios** (Utilities)
- **Educación** (Education)
- **Otros** (Other)

## How It Works

### PDF Analysis Flow

1. **Upload**: User uploads a PDF expense receipt
2. **Text Extraction**: PyPDF2 attempts to extract text from the PDF
3. **AI Analysis**: 
   - If text extraction succeeds: GPT-4 analyzes the text
   - If text extraction fails: PDF is converted to image and analyzed with Vision API
4. **Data Extraction**: AI extracts:
   - Category
   - Amount
   - Date
   - Vendor/Business name
   - Description
5. **Storage**: Expense data and PDF file are saved
6. **Response**: Structured expense data returned to user

### OpenAI Service

The `openai_service.py` module handles:

- **PDF to Images**: Converts PDF pages to high-quality JPEG images (up to 3 pages)
- **GPT-4o Vision Analysis**: Sends all images to GPT-4o for complete document analysis
- **Structured Extraction**: Extracts category, amount, date, vendor, and description
- **Prompt Engineering**: Ensures consistent categorization in Spanish

**Model Used:**
- `gpt-4o` - Latest multimodal model with vision capabilities for direct PDF analysis

## Database Schema

### Expense Model

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| category | String | Expense category |
| amount | Numeric(10,2) | Expense amount |
| date | Date | Expense date (optional) |
| vendor | String | Vendor/business name (optional) |
| description | Text | Expense description (optional) |
| pdf_filename | String | Original PDF filename |
| pdf_path | String | Path to stored PDF |
| analysis_method | String | 'text' or 'vision' |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

## Development

### View Logs

```bash
# All services
docker-compose logs -f

# API only
docker-compose logs -f api

# Database only
docker-compose logs -f postgres
```

### Access Database

```bash
docker-compose exec postgres psql -U postgres -d expenses_db
```

### Rebuild After Changes

```bash
docker-compose down
docker-compose up --build
```

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Data

```bash
docker-compose down -v
```

## Dependencies

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **SQLAlchemy** - ORM
- **Psycopg2** - PostgreSQL adapter
- **OpenAI** - OpenAI API client
- **PyPDF2** - PDF text extraction
- **pdf2image** - PDF to image conversion
- **Pillow** - Image processing
- **python-multipart** - File upload support

## Troubleshooting

### OpenAI API Key Not Working

Make sure your `.env` file contains a valid OpenAI API key:
```
OPENAI_API_KEY=sk-...
```

### PDF Analysis Fails

- Check if the PDF is readable (some PDFs are protected)
- Ensure poppler-utils is installed (included in Dockerfile)
- Check OpenAI API quota and limits

### Database Connection Issues

- Ensure PostgreSQL is running: `docker-compose ps`
- Check database credentials in `.env`
- Wait for health check: PostgreSQL needs time to initialize

### Upload Directory Permissions

The uploads directory is created automatically. If you have permission issues:
```bash
chmod 755 uploads
```

## Production Considerations

1. **API Key Security**: Use proper secrets management
2. **CORS**: Update allowed origins in `main.py`
3. **File Storage**: Consider cloud storage (S3) for production
4. **Rate Limiting**: Add rate limiting for API endpoints
5. **Authentication**: Add user authentication if needed
6. **Monitoring**: Add logging and monitoring
7. **Backups**: Regular database backups

## License

MIT