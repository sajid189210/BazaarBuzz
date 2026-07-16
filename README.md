# BazaarBuzz — Fashion E-Commerce Platform

Full-featured fashion e-commerce web application built with Node.js, Express, MongoDB, and EJS. Supports user authentication, product browsing, cart/wishlist management, coupon and offer systems, Razorpay payments, admin dashboard, and more.

---

## Features

### User Features
- **Authentication** — Email/password signup with OTP verification, Google OAuth, password reset via OTP
- **Product Catalog** — Browse by category, filter by price/brand, search with autocomplete
- **Product View** — Image gallery, size/color variant selection, real-time stock indicators, recently viewed
- **Cart** — Add/remove items, update quantities, coupon application, discount calculation
- **Wishlist** — Save products for later
- **Checkout** — Address management, order summary, coupon + offer stacking, Razorpay payment
- **Orders** — Order history, invoice download, cancel/return items
- **Wallet** — User wallet for credits and refunds
- **Coupons** — Browse and apply available coupons

### Admin Features
- **Dashboard** — Revenue, AOV, top products, new vs repeat customers, order/payment method breakdown
- **Product Management** — CRUD with image upload, stock tracking per variant (size/color)
- **Category Management** — CRUD with cascade status to products and offers
- **Order Management** — View, filter, update order status
- **Return Management** — Process return requests with refund handling
- **Coupon Management** — Create, update, toggle status
- **Offer Management** — Brand+category offer creation with discount
- **User Management** — View, block/unblock users
- **Wallet** — Admin wallet overview

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Template Engine** | EJS with Express EJS Layouts |
| **Database** | MongoDB (Mongoose ODM) |
| **Authentication** | Passport.js (Google OAuth 2.0), bcrypt |
| **Payments** | Razorpay API |
| **Image Hosting** | Cloudinary |
| **Email** | Nodemailer (SMTP) |
| **Session** | express-session with connect-flash |
| **Security** | express-rate-limit, Helmet (commented), CORS |
| **Logging** | Morgan |
| **Compression** | Compression (gzip) |
| **Frontend** | Vanilla JS, Font Awesome, SweetAlert2, CropperJS, ApexCharts |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- pnpm (or npm)
- MongoDB instance (local or Atlas)
- Cloudinary account (free tier)
- Razorpay account (test mode)
- Google OAuth credentials (console.cloud.google.com)
- Gmail account with app password (for Nodemailer)

### Installation

```bash
git clone <repo-url>
cd BazaarBuzz
pnpm install
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3080` | Express server port |
| `NODE_ENV` | No | — | `production` or `development` |
| `SECRET_KEY` | **Yes** | — | Session signing secret |
| `MONGOOSE_URI` | **Yes** | — | MongoDB connection string |
| `BASE_URL` | No | `http://localhost:3080` | App base URL (for email templates) |
| `SUPPORT_EMAIL` | No | `support@bazaarbuzz.com` | Support email shown in views/emails |
| `GOOGLE_CLIENT_ID` | **Yes** | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | — | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | **Yes** | — | `http://localhost:3080/auth/google/callback` |
| `RAZORPAY_KEY_ID` | **Yes** | — | Razorpay API key ID |
| `RAZORPAY_KEY_SECRET` | **Yes** | — | Razorpay API key secret |
| `EMAIL_HOST` | No | `smtp.gmail.com` | SMTP host |
| `EMAIL_PORT` | No | `465` | SMTP port |
| `EMAIL_USER` | **Yes** | — | SMTP email address |
| `EMAIL_PASS` | **Yes** | — | SMTP password or app password |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | **Yes** | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | **Yes** | — | Cloudinary API secret |

### Seed Admin User

```bash
node seed/createAdmin.js --email admin@example.com --password yourpassword
```

### Run

```bash
# Development
pnpm run dev

# Production
pnpm start
```

---

## Project Structure

```
BazaarBuzz/
├── public/                  # Static assets (CSS, JS, images)
│   ├── css/
│   ├── images/
│   ├── javascript/
│   │   ├── admin/           # Admin panel JS modules
│   │   └── user/            # User-facing JS modules
│   └── uploads/
├── seed/
│   └── createAdmin.js       # Admin user seeder
├── src/
│   ├── app.js               # Express app setup & middleware
│   ├── server.js             # Server entry point
│   ├── constants/
│   │   ├── messages.js       # Response message constants
│   │   ├── paymentSources.js # Payment method constants
│   │   ├── redirects.js      # URL redirect constants
│   │   └── walletTypes.js    # Wallet type constants
│   ├── controller/
│   │   ├── adminController/  # Admin controllers
│   │   └── userController/   # User-facing controllers
│   ├── middleware/
│   │   └── adminAuth.js      # Admin authentication middleware
│   ├── model/                # Mongoose models
│   ├── routes/               # Express route definitions
│   ├── Services/             # Business logic & integrations
│   │   ├── cloudinary.js
│   │   ├── emailTemplates.js # HTML email generation
│   │   ├── passport-setup.js # Passport strategy config
│   │   ├── razorPay.js       # Razorpay SDK instance
│   │   ├── responseMapper.js # Standardized response helpers
│   │   └── uploads.js        # Cloudinary upload config
│   ├── utils/                # Utility functions
│   └── views/                # EJS templates
│       ├── admin/            # Admin panel views
│       ├── partials/         # Reusable template partials
│       └── user/             # User-facing views
└── uploads/                  # Local file uploads (banners, etc.)
```

