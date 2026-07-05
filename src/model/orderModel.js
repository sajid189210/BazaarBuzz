const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        // Product snapshot
        name: {
            type: String,
            required: true,
        },

        image: {
            type: String,
            required: true,
        },

        brand: {
            type: String,
        },

        category: {
            type: String,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Quantity must be an integer.",
            },
        },

        selectedSize: {
            type: String,
            required: true,
        },

        selectedColor: {
            type: String,
            required: true,
        },

        // Price snapshot
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        finalPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "processing",
                "shipped",
                "delivered",
                "cancelled",
                "returned",
            ],
            default: "processing",
        },

        return: {
            type: {
                status: {
                    type: String,
                    enum: [
                        "requested",
                        "approved",
                        "rejected",
                        "completed",
                    ],
                },

                reason: {
                    type: String,
                },

                refundedAmount: {
                    type: Number,
                    default: 0,
                },
            },
            default: null,
        },
    },
);

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },

        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (items) => items.length > 0,
                message: "Order must contain at least one item.",
            },
        },

        shippingAddress: {
            contactName: {
                type: String,
                required: true,
            },

            contactNumber: {
                type: String,
                required: true,
            },

            building: {
                type: String,
                required: true,
            },

            street: {
                type: String,
                required: true,
            },

            landmark: {
                type: String,
            },

            district: {
                type: String,
                required: true,
            },

            state: {
                type: String,
                required: true,
            },

            pincode: {
                type: String,
                required: true,
            },
        },

        payment: {
            method: {
                type: String,
                enum: ["cod", "razorpay", "wallet"],
                required: true,
            },

            status: {
                type: String,
                enum: ["pending", "paid", "failed", "refunded"],
                default: "pending",
            },

            transactionId: {
                type: String,
                default: null,
            },

            gatewayOrderId: {
                type: String,
                default: null,
            },

            paidAt: {
                type: Date,
                default: null,
            },
        },

        coupon: {
            type: {
                code: {
                    type: String,
                },

                discount: {
                    type: Number,
                    default: 0,
                },
            },
            default: null
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        productDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },

        tax: {
            type: Number,
            default: 0,
            min: 0,
        },

        shippingFee: {
            type: Number,
            default: 0,
            min: 0,
        },

        total: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "processing",
                "shipped",
                "partially_delivered",
                "delivered",
                "cancelled",
                "partially_returned",
                "returned",
            ],
            default: "processing",
        },
    },
    {
        timestamps: true,
    }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;