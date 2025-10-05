# 🚀 Iniciar el Backend

## Problema Actual
El frontend no puede conectarse al backend porque **el backend no está corriendo**.

## Solución Rápida (5 minutos)

### Paso 1: Ir a la carpeta backend
```bash
cd /home/cadutodalcielo/desarrollo/gpti-demo/backend
```

### Paso 2: Crear archivo .env con tu API Key de OpenAI

Crea el archivo `.env` con este contenido:

```bash
cat > .env << 'EOF'
OPENAI_API_KEY=sk-tu-clave-api-aqui
EOF
```

**⚠️ IMPORTANTE:** Reemplaza `sk-tu-clave-api-aqui` con tu clave real de OpenAI.

O simplemente crea el archivo manualmente:
```bash
echo "OPENAI_API_KEY=sk-tu-clave-aqui" > .env
```

Si no tienes una clave, obtén una aquí: https://platform.openai.com/api-keys

### Paso 3: Limpiar contenedores anteriores (IMPORTANTE)

Si ya habías intentado iniciar el backend antes, necesitas limpiar todo:

```bash
# Detener y eliminar contenedores y volúmenes
docker-compose down -v

# Eliminar imágenes antiguas
docker rmi gpti-demo-backend-api 2>/dev/null || true
```

### Paso 4: Iniciar el backend con Docker
```bash
docker-compose up --build
```

### Paso 5: Esperar a que inicie
Verás algo como:
```
gpti_postgres | database system is ready to accept connections
gpti_api      | INFO:     Application startup complete.
gpti_api      | INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ **¡Listo!** Ahora el backend está corriendo.

### Paso 6: Verificar que funciona
Abre en tu navegador: http://localhost:8000/docs

Deberías ver la documentación interactiva de la API.

### Paso 7: Recargar el Frontend
Recarga la página del frontend (http://localhost:3000) y ya debería funcionar.

---

## Comandos Útiles

### Ver logs del backend
```bash
docker-compose logs -f api
```

### Detener el backend
```bash
docker-compose down
```

### Reiniciar el backend
```bash
docker-compose restart
```

### Ver si el backend está corriendo
```bash
docker-compose ps
```

### Verificar que el puerto 8000 está escuchando
```bash
curl http://localhost:8000/health
```

Debería responder: `{"status":"healthy"}`

---

## Errores Comunes

### "Cannot connect to the Docker daemon"
- Inicia Docker Desktop
- O inicia el servicio: `sudo systemctl start docker`

### "port is already allocated"
- Otro servicio está usando el puerto 8000
- Detén el otro servicio o cambia el puerto en `docker-compose.yml`

### "Invalid OpenAI API Key"
- Verifica que tu clave en `.env` es correcta
- Verifica que la clave tiene créditos en tu cuenta OpenAI
- Verifica que la clave tiene acceso a GPT-4o-mini

### El backend se detiene constantemente
- Revisa los logs: `docker-compose logs api`
- Es probable que haya un error en la clave de OpenAI o en la conexión a la DB

---

## Estructura de Archivos Necesaria

```
backend/
├── .env                    ← ¡Debes crear este archivo!
├── docker-compose.yml      ← Ya existe
├── Dockerfile              ← Ya existe
├── requirements.txt        ← Ya existe
└── app/
    ├── main.py
    ├── models.py
    ├── schemas.py
    ├── database.py
    └── services/
        └── openai_service.py
```

---

## ¿Necesitas Ayuda?

1. Verifica los logs: `docker-compose logs -f`
2. Verifica que Docker está corriendo: `docker ps`
3. Verifica la API de OpenAI: https://platform.openai.com/account/usage
4. Verifica el archivo `.env` existe y tiene tu clave

---

**Una vez que el backend esté corriendo, el frontend se conectará automáticamente y podrás subir PDFs para analizar gastos.** 🎉
