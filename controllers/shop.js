const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 6;

exports.getProducts = (req, res, next) => {

    const isLoggedIn = () => {
        if (req.session.isLoggedIn == undefined || !req.session.isLoggedIn) {
            return false;
        }
        return req.session.isLoggedIn;
    };

    const page = +req.query.page || 1;
    let totalItems;

    let cartQuantity = 0;
    if (isLoggedIn()) {
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

                Product.find()
                    .countDocuments()
                    .then(numProducts => {
                        totalItems = numProducts;
                        return Product.find()
                            .skip((page - 1) * ITEMS_PER_PAGE)
                            .limit(ITEMS_PER_PAGE);
                    })
                    .then(products => {
                        res.render('shop/product-list', {
                            prods: products,
                            pageTitle: 'All Products',
                            isLoggedIn: isLoggedIn(),
                            cartQuantity: cartQuantity(),
                            path: '/',
                            currentPage: page,
                            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                            hasPreviousPage: page > 1,
                            nextPage: page + 1,
                            previousPage: page - 1,
                            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        const error = new Error(err);
                        error.httpStatusCode = 500;
                        return next(error);
                    });
            });
    } else {
        Product.find()
            .countDocuments()
            .then(numProducts => {
                totalItems = numProducts;
                return Product.find()
                    .skip((page - 1) * ITEMS_PER_PAGE)
                    .limit(ITEMS_PER_PAGE);
            })
            .then(products => {
                res.render('shop/product-list', {
                    prods: products,
                    pageTitle: 'All Products',
                    isLoggedIn: isLoggedIn(),
                    cartQuantity: cartQuantity,
                    path: '/',
                    currentPage: page,
                    hasNextPage: ITEMS_PER_PAGE * page < totalItems,
                    hasPreviousPage: page > 1,
                    nextPage: page + 1,
                    previousPage: page - 1,
                    lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            });
    }
};

exports.getProduct = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            res.render('shop/product-detail', {
                product: product,
                pageTitle: product.title,
                path: '/products'
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getIndex = (req, res, next) => {
    const isLoggedIn = () => {
        if (req.session.isLoggedIn == undefined || !req.session.isLoggedIn) {
            return false;
        }
        return req.session.isLoggedIn;
    };

    let cartQuantity = 0;
    if (isLoggedIn()) {
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

                Product.find()
                    .then(products => {
                        res.render('shop/index', {
                            prods: products,
                            pageTitle: 'Shop',
                            isLoggedIn: isLoggedIn(),
                            cartQuantity: cartQuantity(),
                            path: '/'
                        });
                    })
                    .catch(err => {
                        const error = new Error(err);
                        error.httpStatusCode = 500;
                        return next(error);
                    });
            });
    } else {
        Product.find()
            .then(products => {
                res.render('shop/index', {
                    prods: products,
                    pageTitle: 'Shop',
                    isLoggedIn: isLoggedIn(),
                    cartQuantity: cartQuantity,
                    path: '/'
                });
            })
            .catch(err => {
                const error = new Error(err);
                error.httpStatusCode = 500;
                return next(error);
            });
    }

};


exports.getCart = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: {...i.productId._doc } };
            });

            console.log(products);

            const cartQuantity = products => {
                let qtd = 0;
                products.forEach(prod => {
                    qtd += prod.quantity;
                })
                return qtd;
            }

            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: products,
                isLoggedIn: req.session.isLoggedIn,
                cartQuantity: cartQuantity(products),
                orderTotal: orderAmount(products)
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
        .then(product => {
            return req.user.addToCart(product);
        })
        .then(result => {
            console.log(result);
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user
        .removeFromCart(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

const orderAmount = products => {
    let total = 0.00;
    products.forEach(prod => {
        total += prod.quantity * prod.product.price;
    })
    return total;
}

exports.postOrder = (req, res, next) => {
    req.user
        .populate('cart.items.productId')
        .execPopulate()
        .then(user => {
            const products = user.cart.items.map(i => {
                return { quantity: i.quantity, product: {...i.productId._doc } };
            });
            const order = new Order({
                user: {
                    email: req.user.email,
                    userId: req.user
                },
                products: products,
                orderTotal: orderAmount(products)
            });
            return order.save();
        })
        .then(result => {
            return req.user.clearCart();
        })
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
    Order.find({ 'user.userId': req.user._id })
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders,
                isLoggedIn: req.session.isLoggedIn
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

};