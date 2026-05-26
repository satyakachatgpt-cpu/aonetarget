import mongoose from 'mongoose';
import { db } from '../config/db.js';

const { ObjectId } = mongoose.Types;

// Banner Controllers
export const getBanners = async (req, res) => {
  try {
    const banners = await db.collection('banners').find({}).sort({ order: 1 }).toArray();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
};

export const createBanner = async (req, res) => {
  try {
    const result = await db.collection('banners').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('banners').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, message: 'Banner updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const result = await db.collection('banners').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
};

export const reorderBanners = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      // Prioritize MongoDB _id for reordering
      const query = {
        $or: [
          { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
          { id: id }
        ].filter(v => v._id || v.id)
      };

      return {
        updateOne: {
          filter: query,
          update: { $set: { order: index + 1 } }
        }
      };
    });

    const result = await db.collection('banners').bulkWrite(bulkOps);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No banners matched the provided IDs' });
    }

    res.json({ 
      success: true, 
      message: 'Banners reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Reorder banners error:', error);
    res.status(500).json({ error: 'Failed to reorder banners', details: error.message });
  }
};

// News Controllers
export const getNews = async (req, res) => {
  try {
    const news = await db.collection('news').find({}).sort({ createdAt: -1 }).toArray();
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
};

export const createNews = async (req, res) => {
  try {
    const result = await db.collection('news').insertOne({ ...req.body, createdAt: new Date() });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create news' });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('news').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ success: true, message: 'News updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update news' });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const result = await db.collection('news').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ success: true, message: 'News deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete news' });
  }
};

export const shareNews = async (req, res) => {
  try {
    const id = req.params.id;
    const { ObjectId } = mongoose.Types;
    
    let query = { id: id };
    if (ObjectId.isValid(id)) {
      query = { $or: [{ id: id }, { _id: new ObjectId(id) }] };
    }
    
    // Check both blog and news collections
    let news = await db.collection('blog').findOne(query);
    if (!news) {
      news = await db.collection('news').findOne(query);
    }
    
    if (!news) {
      return res.redirect('/#/');
    }

    const title = news.title || 'Aone Target Institute News';
    const rawDesc = news.excerpt || news.message || news.content || '';
    const desc = rawDesc.replace(/<[^>]+>/g, '').substring(0, 150) || 'Check out this news on Aone Target Institute';
    
    // Clean up image url if it's relative
    let image = news.thumbnail || news.imageUrl || news.image || 'https://aonetarget.in/pwa-512x512.png';
    if (!image.startsWith('http')) {
      if (!image.startsWith('/')) {
        image = '/' + image;
      }
      image = 'https://aonetarget.in' + image;
    }

    const redirectUrl = `/#/news/${id}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="https://aonetarget.in/api/share/news/${id}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <p>Redirecting to article...</p>
  <script>
    // Ensure we preserve the domain when redirecting
    window.location.replace(window.location.origin + '${redirectUrl}');
  </script>
</body>
</html>
    `;
    res.send(html);
  } catch (error) {
    res.redirect('/#/');
  }
};


// Quick Links Controllers
export const getQuickLinks = async (req, res) => {
  try {
    const links = await db.collection('quickLinks').find({}).sort({ sortBy: -1 }).toArray();
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quick links' });
  }
};

export const createQuickLink = async (req, res) => {
  try {
    const result = await db.collection('quickLinks').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quick link' });
  }
};

export const updateQuickLink = async (req, res) => {
  try {
    const id = req.params.id;
    const { _id, ...updateData } = req.body;

    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { $or: [{ id: id }, { _id: new ObjectId(id) }] };

    const result = await db.collection('quickLinks').updateOne(filter, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ success: true, message: 'Quick link updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quick link' });
  }
};

export const deleteQuickLink = async (req, res) => {
  try {
    const id = req.params.id;
    let filter = { id: id };
    if (ObjectId.isValid(id)) filter = { $or: [{ id: id }, { _id: new ObjectId(id) }] };

    const result = await db.collection('quickLinks').deleteOne(filter);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Quick link not found' });
    res.json({ success: true, message: 'Quick link deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quick link' });
  }
};

