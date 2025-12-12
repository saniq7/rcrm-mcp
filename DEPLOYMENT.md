# Руководство по развертыванию RetailCRM MCP Server

Этот документ описывает различные способы развертывания MCP сервера в различных окружениях.

## Содержание

1. [Локальное развертывание](#локальное-развертывание)
2. [Docker развертывание](#docker-развертывание)
3. [Облачное развертывание](#облачное-развертывание)
4. [Масштабирование](#масштабирование)
5. [Мониторинг и логирование](#мониторинг-и-логирование)
6. [Безопасность](#безопасность)

---

## Локальное развертывание

### Требования

- Node.js 20+
- npm 10+
- Git

### Шаги

1. **Клонировать репозиторий**
   ```bash
   git clone <repository-url>
   cd retailcrm-mcp-server
   ```

2. **Установить зависимости**
   ```bash
   npm install
   ```

3. **Создать файл .env**
   ```bash
   cp .env.example .env
   ```

4. **Отредактировать .env**
   ```bash
   RETAILCRM_URL=https://your-instance.retailcrm.ru
   RETAILCRM_API_KEY=your-api-key-here
   NODE_ENV=production
   ```

5. **Собрать проект**
   ```bash
   npm run build
   ```

6. **Запустить сервер**
   ```bash
   npm start
   ```

7. **Проверить статус**
   ```bash
   curl http://localhost:3000/query -X POST \
     -H "Content-Type: application/json" \
     -d '{"operation": "get_leads_count", "params": {"date_from": "2025-10-01", "date_to": "2025-10-31"}}'
   ```

### Остановка сервера

```bash
# Ctrl+C в терминале
```

---

## Docker развертывание

### Требования

- Docker 20+
- Docker Compose 2+

### Вариант 1: Docker Compose (Рекомендуется)

1. **Клонировать репозиторий**
   ```bash
   git clone <repository-url>
   cd retailcrm-mcp-server
   ```

2. **Создать файл .env**
   ```bash
   cp .env.example .env
   ```

3. **Отредактировать .env**
   ```bash
   RETAILCRM_URL=https://your-instance.retailcrm.ru
   RETAILCRM_API_KEY=your-api-key-here
   ```

4. **Запустить контейнер**
   ```bash
   docker-compose up -d
   ```

5. **Проверить статус**
   ```bash
   docker-compose ps
   docker-compose logs -f retailcrm-mcp
   ```

6. **Остановить контейнер**
   ```bash
   docker-compose down
   ```

### Вариант 2: Docker build и run

1. **Собрать образ**
   ```bash
   docker build -t retailcrm-mcp:latest .
   ```

2. **Запустить контейнер**
   ```bash
   docker run -d \
     --name retailcrm-mcp \
     -e RETAILCRM_URL=https://your-instance.retailcrm.ru \
     -e RETAILCRM_API_KEY=your-api-key-here \
     -p 3000:3000 \
     retailcrm-mcp:latest
   ```

3. **Проверить логи**
   ```bash
   docker logs -f retailcrm-mcp
   ```

4. **Остановить контейнер**
   ```bash
   docker stop retailcrm-mcp
   docker rm retailcrm-mcp
   ```

---

## Облачное развертывание

### Heroku

1. **Установить Heroku CLI**
   ```bash
   curl https://cli-assets.heroku.com/install.sh | sh
   ```

2. **Войти в Heroku**
   ```bash
   heroku login
   ```

3. **Создать приложение**
   ```bash
   heroku create your-app-name
   ```

4. **Установить переменные окружения**
   ```bash
   heroku config:set RETAILCRM_URL=https://your-instance.retailcrm.ru
   heroku config:set RETAILCRM_API_KEY=your-api-key-here
   ```

5. **Развернуть**
   ```bash
   git push heroku main
   ```

6. **Проверить статус**
   ```bash
   heroku logs --tail
   ```

### AWS EC2

1. **Создать EC2 инстанс**
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t3.micro (или больше)
   - Security Group: открыть порт 3000

2. **Подключиться к инстансу**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Установить Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Клонировать репозиторий**
   ```bash
   git clone <repository-url>
   cd retailcrm-mcp-server
   ```

5. **Установить зависимости**
   ```bash
   npm install --production
   ```

6. **Создать .env файл**
   ```bash
   cat > .env << EOF
   RETAILCRM_URL=https://your-instance.retailcrm.ru
   RETAILCRM_API_KEY=your-api-key-here
   NODE_ENV=production
   EOF
   ```

7. **Собрать проект**
   ```bash
   npm run build
   ```

8. **Запустить с PM2**
   ```bash
   sudo npm install -g pm2
   pm2 start dist/index.js --name retailcrm-mcp
   pm2 startup
   pm2 save
   ```

### DigitalOcean

1. **Создать Droplet**
   - OS: Ubuntu 22.04 LTS
   - Size: $5/month (или больше)

2. **Подключиться**
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Установить Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Следовать шагам AWS EC2 (пункты 4-8)**

### Docker Hub + Kubernetes

1. **Создать Docker образ**
   ```bash
   docker build -t your-username/retailcrm-mcp:latest .
   docker push your-username/retailcrm-mcp:latest
   ```

2. **Развернуть в Kubernetes**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: retailcrm-mcp
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: retailcrm-mcp
     template:
       metadata:
         labels:
           app: retailcrm-mcp
       spec:
         containers:
         - name: retailcrm-mcp
           image: your-username/retailcrm-mcp:latest
           ports:
           - containerPort: 3000
           env:
           - name: RETAILCRM_URL
             valueFrom:
               secretKeyRef:
                 name: retailcrm-secrets
                 key: url
           - name: RETAILCRM_API_KEY
             valueFrom:
               secretKeyRef:
                 name: retailcrm-secrets
                 key: api-key
   ---
   apiVersion: v1
   kind: Service
   metadata:
     name: retailcrm-mcp-service
   spec:
     selector:
       app: retailcrm-mcp
     ports:
     - protocol: TCP
       port: 80
       targetPort: 3000
     type: LoadBalancer
   ```

---

## Масштабирование

### Горизонтальное масштабирование

#### С Docker Compose

```yaml
version: '3.8'

services:
  retailcrm-mcp-1:
    build: .
    environment:
      RETAILCRM_URL: ${RETAILCRM_URL}
      RETAILCRM_API_KEY: ${RETAILCRM_API_KEY}
    ports:
      - "3001:3000"

  retailcrm-mcp-2:
    build: .
    environment:
      RETAILCRM_URL: ${RETAILCRM_URL}
      RETAILCRM_API_KEY: ${RETAILCRM_API_KEY}
    ports:
      - "3002:3000"

  retailcrm-mcp-3:
    build: .
    environment:
      RETAILCRM_URL: ${RETAILCRM_URL}
      RETAILCRM_API_KEY: ${RETAILCRM_API_KEY}
    ports:
      - "3003:3000"

  nginx:
    image: nginx:latest
    ports:
      - "3000:3000"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - retailcrm-mcp-1
      - retailcrm-mcp-2
      - retailcrm-mcp-3
```

#### nginx.conf

```nginx
upstream mcp_servers {
    server retailcrm-mcp-1:3000;
    server retailcrm-mcp-2:3000;
    server retailcrm-mcp-3:3000;
}

server {
    listen 3000;
    
    location / {
        proxy_pass http://mcp_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Кэширование с Redis

1. **Обновить docker-compose.yml**
   ```yaml
   version: '3.8'
   
   services:
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
     
     retailcrm-mcp:
       build: .
       environment:
         RETAILCRM_URL: ${RETAILCRM_URL}
         RETAILCRM_API_KEY: ${RETAILCRM_API_KEY}
         REDIS_URL: redis://redis:6379
       ports:
         - "3000:3000"
       depends_on:
         - redis
   ```

2. **Обновить cache.ts для использования Redis**
   ```typescript
   import redis from 'redis';
   
   const client = redis.createClient({
     url: process.env.REDIS_URL
   });
   
   export const globalCache = {
     get: async (key: string) => {
       return JSON.parse(await client.get(key));
     },
     set: async (key: string, value: any, ttl: number) => {
       await client.setEx(key, ttl / 1000, JSON.stringify(value));
     }
   };
   ```

---

## Мониторинг и логирование

### Логирование

#### Локально

```bash
# Просмотр логов в реальном времени
npm run dev

# Просмотр логов с сохранением в файл
npm start > logs/app.log 2>&1 &
```

#### Docker

```bash
# Просмотр логов контейнера
docker-compose logs -f retailcrm-mcp

# Сохранение логов в файл
docker-compose logs retailcrm-mcp > logs.txt
```

### Мониторинг производительности

#### PM2 мониторинг

```bash
# Установить PM2
npm install -g pm2

# Запустить с мониторингом
pm2 start dist/index.js --name retailcrm-mcp
pm2 monit

# Просмотр статистики
pm2 show retailcrm-mcp
```

#### Prometheus + Grafana

1. **Добавить метрики в сервер**
   ```typescript
   import promClient from 'prom-client';
   
   const httpRequestDuration = new promClient.Histogram({
     name: 'http_request_duration_seconds',
     help: 'Duration of HTTP requests in seconds',
     labelNames: ['method', 'route', 'status_code']
   });
   ```

2. **Настроить Prometheus**
   ```yaml
   global:
     scrape_interval: 15s
   
   scrape_configs:
     - job_name: 'retailcrm-mcp'
       static_configs:
         - targets: ['localhost:3000/metrics']
   ```

3. **Запустить Grafana**
   ```bash
   docker run -d -p 3001:3000 grafana/grafana
   ```

---

## Безопасность

### SSL/TLS сертификат

#### Локально с Let's Encrypt

```bash
# Установить Certbot
sudo apt-get install certbot python3-certbot-nginx

# Получить сертификат
sudo certbot certonly --standalone -d your-domain.com

# Обновить nginx.conf
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

#### Docker с SSL

```dockerfile
FROM node:20-alpine

# Копировать сертификаты
COPY certs/fullchain.pem /app/certs/
COPY certs/privkey.pem /app/certs/

# Остальной код...
```

### Аутентификация

#### API Key аутентификация

```typescript
// В index.ts добавить middleware
const apiKey = process.env.MCP_API_KEY;

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const key = request.headers?.['X-API-Key'];
  if (apiKey && key !== apiKey) {
    return {
      content: [{ type: 'text', text: 'Unauthorized' }],
      isError: true
    };
  }
  // ... остальной код
});
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // лимит 100 запросов на IP
});

app.use(limiter);
```

---

## Проверка здоровья

### Health Check endpoint

```bash
curl http://localhost:3000/health
```

### Docker health check

```yaml
services:
  retailcrm-mcp:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## Резервное копирование и восстановление

### Резервное копирование кэша

```bash
# Если используется Redis
docker exec redis-container redis-cli BGSAVE

# Скопировать dump.rdb
docker cp redis-container:/data/dump.rdb ./backup/
```

### Восстановление

```bash
# Скопировать файл обратно
docker cp ./backup/dump.rdb redis-container:/data/

# Перезагрузить контейнер
docker-compose restart redis
```

---

## Обновление

### Обновление кода

```bash
# Локально
git pull
npm install
npm run build
npm start

# Docker
git pull
docker-compose up -d --build
```

### Обновление зависимостей

```bash
# Проверить обновления
npm outdated

# Обновить
npm update

# Обновить package.json
npm upgrade
```

---

## Решение проблем

### Сервер не запускается

```bash
# Проверить логи
docker-compose logs retailcrm-mcp

# Проверить переменные окружения
docker-compose config

# Перезагрузить контейнер
docker-compose restart retailcrm-mcp
```

### Высокое использование памяти

```bash
# Проверить использование памяти
docker stats retailcrm-mcp

# Очистить кэш
# Перезагрузить контейнер
docker-compose restart retailcrm-mcp
```

### Медленные ответы

```bash
# Проверить логи
docker-compose logs -f retailcrm-mcp

# Проверить соединение с RetailCRM
curl https://your-instance.retailcrm.ru/api/v5/reference/channels

# Увеличить timeout
# Добавить в HTTP клиент: timeout: 30000
```

---

## Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
