# Deploying the AI Skincare Advisor Application

This application consists of two main parts:
1.  A **Next.js frontend** (located in the root `app/`, `components/`, `lib/`, `public/` directories).
2.  A **Python FastAPI backend** (located in the `backend/` directory).

The frontend makes API calls to the backend for AI-powered skin analysis and product recommendations.

## Deployment Steps

### 1. Backend Deployment (Python FastAPI Application)

The backend is designed to be deployed as a Docker container.

**a. Prerequisites:**
   - Docker installed locally.
   - Access to a container registry (e.g., Docker Hub, AWS ECR, Google Container Registry, Azure Container Registry) is recommended.
   - Access to a container hosting service (e.g., AWS App Runner, Google Cloud Run, Heroku, DigitalOcean App Platform, Azure App Service).

**b. Build the Docker Image:**
   - Open your terminal in the root directory of this repository.
   - Run the build command:
     ```bash
     docker build -t skincare-app-backend .
     ```
     (You can replace `skincare-app-backend` with your preferred image name).

**c. Push to Container Registry (Recommended):**
   - Tag your image for your chosen registry:
     ```bash
     docker tag skincare-app-backend your-registry/your-image-name:latest
     ```
     (Replace `your-registry/your-image-name` accordingly).
   - Log in to your container registry (e.g., `docker login`).
   - Push the image:
     ```bash
     docker push your-registry/your-image-name:latest
     ```

**d. Deploy to Hosting Service:**
   - Choose your hosting service.
   - Deploy your Docker image (either from the registry or by direct upload if supported).
   - **Configuration:**
     - The container should be configured to expose and listen on **port 8000**.
     - Ensure the service has adequate resources (CPU/memory), as the backend loads machine learning models (`.pt` file for acne detection and processes a CSV for recommendations).
   - Once deployed, the hosting service will provide a public URL for your backend (e.g., `https://your-backend-service.example.com`). **Note this URL.**

**e. Backend Model and Data Files:**
   - The Dockerfile handles copying the necessary model (`YOLOv5 Acne Detector Model/best.pt`) and data (`Product Recommendation Model/amazon_beauty_products_high_quality_20250602_152900.csv`) files into the image. The backend Python scripts are configured to load these files from their packaged locations.

**f. CORS Configuration (Security Best Practice):**
   - The backend (`backend/main.py`) currently allows all origins (`allow_origins=["*"]`) for CORS.
   - **For production, it is strongly recommended to restrict this.** Update the `CORSMiddleware` in `backend/main.py` to only allow your frontend's domain:
     ```python
     # In backend/main.py
     app.add_middleware(
         CORSMiddleware,
         allow_origins=["https://your-frontend-domain.com"], # Replace with your actual frontend domain
         allow_credentials=True,
         allow_methods=["*"],
         allow_headers=["*"],
     )
     ```
   - You will need to rebuild and redeploy the backend Docker image after making this change.

### 2. Frontend Deployment (Next.js Application)

**a. Prerequisites:**
   - Account with a Next.js hosting platform (e.g., Vercel, Netlify, AWS Amplify).

**b. Configure Environment Variables:**
   - During the setup process on your chosen hosting platform, you **must** set the following environment variable:
     - `NEXT_PUBLIC_BACKEND_URL`: Set this to the **public URL of your deployed backend service** (from step 1.d). For example: `https://your-backend-service.example.com`.

**c. Deploy:**
   - Connect your Git repository to the hosting platform.
   - Follow the platform's instructions for deploying a Next.js application.
   - The build process should pick up the `NEXT_PUBLIC_BACKEND_URL` environment variable to correctly connect to your backend.

## Development Notes

### Backend URL in Frontend
The frontend component `components/questionnaire-form.tsx` is configured to use `process.env.NEXT_PUBLIC_BACKEND_URL`. If this environment variable is not set (e.g., during local development without a `.env.local` file), it will default to `http://localhost:8000` to connect to a locally running backend.

### Unused Code (`app/api/analyze/route.ts`)
There is a Next.js API route at `app/api/analyze/route.ts` which uses the Google Generative AI API. This route appears to be **unused** in the primary questionnaire flow, which directly calls the Python backend. This code can be:
   - Kept for future development or an alternative feature.
   - Removed if it's confirmed to be obsolete, to simplify the codebase.

### `pathlib` Workaround in `backend/acne_detector.py`
The `AcneDetector` class includes a workaround for `pathlib` behavior that was likely added to address issues when loading the PyTorch model on Windows. This workaround is now conditional and should only apply if the OS is Windows (`os.name == 'nt'`). This change is intended to prevent potential issues in Linux-based deployment environments. If model loading errors occur in your specific deployment, this section of the code (`backend/acne_detector.py`) might be a point to review.
---

This file should provide a good overview for deploying the application.Tool output for `create_file_with_block`:
