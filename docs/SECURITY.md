# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in AEGIS, please report it to:

- Email: security@aegis.dev
- Do NOT create a public GitHub issue

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Active support  |
| 0.x.x   | ❌ Beta only       |

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files
2. **JWT Secrets**: Use strong, unique secrets
3. **Rate Limiting**: Enable in production
4. **HTTPS**: Always use in production
5. **Dependencies**: Keep updated regularly
6. **Audit Trail**: Enable for all sensitive operations