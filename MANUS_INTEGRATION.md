# Интеграция RetailCRM MCP Server с Manus

Этот документ описывает, как подключить RetailCRM MCP Server к Manus для использования в AI агентах.

## Архитектура

```
Manus AI Agent
    ↓
MCP Client (встроен в Manus)
    ↓
RetailCRM MCP Server
    ↓
RetailCRM API
```

## Требования

- Запущенный RetailCRM MCP Server (локально или на сервере)
- Доступ к Manus
- Сетевая связь между Manus и MCP сервером

## Пошаговая интеграция

### Шаг 1: Запустить MCP сервер

Убедитесь, что MCP сервер запущен и доступен:

```bash
# С Docker (рекомендуется)
docker-compose up -d

# Проверить, что сервер запущен
curl http://localhost:3000/health
```

### Шаг 2: Определить URL MCP сервера

- **Локально**: `http://localhost:3000`
- **На сервере**: `http://your-server.com:3000`
- **В Docker Compose**: `http://retailcrm-mcp:3000` (если в одной сети)

### Шаг 3: Подключить к Manus

В Manus перейдите в настройки и добавьте MCP сервер:

1. **Settings** → **MCP Servers**
2. **Add New Server**
3. Заполните параметры:
   - **Name**: `RetailCRM`
   - **URL**: `http://localhost:3000` (или ваш URL)
   - **Transport**: `Streamable HTTP`
   - **API Key**: (если требуется аутентификация)

### Шаг 4: Проверить подключение

После добавления сервера:

1. Перейдите в **Tools**
2. Найдите `query_retailcrm`
3. Убедитесь, что инструмент доступен

## Использование в Manus

### Пример 1: Запрос продаж по источникам

```
User: "Какие источники принесли больше регистраций в ноябре 25?"

Manus AI Agent:
1. Распознает запрос
2. Вызывает инструмент query_retailcrm
3. Передает параметры:
   {
     "operation": "get_sales_by_source",
     "params": {
       "date_from": "2025-11-01",
       "date_to": "2025-11-30"
     }
   }
4. Получает результат
5. Форматирует ответ для пользователя
```

### Пример 2: Запрос количества лидов

```
User: "Сколько лидов было в октябре 25?"

Manus AI Agent:
1. Вызывает query_retailcrm с operation: "get_leads_count"
2. Получает данные за октябрь
3. Выводит результат
```

### Пример 3: Запрос статистики по методам

```
User: "Создай график по способам регистрации и сумме сделок за 3 месяца"

Manus AI Agent:
1. Вызывает query_retailcrm с operation: "get_registration_stats"
2. Получает данные за 3 месяца
3. Форматирует данные для графика
4. Выводит результат
```

## Доступные инструменты

### query_retailcrm

Универсальный инструмент для запросов к RetailCRM.

**Параметры:**

```typescript
{
  operation: "get_sales_by_source" | "get_leads_count" | "get_registration_stats",
  params: {
    date_from: string,      // YYYY-MM-DD
    date_to: string,        // YYYY-MM-DD
    source_id?: string      // опционально для get_sales_by_source
  }
}
```

**Примеры ответов:**

#### get_sales_by_source
```json
{
  "sources": [
    {
      "source_id": "direct",
      "source_name": "Прямой трафик",
      "registration_count": 42,
      "total_sum": 125000,
      "average_sum": 2976.19
    }
  ],
  "total_registrations": 100,
  "total_sum": 300000,
  "period": {"from": "2025-11-01", "to": "2025-11-30"}
}
```

#### get_leads_count
```json
{
  "total_leads": 150,
  "leads_by_day": [
    {"date": "2025-10-01", "count": 5},
    {"date": "2025-10-02", "count": 8}
  ],
  "period": {"from": "2025-10-01", "to": "2025-10-31"}
}
```

