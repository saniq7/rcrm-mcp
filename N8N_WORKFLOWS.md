# n8n Workflow Примеры для RetailCRM MCP Server

Этот документ содержит готовые примеры workflows для n8n, которые используют RetailCRM MCP Server.

## Workflow 1: Простой запрос продаж по источникам

### Описание
Простой workflow, который запрашивает продажи по источникам за ноябрь 2025 и выводит результат.

### Структура
```
Start → HTTP Request → Output
```

### JSON конфигурация

```json
{
  "nodes": [
    {
      "parameters": {},
      "id": "b7b8e8e8-8e8e-8e8e-8e8e-8e8e8e8e8e8e",
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "http://localhost:3000/query",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "contentType": "application/json",
        "body": "{\n  \"operation\": \"get_sales_by_source\",\n  \"params\": {\n    \"date_from\": \"2025-11-01\",\n    \"date_to\": \"2025-11-30\"\n  }\n}",
        "options": {}
      },
      "id": "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
      "name": "HTTP Request",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [450, 300]
    },
    {
      "parameters": {},
      "id": "c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2",
      "name": "Output",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Start": {
      "main": [
        [
          {
            "node": "HTTP Request",
            "branch": 0,
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request": {
      "main": [
        [
          {
            "node": "Output",
            "branch": 0,
            "index": 0
          }
        ]
      ]
    }
  }
}
```

## Workflow 2: AI агент для анализа данных

### Описание
Workflow с AI Node (Claude), который может автоматически запрашивать данные из RetailCRM и анализировать их.

### Структура
```
Start → AI Node → HTTP Request → Output
```

### Конфигурация

1. **Start Node** - стандартный старт
2. **AI Node (Claude)**
   - Model: gpt-4
   - System Prompt: "Вы помощник для анализа данных RetailCRM. Помогайте пользователям получать информацию о продажах, лидах и статистике."
   - Tools: HTTP Request Node (как Tool)

3. **HTTP Request Node**
   - Method: POST
   - URL: `http://localhost:3000/query`
   - Body: `{{ $json.tool_input }}`

### Пример использования

```
User Input: "Какие источники принесли больше регистраций в ноябре 25?"

AI Agent:
1. Распознает запрос
2. Вызывает HTTP Request Tool с параметрами:
   {
     "operation": "get_sales_by_source",
     "params": {
       "date_from": "2025-11-01",
       "date_to": "2025-11-30"
     }
   }
3. Получает результат
4. Форматирует ответ для пользователя
```

## Workflow 3: Динамический запрос с параметрами

### Описание
Workflow, который принимает параметры (дату, тип операции) и выполняет соответствующий запрос.

### Структура
```
Start → Set Data → HTTP Request → Output
```

### Конфигурация

**Start Node:**
- Webhook URL: `/retailcrm-query`
- Method: POST

**Set Data Node:**
```javascript
return {
  operation: $json.body.operation || "get_sales_by_source",
  params: {
    date_from: $json.body.date_from || "2025-11-01",
    date_to: $json.body.date_to || "2025-11-30",
    source_id: $json.body.source_id
  }
};
```

**HTTP Request Node:**
```
URL: http://localhost:3000/query
Body: {{ $json }}
```

### Пример вызова

```bash
curl -X POST http://your-n8n.com/webhook/retailcrm-query \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get_leads_count",
    "date_from": "2025-10-01",
    "date_to": "2025-10-31"
  }'
```

## Workflow 4: Периодический отчет

### Описание
Workflow, который автоматически генерирует отчет по продажам каждый день в 9:00.

### Структура
```
Cron Trigger → HTTP Request (Sales) → HTTP Request (Leads) → Email → Output
```

### Конфигурация

**Cron Trigger:**
- Cron: `0 9 * * *` (каждый день в 9:00)

**HTTP Request 1 (Sales by Source):**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "{{ new Date(Date.now() - 86400000).toISOString().split('T')[0] }}",
    "date_to": "{{ new Date().toISOString().split('T')[0] }}"
  }
}
```

**HTTP Request 2 (Leads Count):**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_leads_count",
  "params": {
    "date_from": "{{ new Date(Date.now() - 86400000).toISOString().split('T')[0] }}",
    "date_to": "{{ new Date().toISOString().split('T')[0] }}"
  }
}
```

**Email Node:**
```
To: your-email@example.com
Subject: Ежедневный отчет RetailCRM
Body: 
Продажи по источникам:
{{ $json[0].body.sources }}

Лиды:
{{ $json[1].body.total_leads }}
```

## Workflow 5: Обработка ошибок

### Описание
Workflow с обработкой ошибок при обращении к MCP серверу.

### Структура
```
Start → HTTP Request → IF (Success?) → Output / Error Handler
```

### Конфигурация

**HTTP Request Node:**
```
URL: http://localhost:3000/query
Continue on fail: true
```

