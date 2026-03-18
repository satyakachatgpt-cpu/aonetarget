import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    courseId: { type: String, required: true },
    author: { type: String, required: true },
    content: { type: String, required: true },
    authorAvatar: { type: String },
    createdAt: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    comments: [{
        author: String,
        content: String,
        createdAt: { type: Date, default: Date.now }
    }]
});

const Post = mongoose.model('Post', postSchema);
export default Post;
