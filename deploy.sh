#!/bin/bash

# V Kitchen Deployment Script
echo "🚀 Starting V Kitchen deployment process..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "npm i -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Please login to Vercel first:"
    echo "vercel login"
    exit 1
fi

echo "✅ Vercel CLI is ready"

# Deploy Backend
echo "📦 Deploying backend..."
cd backend
vercel --prod --yes
BACKEND_URL=$(vercel ls | grep v-kitchen-backend | head -1 | awk '{print $2}')
echo "✅ Backend deployed at: https://$BACKEND_URL"

# Deploy Frontend
echo "📦 Deploying frontend..."
cd ../frontend
vercel --prod --yes
FRONTEND_URL=$(vercel ls | grep frontend | head -1 | awk '{print $2}')
echo "✅ Frontend deployed at: https://$FRONTEND_URL"

echo ""
echo "🎉 Deployment completed!"
echo "Backend URL: https://$BACKEND_URL"
echo "Frontend URL: https://$FRONTEND_URL"
echo ""
echo "📝 Next steps:"
echo "1. Update environment variables in Vercel dashboard"
echo "2. Update CORS settings in backend"
echo "3. Update API base URL in frontend"
echo "4. Test the application"
echo ""
echo "🔧 Environment variables needed:"
echo "Backend: MONGODB_URI, JWT_SECRET, STRIPE_SECRET_KEY, EMAIL_USER, EMAIL_PASS"
echo "Frontend: VITE_API_BASE_URL, VITE_STRIPE_PUBLISHABLE_KEY"
