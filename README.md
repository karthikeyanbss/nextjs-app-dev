# TypeScript Next.js Azure Container Apps - DevOps Pipeline

A production-ready TypeScript Next.js application with complete CI/CD pipeline for Azure Container Apps deployment.

## 🎯 Features

✅ **Single Image Build** - Build once, deploy everywhere (immutable deployments)  
✅ **Azure Container Registry** - Centralized container image management  
✅ **Single Container App Target** - Direct deployment to `nextjs-app-dev` in `ner-env`  
✅ **Gemini-style chat UI** - Ask questions and display replies from the FastAPI endpoint  
✅ **Azure Container Apps** - Serverless container platform with auto-scaling  
✅ **Security** - Non-root container user, minimal Alpine base image  
✅ **Modern Stack** - Next.js 16, TypeScript 5, React 19  

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│                                                              │
│  ┌──────────────┐      ┌─────────────────────────────┐     │
│  │   Build Job  │──────▶│  Azure Container Registry   │     │
│  │ (Single Image)│      │   (nerfastapiacr.azurecr.io)│     │
│  └──────────────┘      └─────────────────────────────┘     │
│                                    │                         │
│                    ▼                                         │
│              ┌────────────────────┐                         │
│              │   nextjs-app-dev    │                         │
│              │ Container App (dev) │                         │
│              └────────────────────┘                         │
│                                                              │
│              Resource Group: ner-service-rg                  │
│       Container Apps Environment: ner-env                   │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Prerequisites

### Azure Resources Required

1. **Azure Container Registry (ACR)**
  - Name: `nerfastapiacr`
  - SKU: Standard or Premium
  - Admin user enabled

2. **Azure Resource Group**
  - Name: `ner-service-rg`
  - Location: Your preferred region (e.g., eastus)

3. **Azure Container Apps Environment**
  - `ner-env`

4. **Container Apps (hosted in `ner-env`)**
  - `nextjs-app-dev`

### GitHub Secrets Required

Configure the following secrets in your GitHub repository:

- `AZURE_CREDENTIALS` - Azure Service Principal credentials (JSON format)
- `ACR_USERNAME` - Azure Container Registry username
- `ACR_PASSWORD` - Azure Container Registry password

## 🔧 Setup Instructions

### 1. Create Azure Resources

```bash
# Variables
RESOURCE_GROUP="ner-service-rg"
LOCATION="eastus"
ACR_NAME="nerfastapiacr"

# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Standard \
  --admin-enabled true

# Create Container Apps Environment
az containerapp env create \
  --name ner-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Optional: create a placeholder Container App inside ner-env using a starter image
az containerapp create \
  --name nextjs-app-dev \
  --resource-group $RESOURCE_GROUP \
  --environment ner-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --ingress external \
  --target-port 80

# The GitHub Actions workflow updates nextjs-app-dev with the `nerfastapiacr` image.

The GitHub Actions workflow now checks whether the container app exists and is provisioned before attempting to deploy. If the app has a `Failed` provisioning state or is missing, the workflow will re-create it with the Azure starter image so the action can push your custom image without repeatedly failing.

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)

```
```

### 2. Push Alpine Image Repository

```bash
# Login to the newly created registry
az acr login --name $ACR_NAME

# Ensure the repository exists to capture the Alpine-based artifact
az acr repository create --name $ACR_NAME --repository nextjs-alpine --image nextjs-alpine:latest

