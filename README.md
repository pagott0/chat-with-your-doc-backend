# 🧠 Backend - Chat With Your Doc

Check it on: https://chat-with-your-doc-frontend.vercel.app/upload
Upload any invoice image and ask questions about it. Want to know what are the taxes of your invoice? What are the quantity of each item? Who is the issuer? We answer it for you on a fast and easy way.

This is the backend of the project, built with [NestJS](https://nestjs.com/) and [Prisma ORM](https://www.prisma.io/).
You can also see the frontend on the link https://github.com/pagott0/chat-with-your-doc-frontend

## Observations

This is a project for study purposes only.
It uses Tesseract for the OCR and Open Router for the LLM API, because of the free tiers.
On a real product, these are not necessarilly what I would use for the OCR and LLM.

## 🚀 Getting Started Locally

Follow the steps below to run the backend locally in development mode.

---

### ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) or [Yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (or another database supported by Prisma)
- (Optional) [Docker](https://www.docker.com/) to simplify database setup

---

### 📦 Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/backend-repo.git
   cd backend-repo

2. **Install dependencies:**

    npm install
    # or
    yarn install

3. **Environment Variables**
   
    Create a .env file in the root of the project with the following content:
      DATABASE_URL=postgresql://user:password@localhost:5432/database_name
      JWT_SECRET=your_jwt_secret
      PORT=PORT_NUMBER
      OPENROUTER_API_KEY=your_api_key

    Update the values to match your local environment.

4. **Prisma Setup**

    Run the following commands to generate and apply database migrations:
      npx prisma generate
      npx prisma migrate dev

5. **Run The Development Server**

    npm run start:dev
    # or
    yarn start:dev

    The API will be available at:
    👉 http://localhost:PORT_NUMBER

## 🛠️ Scripts

- `start:dev` – Runs the app in development mode with live reload  
- `start:prod` – Runs the app in production mode  
- `build` – Compiles the project  
- `lint` – Runs ESLint  
- `format` – Formats the codebase using Prettier  
- `prisma migrate dev` – Applies migrations and creates the database locally  
- `prisma generate` – Generates Prisma client
