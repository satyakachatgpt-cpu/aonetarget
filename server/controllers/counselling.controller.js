import mongoose from 'mongoose';
import CounsellingLead from '../models/CounsellingLead.js';

export const submitCounsellingLead = async (req, res) => {
    try {
        let { name, phone, email, interestedCategory, message, studentId } = req.body;

        // 1. Name Validation
        name = name?.trim();
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Please enter a valid name (min 2 characters)' });
        }
        if (name.length > 80) {
            return res.status(400).json({ error: 'Name is too long (max 80 characters)' });
        }
        if (!/^[a-zA-Z\s.'-]+$/.test(name) || /^[0-9\W]+$/.test(name)) {
            return res.status(400).json({ error: 'Name contains invalid characters' });
        }

        // 2. Mobile Validation
        const rawPhone = String(phone || '').trim();
        
        // Strict product rule: ONLY digits, exactly 10, starting with 6-9
        // No +, no spaces, no hyphens allowed in raw input
        if (!/^[6-9]\d{9}$/.test(rawPhone)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
        }
        
        // Reject repeating patterns or 1234567890
        if (/^(\d)\1{9}$/.test(rawPhone) || rawPhone === '1234567890') {
            return res.status(400).json({ error: 'Please provide a valid mobile number' });
        }

        const cleanedPhone = rawPhone;

        // 3. Email Validation (Optional)
        if (email) {
            email = email.trim().toLowerCase();
            if (email.length > 120) {
                return res.status(400).json({ error: 'Email is too long' });
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ error: 'Please provide a valid email address' });
            }
        }

        // 4. Category Validation
        interestedCategory = interestedCategory?.trim();
        if (!interestedCategory) {
            return res.status(400).json({ error: 'Please select an interested category' });
        }

        // 5. Message Validation (Required, 5-500 chars)
        message = message?.trim();
        if (!message || message.length < 5) {
            return res.status(400).json({ error: 'Please enter your concern (min 5 characters)' });
        }
        if (message.length > 500) {
            return res.status(400).json({ error: 'Message is too long (max 500 characters)' });
        }

        const newLead = new CounsellingLead({
            name,
            phone: cleanedPhone,
            email: email || undefined,
            interestedCategory,
            message: message || undefined,
            studentId,
            source: 'student_explore_cta'
        });

        await newLead.save();

        res.status(201).json({ 
            success: true, 
            message: 'Counselling request submitted successfully',
            lead: newLead 
        });
    } catch (error) {
        console.error('Error submitting counselling lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getCounsellingLeads = async (req, res) => {
    try {
        const leads = await CounsellingLead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        console.error('Error fetching counselling leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateCounsellingLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['new', 'contacted', 'resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updatedLead = await CounsellingLead.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ 
            success: true, 
            message: 'Status updated successfully',
            lead: updatedLead 
        });
    } catch (error) {
        console.error('Error updating counselling lead status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteCounsellingLead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid lead ID format' });
        }

        const deletedLead = await CounsellingLead.findByIdAndDelete(id);

        if (!deletedLead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ 
            success: true, 
            message: 'Counselling request deleted successfully' 
        });
    } catch (error) {
        console.error('[Counselling Controller] Error deleting lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
