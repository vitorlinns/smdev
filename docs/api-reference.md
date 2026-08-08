# Referência da API

Base URL: `http://localhost:8025` (ou o host/porta configurados via `HTTP_PORT`, veja [`integration.md`](./integration.md)).

Sem autenticação. Todos os endpoints retornam/aceitam JSON (exceto os `DELETE`, que não têm corpo de resposta).

CORS habilitado para qualquer origem (`Access-Control-Allow-Origin: *`) — pode chamar a API diretamente do JS do navegador rodando em outra porta/origem, sem proxy.

## Tipos

### `MessageSummary`

Retornado pela listagem (`GET /api/messages`). É a versão resumida de uma mensagem, usada na lista da UI.

```ts
interface MessageSummary {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;      // ISO 8601
  preview: string;    // primeiros ~140 caracteres do corpo, sem HTML
  read: boolean;
}
```

### `EmailMessage`

Retornado pelo detalhe (`GET /api/messages/:id`). Estende `MessageSummary` com o conteúdo completo.

```ts
interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;                     // ISO 8601
  text: string;                     // corpo em texto puro (pode ser vazio)
  html: string;                     // corpo em HTML (pode ser vazio)
  headers: Record<string, string>;  // headers brutos do email (chave -> linha completa)
  otp: string | null;               // código de 4-8 dígitos detectado perto de palavras como "código", "verificação", "confirmação", "senha", "otp", "pin"; null se não achou nenhum
  preview: string;
  read: boolean;
}
```

O campo `otp` só é preenchido quando um número de 4 a 8 dígitos aparece perto (~40 caracteres) de uma palavra de contexto (código, verificação, confirmação, senha, autenticação, OTP, PIN, verification, confirmation, verify, security code, access code, one-time, passcode, password reset). Isso evita falsos positivos como número de pedido, últimos dígitos de cartão, ou ano em um texto qualquer.

## Endpoints

### `GET /api/messages`

Lista mensagens na caixa, mais recente primeiro. Retorna um array de `MessageSummary`.

Aceita um parâmetro de query opcional:

| Query param | Descrição |
|---|---|
| `to` | Filtra por destinatário (substring, case-insensitive, aplicado ao campo `to`) |

```bash
curl http://localhost:8025/api/messages
curl "http://localhost:8025/api/messages?to=vitor@example.com"
```

```json
[
  {
    "id": "a6a7b70f-5aad-4b93-9587-c6042730780a",
    "from": "contas@meuapp.com",
    "to": "user@example.com",
    "subject": "Confirme seu cadastro",
    "date": "2026-08-08T20:28:54.000Z",
    "preview": "Seu código de verificação é 738291. Use em até 10 minutos.",
    "read": false
  }
]
```

A caixa guarda no máximo `INBOX_MAX_MESSAGES` mensagens (padrão 200, configurável — veja [`integration.md`](./integration.md)); as mais antigas são descartadas automaticamente.

### `GET /api/messages/latest?to=<email>`

Atalho para pegar direto o detalhe completo (`EmailMessage`) da mensagem mais recente enviada a um destinatário — o caso de uso mais comum em teste automatizado (pegar o OTP sem passar pela UI). Marca a mensagem como lida, igual `GET /api/messages/:id`.

```bash
curl "http://localhost:8025/api/messages/latest?to=vitor@example.com"
```

- `400` com `{ "error": "Query param \"to\" is required" }` se `to` não for informado.
- `404` com `{ "error": "No message found for that recipient" }` se nenhuma mensagem corresponder a esse destinatário.

### `GET /api/messages/:id`

Retorna o detalhe completo (`EmailMessage`) de uma mensagem. **Efeito colateral:** marca a mensagem como lida (`read: true`) — é assim que a UI sabe o que já foi visto.

```bash
curl http://localhost:8025/api/messages/a6a7b70f-5aad-4b93-9587-c6042730780a
```

`404` com `{ "error": "Message not found" }` se o `id` não existir (ex: já foi excluído).

### `DELETE /api/messages/:id`

Remove uma mensagem específica. `204` sem corpo em caso de sucesso, `404` se o `id` não existir.

```bash
curl -X DELETE http://localhost:8025/api/messages/a6a7b70f-5aad-4b93-9587-c6042730780a
```

### `DELETE /api/messages`

Limpa a caixa inteira. `204` sem corpo.

```bash
curl -X DELETE http://localhost:8025/api/messages
```

## Buscando um email por destinatário (padrão de uso comum)

Use `GET /api/messages/latest?to=<email>` (veja acima). É o padrão usado por testes automatizados que precisam pegar o email mais recente enviado para um endereço específico:

```js
async function getLatestMessageTo(email) {
  const res = await fetch(`http://localhost:8025/api/messages/latest?to=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  return res.json();
}
```

Combine com um polling curto (veja exemplo de "esperar o email chegar" em [`integration.md`](./integration.md)) já que o envio via SMTP é assíncrono em relação à sua aplicação.
