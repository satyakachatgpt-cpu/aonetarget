import { getDb } from '../config/db.js';
import mongoose from 'mongoose';

// === Orders Logic ===

export const createOrder = async (req, res) => {
  try {
    const db = getDb();
    const order = {
      ...req.body,
      createdAt: new Date(),
      status: 'pending'
    };
    const result = await db.collection('orders').insertOne(order);
    res.status(201).json({ _id: result.insertedId, ...order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const getOrdersByUser = async (req, res) => {
  try {
    const db = getDb();
    const orders = await db.collection('orders').find({ userId: req.params.userId }).toArray();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// === Buyers Logic ===

export const getBuyers = async (req, res) => {
  try {
    const db = getDb();
    const buyers = await db.collection('buyers').find({}).toArray();
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch buyers' });
  }
};

export const createBuyer = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('buyers').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create buyer' });
  }
};

export const updateBuyer = async (req, res) => {
  try {
    const db = getDb();
    const idParam = req.params.id;
    const { _id, id: rawId, ...updateData } = req.body;

    console.log(`[Buyer Update Attempt] URL ID: ${idParam}`);

    const filterConditions = [
      { _id: idParam },
      { id: idParam }
    ];

    if (mongoose.Types.ObjectId.isValid(idParam)) {
      filterConditions.push({ _id: new mongoose.Types.ObjectId(idParam) });
    }

    if (updateData.studentName && updateData.amount) {
      filterConditions.push({
        studentName: updateData.studentName,
        amount: updateData.amount
      });
    }

    const filter = { $or: filterConditions };

    const targetDoc = await db.collection('buyers').findOne(filter);

    if (!targetDoc) {
      console.log(`[Buyer Update FAILED] No doc matched any filter for ID: ${idParam}`);
      return res.status(404).json({
        error: 'Buyer not found',
        details: `We searched for ID ${idParam} and student name ${updateData.studentName} but no record was found.`
      });
    }

    const result = await db.collection('buyers').updateOne(
      { _id: targetDoc._id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );

    const updated = await db.collection('buyers').findOne({ _id: targetDoc._id });
    console.log(`[Buyer Update SUCCESS] Document updated: ${targetDoc._id}`);
    res.json(updated);
  } catch (error) {
    console.error('[Buyer Update Error]', error);
    res.status(500).json({ error: 'Failed to update: ' + error.message });
  }
};

export const deleteBuyer = async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const filter = {
      $or: [
        { _id: id },
        { id: id }
      ]
    };

    if (mongoose.Types.ObjectId.isValid(id)) {
      filter.$or.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    const result = await db.collection('buyers').deleteOne(filter);
    if (result.deletedCount === 0) {
      console.log(`Delete failed - Buyer not found for ID: ${id}`);
      return res.status(404).json({ error: 'Buyer not found' });
    }
    res.json({ success: true, message: 'Buyer deleted' });
  } catch (error) {
    console.error('Delete buyer error:', error);
    res.status(500).json({ error: 'Failed to delete buyer' });
  }
};

export const deleteAllBuyers = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('buyers').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} buyers` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all buyers' });
  }
};

export const bulkCreateBuyers = async (req, res) => {
  try {
    const { buyers } = req.body;
    if (!Array.isArray(buyers) || buyers.length === 0) return res.status(400).json({ error: 'No buyers provided' });
    const db = getDb();
    const result = await db.collection('buyers').insertMany(buyers);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create buyers' });
  }
};

export const updateAllBuyers = async (req, res) => {
  try {
    const db = getDb();
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('buyers').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} buyers` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all buyers' });
  }
};

// === Tokens Logic ===

export const getTokens = async (req, res) => {
  try {
    const db = getDb();
    const tokens = await db.collection('tokens').find({}).toArray();
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
};

export const createToken = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('tokens').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create token' });
  }
};

export const updateToken = async (req, res) => {
  try {
    const db = getDb();
    const { _id, ...updateData } = req.body;
    const result = await db.collection('tokens').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json({ success: true, message: 'Token updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update token' });
  }
};

export const deleteToken = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('tokens').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json({ success: true, message: 'Token deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete token' });
  }
};

