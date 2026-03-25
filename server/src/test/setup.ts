// Bun automatically loads .env files, but we set test-specific values here
process.env.DATABASE_URL =
  "postgres://postgres:postgres@localhost:5432/template_test";
process.env.AUTH0_AUDIENCE = "https://api.test.com";
process.env.AUTH0_ISSUER_BASE_URL = "https://test.auth0.com/";
process.env.NODE_ENV = "test";

export {};
