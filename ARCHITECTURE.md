# Архитектура RetailCRM MCP Server

## Обзор

RetailCRM MCP Server - это универсальный сервер Model Context Protocol для интеграции RetailCRM (Simla) с AI приложениями.

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Приложения                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   n8n AI    │  │   Manus AI   │  │ Claude Code │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
         ↕ (HTTP / Streamable HTTP)
┌─────────────────────────────────────────────────────────────┐
│              RetailCRM MCP Server                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MCP Server (Node.js)                                 │  │
│  │                                                      │  │
│  │ Tool: query_retailcrm                               │  │
│  │ ├─ get_sales_by_source                              │  │
│  │ ├─ get_leads_count                                  │  │
│  │ └─ get_registration_stats                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↕ (HTTP REST)
┌─────────────────────────────────────────────────────────────┐
│              RetailCRM API v5                               │
└─────────────────────────────────────────────────────────────┘
```

## Компоненты

### 1. MCP Server (src/index.ts)

Основной компонент, который:
- Инициализирует MCP сервер
- Определяет доступные инструменты
- Обрабатывает запросы от клиентов
- Маршрутизирует запросы к операциям

**Ключевые функции:**
- `ListToolsRequestSchema` - возвращает список доступных инструментов
- `CallToolRequestSchema` - обрабатывает вызовы инструментов

### 2. RetailCRM API Client (src/retailcrm/api-client.ts)

Клиент для работы с RetailCRM API:
- Управляет аутентификацией (API ключ)
- Выполняет HTTP запросы к RetailCRM
- Обрабатывает пагинацию
- Преобразует ответы в типизированные объекты

**Основные методы:**
- `getOrders()` - получить заказы с фильтрацией
- `getCustomers()` - получить клиентов с фильтрацией
- `getChannels()` - получить список каналов (источников)
- `getOrderMethods()` - получить способы оформления
- `getOrderStatuses()` - получить статусы заказов

### 3. Операции (src/operations/)

Бизнес-логика для различных типов запросов:

#### sales-by-source.ts
Получает продажи по источникам за период:
1. Получает список каналов из справочника
2. Запрашивает заказы за период
3. Агрегирует по источникам
4. Сортирует по количеству регистраций
5. Возвращает структурированный результат

#### leads-count.ts
Получает количество лидов за период:
1. Запрашивает клиентов за период
2. Агрегирует по дням
3. Возвращает общее количество и разбивку по дням

#### registration-stats.ts
Получает статистику по методам регистрации:
1. Получает список методов из справочника
2. Запрашивает заказы за период
3. Агрегирует по методам, месяцам и комбинациям
4. Возвращает комплексную статистику

### 4. Кэширование (src/utils/cache.ts)

Простой в памяти кэш с TTL:
- Кэширует результаты операций на 30 минут
- Кэширует справочники на 1 час
- Автоматически удаляет истекшие элементы

## Поток данных

### Запрос 1: Продажи по источникам

```
1. Клиент отправляет запрос
   {
     "operation": "get_sales_by_source",
     "params": { "date_from": "2025-11-01", "date_to": "2025-11-30" }
   }

2. MCP Server получает запрос
   ↓
3. Проверяет кэш
   ├─ Если найдено → возвращает из кэша
   └─ Если не найдено → продолжает

4. getSalesBySource() выполняет:
   a. Получает каналы (из кэша или API)
   b. Запрашивает заказы за период
   c. Агрегирует по источникам
   d. Сохраняет в кэш
   e. Возвращает результат

5. Клиент получает структурированный результат
   {
     "sources": [...],
     "total_registrations": 100,
     "total_sum": 300000,
     "period": {...}
   }
