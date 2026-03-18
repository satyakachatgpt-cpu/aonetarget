import React from 'react';
import { useParams } from 'react-router-dom';
import ViewFormatModal from './ViewFormatModal';

const ViewFormatPage: React.FC = () => {
    const { formatId } = useParams<{ formatId: string }>();

    return (
        <ViewFormatModal 
            isOpen={true} 
            onClose={() => window.close()} 
            format={formatId || 'default'} 
        />
    );
};

export default ViewFormatPage;
