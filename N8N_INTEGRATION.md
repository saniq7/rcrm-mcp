# Интеграция RetailCRM MCP Server с n8n

Этот документ описывает, как интегрировать RetailCRM MCP Server с n8n для использования в AI агентах.

## Архитектура

```
n8n Workflow
    ↓
AI Node (Claude)
    ↓
HTTP Request Node (вызов MCP сервера)
    ↓
RetailCRM MCP Server
    ↓
RetailCRM API
```

## Пошаговая интеграция

### Шаг 1: Запустить MCP сервер

Убедитесь, что MCP сервер запущен:

```bash
# С Docker (рекомендуется)
docker-compose up -d

# Или локально
npm run build
npm start
```

Сервер будет доступен по адресу: `http://localhost:3000`

### Шаг 2: Создать HTTP Request Node в n8n

1. Создайте новый workflow в n8n
2. Добавьте **HTTP Request** node
3. Настройте параметры:

```
Method: POST
URL: http://localhost:3000/query
Authentication: None (или Basic если требуется)
Headers:
  Content-Type: application/json

Body (JSON):
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}
```

### Шаг 3: Использовать в AI Node

Создайте workflow с AI Node для обработки запросов:

```
1. Start Node
2. AI Node (Claude)
   - System Prompt: "Вы помощник для анализа данных RetailCRM"
   - Tools: HTTP Request Node (как Tool)
3. HTTP Request Node
   - Вызывает MCP сервер
4. Output Node
   - Выводит результат
```

## Примеры workflows

### Пример 1: Простой запрос продаж по источникам

```json
{
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "position": [250, 300]
    },
    {
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "position": [450, 300],
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/query",
        "jsonData": true,
        "bodyParametersJson": "{\n  \"operation\": \"get_sales_by_source\",\n  \"params\": {\n    \"date_from\": \"2025-11-01\",\n    \"date_to\": \"2025-11-30\"\n  }\n}"
      }
    },
    {
      "name": "Output",
      "type": "n8n-nodes-base.noOp",
      "position": [650, 300]
    }
  ],
  "connections": {
    "Start": {
      "main": [[{"node": "HTTP Request", "branch": 0, "index": 0}]]
    },
    "HTTP Request": {
      "main": [[{"node": "Output", "branch": 0, "index": 0}]]
    }
  }
}
```

### Пример 2: AI агент для анализа данных

```json
{
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "position": [250, 300]
    },
    {
      "name": "AI Node",
      "type": "n8n-nodes-base.openAi",
      "position": [450, 300],
      "parameters": {
        "model": "gpt-4",
        "systemPrompt": "Вы помощник для анализа данных RetailCRM. Помогайте пользователям получать информацию о продажах, лидах и статистике.",
        "tools": ["query_retailcrm"]
      }
    },
    {
      "name": "Query RetailCRM",
      "type": "n8n-nodes-base.httpRequest",
      "position": [650, 300],
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/query",
        "jsonData": true,
        "bodyParametersJson": "={{ $json.tool_input }}"
      }
    }
  ]
}
```

## Использование с динамическими параметрами

### Пример: Параметры из входных данных

```
HTTP Request Node:
URL: http://localhost:3000/query
Body (JSON):
{
  "operation": "{{ $json.operation }}",
  "params": {
    "date_from": "{{ $json.date_from }}",
    "date_to": "{{ $json.date_to }}",
    "source_id": "{{ $json.source_id }}"
  }
}
```

### Пример: Параметры из переменных n8n

```
HTTP Request Node:
Body (JSON):
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "{{ $env.REPORT_DATE_FROM }}",
    "date_to": "{{ $env.REPORT_DATE_TO }}"
  }
}
```

## Обработка ошибок

Добавьте обработку ошибок в workflow:

```
HTTP Request Node
    ↓
IF Node (проверка ошибок)
    ├─ Success → Output
    └─ Error → Error Handler
```

## Кэширование результатов

MCP сервер автоматически кэширует результаты на 30 минут. Если вам нужны свежие данные:

1. Добавьте параметр `cache_bust` с текущим временем
2. Или перезагрузите сервер

## Масштабирование

### Для нескольких n8n инстансов

Если у вас несколько n8n инстансов, используйте один MCP сервер:

```
n8n Instance 1 ──┐
n8n Instance 2 ──┼─→ MCP Server → RetailCRM
n8n Instance 3 ──┘
```

### Для высокой нагрузки

1. Используйте Redis для кэширования:
   ```bash
   docker-compose -f docker-compose.redis.yml up -d
   ```

2. Запустите несколько инстансов MCP сервера:
   ```bash
   docker-compose up -d --scale retailcrm-mcp=3
   ```

3. Используйте load balancer (nginx):
   ```nginx
   upstream mcp_servers {
       server mcp-1:3000;
       server mcp-2:3000;
       server mcp-3:3000;
   }
   
   server {
       listen 3000;
       location / {
           proxy_pass http://mcp_servers;
       }
   }
   ```

## Примеры запросов для AI агента

### Запрос 1: "Какие источники принесли больше регистраций в ноябре 25?"

```
AI Node получит запрос:
"Какие источники принесли больше регистраций в ноябре 25?"

AI вызовет:
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}

Результат будет отсортирован по registration_count в убывающем порядке
```

### Запрос 2: "Сколько лидов было в октябре 25?"

```
AI Node получит запрос:
"Сколько лидов было в октябре 25?"

AI вызовет:
{
  "operation": "get_leads_count",
  "params": {
    "date_from": "2025-10-01",
    "date_to": "2025-10-31"
  }
}

Результат содержит total_leads и leads_by_day
```

### Запрос 3: "Создай график по способам регистрации и сумме сделок за 3 месяца"

```
AI Node получит запрос:
"Создай график по способам регистрации и сумме сделок за 3 месяца"

AI вызовет:
{
  "operation": "get_registration_stats",
  "params": {
    "date_from": "2025-09-01",
    "date_to": "2025-11-30"
  }
}

Результат содержит:
- by_method: статистика по методам
- by_month: статистика по месяцам
- by_method_and_month: комбинированная статистика для графика
```

## Отладка

### Просмотр логов MCP сервера

```bash
# С Docker
docker-compose logs -f retailcrm-mcp

# Локально
npm run dev
```

### Тестирование запроса вручную

```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get_sales_by_source",
    "params": {
      "date_from": "2025-11-01",
      "date_to": "2025-11-30"
    }
  }'
```

## Безопасность

1. **API ключ**: Храните API ключ в переменных окружения, не в коде
2. **HTTPS**: Используйте HTTPS для продакшена
3. **Аутентификация**: Добавьте аутентификацию для MCP сервера (опционально)
4. **Rate limiting**: Добавьте rate limiting для защиты от DDoS

## Производительность

- Кэширование: результаты кэшируются на 30 минут
- Пагинация: API автоматически обрабатывает пагинацию
- Оптимизация: используйте фильтры для ограничения данных

## Поддерживаемые операции

| Операция | Описание | Параметры |
|---------|---------|----------|
| `get_sales_by_source` | Продажи по источникам | `date_from`, `date_to`, `source_id` (опционально) |
| `get_leads_count` | Количество лидов | `date_from`, `date_to` |
| `get_registration_stats` | Статистика по методам | `date_from`, `date_to` |

## Дополнительные ресурсы

- [n8n Documentation](https://docs.n8n.io/)
- [RetailCRM API Documentation](https://docs.retailcrm.ru/Developers)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
