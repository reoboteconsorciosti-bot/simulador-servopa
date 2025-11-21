# Servopa Simulator Backend

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Copy `.env.example` to `.env` and update the `DATABASE_URL` with your PostgreSQL connection string.
    ```bash
    cp .env.example .env
    ```

3.  **Database Setup**:
    Run the following command to push the schema to your database:
    ```bash
    npx prisma db push
    ```

4.  **Run Server**:
    ```bash
    npm run dev
    ```

## API Endpoints

-   `POST /api/auth/login`: Login user
-   `POST /api/auth/register`: Register new user
-   `POST /api/simulations`: Save simulation
-   `GET /api/simulations`: List simulations
