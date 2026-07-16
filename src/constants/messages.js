module.exports = Object.freeze({

  // ───── Auth ─────
  CART_AUTH_REQUIRED: 'Please Sign In to view the cart.',
  UNAUTHORIZED_ORDER: 'Unauthorized to access this order.',

  // ───── Common ─────
  ORDER_ID_REQUIRED: 'Order ID is required.',
  ORDER_NOT_FOUND: 'Order not found.',
  USER_NOT_FOUND: 'User not found.',
  PRODUCT_NOT_FOUND: 'Product not found.',
  ITEM_NOT_FOUND: 'Item not found.',
  ADDRESS_NOT_FOUND: 'Address not found.',
  CART_NOT_FOUND: 'Cart not found.',
  INVALID_REQUEST: 'Invalid request.',

  // ───── Cart ─────
  CART_EMPTY: 'Your cart is empty.',
  CART_EMPTY_FLASH: 'Your cart is empty. Add some items before proceeding to checkout.',
  PRODUCT_DETAILS_MISSING: 'Product details are missing.',
  VARIANT_NOT_FOUND: 'Variant not found.',
  SELECTED_VARIANT_NOT_FOUND: 'Selected variant not found.',
  OUT_OF_STOCK: 'Product is out of stock.',
  QTY_EXCEEDS_STOCK: 'Requested quantity exceeds available stock.',
  ITEM_EXISTS_CART: 'Item already exist in the cart',
  ITEM_ID_NOT_FOUND: 'Item ID or User ID is not found.',
  CART_ITEM_NOT_FOUND: 'Cart item not found.',
  MAX_QTY_REACHED: 'Maximum 5 quantities are allowed.',
  MIN_QTY: 'Quantity cannot be less than 1.',
  ITEM_REMOVED: 'Item successfully removed from the cart.',
  QTY_UPDATED: 'Quantity updated successfully.',
  PRODUCT_ADDED_CART: 'Product successfully added in the cart.',
  FAILED_LOAD_CHECKOUT: 'Failed to load checkout',

  // ───── Checkout / Payment ─────
  ADDRESS_PAYMENT_REQUIRED: 'Address and payment method are required.',
  INSUFFICIENT_WALLET: 'Insufficient wallet balance.',
  INVALID_WALLET_TX: 'Invalid wallet transaction.',
  ORDER_NOT_FOUND_CHECKOUT: 'Order could not be found.',
  PAYMENT_VERIFY_FAILED: 'Payment verification failed.',
  WALLET_PAYMENT_SUCCESS: 'Payment successful via wallet.',
  PAYMENT_VERIFIED: 'Payment verified successfully',

  // ───── Coupon ─────
  INVALID_INPUT: 'Invalid input',
  FAILED_APPLY_COUPON: 'Failed to apply coupon.',
  COUPON_ALREADY_APPLIED: 'A coupon is already applied.',
  COUPON_EXPIRED: 'Coupon has expired',
  COUPON_ALREADY_USED: 'Looks like this coupon has already been used!',
  COUPON_MIN_AMOUNT: (min) => `Almost there! Bump your cart up by ${min} to claim your savings.`,
  COUPON_PRODUCT_UNAVAILABLE: 'One or more products in your cart are no longer available.',
  INVALID_COUPON: 'Invalid coupon.',
  COUPON_PRICE_FLOOR: (name) => `Coupon cannot be applied. It reduces ${name} below its minimum allowed price floor.`,
  COUPON_APPLIED: 'Coupon applied successfully',

  // ───── Order ─────
  ORDER_USER_NOT_FOUND: 'Order or user was not found',
  ORDER_ELIGIBLE_STATUS: (status) => `No items are eligible for '${status}' status.`,
  STATUS_CHANGED: 'Status changed successfully.',
  FAILED_UPDATE_STATUS: 'Failed to update status.',
  INVALID_STATUS: 'Invalid status.',
  FAILED_RESTORE_STOCK: 'Failed to restore product stock.',
  NO_DELIVERED_ITEMS: 'No delivered items to invoice.',

  // ───── Product ─────
  PRODUCT_NOT_FOUND_ORDER: 'Product not found in this order.',

  // ───── Cancellation ─────
  ITEM_ALREADY_CANCELLED: 'This product has already been cancelled.',
  CANCELLATION_FAILED: 'Failed to process cancellation.',
  CANCELLED_REFUND: 'You have cancelled the product. The refund has been credited to your wallet.',
  CANCELLED_NO_REFUND: 'You have cancelled the product.',

  // ───── Return (User) ─────
  RETURN_REQUIRED: 'Order ID, item ID, and reason are required.',
  RETURN_ORDER_NOT_FOUND: 'Order or item not found.',
  RETURN_ONLY_DELIVERED: 'Only delivered items can be returned.',
  RETURN_ALREADY_REQUESTED: 'Return already requested for this item.',
  RETURN_ALREADY_APPROVED: 'Return already approved for this item.',
  RETURN_NO_DELIVERY_DATE: 'Delivery date not recorded. Cannot process return.',
  RETURN_WINDOW_EXPIRED: 'Return window has expired. Items can only be returned within 7 days of delivery.',
  RETURN_REQUEST_SUBMITTED: 'Return request submitted successfully. Awaiting admin approval.',
  RETURN_ORDER_SUCCESS: 'Order successfully requested for return. Order will be returned when approved.',

  // ───── Return (Admin) ─────
  RETURN_FAILED_LOAD: 'Failed to load product data.',
  RETURN_INVALID_STATUS: 'Invalid return status.',
  RETURN_REJECT_REASON_REQUIRED: 'Please provide a reason for rejecting the return.',
  RETURN_ORDER_ITEM_NOT_FOUND: 'Order item not found.',
  RETURN_NO_PENDING: 'No pending return request found.',
  RETURN_APPROVED_STOCK_FAIL: 'Return approved, but stock restore failed. Check server logs.',
  RETURN_APPROVED: 'Return request approved successfully.',
  RETURN_REJECTED: 'Return request rejected successfully.',

  // ───── Admin Auth ─────
  INVALID_CREDENTIALS: 'Invalid credentials',
  INVALID_CREDENTIALS_ASTERISK: 'Invalid credentials *',
  FILL_ALL_FIELDS: 'Please fill out all fields *',

  // ───── Admin: Category ─────
  CATEGORY_NOT_FOUND: 'Category not found.',
  CATEGORY_ID_NOT_FOUND: 'Category ID not found.',
  CATEGORY_FIELD_EXISTS: (field) => `A category with this ${field} already exists.`,
  CATEGORY_TITLE_BRAND_REQUIRED: 'Title and brand are required.',
  CATEGORY_FILL_ALL_FIELDS: 'Please fill out all the fields.',
  CATEGORY_BRANDS_EXIST: (brands) => `Brand(s) already exist in this category: ${brands}`,
  CATEGORY_BRANDS_ADDED: 'Brands added to category successfully!',
  CATEGORY_CREATED: 'Category created successfully!',
  CATEGORY_TITLE_ID_REQUIRED: 'Title and categoryId are required.',
  CATEGORY_TITLE_EXISTS: 'Another category with this title already exists.',
  CATEGORY_UPDATED: 'Category updated successfully!',
  CATEGORY_DELETED: 'Category deleted successfully!',
  CATEGORY_FOUND: 'Category found',

  // ───── Admin: Product ─────
  PRODUCTS_FETCHED: 'Products fetched successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_ID_NOT_FOUND: 'Product ID not found.',
  PRODUCT_REMOVED: 'Product removed successfully',
  PRODUCT_STATUS: (status) => `Product is now ${status}`,
  MISSING_REQUIRED_FIELDS: 'Missing required fields. Please provide both productId and productDetails',
  UNAUTHORIZED_AJAX: 'Unauthorized',

  // ───── Admin: Coupon ─────
  COUPON_ALL_FIELDS_REQUIRED: 'All fields are required',
  COUPON_INVALID_TYPE: 'Invalid coupon type',
  COUPON_EXISTS: 'Coupon already exists',
  COUPON_EXPIRY_FUTURE: 'Expiry date must be today or a future date',
  COUPON_CREATED: 'Coupon created successfully.',
  COUPON_NOT_FOUND: 'Coupon not found.',
  COUPON_UPDATED: 'You have successfully updated the coupon.',
  COUPON_DELETED: 'You have successfully deleted the coupon.',
  COUPON_ID_NOT_FOUND: 'Coupon ID was not found.',
  COUPON_ID_REQUIRED: 'Coupon ID is required.',
  COUPON_STATUS: (status) => `Coupon is now ${status}.`,

  // ───── Admin: Offer ─────
  OFFER_FIELDS_MISSING: 'Required fields are missing.',
  OFFER_CATEGORY_INACTIVE: 'Selected category not found or is inactive.',
  OFFER_EXISTS: 'Offer already exists for this brand in the selected category.',
  OFFER_CREATED: 'Offer created successfully',
  OFFER_NOT_FOUND: 'Offer not found.',
  OFFER_STATUS_CHANGED: 'Status changed',
  OFFER_UPDATE_FAILED: 'Could not find offer',
  OFFER_UPDATED: 'Offer updated successfully',
  OFFER_NAME_UNIQUE: 'Offer name must be unique.',
  OFFER_REMOVED: 'Offer removed successfully',

  // ───── Admin: User Management ─────
  INVALID_USER_ID: 'Invalid user ID provided.',
  USER_ALREADY_UNBLOCKED: 'User is already unblocked',
  USER_UNBLOCKED: 'User has been successfully unblocked',
  USER_ALREADY_BLOCKED: 'User is already blocked.',
  USER_BLOCKED: 'User has been successfully blocked',

  // ───── Admin: Sales Report ─────
  INVALID_DATE_SELECTION: 'Invalid date selection.',
  INVALID_FORMAT: 'Invalid format selection.',

  ORDER_FAILED_PAYMENT_STATUS: 'Cannot change status for failed payment orders.',
  ORDER_NOT_ELIGIBLE_RETRY: 'This order is not eligible for retry.',

  // ───── Server ─────
  SERVER_ERROR: 'Server error',
  SELECT_FILTER: 'Please select a filter',

  // ───── Stock ─────
  STOCK_LIMIT_REACHED: (avail) => `Only ${avail} item(s) available in stock.`,

  // ───── Admin: Dashboard ─────
  FAILED_LOAD_ORDERS: 'Failed to load orders.',

  // ───── User Auth ─────
  USERNAME_LETTERS_ONLY: 'Username must contain only letters and be at least 3 characters long.',
  VALID_EMAIL: 'Please enter a valid email address.',
  PASSWORD_REQUIREMENTS: 'Password must be at least 8 characters long and contain at least one number and one special character (@$!%*?&).',
  PASSWORDS_MISMATCH: 'Passwords do not match.',
  EMAIL_TAKEN: 'Email is already taken.',
  ERROR_CREATING_USER: 'Error creating user. Please try again.',
  PASSWORD_REQUIRED: 'Password is required.',
  USER_NOT_FOUND_SIGNIN: 'User not found. Please check your email or sign up.',
  USER_BLOCKED_CONTACT: 'You are blocked by the admin. Please contact support.',
  GOOGLE_LOGIN_METHOD: 'Login failed. Please ensure you are using the correct method. If you signed up with Google, please log in using the Google option.',
  INVALID_PASSWORD: 'Invalid password. Please try again.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
  PROVIDE_VALID_EMAIL: 'Provide a valid email.',
  PASSWORD_UPDATED: 'Password Updated Successfully',
  NOT_AUTHENTICATED: 'Not authenticated',

  // ───── User Profile & Address ─────
  ADDRESS_ADDED: 'You have successfully added address.',
  ADDRESS_OR_USER_NOT_FOUND: 'address or user not found',
  ADDRESS_REMOVED: 'Address Successfully removed',
  ADDRESS_UPDATED: 'Address Successfully Updated.',
  ADDRESS_FETCHED: 'Address fetched',
  FORM_INPUTS_REQUIRED: 'Form inputs or user not found.',
  ADDRESS_NOT_FOUND_EDIT: 'Address not found',
  PROFILE_UPDATED: 'Profile updated successfully.',
  NEWSLETTER_SUBSCRIBED: 'Successfully subscribed to newsletter!',

  // ───── Wishlist ─────
  WISHLIST_AUTH_REQUIRED: 'Please sign in to add items to your wishlist.',
  WISHLIST_USER_NOT_FOUND: 'Could not find the user or the wishlist.',
  WISHLIST_NOT_FOUND: 'Could not find the wishlist.',
  WISHLIST_EXISTS: 'Product already exists in the wishlist.',
  WISHLIST_ADDED: 'Product Successfully Added.',
  WISHLIST_PRODUCT_NOT_FOUND: 'Product not found in the wishlist.',
  WISHLIST_REMOVED: 'Product successfully removed from the wishlist.',
  WISHLIST_PRODUCT_ID_MISSING: 'Could not find the product.',

  // ───── Wallet ─────
  INVALID_AMOUNT: 'Please input a valid amount greater than 0.',

  // ───── OTP ─────
  OTP_EMAIL_TAKEN: 'Email already taken',
  OTP_FAILED: (msg) => `Failed to send OTP: ${msg}`,
  OTP_SENT: 'OTP sent to your email',
  OTP_NOT_FOUND: 'OTP not found',
  OTP_INVALID_EXPIRED: 'Invalid or expired otp',
  OTP_INVALID_ID: 'Invalid OTP ID',
  OTP_EXPIRED: 'OTP has been expired',
  OTP_VERIFIED: 'OTP verified successfully',
});
