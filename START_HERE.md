# Start here

Read `AGENTS.md`, `README.md`, `BUILD_STATUS.md`, and the complete approved specification in `docs/product/` before changing architecture. Resume from `BUILD_STATUS.md`, preserve user work, keep code readable, and update the status after meaningful milestones.

The application uses production provider interfaces and PostgreSQL in every runtime environment. Missing credentials must fail closed. Isolated tests may use local fixtures but must never create a runtime identity, balance, provider result, signature, or transaction.