export const deleteAllTokens = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('tokens').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} tokens` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all tokens' });
  }
};

export const bulkCreateTokens = async (req, res) => {
  try {
    const { tokens } = req.body;
    if (!Array.isArray(tokens) || tokens.length === 0) return res.status(400).json({ error: 'No tokens provided' });
    const db = getDb();
    const result = await db.collection('tokens').insertMany(tokens);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create tokens' });
  }
};

export const updateAllTokens = async (req, res) => {
  try {
    const db = getDb();
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('tokens').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} tokens` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all tokens' });
  }
};

// === E-Books Logic ===

export const getEbooks = async (req, res) => {
  try {
    const db = getDb();
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;
    const ebooks = await db.collection('ebooks').find(filter).sort({ createdAt: -1 }).toArray();
    res.json(ebooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ebooks' });
  }
};

export const createEbook = async (req, res) => {
  try {
    const db = getDb();
    const ebook = { ...req.body, createdAt: new Date().toISOString() };
    const result = await db.collection('ebooks').insertOne(ebook);
    res.status(201).json({ _id: result.insertedId, ...ebook });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ebook' });
  }
};

export const updateEbook = async (req, res) => {
  try {
    const db = getDb();
    const { _id, ...updateData } = req.body;
    const result = await db.collection('ebooks').updateOne(
      { id: req.params.id },
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ success: true, message: 'Ebook updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ebook' });
  }
};

export const deleteEbook = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('ebooks').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Ebook not found' });
    res.json({ success: true, message: 'Ebook deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete ebook' });
  }
};

// === Store Products Logic ===

export const getStoreProducts = async (req, res) => {
  try {
    const db = getDb();
    const products = await db.collection('store').find({}).toArray();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store products' });
  }
};

export const createStoreProduct = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('store').insertOne(req.body);
    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateStoreProduct = async (req, res) => {
  try {
    const db = getDb();
    const { _id, ...updateData } = req.body;
    const result = await db.collection('store').updateOne(
      { id: req.params.id },
      { $set: updateData }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteStoreProduct = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('store').deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const deleteAllStoreProducts = async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('store').deleteMany({});
    res.json({ success: true, message: `Deleted ${result.deletedCount} products` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete all products' });
  }
};

export const bulkCreateStoreProducts = async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) return res.status(400).json({ error: 'No products provided' });
    const db = getDb();
    const result = await db.collection('store').insertMany(products);
    res.status(201).json({ success: true, inserted: result.insertedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk create products' });
  }
};

export const updateAllStoreProducts = async (req, res) => {
  try {
    const db = getDb();
    const updates = (req.body && req.body.updates) ? req.body.updates : (Array.isArray(req.body) ? req.body : []);
    for (const update of updates) {
      const { id, _id, ...data } = update;
      if (id) await db.collection('store').updateOne({ id }, { $set: data });
    }
    res.json({ success: true, message: `Updated ${updates.length} products` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update all products' });
  }
};

// --- Purchases (Phase 19F) ---

export const getPurchasesByStudent = async (req, res) => {
  try {
    const isOwner = req.user?.studentId === req.params.studentId;
    const isAdmin = req.user?.role === 'admin' || req.user?.isAdmin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized access to student data' });
    }

    const db = getDb();
    const purchases = await db.collection('purchases').find({ studentId: req.params.studentId }).sort({ createdAt: -1 }).toArray();
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
};

export const getAdminPurchases = async (req, res) => {
  try {
    const db = getDb();
    const purchases = await db.collection('purchases').aggregate([
      {
        $lookup: {
          from: 'students',
          let: { sId: '$studentId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$id", "$$sId"] },
                    { $eq: [{ $toString: "$_id" }, { $toString: "$$sId" }] }
                  ]
                }
              }
            }
          ],
          as: 'studentInfo'
        }
      },
      {
        $unwind: {
          path: '$studentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();
    res.json(purchases);
  } catch (error) {
    console.error('Fetch purchases error:', error);
    res.status(500).json({ error: 'Failed to fetch all purchases' });
  }
};
