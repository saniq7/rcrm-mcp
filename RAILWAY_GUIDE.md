# Как запустить MCP сервер в облаке (Railway)

Это руководство поможет вам бесплатно (или очень дешево) разместить ваш сервер в интернете, чтобы n8n мог к нему обращаться.

## Шаг 1: Подготовка GitHub

1.  Зарегистрируйтесь на [GitHub.com](https://github.com), если у вас нет аккаунта.
2.  Создайте новый репозиторий (кнопка **New** или **+**).
    *   Назовите его, например, `retailcrm-mcp`.
    *   Сделайте его **Private** (чтобы никто не видел ваш код).
3.  Загрузите файлы из архива `retailcrm-mcp-server-cloud.tar.gz` в этот репозиторий.
    *   Можно просто перетащить файлы через веб-интерфейс GitHub (кнопка **Add file** -> **Upload files**).

## Шаг 2: Запуск на Railway

1.  Перейдите на [Railway.app](https://railway.app).
2.  Нажмите **Login** и войдите через **GitHub**.
3.  Нажмите **+ New Project** -> **Deploy from GitHub repo**.
4.  Выберите ваш репозиторий `retailcrm-mcp`.
5.  Нажмите **Deploy Now**.

Railway начнет сборку вашего проекта. Это займет 1-2 минуты.

## Шаг 3: Настройка переменных

Пока проект собирается, нужно добавить ваши ключи:

1.  В проекте Railway перейдите во вкладку **Variables**.
2.  Нажмите **New Variable** и добавьте:
    *   `RETAILCRM_URL` = `https://ваш-магазин.retailcrm.ru`
    *   `RETAILCRM_API_KEY` = `ваш-api-ключ`
3.  Railway автоматически перезапустит сервер с новыми настройками.

## Шаг 4: Получение ссылки

1.  Перейдите во вкладку **Settings**.
2.  Найдите раздел **Networking**.
3.  Нажмите **Generate Domain**.
4.  Вы получите ссылку вида: `https://retailcrm-mcp-production.up.railway.app`.

**Всё готово!** Ваш сервер работает в облаке.

---

## Как использовать в n8n

Теперь в вашем n8n (где бы он ни был) используйте **HTTP Request** ноду:

*   **Method:** `POST`
*   **URL:** `https://ваша-ссылка-из-railway/mcp`
*   **Body:** JSON

### Пример запроса (Body):

```json
{
  "name": "get_orders",
  "arguments": {
    "filter": {
      "status": "new"
    },
    "limit": 5
  }
}
```

### Пример запроса справочника (Body):

```json
{
  "name": "get_reference",
  "arguments": {
    "dictionary": "statuses"
  }
}
```
