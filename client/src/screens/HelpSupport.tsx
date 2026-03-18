import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentSidebar from '../components/StudentSidebar';
import ChatWindow from '../components/ChatWindow';

const HelpSupport: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const storedStudent = localStorage.getItem('studentData');
    if (storedStudent) {
      setStudent(JSON.parse(storedStudent));
    } else {
      navigate('/student-login');
    }
  }, []);

  const faqs = [
    {
      question: 'How do I enroll in a course?',
      answer: 'Go to Batches or Courses section, select the course you want to enroll in, and complete the payment process.'
    },
    {
      question: 'How can I download videos for offline viewing?',
      answer: 'In your enrolled course, click on the download icon next to any video. Downloaded videos will appear in the Downloads section.'
    },
    {
      question: 'How do I take a mock test?',
      answer: 'Go to Mock Tests section, select the test you want to attempt, and click on Start Test. Make sure you have a stable internet connection.'
    },
    {
      question: 'How can I contact my instructor?',
      answer: 'Use the Chats section to message your instructor directly. You can also ask doubts during live classes.'
    },
    {
      question: 'How do I get a refund?',
      answer: 'For refund requests, please contact our support team through the contact options below. Refunds are processed as per our policy.'
    }
  ];

  const contactOptions = [
    { icon: 'call', label: 'Call Us', value: '+91 98765 43210', action: 'tel:+919876543210' },
    { icon: 'mail', label: 'Email', value: 'support@aonetarget.com', action: 'mailto:support@aonetarget.com' },
    { icon: 'chat', label: 'WhatsApp', value: 'Chat with us', action: 'https://wa.me/919876543210' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-2">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} student={student} />

      <header className="bg-gradient-to-r from-cyan-600 to-[#0097A7] text-white pt-8 pb-6 px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-full hover:bg-white/20">
            <span className="material-symbols-rounded">menu</span>
          </button>
          <h1 className="text-lg font-bold">Help & Support</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        <section>
          <h3 className="font-bold text-sm mb-3 text-gray-700 flex items-center gap-2">
            <span className="material-symbols-rounded text-cyan-600">contact_support</span>
            Contact Us
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {contactOptions.map((option, idx) => (
              <a
                key={idx}
                href={option.action}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl p-4 shadow-sm text-center hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="material-symbols-rounded text-cyan-600">{option.icon}</span>
                </div>
                <p className="text-xs font-bold">{option.label}</p>
                <p className="text-[10px] text-gray-400 mt-1 truncate">{option.value}</p>
              </a>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold text-sm mb-3 text-gray-700 flex items-center gap-2">
            <span className="material-symbols-rounded text-cyan-600">quiz</span>
            Frequently Asked Questions
          </h3>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full p-4 text-left flex justify-between items-center"
                >
                  <span className="font-bold text-sm pr-4">{faq.question}</span>
                  <span className={`material-symbols-rounded text-gray-400 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-br from-cyan-600 to-[#0097A7] rounded-xl p-6 text-white text-center">
          <span className="material-symbols-rounded text-4xl mb-3">support_agent</span>
          <h3 className="font-bold">Need More Help?</h3>
          <p className="text-xs opacity-80 mt-1">Our support team is available 24/7</p>
          <button
            onClick={() => setChatOpen(true)}
            className="mt-4 bg-white text-cyan-600 px-6 py-2 rounded-lg text-sm font-bold active:scale-95 transition-all"
          >
            Chat with Support
          </button>
        </section>
      </div>

      <ChatWindow
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        student={student}
      />
    </div>
  );
};

export default HelpSupport;