---

## API Endpoints

### User Routes (`/user`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/signUp` | Signup page |
| POST | `/signUp` | Register user |
| GET | `/signIn` | Sign-in page |
| POST | `/signIn` | Authenticate |
| PATCH | `/changePassword` | Change password |
| POST | `/forgotPassword/otpRequest` | Request password reset OTP |
| POST | `/forgotPassword/otpVerify` | Verify password reset OTP |
| PATCH | `/forgotPassword/reset` | Reset password with OTP |
| POST | `/otpRequest` | Request signup OTP |
| POST | `/otpVerify` | Verify signup OTP |
| GET | `/` | Homepage |
| GET | `/cart` | View cart |
| POST | `/cart` | Add to cart |
| PATCH | `/cart/updateQuantity` | Update cart item quantity |
| DELETE | `/cart/removeItem` | Remove cart item |
| GET | `/wishlist` | View wishlist |
| POST | `/wishlist` | Add to wishlist |
| DELETE | `/removeList` | Remove from wishlist |
| GET | `/checkout` | Checkout page |
| POST | `/checkout/payment` | Proceed to payment |
| POST | `/checkout/verify` | Verify payment |
| PATCH | `/checkout/applyCoupon` | Apply coupon |
| GET | `/orders` | Order history |
| POST | `/orders/retryPayment` | Retry failed payment |
| PATCH | `/orders/return` | Request return |
| PATCH | `/orders/cancel` | Cancel order |
| GET | `/wallet` | Wallet page |
| GET | `/address` | Address management |
| POST | `/address` | Add address |
| PATCH | `/address/:addressId` | Edit address |
| DELETE | `/address/:addressId` | Delete address |
| PATCH | `/profile` | Update profile |
| GET | `/coupons` | Browse coupons |
| GET | `/search` | Search products |

### Admin Routes (`/admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard` | Analytics dashboard |
| GET | `/category` | Category list |
| POST | `/category/create` | Create category |
| PATCH | `/categoryStatus/:id` | Toggle category status |
| PATCH | `/category/update` | Update category |
| DELETE | `/category/delete/:id` | Delete category |
| GET | `/userList/` | User management |
| PATCH | `/userList/blocked/:id` | Block user |
| PATCH | `/userList/unblocked/:id` | Unblock user |
| GET | `/productList` | Product list (server-rendered) |
| GET | `/products` | Product list (JSON) |
| POST | `/productList/create` | Create product |
| PATCH | `/status` | Toggle product status |
| PATCH | `/productList/update` | Update product |
| POST | `/editProduct/:id` | Update product (form POST) |
| DELETE | `/product/:id` | Soft-delete product |
| GET | `/orders` | Order list |
| PATCH | `/order/changeStatus` | Update order status |
| GET | `/coupon` | Coupon list |
| POST | `/coupon` | Create coupon |
| PATCH | `/coupon` | Update coupon |
| DELETE | `/coupon` | Delete coupon |
| PATCH | `/coupon/status` | Toggle coupon status |
| GET | `/offer` | Offer list |
| POST | `/offer` | Create offer |
| PATCH | `/offer` | Update offer |
| PATCH | `/offer/status` | Toggle offer status |
| DELETE | `/offer/:id` | Delete offer |
| GET | `/returns` | Return requests |
| PATCH | `/order/returns` | Process return |

---

## Security Notes

- `.env` is gitignored — never commit secrets
- Passwords hashed with bcrypt (async, cost factor 10)
- Rate limiting: 10,000 requests per 15-minute window
- OTPs bound to email address at database level
- Signup requires verified OTP (server-enforced, not client-only)
- Search inputs sanitized against ReDoS via regex escaping
- Session-based authentication with flash messages
- Static assets cached with immutable headers (1 year)

---

## Deployment

The app is configured for deployment on **Render** (or any Node.js host):

1. Set all environment variables in Render dashboard
2. Build command: `pnpm install`
3. Start command: `node src/server.js`
4. Update `GOOGLE_REDIRECT_URI` and `BASE_URL` to your production domain
5. Configure Google OAuth console with your production redirect URI
6. Update Razorpay webhook URLs to production
