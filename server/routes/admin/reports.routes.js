import express from 'express';
import mongoose from 'mongoose';
import { verifyAccessToken } from '../../middleware/auth.js';

const router = express.Router();

// Admin Auth Middleware
const adminAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const decoded = verifyAccessToken(authHeader.slice(7));
            if (decoded?.isAdmin || decoded?.role === 'admin') {
                req.admin = decoded;
                return next();
            }
        }

        const adminId = req.headers['x-admin-id'];
        if (!adminId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const db = mongoose.connection.db;
        const admin = await db.collection('admins').findOne({ adminId });

        if (!admin) {
            return res.status(401).json({ error: 'Admin not found' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Route 1: GET /api/admin/reports/sales
router.get('/sales', adminAuth, async (req, res) => {
    try {
        const { startDate, endDate, courseId, batchId } = req.query;
        const db = mongoose.connection.db;

        const query = { status: 'completed' };

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        if (courseId) {
            query.courseId = courseId;
        }
        
        // Note: purchases don't explicitly have batchId, but if stored as courseId, we can use it.
        // If they are different, we might need a lookup.
        if (batchId) {
            query.batchId = batchId; 
        }

        const isExport = String(req.query.export).toLowerCase() === 'true';
        const page = parseInt(req.query.page) || 1;
        const exportLimit = 5000;
        const limit = isExport ? exportLimit : (parseInt(req.query.limit) || 15);
        const skip = isExport ? 0 : (page - 1) * limit;

        const [results, summaryData] = await Promise.all([
            db.collection('purchases').aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'students',
                        localField: 'studentId',
                        foreignField: 'id',
                        as: 'studentInfo'
                    }
                },
                { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
                { $sort: { createdAt: -1 } },
                ...(isExport ? [{ $limit: limit }] : [{ $skip: skip }, { $limit: limit }])
            ]).toArray(),
            db.collection('purchases').aggregate([
                { $match: query },
                { 
                    $group: { 
                        _id: null, 
                        totalCount: { $sum: 1 }, 
                        totalRevenue: { $sum: '$amount' } 
                    } 
                }
            ]).toArray()
        ]);

        const totalCount = summaryData[0]?.totalCount || 0;
        const totalRevenue = summaryData[0]?.totalRevenue || 0;
        const totalPages = Math.ceil(totalCount / (isExport ? 15 : limit)); // Keep UI totalPages consistent

        // Format sales for the frontend table
        const formattedSales = results.map(s => ({
            id: s._id,
            studentName: s.studentInfo?.name || s.studentName || 'Unknown',
            email: s.studentInfo?.email || '-',
            phone: s.studentInfo?.phone || '-',
            courseName: s.courseName || '-',
            batchName: s.batchName || '-',
            amountPaid: s.amount,
            paymentDate: s.createdAt,
            paymentMethod: s.paymentMethod || 'razorpay',
            transactionId: s.razorpayPaymentId || s.id
        }));

        res.json({
            sales: formattedSales,
            totalRevenue,
            totalCount,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
});

// Route 2: GET /api/admin/reports/no-purchase
router.get('/no-purchase', adminAuth, async (req, res) => {
    try {
        const { startDate, endDate, search } = req.query;
        const db = mongoose.connection.db;

        const isExport = String(req.query.export).toLowerCase() === 'true';
        const page = parseInt(req.query.page) || 1;
        const exportLimit = 5000;
        const limit = isExport ? exportLimit : (parseInt(req.query.limit) || 15);
        const skip = isExport ? 0 : (page - 1) * limit;

        // Initialize student query
        const studentQuery = {};
        if (startDate || endDate) {
            studentQuery.createdAt = {};
            if (startDate) studentQuery.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                studentQuery.createdAt.$lte = end;
            }
        }

        if (search) {
            studentQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Use aggregation for high efficiency: Filter students who have NO successful purchases
        const aggregationQuery = [
            { $match: studentQuery },
            {
                $lookup: {
                    from: 'purchases',
                    let: { student_id: '$id' },
                    pipeline: [
                        { $match: { $expr: { $and: [ { $eq: ['$studentId', '$$student_id'] }, { $eq: ['$status', 'completed'] } ] } } },
                        { $limit: 1 }
                    ],
                    as: 'purchaseCount'
                }
            },
            { $match: { purchaseCount: { $size: 0 } } },
            { $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    ...(isExport ? [{ $limit: limit }] : [{ $skip: skip }, { $limit: limit }])
                ],
                metadata: [
                    { $count: 'total' }
                ]
            }}
        ];

        const [result] = await db.collection('students').aggregate(aggregationQuery).toArray();
        const nonBuyers = result.data || [];
        const totalCount = result.metadata[0]?.total || 0;
        const totalPages = Math.ceil(totalCount / limit);

        const formattedUsers = nonBuyers.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email || '-',
            phone: u.phone,
            registrationDate: u.createdAt || u.registrationDate,
            appRegistered: u.registrationType === 'mobile' || !!u.deviceId || !!u.fcmToken,
            registrationType: u.registrationType || 'web',
            deviceId: u.deviceId || 'N/A',
            status: u.status || 'active',
            lastLogin: u.updatedAt || '-'
        }));

        res.json({
            users: formattedUsers,
            totalCount,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('No-purchase report error:', error);
        res.status(500).json({ error: 'Failed to fetch registered (no purchase) report' });
    }
});

// Route 3: UPDATE /api/admin/reports/no-purchase/:id
router.put('/no-purchase/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, status } = req.body;
        const db = mongoose.connection.db;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (status !== undefined) updateData.status = status;
        updateData.updatedAt = new Date();

        const idFilter = mongoose.Types.ObjectId.isValid(id) ? { _id: new mongoose.Types.ObjectId(id) } : { _id: id };
        const result = await db.collection('students').updateOne(
            idFilter,
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Lead profile not found' });
        }

        res.json({ message: 'Lead profile updated successfully' });
    } catch (error) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Failed to update candidate profile' });
    }
});

// Route 4: DELETE /api/admin/reports/no-purchase/:id
router.delete('/no-purchase/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const db = mongoose.connection.db;

        const idFilter = mongoose.Types.ObjectId.isValid(id) ? { _id: new mongoose.Types.ObjectId(id) } : { _id: id };
        const result = await db.collection('students').deleteOne(idFilter);

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Lead profile not found' });
        }

        res.json({ message: 'Lead removed successfully' });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Failed to remove candidate lead' });
    }
});

export default router;
