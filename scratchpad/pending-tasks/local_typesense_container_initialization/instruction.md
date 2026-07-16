Local development environments require a robust, reproducible search engine setup. Typesense distributed via a Docker container is ideal for local testing.

You need to write a standalone bash script named `start-typesense.sh` that initializes and runs a Typesense server inside a Docker container.

**Constraints:**
- The container must expose port `8108`.
- The API key must be explicitly set to `dev-api-key`.
- The data directory must be mapped to a local `./typesense-data` folder.
- CORS must be enabled within the Typesense server configuration to allow local web client testing.