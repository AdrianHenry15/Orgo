const jwt = require('jsonwebtoken');

// secret to enable server to recognize token
const secret = 'mysecretsshhhhh';
const expiration = '2h';

module.exports = {
    authMiddleware: function ({ req }) {
        // allows token to be sent via req.body, req.query, or headers
        let token = req.body.token || req.query.token || req.headers.authorization;

        // separate "Bearer" from "<tokenvalue>"
        if (req.headers.authorization) {
            token = token
                .split(' ')
                .pop()
                .trim();
        }

        // if no token, return request object as is
        if (!token) {
            return req;
        }

        try {
            // decode and attach user data to request object
            const { data } = jwt.verify(token, secret, { maxAge: expiration });
            req.user - data;
        } catch {
            console.log('Invalid token');
        }

        // return updated request object
        return req;
    },
    // adds users username, email, and id to the token
    // tokens can be given an expiration date and a secret to sign the token with
    signToken: function ({ username, email, _id }) {
        const payload = { username, email, _id };

        return jwt.sign({ data: payload }, secret, { expiresIn: expiration })
    }
}