**IF Node:**
```javascript
return $json.statusCode === 200;
```

**Success Output:**
```
{{ $json.body }}
```

**Error Handler:**
```
Send notification: "Ошибка при запросе к RetailCRM: {{ $json.error }}"
```

## Workflow 6: Кэширование результатов

### Описание
Workflow, который кэширует результаты в n8n для избежания лишних запросов.

### Структура
```
Start → Check Cache → HTTP Request → Save Cache → Output
```

### Конфигурация

**Check Cache Node (JavaScript):**
```javascript
const cacheKey = `sales_${new Date().toISOString().split('T')[0]}`;
const cached = await $nodeExecutionContext.helpers.getNodeParameter('cache', cacheKey);
return cached || null;
```

**HTTP Request Node:**
```
URL: http://localhost:3000/query
Body: { operation, params }
```

**Save Cache Node (JavaScript):**
```javascript
const cacheKey = `sales_${new Date().toISOString().split('T')[0]}`;
await $nodeExecutionContext.helpers.setNodeParameter('cache', cacheKey, $json);
return $json;
```

## Workflow 7: Интеграция с Google Sheets

### Описание
Workflow, который получает данные из RetailCRM и записывает их в Google Sheets.

### Структура
```
Start → HTTP Request → Google Sheets (Append) → Output
```

### Конфигурация

**HTTP Request Node:**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}
```

**Google Sheets Node:**
```
Action: Append
Spreadsheet: Your Spreadsheet
Sheet: Sales Report
Columns:
- source_name: {{ $json.body.sources[0].source_name }}
- registration_count: {{ $json.body.sources[0].registration_count }}
- total_sum: {{ $json.body.sources[0].total_sum }}
- date: {{ new Date().toISOString() }}
```

## Workflow 8: Webhook для внешних запросов

### Описание
Workflow, который предоставляет webhook для внешних приложений для запроса данных из RetailCRM.

### Структура
```
Webhook → HTTP Request → Response
```

### Конфигурация

**Webhook Node:**
```
URL: /retailcrm-api
Method: POST
Authentication: None (или API Key)
```

**HTTP Request Node:**
```
URL: http://localhost:3000/query
Body: {{ $json.body }}
```

**Response Node:**
```
Status: 200
Body: {{ $json }}
```

### Пример использования

```bash
curl -X POST http://your-n8n.com/webhook/retailcrm-api \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get_registration_stats",
    "params": {
      "date_from": "2025-09-01",
      "date_to": "2025-11-30"
    }
  }'
```

## Workflow 9: Slack уведомления

### Описание
Workflow, который отправляет результаты в Slack.

### Структура
```
Start → HTTP Request → Slack → Output
```

### Конфигурация

**HTTP Request Node:**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}
```

**Slack Node:**
```
Channel: #reports
Message:
📊 Отчет по продажам за ноябрь:

{{ $json.body.sources.map(s => 
  `• ${s.source_name}: ${s.registration_count} регистраций (${s.total_sum} руб.)`
).join('\n') }}

Всего: {{ $json.body.total_registrations }} регистраций на сумму {{ $json.body.total_sum }} руб.
```

## Workflow 10: Комплексный анализ

### Описание
Workflow, который выполняет несколько запросов и создает комплексный анализ.

### Структура
```
Start → HTTP Request 1 (Sales) → HTTP Request 2 (Leads) → HTTP Request 3 (Stats) → Merge → Output
```

### Конфигурация

**HTTP Request 1 (Sales by Source):**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}
```

**HTTP Request 2 (Leads Count):**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_leads_count",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}
```

**HTTP Request 3 (Registration Stats):**
```
URL: http://localhost:3000/query
Body:
{
  "operation": "get_registration_stats",
  "params": {
    "date_from": "2025-09-01",
    "date_to": "2025-11-30"
  }
}
```

**Merge Node (JavaScript):**
```javascript
return {
  sales: $json[0].body,
  leads: $json[1].body,
  stats: $json[2].body,
  summary: {
    top_source: $json[0].body.sources[0],
    total_leads: $json[1].body.total_leads,
    best_method: $json[2].body.by_method[0]
  }
};
```

## Советы по использованию

1. **Тестирование** - используйте "Test" кнопку перед сохранением
2. **Переменные** - используйте переменные окружения для URL и ключей
3. **Обработка ошибок** - всегда добавляйте обработку ошибок
4. **Логирование** - используйте Debug nodes для отладки
5. **Кэширование** - кэшируйте результаты для оптимизации

## Экспорт workflows

Все workflows можно экспортировать и импортировать:

1. В n8n: **Menu** → **Export**
2. Сохранить JSON файл
3. Для импорта: **Menu** → **Import**

## Дополнительные ресурсы

- [n8n Documentation](https://docs.n8n.io/)
- [HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [AI Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.openai/)
- [Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