export const reorderQuickLinks = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const total = orderedIds.length;
    const bulkOps = orderedIds.map((id, index) => {
      // Prioritize MongoDB _id for reordering
      const query = {
        $or: [
          { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
          { id: id }
        ].filter(v => v._id || v.id)
      };

      return {
        updateOne: {
          filter: query,
          update: { $set: { sortBy: total - index } }
        }
      };
    });

    const result = await db.collection('quickLinks').bulkWrite(bulkOps);

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No quick links matched the provided IDs' });
    }

    res.json({ 
      success: true, 
      message: 'Quick links reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Reorder quick links error:', error);
    res.status(500).json({ error: 'Failed to reorder quick links', details: error.message });
  }
};

// Instructions Controllers
export const getInstructions = async (req, res) => {
  try {
    const docs = await db.collection('instructions').find({}).sort({ order: 1 }).toArray();
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructions' });
  }
};

export const createInstruction = async (req, res) => {
  try {
    const result = await db.collection('instructions').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create instruction' });
  }
};

export const updateInstruction = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    const result = await db.collection('instructions').updateOne(query, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update instruction' });
  }
};

export const deleteInstruction = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const result = await db.collection('instructions').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete instruction' });
  }
};

export const reorderInstructions = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      let filter;
      if (ObjectId.isValid(id)) {
        filter = { _id: new ObjectId(id) };
      } else {
        filter = { id: id };
      }
      return {
        updateOne: {
          filter,
          update: { $set: { order: index + 1 } }
        }
      };
    });

    const result = await db.collection('instructions').bulkWrite(bulkOps);
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No instructions matched the provided IDs' });
    }

    res.json({ 
      success: true, 
      message: 'Instructions reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Reorder instructions error:', error);
    res.status(500).json({ error: 'Failed to reorder instructions', details: error.message });
  }
};

// Blog Controllers
export const getBlogPosts = async (req, res) => {
  try {
    const posts = await db.collection('blog').find({}).sort({ createdAt: -1 }).toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
};

export const createBlogPost = async (req, res) => {
  try {
    const result = await db.collection('blog').insertOne({
      ...req.body,
      createdAt: new Date(),
      status: req.body.status || 'draft'
    });
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create blog post' });
  }
};

export const updateBlogPost = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('blog').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update blog post' });
  }
};

export const deleteBlogPost = async (req, res) => {
  try {
    const result = await db.collection('blog').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Blog post not found' });
    res.json({ success: true, message: 'Blog post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
};

// Exam Document Controllers
export const getExamDocuments = async (req, res) => {
  try {
    const docs = await db.collection('examDocuments').find({}).toArray();
    // Sort by order ASC, missing/invalid goes last
    docs.sort((a, b) => {
      const aOrder = typeof a.order === 'number' ? a.order : Infinity;
      const bOrder = typeof b.order === 'number' ? b.order : Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return String(a._id || '').localeCompare(String(b._id || ''));
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exam documents' });
  }
};

export const createExamDocument = async (req, res) => {
  try {
    const result = await db.collection('examDocuments').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create exam document' });
  }
};

export const updateExamDocument = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    const result = await db.collection('examDocuments').updateOne({ id: req.params.id }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Exam document not found' });
    res.json({ success: true, message: 'Exam document updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update exam document' });
  }
};

export const deleteExamDocument = async (req, res) => {
  try {
    const result = await db.collection('examDocuments').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Exam document not found' });
    res.json({ success: true, message: 'Exam document deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete exam document' });
  }
};

export const reorderExamDocuments = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      let filter;
      if (ObjectId.isValid(id)) {
        filter = { _id: new ObjectId(id) };
      } else {
        filter = { id: id };
      }
      return {
        updateOne: {
          filter,
          update: { $set: { order: index + 1 } }
        }
      };
    });

    const result = await db.collection('examDocuments').bulkWrite(bulkOps);
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No Exam Documents matched the provided IDs' });
    }

    res.json({ 
      success: true, 
      message: 'Exam Documents reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Reorder Exam Documents error:', error);
    res.status(500).json({ error: 'Failed to reorder exam documents', details: error.message });
  }
};

