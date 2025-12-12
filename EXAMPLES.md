# Примеры использования RetailCRM MCP Server

## Примеры HTTP запросов

### Пример 1: Получить продажи по источникам в ноябре 2025

**Запрос:**
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

**Ответ:**
```json
{
  "sources": [
    {
      "source_id": "direct",
      "source_name": "Прямой трафик",
      "registration_count": 45,
      "total_sum": 135000,
      "average_sum": 3000
    },
    {
      "source_id": "google",
      "source_name": "Google",
      "registration_count": 38,
      "total_sum": 114000,
      "average_sum": 3000
    },
    {
      "source_id": "yandex",
      "source_name": "Яндекс",
      "registration_count": 17,
      "total_sum": 51000,
      "average_sum": 3000
    }
  ],
  "total_registrations": 100,
  "total_sum": 300000,
  "period": {
    "from": "2025-11-01",
    "to": "2025-11-30"
  }
}
```

### Пример 2: Получить количество лидов в октябре 2025

**Запрос:**
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get_leads_count",
    "params": {
      "date_from": "2025-10-01",
      "date_to": "2025-10-31"
    }
  }'
```

**Ответ:**
```json
{
  "total_leads": 150,
  "leads_by_day": [
    {
      "date": "2025-10-01",
      "count": 5
    },
    {
      "date": "2025-10-02",
      "count": 8
    },
    {
      "date": "2025-10-03",
      "count": 6
    },
    {
      "date": "2025-10-04",
      "count": 7
    },
    {
      "date": "2025-10-05",
      "count": 9
    }
  ],
  "period": {
    "from": "2025-10-01",
    "to": "2025-10-31"
  }
}
```

### Пример 3: Получить статистику по методам регистрации за 3 месяца

**Запрос:**
```bash
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get_registration_stats",
    "params": {
      "date_from": "2025-09-01",
      "date_to": "2025-11-30"
    }
  }'
```

**Ответ:**
```json
{
  "by_method": [
    {
      "method_id": "form",
      "method_name": "Форма на сайте",
      "registration_count": 150,
      "total_sum": 450000,
      "average_sum": 3000
    },
    {
      "method_id": "phone",
      "method_name": "По телефону",
      "registration_count": 100,
      "total_sum": 300000,
      "average_sum": 3000
    },
    {
      "method_id": "chat",
      "method_name": "Через чат",
      "registration_count": 50,
      "total_sum": 150000,
      "average_sum": 3000
    }
  ],
  "by_month": [
    {
      "month": "2025-09",
      "registration_count": 100,
      "total_sum": 300000
    },
    {
      "month": "2025-10",
      "registration_count": 100,
      "total_sum": 300000
    },
    {
      "month": "2025-11",
      "registration_count": 100,
      "total_sum": 300000
    }
  ],
  "by_method_and_month": [
    {
      "month": "2025-09",
      "method_id": "form",
      "method_name": "Форма на сайте",
      "registration_count": 50,
      "total_sum": 150000
    },
    {
      "month": "2025-09",
      "method_id": "phone",
      "method_name": "По телефону",
      "registration_count": 35,
      "total_sum": 105000
    },
    {
      "month": "2025-09",
      "method_id": "chat",
      "method_name": "Через чат",
      "registration_count": 15,
      "total_sum": 45000
    },
    {
      "month": "2025-10",
      "method_id": "form",
      "method_name": "Форма на сайте",
      "registration_count": 50,
      "total_sum": 150000
    },
    {
      "month": "2025-10",
      "method_id": "phone",
      "method_name": "По телефону",
      "registration_count": 35,
      "total_sum": 105000
    },
    {
      "month": "2025-10",
      "method_id": "chat",
      "method_name": "Через чат",
      "registration_count": 15,
      "total_sum": 45000
    },
    {
      "month": "2025-11",
      "method_id": "form",
      "method_name": "Форма на сайте",
      "registration_count": 50,
      "total_sum": 150000
    },
    {
      "month": "2025-11",
      "method_id": "phone",
      "method_name": "По телефону",
      "registration_count": 30,
      "total_sum": 90000
    },
    {
      "month": "2025-11",
      "method_id": "chat",
      "method_name": "Через чат",
      "registration_count": 20,
      "total_sum": 60000
    }
  ],
  "total_registrations": 300,
  "total_sum": 900000,
  "period": {
    "from": "2025-09-01",
    "to": "2025-11-30"
  }
}
```

## Примеры использования в Python

### Пример: Запрос через Python

```python
import requests
import json

# URL MCP сервера
MCP_SERVER_URL = "http://localhost:3000/query"

# Функция для запроса продаж по источникам
def get_sales_by_source(date_from, date_to):
    payload = {
        "operation": "get_sales_by_source",
        "params": {
            "date_from": date_from,
            "date_to": date_to
        }
    }
    
    response = requests.post(MCP_SERVER_URL, json=payload)
    return response.json()

# Функция для запроса количества лидов
def get_leads_count(date_from, date_to):
    payload = {
        "operation": "get_leads_count",
        "params": {
            "date_from": date_from,
            "date_to": date_to
        }
    }
    
    response = requests.post(MCP_SERVER_URL, json=payload)
    return response.json()

# Функция для запроса статистики по методам
def get_registration_stats(date_from, date_to):
    payload = {
        "operation": "get_registration_stats",
        "params": {
            "date_from": date_from,
            "date_to": date_to
        }
    }
    
    response = requests.post(MCP_SERVER_URL, json=payload)
    return response.json()

