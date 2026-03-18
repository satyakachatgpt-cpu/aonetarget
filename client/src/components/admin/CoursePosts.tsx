import React, { useState, useEffect } from 'react';
import AddPostDrawer from './AddPostDrawer';

interface Post {
    _id?: string;
    id: string;
    author: string;
    content: string;
    createdAt: string;
    likes?: number;
    comments?: any[];
}

interface CoursePostsProps {
    courseId: string;
}

const CoursePosts: React.FC<CoursePostsProps> = ({ courseId }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddDrawer, setShowAddDrawer] = useState(false);

    useEffect(() => {
        if (courseId) {
            fetchPosts();
        }
    }, [courseId]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/courses/${courseId}/posts`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = posts.filter(post =>
        post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.author?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 bg-[#fcfcfc] min-h-screen animate-fade-in relative">
            {/* Header section with Title, Search, and Add Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <h1 className="text-[28px] font-black text-[#111827] tracking-tight">Posts</h1>
                    <p className="text-[13px] font-medium text-gray-400 uppercase tracking-widest">Manage course updates & announcements</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[20px] group-focus-within:text-indigo-500 transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search posts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-6 py-3 w-[350px] bg-white border border-[#e5e7eb] rounded-2xl text-[14px] font-medium outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50/50 transition-all placeholder:text-gray-400 shadow-sm"
                        />
                    </div>

                    <button
                        onClick={() => setShowAddDrawer(true)}
                        className="w-12 h-12 flex items-center justify-center bg-[#111827] text-white rounded-full hover:bg-black transition-all active:scale-90 shadow-xl shadow-gray-200"
                    >
                        <span className="material-symbols-outlined text-[28px]">add</span>
                    </button>
                </div>
            </div>

            {/* Post List Container */}
            <div className="bg-white rounded-[32px] border border-[#f3f4f6] shadow-[0_8px_40px_rgba(0,0,0,0.03)] min-h-[500px] flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-5">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-[3px] border-gray-100 rounded-full"></div>
                            <div className="absolute inset-0 border-[3px] border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Synchronizing Data...</p>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-32 bg-[#fafafa]/50">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100 group transition-all hover:scale-110 hover:rotate-3">
                            <span className="material-symbols-outlined text-[48px] text-gray-200 font-thin transition-colors group-hover:text-indigo-300">forum</span>
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-400 tracking-tight">No posts found</h3>
                        <p className="text-[13px] text-gray-300 mt-2 font-medium max-w-[250px] text-center">Your updates and announcements will appear here once you create them.</p>
                        <button
                            onClick={() => setShowAddDrawer(true)}
                            className="mt-8 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-black text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all active:scale-95"
                        >
                            Create First Post
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-[#f9fafb]">
                        {filteredPosts.map((post, idx) => (
                            <div key={post._id || post.id} className="p-8 hover:bg-[#fafafa]/80 transition-all group animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div className="flex items-start gap-6">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-500 shrink-0 shadow-sm border border-indigo-100/50">
                                        <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_pin</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-[16px] font-black text-[#111827] tracking-tight">{post.author}</h3>
                                                <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Admin</span>
                                            </div>
                                            <span className="text-[12px] font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <p className="text-[15px] text-[#475569] leading-relaxed font-medium">{post.content}</p>
                                        <div className="flex items-center gap-6 mt-6 opacity-40 group-hover:opacity-100 transition-all duration-300">
                                            <button className="flex items-center gap-2 text-[12px] font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">favorite_border</span>
                                                {post.likes || 0}
                                            </button>
                                            <button className="flex items-center gap-2 text-[12px] font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">chat_bubble_outline</span>
                                                {post.comments?.length || 0}
                                            </button>
                                            <button className="flex items-center gap-2 text-[12px] font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">share</span>
                                                Share
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Delete this post permanently?')) {
                                                        const res = await fetch(`/api/courses/${courseId}/posts/${post._id || post.id}`, { method: 'DELETE' });
                                                        if (res.ok) fetchPosts();
                                                    }
                                                }}
                                                className="flex items-center gap-2 text-[12px] font-bold text-gray-400 hover:text-red-500 transition-colors ml-auto group/del"
                                            >
                                                <span className="material-symbols-outlined text-[20px] group-hover/del:animate-bounce">delete_outline</span>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddPostDrawer
                isOpen={showAddDrawer}
                onClose={() => setShowAddDrawer(false)}
                courseId={courseId}
                onSuccess={fetchPosts}
            />
        </div>
    );
};

export default CoursePosts;