# Build and push the same image that GitHub Actions will deploy later
docker build -t $ACR_NAME.azurecr.io/nextjs-alpine:latest .
docker push $ACR_NAME.azurecr.io/nextjs-alpine:latest
```

### 3. Configure GitHub Secrets

In your GitHub repository, navigate to Settings → Secrets and Variables → Actions, and add:

1. **AZURE_CREDENTIALS**: The JSON output from the `az ad sp create-for-rbac` command
2. **ACR_USERNAME**: The ACR username from above
3. **ACR_PASSWORD**: The ACR password from above

### 4. Deploy

Push to the `main` branch or manually trigger the workflow:

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

Or trigger manually from GitHub Actions tab.

## 🏗️ Local Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Build Docker Image Locally

```bash
docker build -t nextjs-app:latest .
docker run -p 3000:3000 nextjs-app:latest
```

## 💬 Gemini-style Chat Interface

The homepage now renders a Gemini-inspired chat experience that speaks to the FastAPI container app hosted at https://fastapi-dev.calmdesert-eab0db8f.eastus.azurecontainerapps.io. The UI mirrors Google Gemini with glassmorphic cards, suggestion pills, and conversation bubbles, and converses with the backend via `POST` requests.

### Frontend Environment Variables

Use these `NEXT_PUBLIC_` variables to configure which backend the chat interface calls. Set them in `.env.local` for local development and as repository-level environment variables before building or deploying:

- `NEXT_PUBLIC_BACKEND_URL` (default: `https://fastapi-dev.calmdesert-eab0db8f.eastus.azurecontainerapps.io`) – the base URL of the FastAPI service.
- `NEXT_PUBLIC_BACKEND_PATH` (default: `/chat`) – the path appended to the base URL when sending user prompts.

The UI automatically prepends the base URL and path, so updating the defaults is all that is needed to point the chat to a different FastAPI endpoint or path.

## 📦 Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── public/                # Static assets
├── .github/
│   └── workflows/
│       └── azure-container-apps.yml  # CI/CD pipeline
├── Dockerfile             # Multi-stage Docker build
├── .dockerignore          # Docker ignore rules
├── next.config.js         # Next.js configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## 🔒 Security Features

- **Non-root User**: Container runs as `nextjs` user (UID 1001)
- **Minimal Base Image**: Alpine Linux (node:20-alpine)
- **Multi-stage Build**: Optimized image size
- **No Secrets in Code**: All sensitive data via GitHub Secrets
- **Immutable Deployments**: Same image across all environments

## 🌍 Environment Configuration

Each environment gets unique configuration:

| Environment | Min Replicas | Max Replicas | Purpose |
|-------------|--------------|--------------|---------|
| Dev         | 1            | 3            | Development testing for nextjs-app-dev |

Environment-specific variables are injected during deployment:
- `NEXT_PUBLIC_ENVIRONMENT`: dev
- `NEXT_PUBLIC_VERSION`: Git commit SHA
- `NODE_ENV`: production

## 🔄 CI/CD Workflow

### Build Job
1. Checkout code
2. Set up Docker Buildx
3. Login to Azure Container Registry
4. Build Docker image (multi-stage)
5. Push to ACR with multiple tags
6. Cache layers for faster subsequent builds

### Deploy Job
1. Runs once for `nextjs-app-dev` after the build completes
2. Azure login with Service Principal
3. Deploy to Azure Container Apps
4. Configure environment variables (dev)
5. Display deployment URL

## 📊 Monitoring

Access your deployed applications:

- Dev: `https://nextjs-app-dev.<region>.azurecontainerapps.io`

Monitor via Azure Portal:
- Container Apps metrics
- Log Analytics
- Application Insights (if configured)

## 🛠️ Troubleshooting

### Build Failures
- Check ACR credentials in GitHub Secrets
- Verify Docker build succeeds locally
- Review GitHub Actions logs

### Deployment Failures
- Verify Azure credentials are valid
- Check Container App Environment exists
- Ensure Resource Group exists
- Review Azure Activity Log

### Application Issues
- Check Container App logs in Azure Portal
- Verify environment variables are set correctly
- Test Docker image locally

## 📝 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally and in Docker
5. Submit a pull request

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Azure Container Apps](https://docs.microsoft.com/azure/container-apps/)
- [Azure Container Registry](https://docs.microsoft.com/azure/container-registry/)
- [GitHub Actions](https://docs.github.com/actions)