# Использование
if __name__ == "__main__":
    # Пример 1: Продажи по источникам
    sales = get_sales_by_source("2025-11-01", "2025-11-30")
    print("Продажи по источникам:")
    for source in sales["sources"]:
        print(f"  {source['source_name']}: {source['registration_count']} регистраций, {source['total_sum']} руб.")
    
    # Пример 2: Количество лидов
    leads = get_leads_count("2025-10-01", "2025-10-31")
    print(f"\nВсего лидов в октябре: {leads['total_leads']}")
    
    # Пример 3: Статистика по методам
    stats = get_registration_stats("2025-09-01", "2025-11-30")
    print("\nСтатистика по методам:")
    for method in stats["by_method"]:
        print(f"  {method['method_name']}: {method['registration_count']} регистраций, {method['total_sum']} руб.")
```

## Примеры использования в JavaScript

### Пример: Запрос через JavaScript

```javascript
// URL MCP сервера
const MCP_SERVER_URL = "http://localhost:3000/query";

// Функция для запроса продаж по источникам
async function getSalesBySource(dateFrom, dateTo) {
  const payload = {
    operation: "get_sales_by_source",
    params: {
      date_from: dateFrom,
      date_to: dateTo
    }
  };
  
  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}

// Функция для запроса количества лидов
async function getLeadsCount(dateFrom, dateTo) {
  const payload = {
    operation: "get_leads_count",
    params: {
      date_from: dateFrom,
      date_to: dateTo
    }
  };
  
  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}

// Функция для запроса статистики по методам
async function getRegistrationStats(dateFrom, dateTo) {
  const payload = {
    operation: "get_registration_stats",
    params: {
      date_from: dateFrom,
      date_to: dateTo
    }
  };
  
  const response = await fetch(MCP_SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  return response.json();
}

// Использование
(async () => {
  // Пример 1: Продажи по источникам
  const sales = await getSalesBySource("2025-11-01", "2025-11-30");
  console.log("Продажи по источникам:");
  sales.sources.forEach(source => {
    console.log(`  ${source.source_name}: ${source.registration_count} регистраций, ${source.total_sum} руб.`);
  });
  
  // Пример 2: Количество лидов
  const leads = await getLeadsCount("2025-10-01", "2025-10-31");
  console.log(`\nВсего лидов в октябре: ${leads.total_leads}`);
  
  // Пример 3: Статистика по методам
  const stats = await getRegistrationStats("2025-09-01", "2025-11-30");
  console.log("\nСтатистика по методам:");
  stats.by_method.forEach(method => {
    console.log(`  ${method.method_name}: ${method.registration_count} регистраций, ${method.total_sum} руб.`);
  });
})();
```

## Примеры использования в n8n

### Пример 1: HTTP Request Node

```
Method: POST
URL: http://localhost:3000/query
Body (JSON):
{
  "operation": "get_sales_by_source",
  "params": {
    "date_from": "2025-11-01",
    "date_to": "2025-11-30"
  }
}
```

### Пример 2: Динамические параметры

```
URL: http://localhost:3000/query
Body (JSON):
{
  "operation": "{{ $json.operation }}",
  "params": {
    "date_from": "{{ $json.date_from }}",
    "date_to": "{{ $json.date_to }}"
  }
}
```

## Примеры использования в Manus

### Пример 1: Запрос в чате

```
User: "Какие источники принесли больше регистраций в ноябре 25?"

Manus AI:
Я получу данные о продажах по источникам за ноябрь 2025 года.

[Вызывает query_retailcrm с параметрами:
 operation: "get_sales_by_source"
 date_from: "2025-11-01"
 date_to: "2025-11-30"]

Результат:
- Прямой трафик: 45 регистраций, 135,000 руб.
- Google: 38 регистраций, 114,000 руб.
- Яндекс: 17 регистраций, 51,000 руб.

Вывод:
"В ноябре 2025 года наибольшее количество регистраций принес прямой трафик (45 регистраций на сумму 135,000 руб.), за ним следует Google (38 регистраций на сумму 114,000 руб.)."
```

### Пример 2: Анализ тренда

```
User: "Какой источник показывает лучший рост?"

Manus AI:
Я проанализирую данные по источникам за последние 3 месяца.

[Вызывает query_retailcrm 3 раза за разные месяцы]

Анализ:
- Сентябрь: Google 30 регистраций
- Октябрь: Google 35 регистраций
- Ноябрь: Google 38 регистраций

Вывод:
"Google показывает стабильный рост: с 30 регистраций в сентябре до 38 в ноябре (+26.7%)."
```

## Обработка ошибок

### Пример: Обработка ошибки в Python

```python
import requests

def get_sales_by_source_safe(date_from, date_to):
    try:
        payload = {
            "operation": "get_sales_by_source",
            "params": {
                "date_from": date_from,
                "date_to": date_to
            }
        }
        
        response = requests.post("http://localhost:3000/query", json=payload, timeout=10)
        response.raise_for_status()
        
        return response.json()
    
    except requests.exceptions.ConnectionError:
        print("Ошибка: не удается подключиться к MCP серверу")
        return None
    
    except requests.exceptions.Timeout:
        print("Ошибка: время ожидания истекло")
        return None
    
    except requests.exceptions.HTTPError as e:
        print(f"Ошибка HTTP: {e}")
        return None
    
    except Exception as e:
        print(f"Неожиданная ошибка: {e}")
        return None
```

## Советы по использованию

1. **Кэширование**: Результаты кэшируются на 30 минут, используйте это для оптимизации
2. **Пакетные запросы**: Для нескольких периодов делайте запросы последовательно
3. **Обработка ошибок**: Всегда обрабатывайте ошибки подключения
4. **Логирование**: Логируйте запросы для отладки
5. **Тестирование**: Тестируйте с известными датами перед использованием в продакшене