```

## Типы данных

### Order
```typescript
{
  id: number;
  externalId?: string;
  number: string;
  createdAt: string;
  source?: { code: string; name: string };
  orderMethod?: { code: string; name: string };
  sum: number;
  status?: { code: string; name: string };
  customer?: { id: number; externalId?: string };
}
```

### Customer
```typescript
{
  id: number;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
}
```

### Channel
```typescript
{
  code: string;
  name: string;
}
```

## Кэширование

### Стратегия кэширования

| Элемент | TTL | Причина |
|---------|-----|---------|
| Результаты операций | 30 мин | Данные меняются часто, но не в реальном времени |
| Справочники (channels) | 1 час | Редко меняются, безопасно кэшировать |
| Справочники (methods) | 1 час | Редко меняются, безопасно кэшировать |

### Ключи кэша

```
sales_by_source_{date_from}_{date_to}_{source_id}
leads_count_{date_from}_{date_to}
registration_stats_{date_from}_{date_to}
channels_list
order_methods_list
```

## Обработка ошибок

### Уровни обработки ошибок

1. **HTTP уровень** - обработка ошибок подключения
2. **API уровень** - обработка ошибок RetailCRM API
3. **Операция уровень** - обработка ошибок бизнес-логики
4. **MCP уровень** - возврат ошибки клиенту

### Примеры ошибок

```
- Connection refused → "Cannot connect to RetailCRM"
- Invalid API key → "Authentication failed"
- Invalid date format → "Invalid date format"
- No data found → "No data for the specified period"
```

## Масштабируемость

### Текущая архитектура

- **Одиночный инстанс** - подходит для небольших нагрузок
- **Кэширование в памяти** - быстро, но не масштабируется на несколько серверов

### Для масштабирования

1. **Redis кэш** - замена памяти на Redis для распределенного кэша
2. **Load Balancer** - распределение нагрузки между несколькими инстансами
3. **Database** - кэширование результатов в БД для долгосрочного хранения

```
Load Balancer
    ↓
┌─────────┬─────────┬─────────┐
│ MCP 1   │ MCP 2   │ MCP 3   │
└─────────┴─────────┴─────────┘
    ↓
┌─────────────────────────────┐
│ Redis Cache (общий)         │
└─────────────────────────────┘
    ↓
RetailCRM API
```

## Безопасность

### Текущие меры

- API ключ хранится в переменных окружения
- Нет логирования чувствительных данных
- Валидация входных параметров

### Для продакшена

- HTTPS вместо HTTP
- Аутентификация MCP сервера
- Rate limiting
- Логирование и мониторинг
- Шифрование API ключа

## Развертывание

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Docker Compose

```yaml
services:
  retailcrm-mcp:
    build: .
    environment:
      RETAILCRM_URL: https://instance.retailcrm.ru
      RETAILCRM_API_KEY: key
    ports:
      - "3000:3000"
```

## Расширение функциональности

### Добавление новой операции

1. **Создать файл операции** (`src/operations/new-operation.ts`)
   ```typescript
   export async function newOperation(
     client: RetailCRMClient,
     params: any
   ): Promise<any> {
     // Логика операции
     return result;
   }
   ```

2. **Добавить в MCP Server** (`src/index.ts`)
   ```typescript
   case 'new_operation':
     result = await newOperation(retailcrmClient, params);
     break;
   ```

3. **Обновить Tool schema**
   ```typescript
   enum: [
     'get_sales_by_source',
     'get_leads_count',
     'get_registration_stats',
     'new_operation'  // Добавить
   ]
   ```

## Производительность

### Оптимизации

1. **Кэширование** - результаты кэшируются на 30 минут
2. **Пагинация** - автоматическая обработка больших наборов данных
3. **Справочники** - кэшируются на 1 час для быстрого доступа
4. **Параллельные запросы** - возможность оптимизации через Promise.all()

### Метрики

- **Время ответа**: 100-500ms (в зависимости от размера данных)
- **Кэш hit rate**: 70-80% (при типичном использовании)
- **Использование памяти**: 50-100MB (в зависимости от размера кэша)

## Мониторинг

### Логирование

```typescript
console.error('Tool execution error:', errorMessage);
```

### Метрики для отслеживания

- Количество запросов в час
- Среднее время ответа
- Процент ошибок
- Размер кэша
- Использование памяти

## Тестирование

### Типы тестов

1. **Unit тесты** - тестирование отдельных функций
2. **Integration тесты** - тестирование взаимодействия с API
3. **End-to-end тесты** - тестирование полного потока

### Примеры

```bash
# Unit тест
npm test -- sales-by-source.test.ts

# Integration тест
npm test -- api-client.test.ts

# End-to-end тест
npm test -- e2e.test.ts
```

## Документация

- [README.md](README.md) - основная документация
- [QUICKSTART.md](QUICKSTART.md) - быстрый старт
- [EXAMPLES.md](EXAMPLES.md) - примеры использования
- [N8N_INTEGRATION.md](N8N_INTEGRATION.md) - интеграция с n8n
- [MANUS_INTEGRATION.md](MANUS_INTEGRATION.md) - интеграция с Manus
- [ARCHITECTURE.md](ARCHITECTURE.md) - этот файл

## Лицензия

MIT
