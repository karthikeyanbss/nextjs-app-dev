# nextjs-app-dev
the base image (e.g., FROM nerfastapiacr.azurecr.io/nextjs-base:latest) and keep their own app/feature code. Use their own workflow that consumes the published base image (pulls it, adds their layers, pushes a new tag) and deploys to whichever Container App they own.
