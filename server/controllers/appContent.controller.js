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
    
    const conditions = [{ id: id }, { _id: id }];
    if (ObjectId.isValid(id)) {
      conditions.push({ _id: new ObjectId(id) });
    }
    const query = { $or: conditions };
    
    // Check both blog and news collections
    let news = await db.collection('blog').findOne(query);
    if (!news) {
      news = await db.collection('news').findOne(query);
    }
    
    if (!news) {
      return res.redirect('https://play.google.com/store/apps/details?id=com.aonetarget.education');
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

    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.aonetarget.education&referrer=utm_source%3Dwhatsapp%26news_id%3D${encodeURIComponent(id)}`;
    const intentUrl = `intent://news/${encodeURIComponent(id)}#Intent;scheme=aonetarget;package=com.aonetarget.education;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  const rawTitle = news.title || 'Aone Target Institute News';
  const safeTitle = rawTitle.replace(/"/g, '&quot;');
  const safeDesc = desc.replace(/"/g, '&quot;');
  const jsonTitle = JSON.stringify(rawTitle);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <meta property="og:site_name" content="Aone Target Institute">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="https://aonetarget.in/api/share/news/${id}">
  <meta property="og:type" content="article">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${image}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: #ffffff;
      max-width: 440px;
      width: 100%;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
    }
    .thumb {
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      display: block;
    }
    .content {
      padding: 20px;
    }
    .title {
      font-size: 17px;
      font-weight: 700;
      color: #204a8e;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 18px;
    }
    .form-group {
      margin-bottom: 12px;
      text-align: left;
    }
    .form-group label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .form-group input {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      font-size: 14px;
      background: #f8fafc;
      color: #0f172a;
      outline: none;
      transition: all 0.2s;
    }
    .form-group input:focus {
      border-color: #204a8e;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(32, 74, 142, 0.12);
    }
    .phone-wrapper {
      display: flex;
    }
    .phone-prefix {
      display: flex;
      align-items: center;
      padding: 0 12px;
      background: #e2e8f0;
      border: 1px solid #cbd5e1;
      border-right: none;
      border-radius: 12px 0 0 12px;
      font-size: 13px;
      font-weight: 700;
      color: #475569;
    }
    .phone-input {
      border-radius: 0 12px 12px 0 !important;
    }
    .error-msg {
      display: none;
      padding: 10px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #dc2626;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      text-align: center;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 20px;
      background: linear-gradient(135deg, #204a8e, #142e5c);
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(32, 74, 142, 0.35);
      transition: transform 0.15s;
    }
    .btn:active {
      transform: scale(0.98);
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <img src="${image}" class="thumb" alt="News" />
    <div class="content">
      <div class="title">${safeTitle}</div>
      <div class="desc">${safeDesc}</div>

      <div id="errorMsg" class="error-msg"></div>

      <div id="loadingBox" style="display:none; text-align:center; padding: 24px 0;">
        <div style="width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top-color: #204a8e; border-radius: 50%; margin: 0 auto 16px; animation: spin 0.8s linear infinite;"></div>
        <div style="font-size: 16px; font-weight: 700; color: #204a8e; margin-bottom: 4px;">Opening News Article...</div>
        <div style="font-size: 13px; color: #64748b;">Please wait a moment</div>
      </div>

      <form id="readerForm">
        <div id="formBody">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="name" required placeholder="Enter your full name" autocomplete="name" />
          </div>

          <div class="form-group">
            <label>Mobile Number *</label>
            <div class="phone-wrapper">
              <span class="phone-prefix">🇮🇳 +91</span>
              <input type="tel" id="phone" maxlength="10" required pattern="[6-9][0-9]{9}" placeholder="10-digit mobile number" class="phone-input" />
            </div>
          </div>

          <div class="form-group">
            <label>Email ID (Optional)</label>
            <input type="email" id="email" placeholder="name@example.com" autocomplete="email" />
          </div>

          <button type="submit" id="submitBtn" class="btn">
            <span id="btnText">Read More</span>
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    (function() {
      var newsId = "${id}";
      var targetUrl = window.location.origin + '/#/news/' + encodeURIComponent(newsId);
      var articleTitle = ${jsonTitle};

      // Auto-fill previous details if already submitted
      try {
        var savedName = localStorage.getItem('aone_lead_name');
        var savedPhone = localStorage.getItem('aone_lead_phone');
        if (savedName && document.getElementById('name')) {
          document.getElementById('name').value = savedName;
        }
        if (savedPhone && document.getElementById('phone')) {
          document.getElementById('phone').value = savedPhone;
        }
      } catch(e) {}

      var isSubmitting = false;

      function handleLeadSubmit() {
        if (isSubmitting) return;

        var err = document.getElementById('errorMsg');
        if (err) err.style.display = 'none';

        var nameInput = document.getElementById('name');
        var phoneInput = document.getElementById('phone');
        var emailInput = document.getElementById('email');

        var name = (nameInput ? nameInput.value : '').trim();
        var rawPhone = (phoneInput ? phoneInput.value : '').replace(/[^0-9]/g, '');
        var email = (emailInput ? emailInput.value : '').trim();

        var phone = rawPhone;
        if (phone.length === 12 && phone.startsWith('91')) {
          phone = phone.substring(2);
        } else if (phone.length === 11 && phone.startsWith('0')) {
          phone = phone.substring(1);
        }

        if (!name || name.length < 2) {
          if (err) {
            err.innerText = 'Please enter your full name (minimum 2 characters)';
            err.style.display = 'block';
          }
          if (nameInput) nameInput.focus();
          return;
        }

        if (!/^[6-9][0-9]{9}$/.test(phone)) {
          if (err) {
            err.innerText = 'Please enter a valid 10-digit mobile number';
            err.style.display = 'block';
          }
          if (phoneInput) phoneInput.focus();
          return;
        }

        isSubmitting = true;

        // Immediately hide form and show loading animation
        var formBody = document.getElementById('formBody');
        var loadingBox = document.getElementById('loadingBox');
        if (formBody) formBody.style.display = 'none';
        if (loadingBox) loadingBox.style.display = 'block';

        var redirected = false;
        function doRedirect() {
          if (redirected) return;
          redirected = true;
          try {
            localStorage.setItem('aone_news_lead_submitted', 'true');
            localStorage.setItem('aone_lead_name', name);
            localStorage.setItem('aone_lead_phone', phone);
          } catch(e) {}
          window.location.href = targetUrl;
        }

        // Safety timeout: guaranteed redirect within 1.5s even if network is slow
        var timer = setTimeout(doRedirect, 1500);

        // Submit lead to backend
        fetch('/api/news-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name,
            phone: phone,
            email: email || undefined,
            newsId: newsId,
            newsTitle: articleTitle,
            source: 'news_share_link'
          })
        })
        .then(function(res) {
          return res.json();
        })
        .catch(function(e) {
          console.warn('Lead submit error:', e);
        })
        .finally(function() {
          clearTimeout(timer);
          doRedirect();
        });
      }

      // Attach DOM listeners safely without any inline onclick / onsubmit attributes
      var form = document.getElementById('readerForm');
      if (form) {
        form.addEventListener('submit', function(e) {
          if (e && e.preventDefault) e.preventDefault();
          handleLeadSubmit();
        });
      }
      var btn = document.getElementById('submitBtn');
      if (btn) {
        btn.addEventListener('click', function(e) {
          if (e && e.preventDefault) e.preventDefault();
          handleLeadSubmit();
        });
      }
    })();
  </script>
</body>
</html>
    `;
    res.send(html);
  } catch (error) {
    res.redirect('https://play.google.com/store/apps/details?id=com.aonetarget.education');
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
    const { courseId, isFree, categoryId, branch } = req.query;
    const query = {};
    if (courseId) query.courseId = courseId;
    if (isFree === 'true') query.isFree = true;
    
    if (categoryId) {
      query.$or = [
        { categoryId: categoryId },
        { category: categoryId },
        { categoryName: categoryId }
      ];
    }
    if (branch) {
      const branchCond = {
        $or: [
          { branch: branch },
          { level1Branch: branch }
        ]
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, branchCond];
        delete query.$or;
      } else {
        query.$or = branchCond.$or;
      }
    }
    
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
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
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
