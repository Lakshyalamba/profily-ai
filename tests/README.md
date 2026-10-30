The fixture `fixtures/sample-resume.pdf` describes Jordan Ellis, a deliberately fictional test candidate. It contains no real personal information. Its project claims are synthetic and separate from any GitHub repository used in tests.

`evidence.test.ts` runs local contract, extraction, and isolation tests. Its Gemini transport mock only tests malformed-output handling. It is never enabled by the application.

`npm run test:live` calls the running application with real Gemini and public GitHub requests. It uses `expressjs/express` only as repository evidence, never as a personal contribution by Jordan. A successful run deletes its private test session. See `../VERIFICATION.md` for the recorded verification status.
