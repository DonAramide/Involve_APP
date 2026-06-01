// Jest setup — sets NODE_ENV to 'test' before any modules are loaded
// This prevents app.ts from binding to a real port during Supertest runs
process.env.NODE_ENV = 'test';
