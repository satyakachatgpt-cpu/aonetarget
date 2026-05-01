import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { findCourse } from '../services/course.service.js';

const { ObjectId } = mongoose.Types;

export const getCoursePosts = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);
    const query = {
      courseId: { $in: [String(course.id || ''), String(course._id || ''), req.params.id].filter(Boolean) }
    };
    const posts = await db.collection('posts').find(query).sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const createCoursePost = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const courseId = course.id || course._id.toString();
    const post = {
      ...req.body,
      courseId,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: []
    };
    const result = await db.collection('posts').insertOne(post);
    res.status(201).json({ _id: result.insertedId, ...post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const deleteCoursePost = async (req, res) => {
  try {
    const postId = req.params.postId;
    const filter = ObjectId.isValid(postId) ? { _id: new ObjectId(postId) } : { id: postId };
    const result = await db.collection('posts').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