#### get_registration_stats
```json
{
  "by_method": [
    {
      "method_id": "form",
      "method_name": "Форма на сайте",
      "registration_count": 50,
      "total_sum": 150000,
      "average_sum": 3000
    }
  ],
  "by_month": [
    {"month": "2025-09", "registration_count": 30, "total_sum": 90000}
  ],
  "by_method_and_month": [
    {
      "month": "2025-09",
      "method_id": "form",
      "method_name": "Форма на сайте",
      "registration_count": 15,
      "total_sum": 45000
    }
  ],
  "total_registrations": 100,
  "total_sum": 300000,
  "period": {"from": "2025-09-01", "to": "2025-11-30"}
}
```

## Примеры использования

### Создание отчета

```
User: "Создай отчет по продажам за ноябрь"

Manus:
1. Вызывает get_sales_by_source за ноябрь
2. Форматирует данные в таблицу
3. Выводит отчет с графиками
```

### Анализ тренда

```
User: "Какой источник показывает лучший рост?"

Manus:
1. Вызывает get_sales_by_source за последние 3 месяца
2. Сравнивает данные по месяцам
3. Определяет тренд
4. Выводит анализ
```

### Прогнозирование

```
User: "Сколько лидов ожидается в декабре на основе октября?"

Manus:
1. Вызывает get_leads_count за октябрь
2. Анализирует данные
3. Делает прогноз
4. Выводит результат
```

## Сетевая конфигурация

### Локальное использование

```
Manus (localhost) → MCP Server (localhost:3000)
```

### Использование на сервере

```
Manus (cloud) → MCP Server (your-server.com:3000)
```

Убедитесь, что:
- Порт 3000 открыт на сервере
- Firewall позволяет соединение
- MCP сервер доступен по URL

### Docker Compose в одной сети

```yaml
version: '3.8'
services:
  manus:
    image: manus:latest
    environment:
      MCP_SERVER_URL: http://retailcrm-mcp:3000
  
  retailcrm-mcp:
    build: .
    environment:
      RETAILCRM_URL: https://your-instance.retailcrm.ru
      RETAILCRM_API_KEY: your-api-key
```

## Безопасность

### Аутентификация

Если требуется аутентификация:

1. Добавьте API ключ в MCP сервер
2. Настройте в Manus:
   ```
   API Key: your-mcp-api-key
   ```

### HTTPS

Для продакшена используйте HTTPS:

```
https://your-server.com:3000
```

Настройте SSL сертификат на сервере.

### Rate Limiting

MCP сервер имеет встроенное кэширование для защиты от перегрузки.

## Отладка

### Проверить подключение

```bash
# Проверить доступность сервера
curl http://localhost:3000/health

# Тестовый запрос
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

### Логи Manus

Проверьте логи Manus для ошибок подключения:

```
Settings → Logs → MCP Servers
```

### Логи MCP сервера

```bash
docker-compose logs -f retailcrm-mcp
```

## Производительность

- **Кэширование**: результаты кэшируются на 30 минут
- **Пагинация**: автоматическая обработка больших наборов данных
- **Оптимизация**: используйте конкретные даты для ограничения данных

## Масштабирование

### Несколько инстансов Manus

```
Manus 1 ──┐
Manus 2 ──┼─→ MCP Server → RetailCRM
Manus 3 ──┘
```

### Load Balancing

Для высокой нагрузки используйте load balancer:

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

## Расширение функциональности

Для добавления новых операций:

1. Создайте новую операцию в MCP сервере
2. Перезагрузите сервер
3. Операция автоматически станет доступна в Manus

## Поддерживаемые операции

| Операция | Описание |
|---------|---------|
| `get_sales_by_source` | Продажи по источникам за период |
| `get_leads_count` | Количество лидов за период |
| `get_registration_stats` | Статистика по методам регистрации |

## Дополнительные ресурсы

- [Manus Documentation](https://manus.im/docs)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [RetailCRM API Documentation](https://docs.retailcrm.ru/Developers)

## Поддержка

Для вопросов и проблем:

1. Проверьте логи MCP сервера
2. Убедитесь в сетевой связи
3. Проверьте конфигурацию API ключа
4. Создайте Issue в репозитории
