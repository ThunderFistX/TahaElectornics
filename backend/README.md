# ProjectFF Backend

Node/Express backend for ProjectFF. Features:
- Google OAuth + JWT
- Role-based access control (Admin/User)
- Products CRUD (admin)
- Cart, Orders, Tracking

Quick start:

1. copy `.env.example` to `.env` and set values
2. npm install
3. npm run dev

Where to put MongoDB connection string:

Create a `.env` file in `Backend/` and set `MONGODB_URI` like:

MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/projectff?retryWrites=true&w=majority

Or for local MongoDB:

MONGODB_URI=mongodb://127.0.0.1:27017/projectff

Cloudinary image uploads:

Add these values to `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=projectff/products
```

`CLOUDINARY_FOLDER` is optional. Uploaded product images are stored in Cloudinary, and the hosted image URL is saved in MongoDB as `imageUrl`.

Google OAuth:

Google sign-in is optional. To enable it, add these values to `backend/.env`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5001/auth/google/callback
```

If `GOOGLE_CALLBACK_URL` is not set, the backend defaults to `http://localhost:${PORT}/auth/google/callback`.
The required libraries are already in `backend/package.json`: `passport` and `passport-google-oauth20`.
