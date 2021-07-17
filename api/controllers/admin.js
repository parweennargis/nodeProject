const mongoose = require('mongoose');

const { validationResult } = require('express-validator');

const Product = require('../models/product');
const Order = require('../models/order');
const Notification = require('../models/notification');

exports.getAddProduct = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const cartQuantity = () => {
                const cartItems = user.cart.items;
                let qtd = 0;
                cartItems.forEach(item => {
                    qtd += item.quantity;
                })
                return qtd;
            };

            res.render('admin/edit-product', {
                pageTitle: 'Add Product',
                path: '/admin/add-product',
                editing: false,
                hasError: false,
                errorMessage: null,
                validationErrors: [],
                isLoggedIn: req.session.isLoggedIn,
                cartQuantity: cartQuantity()
            });

        });
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const imageUrl = req.body.imageUrl;
    const price = req.body.price;
    const description = req.body.description;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Add Product',
            path: '/admin/add-product',
            editing: false,
            hasError: true,
            product: {
                title: title,
                imageUrl: imageUrl,
                price: price,
                description: description
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });
    product
        .save()
        .then(result => {
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if (!editMode) {
        return res.redirect('/');
    }

    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const cartQuantity = () => {
                const cartItems = user.cart.items;
                let qtd = 0;
                cartItems.forEach(item => {
                    qtd += item.quantity;
                });
                return qtd;
            };

            const prodId = req.params.productId;
            Product.findById(prodId)
                .then(product => {
                    if (!product) {
                        return res.redirect('/');
                    }
                    res.render('admin/edit-product', {
                        pageTitle: 'Edit Product',
                        path: '/admin/edit-product',
                        editing: editMode,
                        product: product,
                        hasError: false,
                        errorMessage: null,
                        validationErrors: [],
                        isLoggedIn: req.session.isLoggedIn,
                        cartQuantity: cartQuantity()
                    });
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                });
        });

};

exports.postEditProduct = (req, res, next) => {
    const prodId = req.body.productId;
    const updatedTitle = req.body.title;
    const updatedPrice = req.body.price;
    const updatedImageUrl = req.body.imageUrl;
    const updatedDesc = req.body.description;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: true,
            hasError: true,
            product: {
                title: updatedTitle,
                imageUrl: updatedImageUrl,
                price: updatedPrice,
                description: updatedDesc,
                _id: prodId
            },
            errorMessage: errors.array()[0].msg,
            validationErrors: errors.array()
        });
    }

    Product.findById(prodId)
        .then(product => {
            if (product.userId.toString() !== req.user._id.toString()) {
                return res.redirect('/');
            }
            product.title = updatedTitle;
            product.price = updatedPrice;
            product.description = updatedDesc;
            product.imageUrl = updatedImageUrl;
            return product.save().then(result => {
                res.redirect('/admin/products');
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getProducts = (req, res, next) => {

    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const cartQuantity = () => {
                const cartItems = user.cart.items;
                let qtd = 0;
                cartItems.forEach(item => {
                    qtd += item.quantity;
                });
                return qtd;
            };

            Product.find({ userId: req.user._id })
                .then(products => {
                    res.render('admin/products', {
                        prods: products,
                        pageTitle: 'Admin Products',
                        path: '/admin/products',
                        isLoggedIn: req.session.isLoggedIn,
                        cartQuantity: cartQuantity()
                    });
                })
                .catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                });
        });
};

exports.postDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    Product.deleteOne({ _id: prodId, userId: req.user._id })
        .then(() => {
            res.redirect('/admin/products');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getAllOrders = async (req, res, next) => {
    const data = await Order.aggregate([
        {
            $match: {}
        },
        {
            $lookup: {
                from: 'users',
                let: { 'userId': '$user.userId' },
                pipeline: [
                    {
                        $match: {
                            $and: [
                                { $expr: { $eq: ['$_id', '$$userId'] } },
                            ]
                        }
                    }
                ],
                as: 'user'
            }
        },
        { $unwind: { path: '$user' } },
    ]);
    res.render('admin/order-list', {
        orders: data,
        pageTitle: 'Admin Products',
        path: '/admin/order/list',
        isLoggedIn: req.session.isLoggedIn,
        cartQuantity: 10
    });
};

exports.changeOrderStatus = async (req, res, next) => {
    if (req.body.orderId && req.body.orderStatus) {
        // update the order status
        await Order.updateOne({ _id: req.body.orderId }, { orderStatus: req.body.orderStatus });

        // create the notification document
        await Notification.create({
            orderId: req.body.orderId,
            userId: req.session.user._id,
            msg: req.body.orderStatus
        })
    }
    res.redirect('/admin/order/list');
};
