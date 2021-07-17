const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
    products: [{
        product: { type: Object, required: true },
        quantity: { type: Number, required: true }
    }],
    user: {
        email: {
            type: String,
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    },
    orderTotal: {
        type: Number,
        required: true
    },
    orderStatus: {
        type: String,
        enum: ['ORDERED', 'PREPARING', 'OUT FOR DELIVERY', 'ARRIVED'],
        default: 'ORDERED'
    }
});

module.exports = mongoose.model('Order', orderSchema);