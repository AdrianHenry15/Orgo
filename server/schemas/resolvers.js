const { User, Aspiration, Folder } = require('../models')
const { AuthenticationError } = require('apollo-server-express')
const { signToken } = require('../utils/auth')

const resolvers = {
    Query: {
        me: async (parent, args, context) => {
            if (context.user) {
                const userData = await User.findOne({})
                    .select('-__v -password')
                    .populate('aspirations')
                    .populate('folders');

                return userData;
            }

            throw new AuthenticationError('Not logged in')
        },
        // get all aspirations
        aspirations: async (parent, { username }) => {
            const params = username ? { username } : {};
            return Aspiration.find().sort({ createdAt: -1 });
        },
        // get single aspiration
        aspiration: async (parent, { _id }) => {
            return Aspiration.findOne({ _id });
        },
        // get all folders (homepage)
        folders: async (parent, { username }) => {
            const params = username ? { username } : {};
            return Folder.find().sort({ createdAt: -1 });
        },
        // get single folder
        folder: async (parent, { _id }) => {
            return Folder.findOne({ _id });
        },
        // get all users
        users: async () => {
            return User.find()
                .select('-__v -password')
                .populate('aspirations');

        },
        // get user by username
        user: async (parent, { username }) => {
            return User.findOne({ username })
                .select('-__v -password')
                .populate('aspirations');
        }
    },
    Mutation: {
        // User sign up
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user };
        },
        // user login 
        login: async (parent, { email, password }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw new AuthenticationError('Incorrect credentials');
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new AuthenticationError('Incorrect credentials')
            }

            const token = signToken(user);
            return { token, user };
        },
        addAspiration: async (parent, args, context) => {
            // if user logged in
            if (context.user) {
                const aspiration = await Aspiration.create({ ...args, username: context.user.username });
                // push into user aspirations array
                await User.findByIdAndUpdate(
                    { _id: context.user._id },
                    { $push: { aspirations: aspiration._id } },
                    // to make sure new document is returned instead of updated document
                    { new: true }
                );

                // push into folder aspirations array
                await Folder.findByIdAndUpdate(
                    { _id: args.folderId },
                    { $push: { aspirations: aspiration._id } },
                    { new: true }
                )
                return aspiration;
            }
            throw new AuthenticationError('You need to be logged in!');
        },
        removeAspiration: async (parent, { aspirationId, folderId }, context) => {
            if (context.user) {
                // remove from user aspirations array
                const updatedUser = await User.findByIdAndUpdate(
                    { _id: context.user._id },
                    { $pull: { aspirations:  aspirationId } },
                    { new: true }
                );
                // remove from folder aspirations array
                await Folder.findByIdAndUpdate(
                    { _id: folderId },
                    { $pull: { aspirations: aspirationId } },
                    { new: true }
                )
                // delete the aspiration
                await Aspiration.findByIdAndDelete({ aspirationId });
                return updatedUser;
            }
            throw new AuthenticationError('You need to be logged in!')
        },
        updateAspiration: async (parent, args, context) => {
            if (context.user) {
                // update all contents of aspiration
                const updatedAspiration = await Aspiration.findByIdAndUpdate(
                    { _id: args.aspirationId },
                    { ...args, username: context.user._id }
                );
                return updatedAspiration;
            }
            throw new AuthenticationError('You need to be logged in!')
        },
        addFolder: async (parent, args, context) => {
            // if user logged in
            if (context.user) {
                const folder = await Folder.create({ ...args, username: context.user.username });

                await User.findByIdAndUpdate(
                    { _id: context.user._id },
                    { $push: { folders: folder._id } },
                    // to make sure new document is returned instead of updated document
                    { new: true }
                );
                return folder;
            }
            throw new AuthenticationError('You need to be logged in!');
        },
        removeFolder: async (parent, { folderId }, context) => {
            if (context.user) {
                const updatedUser = await User.findByIdAndUpdate(
                    { _id: context.user._id },
                    { $pull: { folders: folderId } },
                    { new: true }
                );

                // delete all aspirations inside the folder
                await Aspiration.deleteMany({ folderId: folderId });
                // delete the folder
                await Folder.findByIdAndDelete({ folderId });
                return updatedUser;
            }
            throw new AuthenticationError('You need to be logged in!')
        },
        updateFolder: async (parent, args, context) => {
            if (context.user) {
                // update all contents of folder
                const updatedFolder = await Aspiration.findByIdAndUpdate(
                    { _id: args.folderId },
                    { ...args, username: context.user._id }
                );
                return updatedFolder;
            }
            throw new AuthenticationError('You need to be logged in!')
        },
    },
};

module.exports = resolvers;