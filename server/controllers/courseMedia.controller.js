import mongoose from 'mongoose';
import { db } from '../config/db.js';
import { findCourse, getRelatedCourseIds } from '../services/course.service.js';
import { normalizeId } from '../utils/helpers.js';
import { syncLiveStream } from '../services/liveStream.service.js';

const { ObjectId } = mongoose.Types;

// --- Course Notes/PDFs ---

export const getCourseNotes = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);
    const primaryId = req.params.id;
    const query = {
      courseId: { $in: idVariants }
    };

    const isAdmin = req.admin || req.user?.isAdmin || req.user?.role === 'admin';
    if (isAdmin) {
      query.status = { $ne: 'deleted' };
    } else {
      query.status = { $nin: ['inactive', 'deleted'] };
    }

    // Check both pdfs and notes collections for backward compatibility
    const pdfs = await db.collection('pdfs').find(query).sort({ sortBy: 1, order: 1, createdAt: -1 }).toArray();
    const notes = await db.collection('notes').find(query).sort({ sortBy: 1, order: 1, createdAt: -1 }).toArray();
    
    // Merge all raw notes
    const allRawNotes = [...pdfs, ...notes];

    // Aggressive Deduplication Strategy
    const uniqueNotes = [];
    const seenTitles = new Set();
    const seenUrls = new Set();
    const seenIds = new Set();

    const normalizeUrl = (url) => {
      if (!url) return '';
      return url.trim().toLowerCase().replace(/\/$/, '');
    };

    // First pass: Add notes from the current specific batch
    allRawNotes.forEach(n => {
      if (normalizeId(n.courseId) === normalizeId(primaryId)) {
        const title = (n.title || '').trim().toLowerCase();
        const url = normalizeUrl(n.fileUrl || n.url);
        const id = n.id || n._id?.toString();

        if (title) seenTitles.add(title);
        if (url) seenUrls.add(url);
        if (id) seenIds.add(id);

        uniqueNotes.push(n);
      }
    });

    // Second pass: Add notes from other related batches ONLY if they are unique
    allRawNotes.forEach(n => {
      if (normalizeId(n.courseId) !== normalizeId(primaryId)) {
        const title = (n.title || '').trim().toLowerCase();
        const url = normalizeUrl(n.fileUrl || n.url);
        const id = n.id || n._id?.toString();

        const isDuplicate =
          (id && seenIds.has(id)) ||
          (title && seenTitles.has(title)) ||
          (url && seenUrls.has(url));

        if (!isDuplicate) {
          if (title) seenTitles.add(title);
          if (url) seenUrls.add(url);
          if (id) seenIds.add(id);
          uniqueNotes.push(n);
        }
      }
    });

    res.json(uniqueNotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const createCourseNote = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const courseId = course ? (course.id || course._id.toString()) : req.params.id;

    const note = {
      ...req.body,
      courseId,
      createdAt: new Date().toISOString()
    };
    
    // Ensure URL consistency for backward compatibility
    if (note.url && !note.fileUrl) note.fileUrl = note.url;
    if (note.fileUrl && !note.url) note.url = note.fileUrl;

    const result = await db.collection('pdfs').insertOne(note);
    res.status(201).json({ _id: result.insertedId, ...note });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
};

export const updateCourseNote = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const noteId = req.params.noteId;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    const { _id, ...updateData } = req.body;
    
    // Ensure URL consistency
    if (updateData.url && !updateData.fileUrl) updateData.fileUrl = updateData.url;
    if (updateData.fileUrl && !updateData.url) updateData.url = updateData.fileUrl;

    // Try pdfs collection first, then notes
    let result = await db.collection('pdfs').updateOne(
      query,
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) {
      result = await db.collection('notes').updateOne(
        query,
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );
    }
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
};