// Generic Note/PDF CRUD
export const updateStandaloneNote = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    let result = await db.collection('pdfs').updateOne(query, { $set: updateData });
    if (result.matchedCount === 0) {
      result = await db.collection('notes').updateOne(query, { $set: updateData });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const deleteStandaloneNote = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const getGenericPdfs = async (req, res) => {
  try {
    const { courseId, isFree } = req.query;
    const query = {};
    if (courseId) query.courseId = courseId;
    if (isFree === 'true') query.isFree = true;
    
    const pdfs = await db.collection('pdfs').find(query).sort({ sortBy: 1 }).toArray();
    res.json(pdfs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch PDFs' });
  }
};

export const updateGenericPdf = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const { _id, ...updateData } = req.body;
    await db.collection('pdfs').updateOne(query, { $set: updateData });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
};

export const deleteGenericPdf = async (req, res) => {
  try {
    const id = req.params.id;
    const query = {
      $or: [
        { id: id },
        { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }
      ].filter(v => v.id || v._id)
    };
    const result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) return res.status(404).json({ error: 'PDF not found' });
    res.json({ success: true, message: 'PDF deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete PDF' });
  }
};

export const reorderPdfs = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds must be a non-empty array' });
    }

    const bulkOps = orderedIds.map((id, index) => {
      // Prioritize MongoDB _id for reordering
      const query = {
        $or: [
          { _id: ObjectId.isValid(id) ? new ObjectId(id) : null },
          { id: id }
        ].filter(v => v._id || v.id)
      };

      return {
        updateOne: {
          filter: query,
          update: { $set: { sortBy: index + 1 } }
        }
      };
    });

    const result = await db.collection('pdfs').bulkWrite(bulkOps);
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'No PDFs matched the provided IDs' });
    }

    res.json({ 
      success: true, 
      message: 'PDFs reordered successfully',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Reorder PDFs error:', error);
    res.status(500).json({ error: 'Failed to reorder PDFs', details: error.message });
  }
};

export const deleteAllPdfs = async (req, res) => {
  try {
    const result = await db.collection('pdfs').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} PDFs` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all PDFs' });
  }
};

export const bulkCreatePdfs = async (req, res) => {
  try {
    const { pdfs } = req.body;
    if (!Array.isArray(pdfs) || pdfs.length === 0) return res.status(400).json({ error: 'No PDFs provided' });
    
    // Normalize Each PDF URL
    const normalizedPdfs = pdfs.map(p => {
      const np = { ...p };
      if (np.url && !np.fileUrl) np.fileUrl = np.url;
      if (np.fileUrl && !np.url) np.url = np.fileUrl;
      return np;
    });

    const result = await db.collection('pdfs').insertMany(normalizedPdfs);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create PDFs' });
  }
};

export const createStandalonePdf = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.url && !data.fileUrl) data.fileUrl = data.url;
    if (data.fileUrl && !data.url) data.url = data.fileUrl;
    
    const result = await db.collection('pdfs').insertOne(data);
    res.status(201).json({ _id: result.insertedId, ...data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create PDF' });
  }
};

export const updateAllPdfs = async (req, res) => {
  try {
    const updates = Array.isArray(req.body) ? req.body : Object.values(req.body);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('pdfs').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: 'PDFs updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all PDFs' });
  }
};

// Splash Screen Settings
export const getSplashScreenSettings = async (req, res) => {
  try {
    const splash = await db.collection('settings').findOne({ type: 'splash_screen' });
    const defaultSplash = {
      type: 'splash_screen',
      imageUrl: process.env.DEFAULT_SPLASH_URL || '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    };
    res.json(splash || defaultSplash);
  } catch (error) {
    res.json({
      type: 'splash_screen',
      imageUrl: process.env.DEFAULT_SPLASH_URL || '/attach-assist/ChatGPT_Image_Feb_8,_2026,_05_51_58_PM_1770553325908.png',
      isActive: true,
      duration: 3000
    });
  }
};

export const updateSplashScreenSettings = async (req, res) => {
  try {
    const { _id, ...updateData } = req.body;
    updateData.type = 'splash_screen';
    await db.collection('settings').updateOne(
      { type: 'splash_screen' },
      { $set: updateData },
      { upsert: true }
    );
    res.json({ success: true, message: 'Splash screen settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update splash screen settings' });
  }
};