export const deleteCourseNote = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const noteId = req.params.noteId;

    const query = {
      $or: [
        { id: noteId },
        { _id: ObjectId.isValid(noteId) ? new ObjectId(noteId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    // Try pdfs collection first, then notes
    let result = await db.collection('pdfs').deleteOne(query);
    if (result.deletedCount === 0) {
      result = await db.collection('notes').deleteOne(query);
    }
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

// --- Video System ---

export const getCourseVideos = async (req, res) => {
  const adminId = req.admin?.id || req.admin?._id || req.user?.adminId || req.user?.id || req.user?._id || null;
  try {
    const course = await findCourse(req.params.id);
    if (!course) return res.json([]);

    const idVariants = await getRelatedCourseIds(course, req.params.id);
    const primaryId = req.params.id;

    // --- CHECK ENROLLMENT ---
    const isAdmin = req.admin || req.user?.isAdmin || req.user?.role === 'admin';
    const studentId = req.user?.studentId;

    let isEnrolled = false;

    if (isAdmin) {
      isEnrolled = true;
    } else if (studentId) {
      const student = await db.collection('students').findOne({
        $or: [
          { id: studentId },
          { _id: ObjectId.isValid(studentId) ? new ObjectId(studentId) : null }
        ].filter(f => f.id || f._id)
      });
      if (student) {
        const enrolledCourses = student.enrolledCourses || [];
        isEnrolled = idVariants.some(id => enrolledCourses.includes(id)) ||
          (course.price === 0 || course.isFree === true); // Free courses are always "enrolled"
      }
    }

    // If not enrolled and not a free course, only return demo video
    if (!isEnrolled && course.price > 0) {
      if (course.demoVideo) {
        return res.json([{
          id: 'demo_' + (course.id || course._id),
          _id: 'demo_' + (course.id || course._id),
          title: 'Course Preview (Demo)',
          youtubeUrl: course.demoVideo,
          videoUrl: course.demoVideo,
          url: course.demoVideo,
          isFree: true,
          isDemo: true,
          thumbnail: course.thumbnail || course.imageUrl,
          duration: 'Preview',
          order: -1,
          contentType: 'video'
        }]);
      }
      return res.json([]);
    }
    // --- END ENROLLMENT CHECK ---

    const statusFilter = isAdmin ? { $ne: 'deleted' } : { $nin: ['inactive', 'deleted'] };

    // Fetch from all relevant batches
    let allRawVideos = await db.collection('videos').find({
      courseId: { $in: idVariants },
      status: statusFilter
    }).sort({ order: 1 }).toArray();

    if (allRawVideos.length === 0) {
      const courseNames = [course.name, course.title].filter(Boolean);
      if (courseNames.length > 0) {
        allRawVideos = await db.collection('videos').find({
          $or: [
            { course: { $in: courseNames } },
            { courseId: { $in: idVariants } }
          ],
          status: statusFilter
        }).sort({ order: 1 }).toArray();
      }
    }

    // Aggressive Deduplication Strategy
    const uniqueVideos = [];
    const seenTitles = new Set();
    const seenUrls = new Set();
    const seenIds = new Set();

    const normalizeUrl = (url) => {
      if (!url) return '';
      try {
        let u = url.trim().toLowerCase();
        if (u.includes('youtube.com/watch?v=')) {
          const id = u.split('v=')[1]?.split('&')[0];
          if (id) return `yt:${id}`;
        }
        if (u.includes('youtu.be/')) {
          const id = u.split('youtu.be/')[1]?.split('?')[0];
          if (id) return `yt:${id}`;
        }
        if (u.includes('youtube.com/embed/')) {
          const id = u.split('embed/')[1]?.split('?')[0];
          if (id) return `yt:${id}`;
        }
        return u.replace(/\/$/, '');
      } catch (e) { return url.toLowerCase(); }
    };

    const normalizeTitle = (title) => {
      if (!title) return '';
      return title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // First pass: Add videos from the current specific batch
    allRawVideos.forEach(v => {
      if (normalizeId(v.courseId) === normalizeId(primaryId)) {
        const title = normalizeTitle(v.title);
        const url = normalizeUrl(v.youtubeUrl || v.videoUrl || v.url);
        const id = v.id || v._id?.toString();

        if (title) seenTitles.add(title);
        if (url) seenUrls.add(url);
        if (id) seenIds.add(id);

        uniqueVideos.push(v);
      }
    });

    // Second pass: Add videos from other related batches ONLY if they are unique
    allRawVideos.forEach(v => {
      if (normalizeId(v.courseId) !== normalizeId(primaryId)) {
        const title = normalizeTitle(v.title);
        const url = normalizeUrl(v.youtubeUrl || v.videoUrl || v.url);
        const id = v.id || v._id?.toString();

        const isDuplicate =
          (id && seenIds.has(id)) ||
          (title && seenTitles.has(title)) ||
          (url && seenUrls.has(url));

        if (!isDuplicate) {
          if (title) seenTitles.add(title);
          if (url) seenUrls.add(url);
          if (id) seenIds.add(id);
          uniqueVideos.push(v);
        }
      }
    });

    // If admin and course has a demoVideo that's not already in the list, prepend it
    if (adminId && course.demoVideo) {
      const demoNormUrl = normalizeUrl(course.demoVideo);
      const alreadyPresent = uniqueVideos.some(v => normalizeUrl(v.youtubeUrl || v.videoUrl || v.url) === demoNormUrl);
      if (!alreadyPresent) {
        uniqueVideos.unshift({
          id: 'demo_' + (course.id || course._id),
          _id: 'demo_' + (course.id || course._id),
          title: 'Course Preview (Demo)',
          youtubeUrl: course.demoVideo,
          videoUrl: course.demoVideo,
          url: course.demoVideo,
          isFree: true,
          isDemo: true,
          thumbnail: course.thumbnail || course.imageUrl,
          duration: 'Preview',
          order: -1,
          contentType: 'video'
        });
      }
    }

    // --- MAPPING AND FALLBACK LOGIC ---
    const mappedVideos = uniqueVideos.map(v => {
      const videoUrl = v.youtubeUrl || v.videoUrl || v.url || '';
      const hasProvider = !!v.provider;
      
      let provider = v.provider;
      if (!hasProvider) {
        const url = videoUrl.toLowerCase();
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          provider = 'youtube';
        } else if (url.includes('.m3u8')) {
          provider = 'hls';
        } else {
          provider = 'direct';
        }
      }

      return {
        ...v,
        provider,
        // Ensure the player always sees the expected fields
        youtubeUrl: provider === 'youtube' ? (v.youtubeUrl || videoUrl) : v.youtubeUrl,
        streamUrl: (provider === 'hls' || provider === 'direct') ? (v.streamUrl || videoUrl) : v.streamUrl,
        videoUrl: videoUrl // Keep for backward compatibility
      };
    });

    res.json(mappedVideos);

  } catch (error) {
    console.error('Fetch videos error:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
};

export const createCourseVideo = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const courseId = course ? (course._id ? course._id.toString() : course.id) : req.params.id;

    // Sanitize folderId
    let folderId = req.body.folderId;
    if (folderId === 'null' || folderId === 'undefined' || !folderId) {
      folderId = null;
    } else {
      folderId = String(folderId);
    }

    const videoData = { ...req.body };
    const isLiveStream = videoData.contentType === 'live_stream' || videoData.type === 'live';

    const video = {
      ...videoData,
      ...(isLiveStream ? {
        title: videoData.title,
        platform: videoData.platform,
        meetingLink: videoData.meetingLink || videoData.link || videoData.url,
        startTime: videoData.startTime || videoData.publishOn || videoData.startDateTime,
        startDateTime: videoData.startDateTime || videoData.startTime || videoData.publishOn,
        publishOn: videoData.publishOn || videoData.startTime || videoData.startDateTime,
        isFree: videoData.isFree,
        isPaid: videoData.isPaid !== undefined ? videoData.isPaid : !videoData.isFree,
        thumbnail: videoData.thumbnail || videoData.image,
        contentType: 'live_stream', 
        type: videoData.type || 'live',
        status: videoData.status || 'upcoming',
        url: videoData.meetingLink || videoData.url || videoData.link
      } : {}),
      courseId: String(courseId),
      folderId: folderId,
      provider: videoData.provider || 'youtube',
      streamUrl: videoData.streamUrl,
      youtubeUrl: videoData.youtubeUrl,
      createdAt: new Date().toISOString()
    };
    if (isLiveStream) {
      if (videoData.endTime) video.endTime = videoData.endTime;
      if (videoData.endDateTime) video.endDateTime = videoData.endDateTime;
      if (videoData.joinBeforeMinutes) video.joinBeforeMinutes = videoData.joinBeforeMinutes;
      if (videoData.visibility) video.visibility = videoData.visibility;
    }
    delete video.instructor;

    if (isLiveStream) {
      const syncResult = await syncLiveStream(null, video, 'create');
      res.status(201).json({ _id: syncResult._id, ...video });
    } else {
      const result = await db.collection('videos').insertOne(video);
      res.status(201).json({ _id: result.insertedId, ...video });
    }
  } catch (error) {
    console.error('Video save error:', error);
    res.status(500).json({ error: 'Failed to add video' });
  }
};

export const updateCourseVideo = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const videoId = req.params.videoId;

    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [String(course.id || ''), String(course._id || ''), req.params.id] };
    }

    const { _id, ...updateData } = req.body;
    const isLiveStream = updateData.contentType === 'live_stream' || updateData.type === 'live';

    const finalUpdate = { ...updateData };

    if (isLiveStream) {
      Object.assign(finalUpdate, {
        title: updateData.title || finalUpdate.title,
        platform: updateData.platform || finalUpdate.platform,
        meetingLink: updateData.meetingLink || updateData.link || updateData.url || finalUpdate.meetingLink,
        startTime: updateData.startTime || updateData.publishOn || updateData.startDateTime || finalUpdate.startTime,
        startDateTime: updateData.startDateTime || updateData.startTime || updateData.publishOn || finalUpdate.startDateTime,
        publishOn: updateData.publishOn || updateData.startTime || updateData.startDateTime || finalUpdate.publishOn,
        isFree: updateData.isFree !== undefined ? updateData.isFree : finalUpdate.isFree,
        isPaid: updateData.isPaid !== undefined ? updateData.isPaid : (updateData.isFree !== undefined ? !updateData.isFree : finalUpdate.isPaid),
        thumbnail: updateData.thumbnail || updateData.image || finalUpdate.thumbnail,
        contentType: 'live_stream',
        type: updateData.type || 'live',
        status: updateData.status || finalUpdate.status || 'upcoming',
        url: updateData.meetingLink || updateData.url || updateData.link || finalUpdate.url
      });

      if (updateData.endTime) finalUpdate.endTime = updateData.endTime;
      if (updateData.endDateTime) finalUpdate.endDateTime = updateData.endDateTime;
      if (updateData.joinBeforeMinutes) finalUpdate.joinBeforeMinutes = updateData.joinBeforeMinutes;
      if (updateData.visibility) finalUpdate.visibility = updateData.visibility;
      delete finalUpdate.instructor;
    }

    if (finalUpdate.folderId !== undefined) {
      if (finalUpdate.folderId === 'null' || finalUpdate.folderId === 'undefined' || !finalUpdate.folderId) {
        finalUpdate.folderId = null;
      } else {
        finalUpdate.folderId = String(finalUpdate.folderId);
      }
    }

    if (updateData.provider) finalUpdate.provider = updateData.provider;
    if (updateData.streamUrl !== undefined) finalUpdate.streamUrl = updateData.streamUrl;
    if (updateData.youtubeUrl !== undefined) finalUpdate.youtubeUrl = updateData.youtubeUrl;

    if (isLiveStream) {
      await syncLiveStream(videoId, finalUpdate, 'update');
      res.json({ success: true, message: 'Live stream updated and synced' });
    } else {
      const result = await db.collection('videos').updateOne(
        query,
        { $set: { ...finalUpdate, updatedAt: new Date().toISOString() } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: 'Video not found' });
      res.json({ success: true, message: 'Video updated' });
    }
  } catch (error) {
    console.error('Video update error:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
};

export const deleteCourseVideo = async (req, res) => {
  try {
    const course = await findCourse(req.params.id);
    const videoId = req.params.videoId;

    const query = {
      $or: [
        { id: videoId },
        { _id: ObjectId.isValid(videoId) ? new ObjectId(videoId) : null }
      ].filter(v => v.id || v._id)
    };

    if (course) {
      query.courseId = { $in: [course.id, course._id.toString(), req.params.id] };
    }

    const video = await db.collection('videos').findOne(query);
    const isLiveStream = video && (video.contentType === 'live_stream' || video.type === 'live' || video.platform);

    if (isLiveStream) {
      await syncLiveStream(videoId, null, 'delete');
      res.json({ success: true, message: 'Live stream deleted across all collections' });
    } else {
      const result = await db.collection('videos').deleteOne(query);
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Video not found' });
      res.json({ success: true, message: 'Video deleted' });
    }
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
};
